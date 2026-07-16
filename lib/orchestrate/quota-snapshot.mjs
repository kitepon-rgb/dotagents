// Quota snapshot contract (ADR 0054 Decision 1, dotagents.quota-snapshot.v1).
// Snapshots carry provider quota observations for the rate-aware selector. All persisted
// numbers are integers (basis points); floats never enter the digest path. No secrets,
// account identifiers, cookies, tokens, or raw provider responses may be stored here.
import { createHash } from "node:crypto";

import { canonicalJson } from "./control-record.mjs";

export const QUOTA_SNAPSHOT_SCHEMA = "dotagents.quota-snapshot.v1";

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const PROVIDERS = Object.freeze(["anthropic", "openai"]);
const SOURCES = Object.freeze(["provider-api", "app-ui", "manual"]);
const CONFIDENCES = Object.freeze(["measured", "reported", "estimated"]);
const MAX_WINDOWS = 16;
const MAX_EXECUTOR_SCOPE = 32;

export class QuotaSnapshotError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "QuotaSnapshotError";
    this.code = code;
  }
}

const fail = (code, message) => { throw new QuotaSnapshotError(code, message); };

const object = (value, name) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("INVALID_SCHEMA", `${name} must be an object`);
};
const exact = (value, keys, name) => {
  object(value, name);
  const actual = Object.keys(value).sort(); const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail("INVALID_SCHEMA", `${name} has invalid fields`);
};
const identifier = (value, name) => {
  if (typeof value !== "string" || !ID_RE.test(value)) fail("INVALID_SCHEMA", `${name} is not a bounded identifier`);
};
const boundedString = (value, name, maximum = 256) => {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || value.includes("\0")) fail("INVALID_SCHEMA", `${name} is not a bounded string`);
};
const timestamp = (value, name) => {
  boundedString(value, name, 64);
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) fail("INVALID_SCHEMA", `${name} is not canonical ISO UTC`);
};
const oneOf = (value, values, name) => {
  if (!values.includes(value)) fail("INVALID_SCHEMA", `${name} is invalid`);
};
const basisPoints = (value, name) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10000) fail("INVALID_SCHEMA", `${name} must be an integer between 0 and 10000`);
};

// Registry-identical 4-field executor envelope (ADR 0054 refuter採用指摘4).
export function validateExecutorEnvelope(value, name = "executor") {
  exact(value, ["adapter_id", "contract_version", "instance_id", "handle_schema_id"], name);
  identifier(value.adapter_id, `${name}.adapter_id`); identifier(value.contract_version, `${name}.contract_version`);
  identifier(value.instance_id, `${name}.instance_id`); identifier(value.handle_schema_id, `${name}.handle_schema_id`);
}

export const executorKey = (envelope) => canonicalJson(envelope);

function validateWindowShape(value, name) {
  const base = ["window_id", "reset_at", "remaining_bp", "model_family_scope"];
  const hasStartsAt = value !== null && typeof value === "object" && Object.hasOwn(value, "starts_at");
  exact(value, hasStartsAt ? [...base, "starts_at"] : [...base, "duration_seconds"], name);
  identifier(value.window_id, `${name}.window_id`);
  timestamp(value.reset_at, `${name}.reset_at`);
  basisPoints(value.remaining_bp, `${name}.remaining_bp`);
  if (value.model_family_scope !== null) boundedString(value.model_family_scope, `${name}.model_family_scope`, 128);
  if (hasStartsAt) timestamp(value.starts_at, `${name}.starts_at`);
  else if (!Number.isSafeInteger(value.duration_seconds) || value.duration_seconds <= 0) fail("INVALID_SCHEMA", `${name}.duration_seconds must be a positive integer`);
}

