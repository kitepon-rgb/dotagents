// Rate-aware quota pool selector (ADR 0054 Decision 2, dotagents.selector-decision.v1).
// Pure function: every input is explicit (now, snapshots, previous selection, policy) and no
// clock, environment, or network is read. Role→model resolution stays in docs/02_models.md;
// this module never names models. Failures are typed and loud — no fabricated quota, no
// implicit fallback placement.
import { createHash } from "node:crypto";

import { canonicalJson } from "./control-record.mjs";
import { ROLE_PROVIDER_PLACEMENT } from "./placement-policy.mjs";
import {
  QuotaSnapshotError, executorKey, quotaSnapshotDigest, validateExecutorEnvelope,
  validateQuotaSnapshotSet, windowLengthSeconds,
} from "./quota-snapshot.mjs";

export const SELECTOR_DECISION_SCHEMA = "dotagents.selector-decision.v1";

// Fixture-pinned defaults (ADR 0054: policy既定値は実装で定数化しfixtureで固定する).
export const DEFAULT_SELECTOR_POLICY = Object.freeze({
  epsilon_time: 0.005,
  epsilon_tie_bp: 100,
  min_remaining_bp: 200,
  pace_cap_bp: 50000,
  switch_threshold_bp: 12500,
  max_snapshot_age_seconds: 900,
});

export class RateSelectorError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RateSelectorError";
    this.code = code;
  }
}

const fail = (code, message) => { throw new RateSelectorError(code, message); };

const object = (value, name) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("INVALID_SCHEMA", `${name} must be an object`);
};
const exact = (value, keys, name) => {
  object(value, name);
  const actual = Object.keys(value).sort(); const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail("INVALID_SCHEMA", `${name} has invalid fields`);
};
const boundedString = (value, name, maximum = 256) => {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || value.includes("\0")) fail("INVALID_SCHEMA", `${name} is not a bounded string`);
};
const timestamp = (value, name) => {
  boundedString(value, name, 64);
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) fail("INVALID_SCHEMA", `${name} is not canonical ISO UTC`);
};
const positiveInteger = (value, name) => {
  if (!Number.isSafeInteger(value) || value <= 0) fail("INVALID_SCHEMA", `${name} must be a positive integer`);
};

function validatePolicy(value) {
  exact(value, ["epsilon_time", "epsilon_tie_bp", "min_remaining_bp", "pace_cap_bp", "switch_threshold_bp", "max_snapshot_age_seconds"], "policy");
  if (!Number.isFinite(value.epsilon_time) || value.epsilon_time <= 0 || value.epsilon_time >= 1) fail("INVALID_SCHEMA", "policy.epsilon_time is invalid");
  positiveInteger(value.epsilon_tie_bp, "policy.epsilon_tie_bp");
  if (!Number.isSafeInteger(value.min_remaining_bp) || value.min_remaining_bp < 0 || value.min_remaining_bp > 10000) fail("INVALID_SCHEMA", "policy.min_remaining_bp is invalid");
  positiveInteger(value.pace_cap_bp, "policy.pace_cap_bp");
  if (!Number.isSafeInteger(value.switch_threshold_bp) || value.switch_threshold_bp <= 10000) fail("INVALID_SCHEMA", "policy.switch_threshold_bp must exceed 10000");
  positiveInteger(value.max_snapshot_age_seconds, "policy.max_snapshot_age_seconds");
}

function rethrowSnapshotError(error) {
  if (error instanceof QuotaSnapshotError) fail(error.code, error.message);
  throw error;
}

