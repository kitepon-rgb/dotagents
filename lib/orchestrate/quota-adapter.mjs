// Provider quota observation adapter (ADR 0054 Wave A, request/projection pure functions).
// Live acquisition (reading account usage) is a separate H-gated entry; this module only
// builds observation request descriptors and projects already-captured provider events into
// dotagents.quota-snapshot.v1. No secrets, cookies, tokens, account identifiers, or raw
// provider payloads may pass through: a `raw` field on any event is rejected loudly.
// Source shapes are pinned by rag/orchestration/provider-quota-and-claude-runtime.md:
//  - anthropic: Claude Agent SDK RateLimitEvent.rate_limit_info — utilization is a fraction
//    0.0..1.0 of the window consumed, resets_at is a Unix epoch in seconds (SDK reference).
//  - openai: Codex CLI product-owned token_count rate_limits — used_percent is a percentage
//    0..100, window_minutes, resets_at epoch seconds (measured on 0.144.3; schema drift must
//    fail loud, secondary: null is a valid observed shape).
import { validateExecutorEnvelope, validateQuotaSnapshot, QuotaSnapshotError, QUOTA_SNAPSHOT_SCHEMA } from "./quota-snapshot.mjs";

export const QUOTA_OBSERVATION_REQUEST_SCHEMA = "dotagents.quota-observation-request.v1";

// Provider -> product-owned observation entry (the only v1 entries; statusline and xAI are
// out of scope per ADR 0054). The live layer executes the entry with the product's own
// session; the adapter never sees or carries credentials.
export const QUOTA_OBSERVATION_ENTRIES = Object.freeze({
  anthropic: "claude-agent-sdk-rate-limit-event",
  openai: "codex-token-count-event",
});

// Fixed failure taxonomy: a transport/acquisition failure can only become a typed error,
// never a snapshot (ADR 0054: 取得失敗→typed error).
export const QUOTA_OBSERVATION_FAILURE_CODES = Object.freeze({
  "entry-unavailable": "OBSERVATION_UNAVAILABLE",
  "timeout": "OBSERVATION_TIMEOUT",
  "credential-missing": "CREDENTIAL_MISSING",
  "malformed-event": "EVENT_MALFORMED",
  "schema-drift": "SCHEMA_DRIFT",
});

const ANTHROPIC_WINDOWS = Object.freeze({
  five_hour: Object.freeze({ window_id: "5h", duration_seconds: 5 * 3600, model_family_scope: null }),
  seven_day: Object.freeze({ window_id: "7d", duration_seconds: 7 * 24 * 3600, model_family_scope: null }),
  seven_day_opus: Object.freeze({ window_id: "7d-opus", duration_seconds: 7 * 24 * 3600, model_family_scope: "opus" }),
  seven_day_sonnet: Object.freeze({ window_id: "7d-sonnet", duration_seconds: 7 * 24 * 3600, model_family_scope: "sonnet" }),
});

const RATE_LIMIT_STATUSES = Object.freeze(["allowed", "allowed_warning", "rejected"]);
const MAX_EVENTS = 16;
// Epoch-second sanity bounds: 2001-09-09..2100-01-01. Values outside are drift or unit bugs
// (milliseconds passed as seconds and vice versa), not observations.
const EPOCH_MIN = 1000000000;
const EPOCH_MAX = 4102444800;

export class QuotaAdapterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "QuotaAdapterError";
    this.code = code;
  }
}

const fail = (code, message) => { throw new QuotaAdapterError(code, message); };

const object = (value, name) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("INVALID_SCHEMA", `${name} must be an object`);
};
const exact = (value, keys, name) => {
  object(value, name);
  const actual = Object.keys(value).sort(); const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail("INVALID_SCHEMA", `${name} has invalid fields`);
};
const identifier = (value, name) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) fail("INVALID_SCHEMA", `${name} is not a bounded identifier`);
};
const boundedString = (value, name, maximum = 256) => {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || value.includes("\0")) fail("INVALID_SCHEMA", `${name} is not a bounded string`);
};
const epochSecondsToIso = (value, name) => {
  if (!Number.isSafeInteger(value) || value < EPOCH_MIN || value > EPOCH_MAX) fail("EVENT_MALFORMED", `${name} is not a plausible Unix epoch in seconds`);
  return new Date(value * 1000).toISOString();
};
const rejectRawPayload = (value, name) => {
  if (value !== null && typeof value === "object" && Object.hasOwn(value, "raw")) fail("EVENT_MALFORMED", `${name} carries a raw provider payload; strip it before projection`);
};