export function validateQuotaSnapshotShape(value) {
  exact(value, ["schema_version", "quota_pool_id", "host_instance_id", "executor_scope", "provider", "windows", "observed_at", "source", "confidence"], "quota_snapshot");
  if (value.schema_version !== QUOTA_SNAPSHOT_SCHEMA) fail("INVALID_SCHEMA", "quota snapshot schema is unsupported");
  identifier(value.quota_pool_id, "quota_snapshot.quota_pool_id");
  identifier(value.host_instance_id, "quota_snapshot.host_instance_id");
  if (!Array.isArray(value.executor_scope) || value.executor_scope.length < 1 || value.executor_scope.length > MAX_EXECUTOR_SCOPE) fail("INVALID_SCHEMA", "quota_snapshot.executor_scope has invalid length");
  value.executor_scope.forEach((entry, index) => validateExecutorEnvelope(entry, `quota_snapshot.executor_scope[${index}]`));
  if (new Set(value.executor_scope.map(executorKey)).size !== value.executor_scope.length) fail("INVALID_SCHEMA", "quota_snapshot.executor_scope contains duplicate executors");
  oneOf(value.provider, PROVIDERS, "quota_snapshot.provider");
  if (!Array.isArray(value.windows) || value.windows.length < 1 || value.windows.length > MAX_WINDOWS) fail("INVALID_SCHEMA", "quota_snapshot.windows has invalid length");
  value.windows.forEach((entry, index) => validateWindowShape(entry, `quota_snapshot.windows[${index}]`));
  if (new Set(value.windows.map((entry) => entry.window_id)).size !== value.windows.length) fail("INVALID_SCHEMA", "quota_snapshot.windows contains duplicate window ids");
  timestamp(value.observed_at, "quota_snapshot.observed_at");
  oneOf(value.source, SOURCES, "quota_snapshot.source");
  oneOf(value.confidence, CONFIDENCES, "quota_snapshot.confidence");
}

// ADR 0054 Decision 1: window_length is duration_seconds, or reset_at - starts_at for the
// starts_at form. Contradictions fail loud so a manual reset-date typo can never rank a pool.
export function windowLengthSeconds(window) {
  if (Object.hasOwn(window, "duration_seconds")) return window.duration_seconds;
  return (Date.parse(window.reset_at) - Date.parse(window.starts_at)) / 1000;
}

export function validateQuotaSnapshotWindows(value) {
  const observed = Date.parse(value.observed_at);
  for (const [index, window] of value.windows.entries()) {
    const name = `quota_snapshot.windows[${index}]`;
    const reset = Date.parse(window.reset_at);
    if (Object.hasOwn(window, "starts_at") && Date.parse(window.starts_at) >= reset) fail("WINDOW_CONTRADICTION", `${name}.starts_at is not before reset_at`);
    const length = windowLengthSeconds(window);
    const remainingSeconds = (reset - observed) / 1000;
    if (remainingSeconds <= 0) fail("WINDOW_CONTRADICTION", `${name}.reset_at is not after observed_at`);
    if (remainingSeconds > length) fail("WINDOW_CONTRADICTION", `${name} remaining time exceeds the window length`);
  }
}

export function validateQuotaSnapshot(value) {
  validateQuotaSnapshotShape(value);
  validateQuotaSnapshotWindows(value);
  return value;
}

// Cross-snapshot input rules (ADR 0054): pool ids unique, an executor belongs to at most one pool.
export function validateQuotaSnapshotSet(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length < 1 || snapshots.length > 64) fail("INVALID_SCHEMA", "quota snapshot set has invalid length");
  for (const snapshot of snapshots) validateQuotaSnapshotShape(snapshot);
  if (new Set(snapshots.map((entry) => entry.quota_pool_id)).size !== snapshots.length) fail("INVALID_SCHEMA", "quota snapshot set contains duplicate quota_pool_id");
  const seenExecutors = new Set();
  for (const snapshot of snapshots) for (const executor of snapshot.executor_scope) {
    const key = executorKey(executor);
    if (seenExecutors.has(key)) fail("INVALID_SCHEMA", "an executor belongs to more than one quota pool");
    seenExecutors.add(key);
  }
  for (const snapshot of snapshots) validateQuotaSnapshotWindows(snapshot);
  return snapshots;
}

export function quotaSnapshotDigest(snapshot) {
  validateQuotaSnapshot(snapshot);
  return createHash("sha256").update(canonicalJson(snapshot)).digest("hex");
}