// ADR 0054 fixed error-check order: INVALID_SCHEMA -> WINDOW_CONTRADICTION -> SNAPSHOT_EXPIRED
// -> SNAPSHOT_STALE -> SNAPSHOT_MISSING -> ROLE_NOT_BALANCED -> NO_ELIGIBLE_POOL.
// `reservation` is echoed into the decision (the selector computes no budget); it is required
// by the output contract of ADR 0054 Decision 2.
export function selectQuotaPool(input) {
  exact(input, ["now", "role", "target_model_family", "candidates", "snapshots", "previous_selection", "reservation", "policy"], "selector input");
  timestamp(input.now, "selector input.now");
  boundedString(input.role, "selector input.role", 64);
  if (!Object.hasOwn(ROLE_PROVIDER_PLACEMENT, input.role)) fail("INVALID_SCHEMA", "selector input.role is not a placement role");
  boundedString(input.target_model_family, "selector input.target_model_family", 128);
  if (!Array.isArray(input.candidates) || input.candidates.length < 1 || input.candidates.length > 64) fail("INVALID_SCHEMA", "selector input.candidates has invalid length");
  input.candidates.forEach((entry, index) => validateExecutorEnvelope(entry, `selector input.candidates[${index}]`));
  if (new Set(input.candidates.map(executorKey)).size !== input.candidates.length) fail("INVALID_SCHEMA", "selector input.candidates contains duplicates");
  if (input.previous_selection !== null) {
    exact(input.previous_selection, ["quota_pool_id"], "selector input.previous_selection");
    boundedString(input.previous_selection.quota_pool_id, "selector input.previous_selection.quota_pool_id", 128);
  }
  exact(input.reservation, ["wall_time_seconds", "cost_microusd"], "selector input.reservation");
  positiveInteger(input.reservation.wall_time_seconds, "selector input.reservation.wall_time_seconds");
  positiveInteger(input.reservation.cost_microusd, "selector input.reservation.cost_microusd");
  validatePolicy(input.policy);
  const now = Date.parse(input.now);
  let shapeChecked;
  try {
    shapeChecked = validateQuotaSnapshotSet(input.snapshots);
  } catch (error) { rethrowSnapshotError(error); }
  for (const snapshot of shapeChecked) {
    if (Date.parse(snapshot.observed_at) > now) fail("INVALID_SCHEMA", "quota snapshot observed_at is in the caller future");
  }

  // SNAPSHOT_EXPIRED: any window of an involved snapshot that has already reset demands re-observation.
  const poolBySnapshot = new Map(shapeChecked.map((snapshot) => [snapshot.quota_pool_id, snapshot]));
  const executorToPool = new Map();
  for (const snapshot of shapeChecked) for (const executor of snapshot.executor_scope) executorToPool.set(executorKey(executor), snapshot.quota_pool_id);
  const involvedPools = new Set();
  for (const candidate of input.candidates) {
    const poolId = executorToPool.get(executorKey(candidate));
    if (poolId !== undefined) involvedPools.add(poolId);
  }
  const involvedSorted = [...involvedPools].sort();
  for (const poolId of involvedSorted) {
    for (const window of poolBySnapshot.get(poolId).windows) {
      if (Date.parse(window.reset_at) <= now) fail("SNAPSHOT_EXPIRED", `quota pool ${poolId} window ${window.window_id} has reset; re-observe before selecting`);
    }
  }
  for (const poolId of involvedSorted) {
    if (now - Date.parse(poolBySnapshot.get(poolId).observed_at) > input.policy.max_snapshot_age_seconds * 1000) {
      fail("SNAPSHOT_STALE", `quota pool ${poolId} snapshot is older than the freshness bound`);
    }
  }
  for (const candidate of input.candidates) {
    if (!executorToPool.has(executorKey(candidate))) fail("SNAPSHOT_MISSING", "a candidate executor has no quota snapshot; exclude it or re-observe");
  }
  if (input.role !== "worker") fail("ROLE_NOT_BALANCED", `role ${input.role} is not auto-balanced (ADR 0050 placement relations)`);

  // Evaluate every involved pool over its applicable windows.
  const paceCap = input.policy.pace_cap_bp / 10000;
  const evaluations = [];
  for (const poolId of involvedSorted) {
    const snapshot = poolBySnapshot.get(poolId);
    const applicable = snapshot.windows.filter((window) => window.model_family_scope === null || window.model_family_scope === input.target_model_family);
    if (applicable.length === 0) {
      evaluations.push({ quota_pool_id: poolId, min_pace_bp: null, binding_window_id: null, eligible: false, exclusion_reason: "no-applicable-window" });
      continue;
    }
    if (applicable.some((window) => window.remaining_bp < input.policy.min_remaining_bp)) {
      evaluations.push({ quota_pool_id: poolId, min_pace_bp: null, binding_window_id: null, eligible: false, exclusion_reason: "remaining-floor" });
      continue;
    }
    let minPace = Infinity; let bindingWindowId = null;
    for (const window of [...applicable].sort((left, right) => left.window_id.localeCompare(right.window_id))) {
      const remainingTimeRatio = (Date.parse(window.reset_at) - now) / 1000 / windowLengthSeconds(window);
      const pace = Math.min((window.remaining_bp / 10000) / Math.max(remainingTimeRatio, input.policy.epsilon_time), paceCap);
      if (pace < minPace) { minPace = pace; bindingWindowId = window.window_id; }
    }
    evaluations.push({ quota_pool_id: poolId, min_pace_bp: Math.round(minPace * 10000), binding_window_id: bindingWindowId, eligible: true, exclusion_reason: null, pace: minPace });
  }
  const eligible = evaluations.filter((entry) => entry.eligible);
  if (eligible.length === 0) fail("NO_ELIGIBLE_POOL", "no quota pool is eligible; do not fabricate capacity or fall back implicitly");

  // Quantized total order (non-transitive pairwise approximation is forbidden by ADR 0054).
  const bucket = (entry) => Math.floor((entry.pace * 10000) / input.policy.epsilon_tie_bp);
  const ordered = [...eligible].sort((left, right) => bucket(right) - bucket(left) || left.quota_pool_id.localeCompare(right.quota_pool_id));
  let selected = ordered[0];
  let reason = "max-headroom";
  if (eligible.length === 1) {
    reason = "only-eligible";
  } else if (input.previous_selection !== null) {
    const previous = eligible.find((entry) => entry.quota_pool_id === input.previous_selection.quota_pool_id);
    if (previous !== undefined && selected.quota_pool_id !== previous.quota_pool_id
      && selected.pace <= previous.pace * (input.policy.switch_threshold_bp / 10000)) {
      selected = previous;
      reason = "hysteresis-hold";
    }
  }

  const selectedSnapshot = poolBySnapshot.get(selected.quota_pool_id);
  const scopeKeys = new Set(selectedSnapshot.executor_scope.map(executorKey));
  const selectedExecutor = input.candidates
    .filter((candidate) => scopeKeys.has(executorKey(candidate)))
    .sort((left, right) => executorKey(left).localeCompare(executorKey(right)))[0];

  return {
    schema_version: SELECTOR_DECISION_SCHEMA,
    selected_quota_pool_id: selected.quota_pool_id,
    selected_executor: structuredClone(selectedExecutor),
    evaluated_at: input.now,
    reason,
    pool_evaluations: evaluations.map(({ pace: _pace, ...entry }) => entry),
    snapshot_evidence: involvedSorted.map((poolId) => {
      const snapshot = poolBySnapshot.get(poolId);
      return { type: "executor-receipt", ref: `quota-snapshot:${poolId}:${snapshot.observed_at}`, digest: quotaSnapshotDigest(snapshot), observed_at: snapshot.observed_at };
    }),
    reservation: structuredClone(input.reservation),
  };
}

export function selectorDecisionDigest(decision) {
  return createHash("sha256").update(canonicalJson(decision)).digest("hex");
}