function validateEnvelopeInput(input) {
  identifier(input.quota_pool_id, "input.quota_pool_id");
  identifier(input.host_instance_id, "input.host_instance_id");
  if (!Array.isArray(input.executor_scope) || input.executor_scope.length < 1 || input.executor_scope.length > 32) fail("INVALID_SCHEMA", "input.executor_scope has invalid length");
  try {
    input.executor_scope.forEach((entry, index) => validateExecutorEnvelope(entry, `input.executor_scope[${index}]`));
  } catch (error) {
    if (error instanceof QuotaSnapshotError) fail(error.code, error.message);
    throw error;
  }
}

// Pure request builder: describes what the H-gated live layer must observe. It carries no
// credentials and no account identifiers; the entry runs inside the product-owned session.
export function buildQuotaObservationRequest(input) {
  exact(input, ["provider", "quota_pool_id", "host_instance_id", "executor_scope"], "observation request input");
  if (!Object.hasOwn(QUOTA_OBSERVATION_ENTRIES, input.provider)) fail("INVALID_SCHEMA", "observation request provider is unsupported");
  validateEnvelopeInput(input);
  return {
    schema_version: QUOTA_OBSERVATION_REQUEST_SCHEMA,
    provider: input.provider,
    entry: QUOTA_OBSERVATION_ENTRIES[input.provider],
    credential_policy: "product-owned-session",
    quota_pool_id: input.quota_pool_id,
    host_instance_id: input.host_instance_id,
    executor_scope: structuredClone(input.executor_scope),
  };
}

function finishSnapshot(partial) {
  let snapshot;
  try {
    snapshot = validateQuotaSnapshot(partial);
  } catch (error) {
    if (error instanceof QuotaSnapshotError) fail(error.code, error.message);
    throw error;
  }
  return snapshot;
}

// Projection: Claude Agent SDK RateLimitEvent.rate_limit_info entries -> quota snapshot.
// Each event contributes the window named by rate_limit_type. `overage` is billing state,
// not a quota window: it never becomes a window, and events made only of overage cannot
// produce a snapshot (NO_QUOTA_WINDOWS) — no fabricated capacity.
export function projectAnthropicRateLimitEvents(input) {
  exact(input, ["events", "quota_pool_id", "host_instance_id", "executor_scope", "observed_at"], "anthropic projection input");
  validateEnvelopeInput(input);
  if (!Array.isArray(input.events) || input.events.length < 1 || input.events.length > MAX_EVENTS) fail("INVALID_SCHEMA", "input.events has invalid length");
  const windows = []; const seenTypes = new Set();
  for (const [index, event] of input.events.entries()) {
    const name = `input.events[${index}]`;
    rejectRawPayload(event, name);
    exact(event, ["status", "resets_at", "rate_limit_type", "utilization", "overage_status", "overage_resets_at", "overage_disabled_reason"], name);
    if (!RATE_LIMIT_STATUSES.includes(event.status)) fail("EVENT_MALFORMED", `${name}.status is not a known rate limit status`);
    if (event.overage_status !== null && !RATE_LIMIT_STATUSES.includes(event.overage_status)) fail("EVENT_MALFORMED", `${name}.overage_status is not a known rate limit status`);
    if (event.overage_resets_at !== null) epochSecondsToIso(event.overage_resets_at, `${name}.overage_resets_at`);
    if (event.overage_disabled_reason !== null) boundedString(event.overage_disabled_reason, `${name}.overage_disabled_reason`, 256);
    if (event.rate_limit_type === null) fail("EVENT_MALFORMED", `${name}.rate_limit_type is missing; the event does not name a window`);
    if (seenTypes.has(event.rate_limit_type)) fail("EVENT_MALFORMED", `${name}.rate_limit_type is duplicated across events`);
    seenTypes.add(event.rate_limit_type);
    if (event.rate_limit_type === "overage") continue;
    const shape = ANTHROPIC_WINDOWS[event.rate_limit_type];
    if (shape === undefined) fail("SCHEMA_DRIFT", `${name}.rate_limit_type is not a known window type; characterize the new shape before projecting`);
    // SDK reference pins utilization as the consumed fraction 0.0..1.0 (not a percentage).
    if (typeof event.utilization !== "number" || !Number.isFinite(event.utilization) || event.utilization < 0 || event.utilization > 1) fail("EVENT_MALFORMED", `${name}.utilization is not a fraction between 0 and 1`);
    if (event.resets_at === null) fail("EVENT_MALFORMED", `${name}.resets_at is missing; a window without reset cannot be projected`);
    windows.push({
      window_id: shape.window_id,
      duration_seconds: shape.duration_seconds,
      reset_at: epochSecondsToIso(event.resets_at, `${name}.resets_at`),
      remaining_bp: 10000 - Math.round(event.utilization * 10000),
      model_family_scope: shape.model_family_scope,
    });
  }
  if (windows.length === 0) fail("NO_QUOTA_WINDOWS", "anthropic events carried no quota window; do not fabricate capacity");
  return finishSnapshot({
    schema_version: QUOTA_SNAPSHOT_SCHEMA,
    quota_pool_id: input.quota_pool_id,
    host_instance_id: input.host_instance_id,
    executor_scope: structuredClone(input.executor_scope),
    provider: "anthropic",
    windows,
    observed_at: input.observed_at,
    source: "provider-api",
    confidence: "reported",
  });
}

function projectCodexWindow(value, limitId, slot) {
  const name = `input.event.${slot}`;
  exact(value, ["used_percent", "window_minutes", "resets_at"], name);
  if (typeof value.used_percent !== "number" || !Number.isFinite(value.used_percent) || value.used_percent < 0 || value.used_percent > 100) fail("EVENT_MALFORMED", `${name}.used_percent is not a percentage between 0 and 100`);
  if (!Number.isSafeInteger(value.window_minutes) || value.window_minutes <= 0) fail("EVENT_MALFORMED", `${name}.window_minutes is not a positive integer`);
  return {
    window_id: `${limitId}-${slot}`,
    duration_seconds: value.window_minutes * 60,
    reset_at: epochSecondsToIso(value.resets_at, `${name}.resets_at`),
    remaining_bp: 10000 - Math.round(value.used_percent * 100),
    model_family_scope: null,
  };
}

// Projection: Codex CLI product-owned token_count rate_limits -> quota snapshot.
// Shape pinned on 0.144.3 (measured): { limit_id, primary, secondary }, each slot either
// null or { used_percent, window_minutes, resets_at }. secondary: null is the observed
// valid shape; unknown fields are schema drift and fail loud.
export function projectCodexTokenCountEvent(input) {
  exact(input, ["event", "quota_pool_id", "host_instance_id", "executor_scope", "observed_at"], "codex projection input");
  validateEnvelopeInput(input);
  rejectRawPayload(input.event, "input.event");
  exact(input.event, ["limit_id", "primary", "secondary"], "input.event");
  identifier(input.event.limit_id, "input.event.limit_id");
  const windows = [];
  for (const slot of ["primary", "secondary"]) {
    const value = input.event[slot];
    if (value === null) continue;
    rejectRawPayload(value, `input.event.${slot}`);
    windows.push(projectCodexWindow(value, input.event.limit_id, slot));
  }
  if (windows.length === 0) fail("NO_QUOTA_WINDOWS", "codex event carried no quota window; do not fabricate capacity");
  return finishSnapshot({
    schema_version: QUOTA_SNAPSHOT_SCHEMA,
    quota_pool_id: input.quota_pool_id,
    host_instance_id: input.host_instance_id,
    executor_scope: structuredClone(input.executor_scope),
    provider: "openai",
    windows,
    observed_at: input.observed_at,
    source: "provider-api",
    confidence: "reported",
  });
}

// Acquisition failures become typed errors and nothing else. This function never returns:
// the live layer routes every non-success outcome through here so a failure can never be
// silently shaped into a snapshot or an implicit fallback placement.
export function projectQuotaObservationFailure(input) {
  exact(input, ["provider", "failure_kind", "detail"], "observation failure input");
  if (!Object.hasOwn(QUOTA_OBSERVATION_ENTRIES, input.provider)) fail("INVALID_SCHEMA", "observation failure provider is unsupported");
  if (!Object.hasOwn(QUOTA_OBSERVATION_FAILURE_CODES, input.failure_kind)) fail("INVALID_SCHEMA", "observation failure kind is unsupported");
  boundedString(input.detail, "input.detail", 512);
  fail(QUOTA_OBSERVATION_FAILURE_CODES[input.failure_kind], `${input.provider} quota observation failed: ${input.detail}`);
}
