import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants as FS, createReadStream } from "node:fs";
import {
  chmod, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, stat, unlink,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";

const MANIFEST_SCHEMA = "dotagents.orchestration-control.v19";
const OWNER_SCHEMA = "dotagents.orchestration-lock-owner.v1";
const MANIFEST_LIMIT = 1024 * 1024;
const OWNER_LIMIT = 1024;
const GIT_OUTPUT_LIMIT = 8 * 1024 * 1024;
const FILES_LIMIT = 64 * 1024 * 1024;
const ARRAY_LIMIT = 256;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA1_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const RESERVED_WRITER = new Set(["admitted", "dispatched", "running", "unknown"]);
const WORKER_NONTERMINAL = new Set(["planned", "admitted", "dispatched", "running", "unknown"]);
const CONSULT_NONTERMINAL = new Set(["planned", "dispatched", "running", "unknown"]);
const WORKER_TERMINAL = new Set(["completed", "failed", "cancelled"]);
const CONSULT_TERMINAL = new Set(["completed", "failed"]);
const OPAQUE_HANDLE_LIMIT = 4096;
const OPAQUE_HANDLE_DEPTH = 4;
const DELEGATION_PACKET_SCHEMA = "dotagents.delegation-packet.v1";
const WORKER_REPORT_SCHEMA = "dotagents.worker-report.v1";

const EXECUTOR_CONTRACTS = new Set([
  "parent\u0000v1\u0000direct\u0000parent.correlation.v1",
  "codex-native\u0000v1\u0000native-subagent\u0000codex-native.agent-path.v1",
  "codex-sidecar\u0000v1\u0000auditor\u0000codex-sidecar.synchronous.v1",
  "codex-sidecar\u0000v1\u0000explore\u0000codex-sidecar.synchronous.v1",
  "codex-sidecar\u0000v1\u0000generate\u0000codex-sidecar.synchronous.v1",
  "codex-sidecar\u0000v1\u0000opinion\u0000codex-sidecar.synchronous.v1",
  "codex-sidecar\u0000v1\u0000review\u0000codex-sidecar.synchronous.v1",
  "codex-sidecar\u0000v1\u0000risk-check\u0000codex-sidecar.synchronous.v1",
  "codex-sidecar\u0000v1\u0000work\u0000codex-sidecar.idempotency-key.v1",
  "aiterm\u0000v1\u0000interactive-session\u0000aiterm.session.v1",
  "claude-native\u0000v1\u0000native-subagent\u0000claude-native.session.v1",
]);
const SIDECAR_READONLY_WORKFLOWS = new Set(["auditor", "explore", "generate", "opinion", "review", "risk-check"]);
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const ROLE_EFFECT_POLICY = Object.freeze({
  policy_version: "dotagents.role-effect.v1",
  read_only_roles: Object.freeze(["refuter", "sorter", "verifier"]),
  approval_required_write_roles: Object.freeze(["integrator"]),
});
const DURABILITY_PROTOCOL = Object.freeze({ protocol_version: "fsync-rename-fsync.v1", file_sync: "required", directory_sync: "required", atomic_rename: "required" });

export class ControlRecordError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "ControlRecordError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

const fail = (code, message, details) => { throw new ControlRecordError(code, message, details); };
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function exact(value, keys, name, code = "INVALID_SCHEMA") {
  if (!isObject(value)) fail(code, `${name} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(code, `${name} has invalid fields`);
  }
  return value;
}

function exactOptional(value, required, optional, name, code = "INVALID_SCHEMA") {
  if (!isObject(value)) fail(code, `${name} must be an object`);
  for (const key of required) if (!own(value, key)) fail(code, `${name}.${key} is required`);
  const allowed = new Set([...required, ...optional]);
  if (Object.keys(value).some((key) => !allowed.has(key))) fail(code, `${name} has invalid fields`);
  return value;
}

function string(value, name, max = 128, { nonempty = true, nullable = false } = {}) {
  if (nullable && value === null) return value;
  if (typeof value !== "string" || (nonempty && value.length === 0) || value.length > max || value.includes("\0")) {
    fail("INVALID_SCHEMA", `${name} must be a bounded string`);
  }
  return value;
}

function identifier(value, name) {
  string(value, name);
  if (!ID_RE.test(value) || value === "." || value === "..") fail("INVALID_SCHEMA", `${name} is not a valid identifier`);
  return value;
}

function integer(value, name, { min = 0 } = {}) {
  if (!Number.isSafeInteger(value) || value < min) fail("INVALID_SCHEMA", `${name} must be a safe integer`);
  return value;
}

function nullableInteger(value, name, { min = 0 } = {}) {
  if (value === null) return value;
  return integer(value, name, { min });
}

function oneOf(value, values, name) {
  if (!values.includes(value)) fail("INVALID_SCHEMA", `${name} is invalid`);
  return value;
}

function timestamp(value, name) {
  string(value, name, 128);
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf()) || date.toISOString() !== value) fail("INVALID_SCHEMA", `${name} must be canonical ISO-8601`);
  return value;
}

function boundedArray(value, name, validator, { min = 0 } = {}) {
  if (!Array.isArray(value) || value.length < min) fail("INVALID_SCHEMA", `${name} must be an array`);
  if (value.length > ARRAY_LIMIT) fail("LIMIT_EXCEEDED", `${name} exceeds ${ARRAY_LIMIT} entries`);
  value.forEach((entry, index) => validator(entry, `${name}[${index}]`));
  return value;
}

function uniqueStringArray(value, name, validator, { min = 0 } = {}) {
  boundedArray(value, name, validator, { min });
  if (new Set(value).size !== value.length) fail("INVALID_SCHEMA", `${name} contains duplicates`);
  return value;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function taskAdmissionDigest(value) {
  const snapshot = structuredClone(value);
  delete snapshot.admission_digest;
  return createHash("sha256").update(canonicalJson(snapshot)).digest("hex");
}

function repoPath(value, name) {
  string(value, name, 1024);
  const normalized = value.normalize("NFC");
  if (normalized !== value || isAbsolute(value) || value.includes("\\") || /[*?\[\]{}]/.test(value)) {
    fail("INVALID_SCHEMA", `${name} is not a canonical repository-relative path`);
  }
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) fail("INVALID_SCHEMA", `${name} is not a literal path`);
  return value;
}

const nullableRef = (value, name) => value === null ? value : repoPath(value, name);
const refs = (value, name, min = 0) => boundedArray(value, name, (entry, entryName) => repoPath(entry, entryName), { min });

function validateEvidence(value, name = "evidence") {
  exact(value, ["type", "ref", "digest", "observed_at"], name);
  oneOf(value.type, ["file", "command", "url", "executor-receipt", "decision"], `${name}.type`);
  if (["file", "decision"].includes(value.type)) repoPath(value.ref, `${name}.ref`);
  else if (value.type === "url") {
    string(value.ref, `${name}.ref`, 1024);
    let parsed; try { parsed = new URL(value.ref); } catch { fail("INVALID_SCHEMA", `${name}.ref must be an https URL`); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) fail("INVALID_SCHEMA", `${name}.ref must be an https URL without credentials`);
  } else string(value.ref, `${name}.ref`, 1024);
  if (!SHA256_RE.test(value.digest)) fail("INVALID_SCHEMA", `${name}.digest is invalid`);
  timestamp(value.observed_at, `${name}.observed_at`);
  return value;
}

const evidenceArray = (value, name, min = 0) => boundedArray(value, name, validateEvidence, { min });

function decodeUtf8(buffer, code, message) {
  try { return UTF8_DECODER.decode(buffer); } catch { fail(code, message); }
}

function injectTestFault(point) {
  if (process.env.NODE_ENV === "test" && process.env.DOTAGENTS_ORCHESTRATE_TEST_FAULT === point) {
    const error = new Error(`injected fault: ${point}`); error.code = "EIO"; throw error;
  }
}

export function normalizeScope(entry) {
  try {
    exact(entry, ["kind", "path"], "scope", "INVALID_SCOPE");
    if (!new Set(["file", "directory"]).has(entry.kind)) fail("INVALID_SCOPE", "scope.kind is invalid");
    if (typeof entry.path !== "string" || entry.path.length === 0 || entry.path.length > 1024 || entry.path.includes("\0")) fail("INVALID_SCOPE", "scope.path is invalid");
    const normalized = entry.path.normalize("NFC");
    if (normalized !== entry.path || isAbsolute(normalized) || normalized.includes("\\") || /[*?\[\]{}]/.test(normalized)) fail("INVALID_SCOPE", "scope.path is invalid");
    if (normalized.split("/").some((part) => !part || part === "." || part === "..")) fail("INVALID_SCOPE", "scope.path is invalid");
    return { kind: entry.kind, path: normalized };
  } catch (error) {
    if (error instanceof ControlRecordError && error.code !== "INVALID_SCOPE") fail("INVALID_SCOPE", error.message);
    throw error;
  }
}

function foldPath(value) {
  return process.platform === "linux" ? value : value.toLocaleLowerCase("en-US");
}

export function scopesOverlap(left, right) {
  const a = normalizeScope(left);
  const b = normalizeScope(right);
  const ap = foldPath(a.path);
  const bp = foldPath(b.path);
  if (ap === bp) return true;
  if (a.kind === "directory" && bp.startsWith(`${ap}/`)) return true;
  if (b.kind === "directory" && ap.startsWith(`${bp}/`)) return true;
  return false;
}

function validateScopeArray(value, name, min = 0) {
  boundedArray(value, name, (entry) => normalizeScope(entry), { min });
  return value;
}

function validateDeclaration(value) {
  exact(value, ["objective_ref", "project_root_realpath", "common_dir_realpath", "git_dir_realpath", "git_dir_file_id", "base_sha", "initial_dirty", "initial_status_digest", "initial_workspace_digest", "created_at", "created_by"], "declaration");
  repoPath(value.objective_ref, "declaration.objective_ref");
  if (value.project_root_realpath !== null) string(value.project_root_realpath, "declaration.project_root_realpath", 4096);
  string(value.common_dir_realpath, "declaration.common_dir_realpath", 4096);
  string(value.git_dir_realpath, "declaration.git_dir_realpath", 4096);
  string(value.git_dir_file_id, "declaration.git_dir_file_id", 128);
  if (!/^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$/.test(value.git_dir_file_id)) fail("INVALID_SCHEMA", "declaration.git_dir_file_id is invalid");
  if (value.base_sha !== null && !SHA1_RE.test(value.base_sha)) fail("INVALID_SCHEMA", "declaration.base_sha is invalid");
  if (typeof value.initial_dirty !== "boolean") fail("INVALID_SCHEMA", "declaration.initial_dirty must be boolean");
  if (value.initial_status_digest !== null && !SHA256_RE.test(value.initial_status_digest)) fail("INVALID_SCHEMA", "declaration.initial_status_digest is invalid");
  if (value.initial_workspace_digest !== null && !SHA256_RE.test(value.initial_workspace_digest)) fail("INVALID_SCHEMA", "declaration.initial_workspace_digest is invalid");
  if (value.project_root_realpath === null && (value.initial_dirty !== false || value.initial_status_digest !== null || value.initial_workspace_digest !== null)) fail("INVALID_SCHEMA", "bare declaration cannot be dirty");
  timestamp(value.created_at, "declaration.created_at");
  string(value.created_by, "declaration.created_by");
}

function validateContinuation(value, controlId) {
  exact(value, ["predecessor_control_id", "root_control_id", "sequence"], "continuation");
  if (value.predecessor_control_id !== null) identifier(value.predecessor_control_id, "continuation.predecessor_control_id");
  identifier(value.root_control_id, "continuation.root_control_id");
  integer(value.sequence, "continuation.sequence");
  if (value.sequence === 0 && (value.predecessor_control_id !== null || value.root_control_id !== controlId)) fail("INVALID_SCHEMA", "root continuation is invalid");
  if (value.sequence > 0 && (value.predecessor_control_id === null || value.predecessor_control_id === controlId)) fail("INVALID_SCHEMA", "successor continuation is invalid");
}

function validateDurability(value) {
  exact(value, ["protocol_version", "file_sync", "directory_sync", "atomic_rename"], "durability");
  if (JSON.stringify(value) !== JSON.stringify(DURABILITY_PROTOCOL)) fail("INVALID_SCHEMA", "durability protocol snapshot is invalid");
}

function validateContextPolicy(value, name) {
  exact(value, ["share_objective", "share_current_candidate", "share_existing_findings", "share_failed_approaches", "share_test_results"], name);
  for (const [key, current] of Object.entries(value)) if (typeof current !== "boolean") fail("INVALID_SCHEMA", `${name}.${key} must be boolean`);
}

function validateApprovalSnapshot(value, name = "approval") {
  exact(value, ["approval_ref", "purpose", "impact", "rollback", "operation_digest", "approved_by", "approved_at", "expires_at"], name);
  repoPath(value.approval_ref, `${name}.approval_ref`);
  string(value.purpose, `${name}.purpose`, 4096);
  string(value.impact, `${name}.impact`, 4096);
  string(value.rollback, `${name}.rollback`, 4096);
  if (!SHA256_RE.test(value.operation_digest)) fail("INVALID_SCHEMA", `${name}.operation_digest is invalid`);
  string(value.approved_by, `${name}.approved_by`);
  timestamp(value.approved_at, `${name}.approved_at`);
  if (value.expires_at !== null) {
    timestamp(value.expires_at, `${name}.expires_at`);
    if (Date.parse(value.expires_at) <= Date.parse(value.approved_at)) fail("INVALID_SCHEMA", `${name}.expires_at must be after approved_at`);
  }
}

function validateRoleEffectPolicy(value) {
  exact(value, ["policy_version", "read_only_roles", "approval_required_write_roles"], "role_effect_policy");
  if (value.policy_version !== ROLE_EFFECT_POLICY.policy_version) fail("INVALID_SCHEMA", "role effect policy version is unsupported");
  uniqueStringArray(value.read_only_roles, "role_effect_policy.read_only_roles", (entry, name) => identifier(entry, name));
  uniqueStringArray(value.approval_required_write_roles, "role_effect_policy.approval_required_write_roles", (entry, name) => identifier(entry, name));
  if (JSON.stringify(value) !== JSON.stringify(ROLE_EFFECT_POLICY)) fail("INVALID_SCHEMA", "role effect policy snapshot is invalid");
}

function enforceRoleEffectPolicy(task, policy) {
  if (task.effect === "write" && policy.read_only_roles.includes(task.role)) fail("ROLE_EFFECT_FORBIDDEN", `${task.role} is read-only`);
  if (task.effect === "write" && policy.approval_required_write_roles.includes(task.role) && task.classification !== "H") {
    fail("ROLE_EFFECT_FORBIDDEN", `${task.role} write requires an H approval snapshot`);
  }
}

function validateTask(value, stored = true) {
  const keys = ["task_id", "title", "classification", "effect", "doc_ref", "role", "lane", "depends_on", "required_capabilities", "isolation", "context_policy", "validation", "non_goals", "known_traps", "read_scope", "write_scope", "approval", "alternative_group", ...(stored ? ["admission_digest"] : [])];
  exact(value, keys, "task");
  identifier(value.task_id, "task.task_id");
  string(value.title, "task.title", 4096);
  oneOf(value.classification, ["F", "A", "H"], "task.classification");
  oneOf(value.effect, ["read", "write"], "task.effect");
  repoPath(value.doc_ref, "task.doc_ref");
  identifier(value.role, "task.role");
  oneOf(value.lane, ["behavior-preserving", "behavior-change", "not-applicable"], "task.lane");
  uniqueStringArray(value.depends_on, "task.depends_on", (entry, name) => identifier(entry, name));
  uniqueStringArray(value.required_capabilities, "task.required_capabilities", (entry, name) => identifier(entry, name));
  oneOf(value.isolation, ["none", "dedicated-worktree"], "task.isolation");
  validateContextPolicy(value.context_policy, "task.context_policy");
  uniqueStringArray(value.validation, "task.validation", (entry, name) => string(entry, name, 4096), { min: 1 });
  uniqueStringArray(value.non_goals, "task.non_goals", (entry, name) => string(entry, name, 4096));
  uniqueStringArray(value.known_traps, "task.known_traps", (entry, name) => string(entry, name, 4096));
  validateScopeArray(value.read_scope, "task.read_scope");
  validateScopeArray(value.write_scope, "task.write_scope", value.effect === "write" ? 1 : 0);
  if (value.effect !== "write" && value.write_scope.length !== 0) fail("INVALID_SCHEMA", "non-write task cannot have write scope");
  if (value.approval !== null) validateApprovalSnapshot(value.approval, "task.approval");
  if ((value.classification === "H") !== (value.approval !== null)) fail("INVALID_SCHEMA", "only H task requires an approval snapshot");
  if (value.alternative_group !== null) identifier(value.alternative_group, "task.alternative_group");
  if (stored && (!SHA256_RE.test(value.admission_digest) || value.admission_digest !== taskAdmissionDigest(value))) fail("INVALID_SCHEMA", "task.admission_digest is invalid");
}

function validateVerification(value, name = "execution_verification") {
  exact(value, ["stage", "observed_version", "observed_at", "evidence"], name);
  oneOf(value.stage, ["unverified", "installed", "registered", "verified", "execution-verified"], `${name}.stage`);
  string(value.observed_version, `${name}.observed_version`);
  timestamp(value.observed_at, `${name}.observed_at`);
  validateEvidence(value.evidence, `${name}.evidence`);
}

function validateLineage(value) {
  exact(value, ["parent_worker_run_id", "root_assignment_id", "provider", "model", "prompt_family", "independence_group", "context_policy", "input_digest", "approach_family_ref", "shared_finding_refs"], "lineage");
  if (value.parent_worker_run_id !== null) identifier(value.parent_worker_run_id, "lineage.parent_worker_run_id");
  identifier(value.root_assignment_id, "lineage.root_assignment_id");
  string(value.provider, "lineage.provider"); string(value.model, "lineage.model");
  identifier(value.prompt_family, "lineage.prompt_family"); identifier(value.independence_group, "lineage.independence_group");
  validateContextPolicy(value.context_policy, "lineage.context_policy");
  if (!SHA256_RE.test(value.input_digest)) fail("INVALID_SCHEMA", "lineage.input_digest is invalid");
  if (value.approach_family_ref !== null) identifier(value.approach_family_ref, "lineage.approach_family_ref");
  refs(value.shared_finding_refs, "lineage.shared_finding_refs");
}

function validateWorkflowCapabilities(value, name = "workflow_capabilities") {
  boundedArray(value, name, (entry, entryName) => {
    exact(entry, ["capability_id", "value", "evidence"], entryName);
    identifier(entry.capability_id, `${entryName}.capability_id`);
    oneOf(entry.value, ["true", "false", "unknown"], `${entryName}.value`);
    if (entry.evidence === null) {
      if (entry.value !== "unknown") fail("INVALID_SCHEMA", `${entryName}.evidence is required for known capability values`);
    } else validateEvidence(entry.evidence, `${entryName}.evidence`);
  }, { min: 1 });
  const ids = value.map((entry) => entry.capability_id);
  if (new Set(ids).size !== ids.length) fail("INVALID_SCHEMA", `${name} contains duplicates`);
  const sorted = [...ids].sort();
  if (ids.some((entry, index) => entry !== sorted[index])) fail("INVALID_SCHEMA", `${name} must be sorted by capability_id`);
}

function validateTriStateObservation(value, name) {
  exact(value, ["value", "evidence"], name);
  oneOf(value.value, ["true", "false", "unknown"], `${name}.value`);
  if (value.evidence === null) {
    if (value.value !== "unknown") fail("INVALID_SCHEMA", `${name}.evidence is required for known values`);
  } else validateEvidence(value.evidence, `${name}.evidence`);
}

function validateCapacityNumber(value, name, min) {
  exact(value, ["knowledge", "value", "evidence"], name);
  oneOf(value.knowledge, ["known", "unknown"], `${name}.knowledge`);
  if (value.knowledge === "unknown") {
    if (value.value !== null) fail("INVALID_SCHEMA", `${name} unknown value must not claim numeric data`);
    if (value.evidence !== null) validateEvidence(value.evidence, `${name}.evidence`);
    return;
  }
  integer(value.value, `${name}.value`, { min });
  if (value.evidence === null) fail("INVALID_SCHEMA", `${name}.evidence is required for known values`);
  validateEvidence(value.evidence, `${name}.evidence`);
}

function validateCapacityObservation(value, name) {
  exact(value, ["admission", "hard_inflight_limit", "soft_inflight_limit", "observed_inflight"], name);
  validateTriStateObservation(value.admission, `${name}.admission`);
  validateCapacityNumber(value.hard_inflight_limit, `${name}.hard_inflight_limit`, 1);
  validateCapacityNumber(value.soft_inflight_limit, `${name}.soft_inflight_limit`, 1);
  validateCapacityNumber(value.observed_inflight, `${name}.observed_inflight`, 0);
  if (value.hard_inflight_limit.knowledge === "known" && value.soft_inflight_limit.knowledge === "known" && value.soft_inflight_limit.value > value.hard_inflight_limit.value) {
    fail("INVALID_SCHEMA", `${name}.soft_inflight_limit exceeds hard limit`);
  }
}

function validateRegistryObservation(value) {
  exact(value, ["registry_observation_id", "executor", "workflow_id", "enabled", "workflow_capabilities", "capacity", "verification", "expires_at"], "registry_observation");
  identifier(value.registry_observation_id, "registry_observation.registry_observation_id");
  validateExecutorEnvelope(value.executor);
  if (value.executor.adapter_id === "gpt-connector") fail("EXECUTOR_FORBIDDEN", "gpt-connector is consultation-only");
  identifier(value.workflow_id, "registry_observation.workflow_id");
  validateTriStateObservation(value.enabled, "registry_observation.enabled");
  validateWorkflowCapabilities(value.workflow_capabilities, "registry_observation.workflow_capabilities");
  validateCapacityObservation(value.capacity, "registry_observation.capacity");
  validateVerification(value.verification, "registry_observation.verification");
  timestamp(value.expires_at, "registry_observation.expires_at");
  const observationEvidence = [
    value.enabled.evidence,
    ...value.workflow_capabilities.map((entry) => entry.evidence),
    value.capacity.admission.evidence,
    value.capacity.hard_inflight_limit.evidence,
    value.capacity.soft_inflight_limit.evidence,
    value.capacity.observed_inflight.evidence,
    value.verification.evidence,
  ].filter((entry) => entry !== null);
  if (observationEvidence.some((entry) => Date.parse(entry.observed_at) > Date.parse(value.verification.observed_at))) fail("INVALID_SCHEMA", "registry evidence is newer than observation snapshot");
  if (Date.parse(value.expires_at) <= Date.parse(value.verification.observed_at)) fail("INVALID_SCHEMA", "registry observation expiry must be after observation");
}

function validatePlacementCandidate(value, name) {
  exact(value, ["candidate_id", "registry_observation_id", "assignment_id", "workspace_cwd", "workspace_binding", "write_mode", "operation_digest", "budget_reservation", "lineage", "executor_handle"], name);
  identifier(value.candidate_id, `${name}.candidate_id`);
  identifier(value.registry_observation_id, `${name}.registry_observation_id`);
  identifier(value.assignment_id, `${name}.assignment_id`);
  string(value.workspace_cwd, `${name}.workspace_cwd`, 4096);
  oneOf(value.workspace_binding, ["fixed", "executor-isolated"], `${name}.workspace_binding`);
  oneOf(value.write_mode, ["none", "direct", "isolated-alternative"], `${name}.write_mode`);
  if (value.operation_digest !== null && !SHA256_RE.test(value.operation_digest)) fail("INVALID_SCHEMA", `${name}.operation_digest is invalid`);
  validateBudgetReservation(value.budget_reservation, `${name}.budget_reservation`);
  validateLineage(value.lineage);
  validateOpaqueHandleValue(value.executor_handle, `${name}.executor_handle`);
}

function placementCandidateDigest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function materializedPlacementCandidate(run, registryObservationId) {
  return {
    candidate_id: run.worker_run_id,
    registry_observation_id: registryObservationId,
    assignment_id: run.assignment_id,
    workspace_cwd: run.workspace.worktree_root_realpath ?? run.workspace.git_dir_realpath,
    workspace_binding: run.workspace_binding.mode,
    write_mode: run.write_mode,
    operation_digest: run.operation_digest,
    budget_reservation: structuredClone(run.budget_reservation),
    lineage: structuredClone(run.lineage),
    executor_handle: structuredClone(run.executor_handle),
    recorded_workspace_fingerprint: structuredClone(run.recorded_workspace_fingerprint),
  };
}

function placementReservationDigest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function validatePlacementReservation(value) {
  exact(value, ["registry_observation_id", "candidate_digest", "selected_from_revision", "eligibility", "review_reasons", "review_decision", "selected_by", "selected_at"], "placement_reservation");
  identifier(value.registry_observation_id, "placement_reservation.registry_observation_id");
  if (!SHA256_RE.test(value.candidate_digest)) fail("INVALID_SCHEMA", "placement_reservation.candidate_digest is invalid");
  integer(value.selected_from_revision, "placement_reservation.selected_from_revision");
  oneOf(value.eligibility, ["eligible", "review-required"], "placement_reservation.eligibility");
  uniqueStringArray(value.review_reasons, "placement_reservation.review_reasons", (entry, name) => identifier(entry, name));
  if (value.review_reasons.some((entry, index) => entry !== [...value.review_reasons].sort()[index])) fail("INVALID_SCHEMA", "placement_reservation.review_reasons must be sorted");
  if (value.review_decision !== null) {
    validateEvidence(value.review_decision, "placement_reservation.review_decision");
    if (value.review_decision.type !== "decision") fail("INVALID_SCHEMA", "placement reservation review must be decision evidence");
  }
  string(value.selected_by, "placement_reservation.selected_by"); timestamp(value.selected_at, "placement_reservation.selected_at");
  if (value.review_decision !== null && Date.parse(value.review_decision.observed_at) > Date.parse(value.selected_at)) fail("INVALID_SCHEMA", "placement review decision is newer than selection");
  if (value.eligibility === "eligible" && (value.review_reasons.length !== 0 || value.review_decision !== null)) fail("INVALID_SCHEMA", "eligible placement cannot carry review approval");
  if (value.eligibility === "review-required" && (value.review_reasons.length === 0 || value.review_decision === null)) fail("INVALID_SCHEMA", "review-required placement needs parent decision evidence");
}

function validateBudget(value) {
  exact(value, ["max_worker_runs", "max_consultations", "max_external_runs", "max_wall_time_seconds", "max_cost_microusd", "max_runs_per_approach_family", "max_retries_per_assignment", "max_integration_runs"], "budget");
  integer(value.max_worker_runs, "budget.max_worker_runs");
  integer(value.max_consultations, "budget.max_consultations");
  integer(value.max_external_runs, "budget.max_external_runs");
  nullableInteger(value.max_wall_time_seconds, "budget.max_wall_time_seconds");
  nullableInteger(value.max_cost_microusd, "budget.max_cost_microusd");
  integer(value.max_runs_per_approach_family, "budget.max_runs_per_approach_family", { min: 1 });
  integer(value.max_retries_per_assignment, "budget.max_retries_per_assignment", { min: 0 });
  integer(value.max_integration_runs, "budget.max_integration_runs", { min: 0 });
}

function validateBudgetReservation(value, name = "budget_reservation") {
  exact(value, ["wall_time_seconds", "cost_microusd"], name);
  nullableInteger(value.wall_time_seconds, `${name}.wall_time_seconds`, { min: 1 });
  nullableInteger(value.cost_microusd, `${name}.cost_microusd`, { min: 0 });
}

function externalWorker(worker) {
  return !["parent", "codex-native"].includes(worker.executor.adapter_id);
}

function assertBudgetWithin(manifest, extraWorker = null, extraConsultation = null, { allowUnknown = false, skipPlacementLimits = false } = {}) {
  const workers = extraWorker === null ? manifest.worker_runs : [...manifest.worker_runs, extraWorker];
  const consultations = extraConsultation === null ? manifest.consultations : [...manifest.consultations, extraConsultation];
  if (workers.length > manifest.budget.max_worker_runs) fail("BUDGET_EXCEEDED", "worker run budget is exceeded");
  if (consultations.length > manifest.budget.max_consultations) fail("BUDGET_EXCEEDED", "consultation budget is exceeded");
  if (workers.filter(externalWorker).length > manifest.budget.max_external_runs) fail("BUDGET_EXCEEDED", "external worker run budget is exceeded");
  if (!skipPlacementLimits) {
    const approachCounts = new Map(); const assignmentCounts = new Map(); let integrationRuns = 0;
    for (const worker of workers) {
      const family = worker.lineage.approach_family_ref;
      if (family === null) fail("BUDGET_UNKNOWN", "worker approach family is unknown");
      approachCounts.set(family, (approachCounts.get(family) ?? 0) + 1);
      assignmentCounts.set(worker.assignment_id, (assignmentCounts.get(worker.assignment_id) ?? 0) + 1);
      const task = manifest.tasks.find((entry) => entry.task_id === worker.task_id);
      if (task?.role === "integrator") integrationRuns += 1;
    }
    if ([...approachCounts.values()].some((count) => count > manifest.budget.max_runs_per_approach_family)) fail("BUDGET_EXCEEDED", "approach family run limit is exceeded");
    if ([...assignmentCounts.values()].some((count) => count > manifest.budget.max_retries_per_assignment + 1)) fail("BUDGET_EXCEEDED", "assignment retry limit is exceeded");
    if (integrationRuns > manifest.budget.max_integration_runs) fail("BUDGET_EXCEEDED", "integration run capacity is exceeded");
  }
  const reservations = [...workers, ...consultations].map((entry) => entry.budget_reservation);
  for (const [reservationField, limitField] of [["wall_time_seconds", "max_wall_time_seconds"], ["cost_microusd", "max_cost_microusd"]]) {
    const limit = manifest.budget[limitField];
    if (limit === null) {
      if (!allowUnknown && reservations.length > 0) fail("BUDGET_UNKNOWN", `${limitField} is unknown`);
      continue;
    }
    if (reservations.some((entry) => entry[reservationField] === null)) {
      if (allowUnknown) continue;
      fail("BUDGET_UNKNOWN", `${reservationField} reservation is unknown under a known control limit`);
    }
    let total = 0;
    for (const reservation of reservations) {
      total += reservation[reservationField];
      if (!Number.isSafeInteger(total) || total > limit) fail("BUDGET_EXCEEDED", `${reservationField} budget is exceeded`);
    }
  }
}

function capabilityValue(worker, capabilityId) {
  return worker.workflow_capabilities.find((entry) => entry.capability_id === capabilityId)?.value;
}

function validateWorkflowCapabilityContract(worker) {
  if (!isKnownExecutorContract(worker.executor, worker.workflow_id)) return;
  if (worker.executor.adapter_id === "codex-sidecar" && SIDECAR_READONLY_WORKFLOWS.has(worker.workflow_id)) {
    if (capabilityValue(worker, "workspace.write") !== "false" || capabilityValue(worker, "readonly.enforceable") !== "true") {
      fail("CAPABILITY_MISMATCH", "codex-sidecar synchronous read-only workflow capability snapshot is invalid");
    }
  }
  if (worker.executor.adapter_id === "codex-sidecar" && worker.workflow_id === "work") {
    if (capabilityValue(worker, "workspace.write") !== "true" || capabilityValue(worker, "workspace.isolated") !== "true") {
      fail("CAPABILITY_MISMATCH", "codex-sidecar durable work capability snapshot is invalid");
    }
  }
}

function requireTaskCapabilities(worker, task) {
  const missing = task.required_capabilities.filter((capabilityId) => capabilityValue(worker, capabilityId) !== "true");
  if (missing.length) fail("CAPABILITY_MISMATCH", "worker workflow does not satisfy task required capabilities", { missing });
}

function validateExecutorEnvelope(value) {
  exact(value, ["adapter_id", "contract_version", "instance_id", "handle_schema_id"], "executor");
  identifier(value.adapter_id, "executor.adapter_id");
  identifier(value.contract_version, "executor.contract_version");
  identifier(value.instance_id, "executor.instance_id");
  identifier(value.handle_schema_id, "executor.handle_schema_id");
  return value;
}

function executorContractKey(executor, workflowId) {
  return [executor.adapter_id, executor.contract_version, workflowId, executor.handle_schema_id].join("\u0000");
}

function isKnownExecutorContract(executor, workflowId) {
  return EXECUTOR_CONTRACTS.has(executorContractKey(executor, workflowId));
}

function validateOpaqueHandleValue(value, name, depth = 0) {
  if (depth > OPAQUE_HANDLE_DEPTH) fail("LIMIT_EXCEEDED", `${name} exceeds opaque handle depth`);
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") { string(value, name, 1024, { nonempty: false }); return; }
  if (typeof value === "number") { if (!Number.isSafeInteger(value)) fail("INVALID_SCHEMA", `${name} number must be a safe integer`); return; }
  if (Array.isArray(value)) {
    if (value.length > 32) fail("LIMIT_EXCEEDED", `${name} has too many entries`);
    value.forEach((entry, index) => validateOpaqueHandleValue(entry, `${name}[${index}]`, depth + 1));
    return;
  }
  if (!isObject(value)) fail("INVALID_SCHEMA", `${name} has an unsupported value`);
  const keys = Object.keys(value);
  if (keys.length > 32) fail("LIMIT_EXCEEDED", `${name} has too many fields`);
  for (const key of keys) {
    string(key, `${name} key`, 128);
    validateOpaqueHandleValue(value[key], `${name}.${key}`, depth + 1);
  }
}

function validateOpaqueHandle(value) {
  if (value !== null && !isObject(value)) fail("INVALID_SCHEMA", "executor_handle must be an object or null");
  validateOpaqueHandleValue(value, "executor_handle");
  if (Buffer.byteLength(canonicalJson(value), "utf8") > OPAQUE_HANDLE_LIMIT) fail("LIMIT_EXCEEDED", "executor_handle exceeds opaque handle limit");
}

function validateHandle(value, executor, workflowId, nullable = true) {
  if (!isKnownExecutorContract(executor, workflowId)) { validateOpaqueHandle(value); return; }
  const schema = executor.handle_schema_id;
  if (value === null) {
    const nullAllowed = nullable && [
      "codex-native.agent-path.v1", "codex-sidecar.synchronous.v1", "aiterm.session.v1", "claude-native.session.v1",
    ].includes(schema);
    if (nullAllowed) return;
    fail("INVALID_SCHEMA", "executor_handle cannot be null for this handle schema");
  }
  if (schema === "parent.correlation.v1") {
    exact(value, ["correlation_id"], "executor_handle"); identifier(value.correlation_id, "executor_handle.correlation_id");
  } else if (schema === "codex-native.agent-path.v1") {
    exact(value, ["agent_path"], "executor_handle"); string(value.agent_path, "executor_handle.agent_path", 1024);
    if (!/^\/root(?:\/[a-z0-9_]+)+$/.test(value.agent_path)) fail("INVALID_SCHEMA", "executor_handle.agent_path is not canonical");
  } else if (schema === "codex-sidecar.idempotency-key.v1") {
    exact(value, ["idempotency_key"], "executor_handle"); string(value.idempotency_key, "executor_handle.idempotency_key");
    if (!/^(?:[A-Za-z0-9_-]{22,128}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.test(value.idempotency_key)) fail("INVALID_SCHEMA", "executor_handle.idempotency_key is not accepted by codex-sidecar");
  } else if (schema === "codex-sidecar.synchronous.v1") {
    fail("INVALID_SCHEMA", "synchronous sidecar workflow cannot have a durable handle");
  } else if (schema === "aiterm.session.v1") {
    exact(value, ["session_id", "agent_kind"], "executor_handle"); identifier(value.session_id, "executor_handle.session_id"); oneOf(value.agent_kind, ["codex", "grok", "composer"], "executor_handle.agent_kind");
  } else if (schema === "claude-native.session.v1") {
    exact(value, ["session_id"], "executor_handle"); identifier(value.session_id, "executor_handle.session_id");
  } else fail("ADAPTER_UNKNOWN", "executor handle schema is not operationally known");
}

function requireOperationalExecutor(worker) {
  if (worker.executor.adapter_id === "gpt-connector") fail("EXECUTOR_FORBIDDEN", "gpt-connector is consultation-only");
  if (!isKnownExecutorContract(worker.executor, worker.workflow_id)) {
    fail("ADAPTER_UNKNOWN", "executor adapter, workflow, or handle schema is not operationally known", {
      adapter_id: worker.executor.adapter_id,
      contract_version: worker.executor.contract_version,
      workflow_id: worker.workflow_id,
      handle_schema_id: worker.executor.handle_schema_id,
    });
  }
}

function requireOperationalManifest(manifest) {
  for (const worker of manifest.worker_runs) requireOperationalExecutor(worker);
}

function validateObservation(value) {
  exact(value, ["source", "observed_version", "observed_at", "raw_state"], "executor_observation");
  string(value.source, "executor_observation.source");
  string(value.observed_version, "executor_observation.observed_version");
  timestamp(value.observed_at, "executor_observation.observed_at");
  string(value.raw_state, "executor_observation.raw_state");
}

function validateFingerprint(value) {
  exact(value, ["digest", "head", "index_digest", "status_digest", "files", "ignored_files"], "workspace_fingerprint");
  if (!SHA256_RE.test(value.digest) || !SHA256_RE.test(value.index_digest) || !SHA256_RE.test(value.status_digest)) fail("INVALID_SCHEMA", "fingerprint digest is invalid");
  if (value.head !== null && !SHA1_RE.test(value.head)) fail("INVALID_SCHEMA", "fingerprint HEAD is invalid");
  boundedArray(value.files, "workspace_fingerprint.files", (entry) => {
    exact(entry, ["path", "state", "file_mode", "content_digest"], "fingerprint file");
    repoPath(entry.path, "fingerprint file.path"); string(entry.state, "fingerprint file.state", 16);
    nullableInteger(entry.file_mode, "fingerprint file.file_mode");
    if (entry.content_digest !== null && !SHA256_RE.test(entry.content_digest)) fail("INVALID_SCHEMA", "file digest is invalid");
    if ((entry.file_mode === null) !== (entry.content_digest === null)) fail("INVALID_SCHEMA", "file mode and content presence differ");
  });
  boundedArray(value.ignored_files, "workspace_fingerprint.ignored_files", (entry) => {
    exact(entry, ["path", "content_digest"], "ignored fingerprint file");
    repoPath(entry.path, "ignored fingerprint file.path");
    if (!SHA256_RE.test(entry.content_digest)) fail("INVALID_SCHEMA", "ignored file digest is invalid");
  });
}

function validateWorkspace(value) {
  exact(value, ["kind", "worktree_root_realpath", "git_dir_realpath", "git_dir_file_id", "common_dir_realpath", "head_at_record", "head_at_reservation"], "workspace");
  oneOf(value.kind, ["worktree", "bare"], "workspace.kind");
  string(value.git_dir_realpath, "workspace.git_dir_realpath", 4096);
  string(value.git_dir_file_id, "workspace.git_dir_file_id", 128);
  if (!/^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$/.test(value.git_dir_file_id)) fail("INVALID_SCHEMA", "workspace.git_dir_file_id is invalid");
  string(value.common_dir_realpath, "workspace.common_dir_realpath", 4096);
  for (const [key, current] of [["head_at_record", value.head_at_record], ["head_at_reservation", value.head_at_reservation]]) {
    if (current !== null && !SHA1_RE.test(current)) fail("INVALID_SCHEMA", `workspace.${key} is invalid`);
  }
  if (value.kind === "bare") {
    if (value.worktree_root_realpath !== null || value.head_at_record !== null || value.head_at_reservation !== null) fail("INVALID_SCHEMA", "bare workspace fields are invalid");
  } else string(value.worktree_root_realpath, "workspace.worktree_root_realpath", 4096);
}

function validateWorkspaceBinding(value) {
  if (value?.mode === "fixed") {
    exact(value, ["mode"], "workspace_binding");
    return;
  }
  exact(value, ["mode", "schema_version", "base_sha", "preserve_worktree", "execution_workspace", "provider_binding", "bound_from_revision", "binding_evidence", "bound_by", "bound_at"], "workspace_binding");
  if (value.mode !== "executor-isolated" || value.schema_version !== "codex-sidecar.delayed-worktree.v1" || value.preserve_worktree !== true || !SHA1_RE.test(value.base_sha)) fail("INVALID_SCHEMA", "executor-isolated workspace binding is invalid");
  if (value.execution_workspace === null) {
    if (value.provider_binding !== null || value.bound_from_revision !== null || value.bound_by !== null || value.bound_at !== null || value.binding_evidence.length !== 0) fail("INVALID_SCHEMA", "unbound executor workspace has binding metadata");
  } else {
    validateWorkspace(value.execution_workspace);
    validateSidecarProviderBinding(value.provider_binding);
    integer(value.bound_from_revision, "workspace_binding.bound_from_revision");
    string(value.bound_by, "workspace_binding.bound_by"); timestamp(value.bound_at, "workspace_binding.bound_at");
    evidenceArray(value.binding_evidence, "workspace_binding.binding_evidence", 1);
    if (value.execution_workspace.kind !== "worktree" || value.execution_workspace.head_at_record !== value.base_sha || value.execution_workspace.head_at_reservation !== value.base_sha) fail("INVALID_SCHEMA", "bound executor workspace differs from base snapshot");
  }
}

function validateSidecarProviderBinding(value) {
  exact(value, ["schema_version", "executor_handle", "provider_run_id", "worktree_path", "observed_state", "result_digest"], "workspace_binding.provider_binding");
  if (value.schema_version !== "dotagents.codex-sidecar.workspace-binding.v1" || value.observed_state !== "completed") fail("INVALID_SCHEMA", "sidecar provider binding is not a completed result");
  exact(value.executor_handle, ["idempotency_key"], "workspace_binding.provider_binding.executor_handle");
  string(value.executor_handle.idempotency_key, "workspace_binding.provider_binding.executor_handle.idempotency_key");
  if (!/^(?:[A-Za-z0-9_-]{22,128}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.test(value.executor_handle.idempotency_key)) fail("INVALID_SCHEMA", "sidecar provider binding idempotency key is invalid");
  identifier(value.provider_run_id, "workspace_binding.provider_binding.provider_run_id");
  string(value.worktree_path, "workspace_binding.provider_binding.worktree_path", 4096);
  if (!isAbsolute(value.worktree_path) || !SHA256_RE.test(value.result_digest)) fail("INVALID_SCHEMA", "sidecar provider binding result is invalid");
}

function sidecarProviderBindingDigest(value) {
  validateSidecarProviderBinding(value);
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function validateResult(value, write) {
  const keys = ["result_digest", "evidence", ...(write ? ["workspace_fingerprint"] : [])];
  exact(value, keys, "result");
  if (!SHA256_RE.test(value.result_digest)) fail("INVALID_SCHEMA", "result_digest is invalid");
  evidenceArray(value.evidence, "result.evidence", 1);
  if (write) validateFingerprint(value.workspace_fingerprint);
}

function validateAcceptance(value, executor, workflowId) {
  exact(value, ["decision", "accepted_from_revision", "result_digest", "executor_handle", "verification_evidence", "decision_note", "decided_by", "decided_at"], "acceptance");
  oneOf(value.decision, ["accepted", "rejected"], "acceptance.decision");
  integer(value.accepted_from_revision, "acceptance.accepted_from_revision");
  if (!SHA256_RE.test(value.result_digest)) fail("INVALID_SCHEMA", "acceptance.result_digest is invalid");
  validateHandle(value.executor_handle, executor, workflowId, true);
  evidenceArray(value.verification_evidence, "acceptance.verification_evidence", 1);
  string(value.decision_note, "acceptance.decision_note", 4096);
  string(value.decided_by, "acceptance.decided_by");
  timestamp(value.decided_at, "acceptance.decided_at");
}

function validateAdmission(value) {
  exact(value, ["admitted_by", "admitted_at", "write_reservation"], "admission");
  string(value.admitted_by, "admission.admitted_by"); timestamp(value.admitted_at, "admission.admitted_at");
  if (typeof value.write_reservation !== "boolean") fail("INVALID_SCHEMA", "admission.write_reservation must be boolean");
}

function validateWorker(value, stored = true) {
  const common = ["worker_run_id", "task_id", "assignment_id", "executor", "workflow_id", "role_ref"];
  const location = stored ? ["workspace", "recorded_workspace_fingerprint", "baseline_workspace_fingerprint"] : ["workspace_cwd"];
  exact(value, [...common, ...location, "workspace_binding", "workflow_capabilities", "budget_reservation", "write_mode", "operation_digest", "execution_verification", "lineage", "placement_reservation", "state", "executor_handle", "executor_observation", "admission", "cancel_request", "dispatch_evidence", "dispatch_attempt_evidence", "terminal_evidence", "result", "acceptance"], "worker_run");
  identifier(value.worker_run_id, "worker_run.worker_run_id"); identifier(value.task_id, "worker_run.task_id"); identifier(value.assignment_id, "worker_run.assignment_id");
  validateExecutorEnvelope(value.executor); identifier(value.workflow_id, "worker_run.workflow_id");
  validateWorkflowCapabilities(value.workflow_capabilities);
  validateBudgetReservation(value.budget_reservation);
  string(value.role_ref, "worker_run.role_ref");
  if (stored) { validateWorkspace(value.workspace); validateWorkspaceBinding(value.workspace_binding); }
  else { string(value.workspace_cwd, "worker_run.workspace_cwd", 4096); oneOf(value.workspace_binding, ["fixed", "executor-isolated"], "worker_run.workspace_binding"); }
  oneOf(value.write_mode, ["none", "direct", "isolated-alternative"], "worker_run.write_mode");
  if (value.operation_digest !== null && !SHA256_RE.test(value.operation_digest)) fail("INVALID_SCHEMA", "worker_run.operation_digest is invalid");
  validateVerification(value.execution_verification);
  validateLineage(value.lineage);
  if (value.placement_reservation !== null) validatePlacementReservation(value.placement_reservation);
  oneOf(value.state, ["planned", "admitted", "dispatched", "running", "unknown", "completed", "failed", "cancelled"], "worker_run.state");
  validateHandle(value.executor_handle, value.executor, value.workflow_id, true);
  validateWorkflowCapabilityContract(value);
  const delayed = stored ? value.workspace_binding.mode === "executor-isolated" : value.workspace_binding === "executor-isolated";
  if (delayed && (value.executor.adapter_id !== "codex-sidecar" || value.workflow_id !== "work" || value.write_mode === "none")) fail("INVALID_SCHEMA", "executor-isolated binding is only valid for codex-sidecar work writers");
  if (stored && delayed) {
    if (value.workspace_binding.base_sha !== value.workspace.head_at_record) fail("INVALID_SCHEMA", "executor-isolated base differs from source workspace");
    const execution = value.workspace_binding.execution_workspace;
    if (execution !== null && (execution.common_dir_realpath !== value.workspace.common_dir_realpath || execution.worktree_root_realpath === value.workspace.worktree_root_realpath)) fail("INVALID_SCHEMA", "executor workspace is not isolated from its source");
  }
  if (value.executor_observation !== null) validateObservation(value.executor_observation);
  if (value.admission !== null) validateAdmission(value.admission);
  if (value.cancel_request !== null) validateCancelRequest(value.cancel_request, value.executor, value.workflow_id);
  evidenceArray(value.dispatch_evidence, "worker_run.dispatch_evidence");
  evidenceArray(value.dispatch_attempt_evidence, "worker_run.dispatch_attempt_evidence");
  evidenceArray(value.terminal_evidence, "worker_run.terminal_evidence");
  if (!stored && (value.state !== "planned" || value.executor_observation !== null || value.admission !== null || value.cancel_request !== null || value.dispatch_evidence.length || value.dispatch_attempt_evidence.length || value.terminal_evidence.length || value.result !== null || value.acceptance !== null)) fail("INVALID_SCHEMA", "new worker must be pristine planned state");
  if (stored) {
    if (value.cancel_request !== null) {
      if (value.state === "planned") fail("INVALID_SCHEMA", "planned worker cannot have an external cancel request");
      if (canonicalJson(value.cancel_request.executor_handle) !== canonicalJson(value.executor_handle)) fail("INVALID_SCHEMA", "cancel request handle differs from worker handle");
    }
    if (value.recorded_workspace_fingerprint !== null) validateFingerprint(value.recorded_workspace_fingerprint);
    if ((value.workspace.kind === "worktree") !== (value.recorded_workspace_fingerprint !== null)) fail("INVALID_SCHEMA", "recorded workspace fingerprint differs from workspace kind");
    if (value.recorded_workspace_fingerprint !== null && value.recorded_workspace_fingerprint.head !== value.workspace.head_at_record) fail("INVALID_SCHEMA", "recorded workspace fingerprint HEAD differs from workspace snapshot");
    if (value.baseline_workspace_fingerprint !== null) validateFingerprint(value.baseline_workspace_fingerprint);
    if (value.baseline_workspace_fingerprint !== null && value.baseline_workspace_fingerprint.head !== value.workspace.head_at_reservation) fail("INVALID_SCHEMA", "writer baseline HEAD differs from reservation snapshot");
    if (value.write_mode === "none" && value.baseline_workspace_fingerprint !== null) fail("INVALID_SCHEMA", "read run cannot have baseline fingerprint");
    if (value.write_mode !== "none" && RESERVED_WRITER.has(value.state) && value.baseline_workspace_fingerprint === null && !delayed) fail("INVALID_SCHEMA", "admitted writer requires baseline fingerprint");
    if (value.result !== null) validateResult(value.result, value.write_mode !== "none");
    if (value.acceptance !== null) validateAcceptance(value.acceptance, value.executor, value.workflow_id);
    const dispatched = value.dispatch_evidence.length > 0;
    const attempted = value.dispatch_attempt_evidence.length > 0;
    const terminal = value.terminal_evidence.length > 0;
    const admitted = value.admission !== null;
    const observed = value.executor_observation !== null;
    if (admitted && value.admission.write_reservation !== (value.write_mode !== "none")) fail("INVALID_SCHEMA", "admission contradicts write mode");
    if (value.write_mode !== "none" && admitted && value.baseline_workspace_fingerprint === null && !delayed) fail("INVALID_SCHEMA", "admitted writer requires baseline fingerprint");
    if (delayed && value.state === "completed" && value.workspace_binding.execution_workspace === null) fail("INVALID_SCHEMA", "completed executor-isolated writer must bind its execution workspace");
    if (value.state === "planned" && (admitted || observed || dispatched || attempted || terminal || value.result !== null || value.acceptance !== null)) fail("INVALID_SCHEMA", "planned worker truth table is invalid");
    if (value.state === "admitted" && (!admitted || observed || dispatched || attempted || terminal || value.result !== null || value.acceptance !== null)) fail("INVALID_SCHEMA", "admitted worker truth table is invalid");
    if (["dispatched", "running", "unknown"].includes(value.state) && (!admitted || !observed || !dispatched || attempted || terminal || value.executor_handle === null || value.result !== null || value.acceptance !== null)) fail("INVALID_SCHEMA", "active worker truth table is invalid");
    if (value.state === "completed" && (!admitted || !observed || !dispatched || attempted || terminal || value.executor_handle === null || value.result === null)) fail("INVALID_SCHEMA", "completed worker truth table is invalid");
    if (value.state === "failed" && (!admitted || !observed || !dispatched || attempted || !terminal || value.result !== null || value.acceptance !== null)) fail("INVALID_SCHEMA", "failed worker truth table is invalid");
    if (value.state === "cancelled") {
      const validPlanned = !admitted && observed && !dispatched && !attempted && !terminal;
      const validAdmitted = admitted && observed && !dispatched && attempted && !terminal && value.cancel_request === null;
      const validRequestedBeforeDispatch = admitted && observed && !dispatched && !attempted && terminal && value.cancel_request !== null;
      const validDispatched = admitted && observed && dispatched && !attempted && terminal;
      if ((!validPlanned && !validAdmitted && !validRequestedBeforeDispatch && !validDispatched) || value.result !== null || value.acceptance !== null) fail("INVALID_SCHEMA", "cancelled worker truth table is invalid");
    }
    if (value.state !== "completed" && value.acceptance !== null) fail("INVALID_SCHEMA", "only completed worker can have acceptance");
  }
}

function validateConsultation(value) {
  exact(value, ["consultation_id", "task_id", "assignment_id", "connector", "slug", "model", "effort", "budget_reservation", "state", "executor_observation", "decision_ref", "terminal_evidence"], "consultation");
  identifier(value.consultation_id, "consultation.consultation_id"); identifier(value.task_id, "consultation.task_id"); identifier(value.assignment_id, "consultation.assignment_id");
  if (value.connector !== "gpt-connector") fail("INVALID_SCHEMA", "consultation connector is invalid");
  string(value.slug, "consultation.slug"); string(value.model, "consultation.model"); string(value.effort, "consultation.effort");
  validateBudgetReservation(value.budget_reservation, "consultation.budget_reservation");
  oneOf(value.state, ["planned", "dispatched", "running", "unknown", "completed", "failed"], "consultation.state");
  if (value.executor_observation !== null) validateObservation(value.executor_observation);
  if (value.decision_ref !== null) repoPath(value.decision_ref, "consultation.decision_ref");
  evidenceArray(value.terminal_evidence, "consultation.terminal_evidence");
  const observed = value.executor_observation !== null; const terminal = value.terminal_evidence.length > 0;
  if (value.state === "planned" && (observed || value.decision_ref !== null || terminal)) fail("INVALID_SCHEMA", "planned consultation truth table is invalid");
  if (["dispatched", "running", "unknown"].includes(value.state) && (!observed || value.decision_ref !== null || terminal)) fail("INVALID_SCHEMA", "active consultation truth table is invalid");
  if (value.state === "completed" && (!observed || value.decision_ref === null || terminal)) fail("INVALID_SCHEMA", "completed consultation truth table is invalid");
  if (value.state === "failed" && (!observed || value.decision_ref !== null || !terminal)) fail("INVALID_SCHEMA", "failed consultation truth table is invalid");
}

function validateFinalization(value) {
  exact(value, ["task_id", "finalization_ref", "recorded_by", "recorded_at"], "task_finalization");
  identifier(value.task_id, "task_finalization.task_id"); repoPath(value.finalization_ref, "task_finalization.finalization_ref");
  string(value.recorded_by, "task_finalization.recorded_by"); timestamp(value.recorded_at, "task_finalization.recorded_at");
}

function validateTaskCancellation(value) {
  exact(value, ["task_id", "cancelled_from_revision", "decision", "cancelled_by", "cancelled_at"], "task_cancellation");
  identifier(value.task_id, "task_cancellation.task_id"); integer(value.cancelled_from_revision, "task_cancellation.cancelled_from_revision");
  validateEvidence(value.decision, "task_cancellation.decision");
  if (value.decision.type !== "decision") fail("INVALID_SCHEMA", "task cancellation requires decision evidence");
  string(value.cancelled_by, "task_cancellation.cancelled_by"); timestamp(value.cancelled_at, "task_cancellation.cancelled_at");
  if (Date.parse(value.decision.observed_at) > Date.parse(value.cancelled_at)) fail("INVALID_SCHEMA", "task cancellation decision is newer than record");
}

function validateCancelRequest(value, executor, workflowId) {
  exact(value, ["requested_from_revision", "decision", "executor_handle", "requested_by", "requested_at"], "cancel_request");
  integer(value.requested_from_revision, "cancel_request.requested_from_revision");
  validateEvidence(value.decision, "cancel_request.decision");
  if (value.decision.type !== "decision") fail("INVALID_SCHEMA", "cancel request requires decision evidence");
  validateHandle(value.executor_handle, executor, workflowId, false);
  string(value.requested_by, "cancel_request.requested_by"); timestamp(value.requested_at, "cancel_request.requested_at");
  if (Date.parse(value.decision.observed_at) > Date.parse(value.requested_at)) fail("INVALID_SCHEMA", "cancel request decision is newer than request");
}

function validateCampaignMember(value, name) {
  exact(value, ["kind", "id"], name);
  oneOf(value.kind, ["worker-run", "consultation"], `${name}.kind`);
  identifier(value.id, `${name}.id`);
}

function validateCampaignRelease(value, auditRequired) {
  exact(value, ["released_from_revision", "audit_evidence", "decision", "released_by", "released_at"], "campaign.release");
  integer(value.released_from_revision, "campaign.release.released_from_revision");
  evidenceArray(value.audit_evidence, "campaign.release.audit_evidence", auditRequired ? 1 : 0);
  if (!auditRequired && value.audit_evidence.length !== 0) fail("INVALID_SCHEMA", "campaign without audit requirement cannot store audit evidence");
  validateEvidence(value.decision, "campaign.release.decision");
  if (value.decision.type !== "decision") fail("INVALID_SCHEMA", "campaign release requires decision evidence");
  string(value.released_by, "campaign.release.released_by"); timestamp(value.released_at, "campaign.release.released_at");
  if ([value.decision, ...value.audit_evidence].some((entry) => Date.parse(entry.observed_at) > Date.parse(value.released_at))) fail("INVALID_SCHEMA", "campaign release evidence is newer than release");
}

function validateCampaign(value) {
  exact(value, ["campaign_id", "campaign_type", "members", "gated_task_ids", "audit_required", "declared_from_revision", "declared_by", "declared_at", "release"], "campaign");
  identifier(value.campaign_id, "campaign.campaign_id");
  oneOf(value.campaign_type, ["discovery", "refutation", "design", "implementation", "final-audit"], "campaign.campaign_type");
  boundedArray(value.members, "campaign.members", validateCampaignMember, { min: 1 });
  if (new Set(value.members.map((entry) => `${entry.kind}\0${entry.id}`)).size !== value.members.length) fail("INVALID_SCHEMA", "campaign members contain duplicates");
  uniqueStringArray(value.gated_task_ids, "campaign.gated_task_ids", identifier, { min: 1 });
  if (typeof value.audit_required !== "boolean") fail("INVALID_SCHEMA", "campaign.audit_required must be boolean");
  integer(value.declared_from_revision, "campaign.declared_from_revision");
  string(value.declared_by, "campaign.declared_by"); timestamp(value.declared_at, "campaign.declared_at");
  if (value.release !== null) validateCampaignRelease(value.release, value.audit_required);
}

function campaignMemberState(manifest, member) {
  const collection = member.kind === "worker-run" ? manifest.worker_runs : manifest.consultations;
  const idKey = member.kind === "worker-run" ? "worker_run_id" : "consultation_id";
  return collection.find((entry) => entry[idKey] === member.id)?.state ?? null;
}

function campaignAllTerminal(manifest, campaign) {
  return campaign.members.every((member) => {
    const state = campaignMemberState(manifest, member);
    return member.kind === "worker-run" ? WORKER_TERMINAL.has(state) : CONSULT_TERMINAL.has(state);
  });
}

function validateControlFinalization(value) {
  exact(value, ["objective_ref", "acceptance_matrix_ref", "final_audit_evidence", "regression_evidence", "knowledge_return_refs", "parent_decision", "finalized_from_revision", "finalized_by", "finalized_at"], "control_finalization");
  repoPath(value.objective_ref, "control_finalization.objective_ref");
  repoPath(value.acceptance_matrix_ref, "control_finalization.acceptance_matrix_ref");
  evidenceArray(value.final_audit_evidence, "control_finalization.final_audit_evidence", 1);
  evidenceArray(value.regression_evidence, "control_finalization.regression_evidence", 1);
  refs(value.knowledge_return_refs, "control_finalization.knowledge_return_refs", 1);
  validateEvidence(value.parent_decision, "control_finalization.parent_decision");
  if (value.parent_decision.type !== "decision") fail("INVALID_SCHEMA", "control finalization parent decision must be decision evidence");
  integer(value.finalized_from_revision, "control_finalization.finalized_from_revision");
  string(value.finalized_by, "control_finalization.finalized_by");
  timestamp(value.finalized_at, "control_finalization.finalized_at");
}

const TRANSITION_OPERATIONS = [
  "control-init", "task-record", "task-cancel-record", "registry-observation-record", "placement-reserve", "worker-run-record", "consultation-record", "worker-admit", "worker-cancel-request",
  "worker-workspace-bind", "worker-observe", "worker-report-import", "consultation-observe", "campaign-record", "campaign-release", "worker-accept", "worker-reject", "task-finalize", "control-finalize", "control-archive",
];

function receiptDigest(value) {
  const payload = structuredClone(value);
  delete payload.receipt_digest;
  return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function validateTransitionReceipt(value, name) {
  exact(value, ["revision", "actor_id", "operation", "subject", "subject_digest", "previous_state", "next_state", "evidence", "recorded_at", "previous_receipt_digest", "receipt_digest"], name);
  integer(value.revision, `${name}.revision`); string(value.actor_id, `${name}.actor_id`);
  oneOf(value.operation, TRANSITION_OPERATIONS, `${name}.operation`);
  exact(value.subject, ["kind", "id"], `${name}.subject`);
  oneOf(value.subject.kind, ["control", "task", "registry-observation", "worker-run", "consultation", "campaign", "task-finalization"], `${name}.subject.kind`);
  identifier(value.subject.id, `${name}.subject.id`);
  if (value.subject_digest !== null && !SHA256_RE.test(value.subject_digest)) fail("INVALID_SCHEMA", `${name}.subject_digest is invalid`);
  if (value.previous_state !== null) string(value.previous_state, `${name}.previous_state`);
  string(value.next_state, `${name}.next_state`);
  evidenceArray(value.evidence, `${name}.evidence`);
  timestamp(value.recorded_at, `${name}.recorded_at`);
  if (value.previous_receipt_digest !== null && !SHA256_RE.test(value.previous_receipt_digest)) fail("INVALID_SCHEMA", `${name}.previous_receipt_digest is invalid`);
  if (!SHA256_RE.test(value.receipt_digest) || value.receipt_digest !== receiptDigest(value)) fail("INVALID_SCHEMA", `${name}.receipt_digest is invalid`);
}

export function validateManifest(value) {
  exact(value, ["schema_version", "record_revision", "control_id", "status", "declaration", "continuation", "durability", "budget", "role_effect_policy", "document_refs", "registry_observations", "tasks", "task_cancellations", "worker_runs", "consultations", "campaigns", "task_finalizations", "control_finalization", "transition_receipts", "last_update"], "manifest");
  if (value.schema_version !== MANIFEST_SCHEMA) fail("INVALID_SCHEMA", "unsupported manifest schema");
  integer(value.record_revision, "manifest.record_revision"); identifier(value.control_id, "manifest.control_id"); oneOf(value.status, ["active", "archived"], "manifest.status");
  validateDeclaration(value.declaration); validateContinuation(value.continuation, value.control_id); validateDurability(value.durability); validateBudget(value.budget); validateRoleEffectPolicy(value.role_effect_policy); refs(value.document_refs, "manifest.document_refs");
  boundedArray(value.registry_observations, "manifest.registry_observations", validateRegistryObservation);
  boundedArray(value.tasks, "manifest.tasks", (entry) => validateTask(entry, true));
  boundedArray(value.task_cancellations, "manifest.task_cancellations", validateTaskCancellation);
  boundedArray(value.worker_runs, "manifest.worker_runs", (entry) => validateWorker(entry, true));
  boundedArray(value.consultations, "manifest.consultations", validateConsultation);
  boundedArray(value.campaigns, "manifest.campaigns", validateCampaign);
  boundedArray(value.task_finalizations, "manifest.task_finalizations", validateFinalization);
  if (value.control_finalization !== null) validateControlFinalization(value.control_finalization);
  boundedArray(value.transition_receipts, "manifest.transition_receipts", validateTransitionReceipt, { min: 1 });
  exact(value.last_update, ["actor_id", "updated_at"], "last_update"); string(value.last_update.actor_id, "last_update.actor_id"); timestamp(value.last_update.updated_at, "last_update.updated_at");
  if (value.transition_receipts.length !== value.record_revision + 1) fail("INVALID_SCHEMA", "transition receipt count differs from record revision");
  for (let index = 0; index < value.transition_receipts.length; index++) {
    const receipt = value.transition_receipts[index];
    if (receipt.revision !== index) fail("INVALID_SCHEMA", "transition receipt revision is not contiguous");
    const expectedPrevious = index === 0 ? null : value.transition_receipts[index - 1].receipt_digest;
    if (receipt.previous_receipt_digest !== expectedPrevious) fail("INVALID_SCHEMA", "transition receipt chain is invalid");
    if (["placement-reserve", "worker-workspace-bind"].includes(receipt.operation) !== (receipt.subject_digest !== null)) fail("INVALID_SCHEMA", "transition subject digest is invalid for operation");
  }
  const firstReceipt = value.transition_receipts[0];
  if (firstReceipt.operation !== "control-init" || firstReceipt.subject.kind !== "control" || firstReceipt.subject.id !== value.control_id || firstReceipt.previous_state !== null || firstReceipt.next_state !== "active") fail("INVALID_SCHEMA", "initial transition receipt is invalid");
  const lastReceipt = value.transition_receipts.at(-1);
  if (lastReceipt.actor_id !== value.last_update.actor_id || lastReceipt.recorded_at !== value.last_update.updated_at) fail("INVALID_SCHEMA", "last update differs from transition receipt");
  if ((value.status === "archived") !== (lastReceipt.operation === "control-archive" && lastReceipt.previous_state === "finalized" && lastReceipt.next_state === "archived")) fail("INVALID_SCHEMA", "control status differs from transition receipt");
  const controlFinalizeReceipts = value.transition_receipts.filter((receipt) => receipt.operation === "control-finalize");
  if ((value.control_finalization === null) !== (controlFinalizeReceipts.length === 0) || controlFinalizeReceipts.length > 1) fail("INVALID_SCHEMA", "control finalization differs from transition receipts");
  if (value.control_finalization !== null) {
    if (value.control_finalization.objective_ref !== value.declaration.objective_ref) fail("INVALID_SCHEMA", "control finalization objective differs from declaration");
    const receipt = controlFinalizeReceipts[0];
    if (receipt.subject.kind !== "control" || receipt.subject.id !== value.control_id || receipt.previous_state !== "active" || receipt.next_state !== "finalized") fail("INVALID_SCHEMA", "control finalization receipt is invalid");
    const expectedRevision = value.control_finalization.finalized_from_revision + 1;
    if (receipt.revision !== expectedRevision) fail("INVALID_SCHEMA", "control finalization revision is invalid");
    const expectedFinalReceiptIndex = value.status === "archived" ? value.transition_receipts.length - 2 : value.transition_receipts.length - 1;
    if (value.transition_receipts[expectedFinalReceiptIndex]?.operation !== "control-finalize") fail("INVALID_SCHEMA", "control finalization is not terminal before archive");
  }
  const unique = (items, key) => { const seen = new Set(); for (const item of items) { if (seen.has(item[key])) fail("INVALID_SCHEMA", `duplicate ${key}`); seen.add(item[key]); } };
  unique(value.registry_observations, "registry_observation_id"); unique(value.tasks, "task_id"); unique(value.task_cancellations, "task_id"); unique(value.worker_runs, "worker_run_id"); unique(value.consultations, "consultation_id"); unique(value.campaigns, "campaign_id"); unique(value.task_finalizations, "task_id");
  const registries = new Map(value.registry_observations.map((entry) => [entry.registry_observation_id, entry]));
  for (const cancellation of value.task_cancellations) {
    if (!value.tasks.some((task) => task.task_id === cancellation.task_id)) fail("INVALID_SCHEMA", "task cancellation references unknown task");
    const receipts = value.transition_receipts.filter((receipt) => receipt.operation === "task-cancel-record" && receipt.subject.kind === "task" && receipt.subject.id === cancellation.task_id);
    if (receipts.length !== 1) fail("INVALID_SCHEMA", "task cancellation receipt is missing or duplicated");
    const receipt = receipts[0];
    if (receipt.revision !== cancellation.cancelled_from_revision + 1 || receipt.actor_id !== cancellation.cancelled_by || receipt.previous_state !== "active" || receipt.next_state !== "cancelled" || Date.parse(receipt.recorded_at) < Date.parse(cancellation.cancelled_at) || canonicalJson(receipt.evidence) !== canonicalJson([cancellation.decision])) fail("INVALID_SCHEMA", "task cancellation receipt is invalid");
  }
  if (value.transition_receipts.filter((receipt) => receipt.operation === "task-cancel-record").length !== value.task_cancellations.length) fail("INVALID_SCHEMA", "task cancellation receipts differ from records");
  for (const campaign of value.campaigns) {
    const recordReceipts = value.transition_receipts.filter((receipt) => receipt.operation === "campaign-record" && receipt.subject.kind === "campaign" && receipt.subject.id === campaign.campaign_id);
    if (recordReceipts.length !== 1) fail("INVALID_SCHEMA", "campaign record receipt is missing or duplicated");
    const recorded = recordReceipts[0];
    if (recorded.revision !== campaign.declared_from_revision + 1 || recorded.actor_id !== campaign.declared_by || recorded.previous_state !== null || recorded.next_state !== "declared" || recorded.evidence.length !== 0 || Date.parse(recorded.recorded_at) < Date.parse(campaign.declared_at)) fail("INVALID_SCHEMA", "campaign record receipt is invalid");
    const releaseReceipts = value.transition_receipts.filter((receipt) => receipt.operation === "campaign-release" && receipt.subject.kind === "campaign" && receipt.subject.id === campaign.campaign_id);
    if (campaign.release === null) {
      if (releaseReceipts.length !== 0) fail("INVALID_SCHEMA", "campaign release receipt exists without release");
    } else {
      if (releaseReceipts.length !== 1) fail("INVALID_SCHEMA", "campaign release receipt is missing or duplicated");
      const released = releaseReceipts[0];
      if (released.revision !== campaign.release.released_from_revision + 1 || released.actor_id !== campaign.release.released_by || released.previous_state !== "declared" || released.next_state !== "released" || canonicalJson(released.evidence) !== canonicalJson([campaign.release.decision, ...campaign.release.audit_evidence]) || Date.parse(released.recorded_at) < Date.parse(campaign.release.released_at)) fail("INVALID_SCHEMA", "campaign release receipt is invalid");
    }
  }
  if (value.transition_receipts.filter((receipt) => receipt.operation === "campaign-record").length !== value.campaigns.length) fail("INVALID_SCHEMA", "campaign record receipts differ from campaigns");
  if (value.transition_receipts.filter((receipt) => receipt.operation === "campaign-release").length !== value.campaigns.filter((campaign) => campaign.release !== null).length) fail("INVALID_SCHEMA", "campaign release receipts differ from campaigns");
  for (const run of value.worker_runs) {
    const creationReceipts = value.transition_receipts.filter((receipt) => receipt.subject.kind === "worker-run" && receipt.subject.id === run.worker_run_id && ["worker-run-record", "placement-reserve"].includes(receipt.operation));
    if (creationReceipts.length !== 1) fail("INVALID_SCHEMA", "worker creation receipt is missing or duplicated");
    const receipt = creationReceipts[0];
    if (run.placement_reservation === null) {
      if (receipt.operation !== "worker-run-record" || receipt.subject_digest !== null) fail("INVALID_SCHEMA", "manual worker creation receipt is invalid");
    } else {
      if (receipt.operation !== "placement-reserve" || receipt.revision !== run.placement_reservation.selected_from_revision + 1 || receipt.actor_id !== run.placement_reservation.selected_by || Date.parse(receipt.recorded_at) < Date.parse(run.placement_reservation.selected_at)) fail("INVALID_SCHEMA", "placement reservation receipt is invalid");
      const registry = registries.get(run.placement_reservation.registry_observation_id);
      if (registry === undefined) fail("INVALID_SCHEMA", "placement reservation registry snapshot is missing");
      if (!sameRegistryScope(run, registry)
        || canonicalJson(run.workflow_capabilities) !== canonicalJson(registry.workflow_capabilities)
        || canonicalJson(run.execution_verification) !== canonicalJson(registry.verification)) {
        fail("INVALID_SCHEMA", "placement reservation differs from registry snapshot");
      }
      if (run.placement_reservation.candidate_digest !== placementCandidateDigest(materializedPlacementCandidate(run, run.placement_reservation.registry_observation_id))) fail("INVALID_SCHEMA", "placement reservation candidate digest is invalid");
      if (receipt.subject_digest !== placementReservationDigest(run.placement_reservation)) fail("INVALID_SCHEMA", "placement reservation content differs from creation receipt");
    }
    const cancelReceipts = value.transition_receipts.filter((entry) => entry.operation === "worker-cancel-request" && entry.subject.kind === "worker-run" && entry.subject.id === run.worker_run_id);
    if (run.cancel_request === null) {
      if (cancelReceipts.length !== 0) fail("INVALID_SCHEMA", "worker cancel request receipt exists without request");
    } else {
      if (cancelReceipts.length !== 1) fail("INVALID_SCHEMA", "worker cancel request receipt is missing or duplicated");
      const cancelReceipt = cancelReceipts[0];
      if (cancelReceipt.revision !== run.cancel_request.requested_from_revision + 1 || cancelReceipt.actor_id !== run.cancel_request.requested_by || cancelReceipt.previous_state !== cancelReceipt.next_state || !["admitted", "dispatched", "running", "unknown"].includes(cancelReceipt.previous_state) || Date.parse(cancelReceipt.recorded_at) < Date.parse(run.cancel_request.requested_at) || canonicalJson(cancelReceipt.evidence) !== canonicalJson([run.cancel_request.decision])) fail("INVALID_SCHEMA", "worker cancel request receipt is invalid");
    }
    const bindReceipts = value.transition_receipts.filter((entry) => entry.operation === "worker-workspace-bind" && entry.subject.kind === "worker-run" && entry.subject.id === run.worker_run_id);
    if (run.workspace_binding.mode === "fixed" || run.workspace_binding.execution_workspace === null) {
      if (bindReceipts.length !== 0) fail("INVALID_SCHEMA", "workspace bind receipt exists without binding");
    } else {
      if (bindReceipts.length !== 1) fail("INVALID_SCHEMA", "workspace bind receipt is missing or duplicated");
      const bindReceipt = bindReceipts[0];
      if (bindReceipt.revision !== run.workspace_binding.bound_from_revision + 1 || bindReceipt.actor_id !== run.workspace_binding.bound_by || bindReceipt.previous_state !== bindReceipt.next_state || !["dispatched", "running", "unknown"].includes(bindReceipt.previous_state) || Date.parse(bindReceipt.recorded_at) < Date.parse(run.workspace_binding.bound_at) || canonicalJson(bindReceipt.evidence) !== canonicalJson(run.workspace_binding.binding_evidence) || bindReceipt.subject_digest !== sidecarProviderBindingDigest(run.workspace_binding.provider_binding)) fail("INVALID_SCHEMA", "workspace bind receipt is invalid");
    }
  }
  if (value.transition_receipts.filter((receipt) => receipt.operation === "worker-cancel-request").length !== value.worker_runs.filter((run) => run.cancel_request !== null).length) fail("INVALID_SCHEMA", "worker cancel request receipts differ from records");
  if (value.transition_receipts.filter((receipt) => receipt.operation === "worker-workspace-bind").length !== value.worker_runs.filter((run) => run.workspace_binding.mode === "executor-isolated" && run.workspace_binding.execution_workspace !== null).length) fail("INVALID_SCHEMA", "workspace bind receipts differ from records");
  assertBudgetWithin(value, null, null, { allowUnknown: true });
  const tasks = new Map(value.tasks.map((task) => [task.task_id, task]));
  for (const task of value.tasks) enforceRoleEffectPolicy(task, value.role_effect_policy);
  for (const task of value.tasks) {
    for (const dependency of task.depends_on) if (!tasks.has(dependency) || dependency === task.task_id) fail("INVALID_SCHEMA", "task dependency is invalid");
  }
  const visiting = new Set(); const visited = new Set();
  const visitTask = (taskId) => {
    if (visiting.has(taskId)) fail("INVALID_SCHEMA", "task dependency cycle detected");
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    for (const dependency of tasks.get(taskId).depends_on) visitTask(dependency);
    visiting.delete(taskId); visited.add(taskId);
  };
  for (const taskId of tasks.keys()) visitTask(taskId);
  for (const run of value.worker_runs) {
    const task = tasks.get(run.task_id); if (!task) fail("INVALID_SCHEMA", "worker references unknown task");
    if (run.role_ref !== task.role) fail("INVALID_SCHEMA", "worker role differs from task snapshot");
    if ((task.effect === "write") !== (run.write_mode !== "none")) fail("INVALID_SCHEMA", "worker write mode contradicts task");
    if (JSON.stringify(run.lineage.context_policy) !== JSON.stringify(task.context_policy)) fail("INVALID_SCHEMA", "worker lineage context policy contradicts task");
    requireTaskCapabilities(run, task);
    if (run.workspace_binding.mode === "executor-isolated" && task.isolation !== "dedicated-worktree") fail("INVALID_SCHEMA", "executor-isolated worker contradicts task isolation");
  }
  const workers = new Map(value.worker_runs.map((run) => [run.worker_run_id, run]));
  for (const run of value.worker_runs) {
    if (run.lineage.parent_worker_run_id === null) {
      if (run.lineage.root_assignment_id !== run.assignment_id) fail("INVALID_SCHEMA", "root worker lineage is invalid");
    } else {
      const parent = workers.get(run.lineage.parent_worker_run_id);
      if (!parent || parent.worker_run_id === run.worker_run_id || run.lineage.root_assignment_id !== parent.lineage.root_assignment_id) fail("INVALID_SCHEMA", "child worker lineage is invalid");
    }
  }
  const lineageVisiting = new Set(); const lineageVisited = new Set();
  const visitWorker = (runId) => {
    if (lineageVisiting.has(runId)) fail("INVALID_SCHEMA", "worker lineage cycle detected");
    if (lineageVisited.has(runId)) return;
    lineageVisiting.add(runId);
    const parent = workers.get(runId).lineage.parent_worker_run_id; if (parent !== null) visitWorker(parent);
    lineageVisiting.delete(runId); lineageVisited.add(runId);
  };
  for (const runId of workers.keys()) visitWorker(runId);
  for (const consultation of value.consultations) if (!tasks.has(consultation.task_id)) fail("INVALID_SCHEMA", "consultation references invalid task");
  for (const campaign of value.campaigns) {
    for (const taskId of campaign.gated_task_ids) if (!tasks.has(taskId)) fail("INVALID_SCHEMA", "campaign references invalid gated task");
    for (const member of campaign.members) if (campaignMemberState(value, member) === null) fail("INVALID_SCHEMA", "campaign references invalid member");
    if (campaign.release !== null && !campaignAllTerminal(value, campaign)) fail("INVALID_SCHEMA", "released campaign has nonterminal members");
  }
  for (const finalization of value.task_finalizations) if (!tasks.has(finalization.task_id)) fail("INVALID_SCHEMA", "finalization references unknown task");
  return value;
}

function apiInput(value, required, optional = [], name = "input") {
  exactOptional(value, required, optional, name, "INVALID_INPUT");
  if (required.includes("cwd")) string(value.cwd, `${name}.cwd`, 4096);
  return value;
}

function safeEnv() {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) if (!key.startsWith("GIT_")) env[key] = value;
  return env;
}

async function runGit(cwd, args, { allowFailure = false, limit = GIT_OUTPUT_LIMIT } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("git", ["--no-optional-locks", "-C", cwd, ...args], { env: safeEnv(), stdio: ["ignore", "pipe", "pipe"] });
    const stdout = []; const stderr = []; let outSize = 0; let errSize = 0; let exceeded = false;
    child.stdout.on("data", (chunk) => { outSize += chunk.length; if (outSize <= limit + 1) stdout.push(chunk); if (outSize > limit) { exceeded = true; child.kill(); } });
    child.stderr.on("data", (chunk) => { errSize += chunk.length; if (errSize <= 64 * 1024) stderr.push(chunk); });
    child.on("error", (error) => rejectPromise(new ControlRecordError("GIT_FAILURE", "git could not be executed", { cause: error.code })));
    child.on("close", (code, signal) => {
      if (exceeded) return rejectPromise(new ControlRecordError("LIMIT_EXCEEDED", "git output exceeds limit"));
      const out = Buffer.concat(stdout);
      if (code !== 0 && !allowFailure) return rejectPromise(new ControlRecordError("GIT_FAILURE", "git command failed", { exit_code: code, signal, stderr: Buffer.concat(stderr).toString("utf8").slice(0, 4096) }));
      resolvePromise({ code, stdout: out, stderr: Buffer.concat(stderr) });
    });
  });
}

async function canonicalCwd(cwd) {
  if (typeof cwd !== "string" || cwd.length === 0 || cwd.length > 4096) fail("INVALID_INPUT", "cwd is required");
  let path;
  try { path = await realpath(resolve(cwd)); } catch (error) { fail("IO_FAILURE", "cwd cannot be resolved", { cause: error.code }); }
  let info;
  try { info = await stat(path); } catch (error) { fail("IO_FAILURE", "cwd cannot be inspected", { cause: error.code }); }
  if (!info.isDirectory()) fail("INVALID_INPUT", "cwd must be a directory");
  return path;
}

async function gitIdentity(cwd) {
  const rootCwd = await canonicalCwd(cwd);
  const inside = await runGit(rootCwd, ["rev-parse", "--is-inside-work-tree"], { allowFailure: true });
  const bareResult = await runGit(rootCwd, ["rev-parse", "--is-bare-repository"], { allowFailure: true });
  if (bareResult.code !== 0 || (inside.code !== 0 && bareResult.stdout.toString().trim() !== "true")) fail("NOT_GIT_REPOSITORY", "cwd is not a git repository");
  const bare = bareResult.stdout.toString().trim() === "true";
  try {
    const commonRaw = (await runGit(rootCwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"])).stdout.toString().trim();
    const gitRaw = (await runGit(rootCwd, ["rev-parse", "--path-format=absolute", "--absolute-git-dir"])).stdout.toString().trim();
    const common = await realpath(commonRaw); const gitDir = await realpath(gitRaw);
    const gitDirStat = await lstat(gitDir, { bigint: true });
    if (gitDirStat.isSymbolicLink() || !gitDirStat.isDirectory()) fail("STATE_PATH_UNSAFE", "git directory is not a safe directory");
    const gitDirFileId = `${gitDirStat.dev.toString(10)}:${gitDirStat.ino.toString(10)}`;
    if (bare) return { kind: "bare", cwd: rootCwd, projectRoot: null, worktreeRoot: null, commonDir: common, gitDir, gitDirFileId, head: null };
    const topRaw = (await runGit(rootCwd, ["rev-parse", "--show-toplevel"])).stdout.toString().trim();
    const top = await realpath(topRaw);
    const headResult = await runGit(top, ["rev-parse", "--verify", "HEAD"], { allowFailure: true });
    const head = headResult.code === 0 ? headResult.stdout.toString().trim() : null;
    if (head !== null && !SHA1_RE.test(head)) fail("GIT_FAILURE", "git returned an invalid HEAD");
    return { kind: "worktree", cwd: rootCwd, projectRoot: top, worktreeRoot: top, commonDir: common, gitDir, gitDirFileId, head };
  } catch (error) {
    if (error instanceof ControlRecordError) throw error;
    fail("GIT_FAILURE", "git identity resolution failed");
  }
}

function workspaceObject(identity, reservation = null) {
  return {
    kind: identity.kind,
    worktree_root_realpath: identity.worktreeRoot,
    git_dir_realpath: identity.gitDir,
    git_dir_file_id: identity.gitDirFileId,
    common_dir_realpath: identity.commonDir,
    head_at_record: identity.kind === "bare" ? null : identity.head,
    head_at_reservation: identity.kind === "bare" ? null : reservation,
  };
}

function workspaceBindingObject(mode, sourceWorkspace) {
  if (mode === "fixed") return { mode: "fixed" };
  return {
    mode: "executor-isolated", schema_version: "codex-sidecar.delayed-worktree.v1",
    base_sha: sourceWorkspace.head_at_record, preserve_worktree: true,
    execution_workspace: null, provider_binding: null, bound_from_revision: null, binding_evidence: [], bound_by: null, bound_at: null,
  };
}

function effectiveWorkspace(run) {
  return run.workspace_binding.mode === "executor-isolated" ? run.workspace_binding.execution_workspace : run.workspace;
}

function requiredExecutionWorkspace(run) {
  const workspace = effectiveWorkspace(run);
  if (workspace === null) fail("INVALID_TRANSITION", "executor execution workspace is not bound");
  return workspace;
}

function sameWorkspaceIdentity(stored, actual) {
  return stored.kind === actual.kind && stored.worktree_root_realpath === actual.worktreeRoot && stored.git_dir_realpath === actual.gitDir && stored.git_dir_file_id === actual.gitDirFileId && stored.common_dir_realpath === actual.commonDir;
}

function requireTaskIsolation(manifest, task, workspace, bindingMode = "fixed") {
  if (bindingMode === "executor-isolated") {
    if (task.isolation !== "dedicated-worktree") fail("INVALID_SCHEMA", "executor-isolated binding requires dedicated-worktree task isolation");
    return;
  }
  if (task.isolation === "dedicated-worktree" && (workspace.kind !== "worktree" || workspace.worktreeRoot === manifest.declaration.project_root_realpath)) {
    fail("WORKSPACE_DRIFT", "dedicated worktree is required");
  }
}

async function ensureDir(path, { create = false } = {}) {
  try {
    if (create) await mkdir(path, { mode: 0o700 });
    let info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink()) fail("STATE_PATH_UNSAFE", "state path is not a safe directory");
    if (create && process.platform !== "win32") { await chmod(path, 0o700); info = await lstat(path); }
    if (process.platform !== "win32" && (info.uid !== process.getuid() || (info.mode & 0o777) !== 0o700)) fail("STATE_PATH_UNSAFE", "state directory owner or mode is unsafe");
  } catch (error) {
    if (error instanceof ControlRecordError) throw error;
    if (create && error.code === "EEXIST") return ensureDir(path);
    fail("IO_FAILURE", "state directory operation failed", { cause: error.code });
  }
}

async function statePaths(identity, create = false) {
  if (process.platform === "win32") fail("PLATFORM_UNVERIFIED", "Windows Control state ACL contract is not verified");
  const root = join(identity.commonDir, "dotagents", "orchestrate");
  const controls = join(root, "controls"); const owners = join(root, "lock-owners");
  if (create) {
    await ensureDir(join(identity.commonDir, "dotagents"), { create: true });
    await ensureDir(root, { create: true }); await ensureDir(controls, { create: true }); await ensureDir(owners, { create: true });
  } else {
    await ensureDir(root); await ensureDir(controls); await ensureDir(owners);
  }
  return { root, controls, owners };
}

async function safeBoundedFile(path, limit, unsafeCode = "STATE_PATH_UNSAFE", { privateState = false } = {}) {
  let handle;
  try {
    handle = await open(path, FS.O_RDONLY | (FS.O_NOFOLLOW ?? 0));
    const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1) fail(unsafeCode, "path is not a safe regular file");
    if (privateState && process.platform !== "win32" && (before.uid !== process.getuid() || (before.mode & 0o777) !== 0o600)) fail(unsafeCode, "state file owner or mode is unsafe");
    if (before.size > limit) fail("LIMIT_EXCEEDED", "file exceeds limit");
    const buffer = Buffer.alloc(before.size + 1); let offset = 0;
    while (offset < buffer.length) { const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset); if (!bytesRead) break; offset += bytesRead; }
    if (offset > limit) fail("LIMIT_EXCEEDED", "file exceeds limit");
    const after = await handle.stat(); const pathInfo = await lstat(path);
    if (!after.isFile() || after.nlink !== 1 || pathInfo.isSymbolicLink() || !pathInfo.isFile() || pathInfo.nlink !== 1 || before.dev !== after.dev || before.ino !== after.ino || after.dev !== pathInfo.dev || after.ino !== pathInfo.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs) fail(unsafeCode, "file changed while reading");
    return { buffer: buffer.subarray(0, offset), stat: after };
  } catch (error) {
    if (error instanceof ControlRecordError) throw error;
    if (error.code === "ELOOP") fail(unsafeCode, "symlink is forbidden");
    fail("IO_FAILURE", "file read failed", { cause: error.code });
  } finally { await handle?.close().catch(() => {}); }
}

async function readManifest(path) {
  const { buffer } = await safeBoundedFile(path, MANIFEST_LIMIT, "STATE_PATH_UNSAFE", { privateState: true });
  let parsed; try { parsed = JSON.parse(decodeUtf8(buffer, "INVALID_SCHEMA", "manifest is not valid UTF-8")); } catch (error) { if (error instanceof ControlRecordError) throw error; fail("INVALID_SCHEMA", "manifest is not valid JSON"); }
  return validateManifest(parsed);
}

async function scanManifests(paths) {
  let entries;
  try { entries = await readdir(paths.controls); } catch (error) { fail("IO_FAILURE", "controls cannot be listed", { cause: error.code }); }
  if (entries.length > ARRAY_LIMIT) fail("LIMIT_EXCEEDED", "too many controls");
  const manifests = [];
  for (const entry of entries.sort()) {
    if (!ID_RE.test(entry) || entry === "." || entry === "..") fail("STATE_PATH_UNSAFE", "unknown controls entry");
    const dir = join(paths.controls, entry); await ensureDir(dir);
    const children = await readdir(dir);
    if (children.length !== 1 || children[0] !== "manifest.json") fail("STATE_PATH_UNSAFE", "control directory has unknown entries");
    const manifest = await readManifest(join(dir, "manifest.json"));
    if (manifest.control_id !== entry) fail("INVALID_SCHEMA", "control directory and manifest disagree");
    manifests.push(manifest);
  }
  validateGlobalManifests(manifests);
  return manifests;
}

function validateOwner(value) {
  exact(value, ["schema_version", "token", "pid", "acquired_at"], "lock owner", "LOCK_MALFORMED");
  if (value.schema_version !== OWNER_SCHEMA || typeof value.token !== "string" || !UUID_RE.test(value.token) || !Number.isSafeInteger(value.pid) || value.pid <= 0 || typeof value.acquired_at !== "string" || new Date(value.acquired_at).toISOString() !== value.acquired_at) fail("LOCK_MALFORMED", "lock owner is malformed");
  return value;
}

async function readOwner(path) {
  let data;
  try { data = await safeBoundedFile(path, OWNER_LIMIT, "STATE_PATH_UNSAFE", { privateState: true }); } catch (error) {
    if (error instanceof ControlRecordError && ["STATE_PATH_UNSAFE", "LIMIT_EXCEEDED"].includes(error.code)) throw error;
    throw error;
  }
  let parsed; try { parsed = JSON.parse(decodeUtf8(data.buffer, "LOCK_MALFORMED", "lock owner is not valid UTF-8")); } catch (error) { if (error instanceof ControlRecordError) throw error; fail("LOCK_MALFORMED", "lock owner is malformed"); }
  return { owner: validateOwner(parsed), stat: data.stat };
}

async function writeSynced(path, buffer, mode = 0o600) {
  let handle;
  try { handle = await open(path, FS.O_WRONLY | FS.O_CREAT | FS.O_EXCL, mode); await handle.writeFile(buffer); await handle.sync(); }
  catch (error) { if (error instanceof ControlRecordError) throw error; fail("IO_FAILURE", "synced write failed", { cause: error.code }); }
  finally { await handle?.close().catch(() => {}); }
}

async function syncDirectory(path) {
  if (process.platform === "win32") return "unsupported";
  let handle;
  try { handle = await open(path, FS.O_RDONLY); await handle.sync(); return "supported"; }
  finally { await handle?.close().catch(() => {}); }
}

async function safeUnlinkOwner(path, expectedOwner, expectedStat) {
  const current = await readOwner(path);
  if (current.stat.dev !== expectedStat.dev || current.stat.ino !== expectedStat.ino || current.stat.nlink !== 1 || JSON.stringify(current.owner) !== JSON.stringify(expectedOwner)) fail("LOCK_TOKEN_MISMATCH", "lock owner changed");
  try { await unlink(path); injectTestFault("owner-release-after-unlink"); await syncDirectory(dirname(path)); }
  catch (error) { if (error instanceof ControlRecordError) throw error; fail("LOCK_OUTCOME_UNKNOWN", "lock owner release outcome is unknown", { cause: error.code }); }
}

async function acquireLock(paths) {
  const token = randomUUID(); const owner = { schema_version: OWNER_SCHEMA, token, pid: process.pid, acquired_at: new Date().toISOString() };
  const pending = join(paths.owners, `.${token}.pending`); const published = join(paths.owners, `${token}.owner`);
  await writeSynced(pending, Buffer.from(`${JSON.stringify(owner)}\n`));
  let publishedRenamed = false;
  try { await rename(pending, published); publishedRenamed = true; injectTestFault("owner-publish-after-rename"); await syncDirectory(paths.owners); }
  catch (error) {
    await rm(pending, { force: true }).catch(() => {});
    if (publishedRenamed) {
      try { const observed = await readOwner(published); await safeUnlinkOwner(published, owner, observed.stat); } catch {}
    }
    if (error instanceof ControlRecordError) throw error;
    fail("IO_FAILURE", "lock publication failed", { cause: error.code });
  }
  const self = await readOwner(published);
  try {
    const entries = (await readdir(paths.owners)).filter((entry) => entry.endsWith(".owner"));
    const others = [];
    for (const entry of entries) {
      const found = await readOwner(join(paths.owners, entry));
      if (entry !== `${token}.owner`) others.push(found.owner);
    }
    if (others.length) fail("LOCK_CONTENDED", "mutation lock is contended", { owners: others.map(({ token: t, pid, acquired_at }) => ({ token: t, pid, acquired_at })) });
    return { token, owner, path: published, stat: self.stat };
  } catch (error) {
    await safeUnlinkOwner(published, owner, self.stat).catch(() => {});
    throw error;
  }
}

async function releaseLock(lock) { await safeUnlinkOwner(lock.path, lock.owner, lock.stat); }

async function withLock(identity, operation) {
  const paths = await statePaths(identity, true); const lock = await acquireLock(paths);
  let primary;
  try { return await operation(paths); }
  catch (error) { primary = error; throw error; }
  finally {
    try { await releaseLock(lock); }
    catch (error) { if (!primary) throw error; }
  }
}

async function atomicManifest(paths, manifest, { newControl = false } = {}) {
  validateManifest(manifest);
  const encoded = Buffer.from(`${JSON.stringify(manifest)}\n`);
  if (encoded.length > MANIFEST_LIMIT) fail("LIMIT_EXCEEDED", "manifest exceeds limit");
  const dir = join(paths.controls, manifest.control_id); const target = join(dir, "manifest.json");
  if (newControl) {
    await ensureDir(dir, { create: true });
    try { injectTestFault("new-control-before-parent-sync"); await syncDirectory(paths.controls); }
    catch (error) { await rm(dir, { recursive: true, force: true }).catch(() => {}); fail("IO_FAILURE", "new control directory commit failed", { cause: error.code }); }
  } else await ensureDir(dir);
  const temp = join(dir, `.manifest.${randomUUID()}.tmp`);
  let renamed = false;
  try {
    await writeSynced(temp, encoded); await rename(temp, target); renamed = true; injectTestFault("manifest-after-rename"); await syncDirectory(dir);
  } catch (error) {
    await rm(temp, { force: true }).catch(() => {});
    if (!renamed) {
      if (newControl) await rm(dir, { recursive: true, force: true }).catch(() => {});
      if (error instanceof ControlRecordError) throw error;
      fail("IO_FAILURE", "manifest commit failed", { cause: error.code });
    }
    let observed_match = false;
    try {
      const observed = await readManifest(target);
      observed_match = observed.record_revision === manifest.record_revision && createHash("sha256").update(JSON.stringify(observed)).digest("hex") === createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
    } catch {}
    fail("COMMIT_OUTCOME_UNKNOWN", "manifest commit outcome is unknown", { observed_match });
  }
}

function targetManifest(manifests, controlId) {
  const manifest = manifests.find((entry) => entry.control_id === controlId);
  if (!manifest) fail("CONTROL_NOT_FOUND", "control does not exist");
  return manifest;
}

function transitionReceipt({ revision, actorId, operation, subjectKind, subjectId, subjectDigest = null, previousState, nextState, evidence, recordedAt, previousReceiptDigest }) {
  const receipt = {
    revision, actor_id: actorId, operation, subject: { kind: subjectKind, id: subjectId },
    subject_digest: subjectDigest,
    previous_state: previousState, next_state: nextState, evidence: structuredClone(evidence),
    recorded_at: recordedAt, previous_receipt_digest: previousReceiptDigest, receipt_digest: "",
  };
  receipt.receipt_digest = receiptDigest(receipt);
  return receipt;
}

function requiredClosingReceipts(manifest) {
  let count = 0;
  for (const run of manifest.worker_runs) {
    if (WORKER_NONTERMINAL.has(run.state)) count += 1;
    else if (run.state === "completed" && run.acceptance === null) count += 1;
    if (WORKER_NONTERMINAL.has(run.state) && run.workspace_binding.mode === "executor-isolated" && run.workspace_binding.execution_workspace === null) count += 1;
  }
  for (const consultation of manifest.consultations) {
    if (consultation.state === "planned") count += 2;
    else if (CONSULT_NONTERMINAL.has(consultation.state)) count += 1;
  }
  count += manifest.campaigns.filter((campaign) => campaign.release === null).length;
  const finalizedTasks = new Set(manifest.task_finalizations.map((entry) => entry.task_id));
  count += manifest.tasks.filter((task) => !finalizedTasks.has(task.task_id)).length;
  if (manifest.control_finalization === null) count += 1;
  if (manifest.status !== "archived") count += 1;
  return count;
}

async function mutation(input, transition, mutate) {
  const identity = await gitIdentity(input.cwd);
  return withLock(identity, async (paths) => {
    const manifests = await scanManifests(paths); const manifest = targetManifest(manifests, input.control_id);
    requireOperationalManifest(manifest);
    assertBudgetWithin(manifest);
    if (manifest.status === "archived") fail("RECORD_ARCHIVED", "control is archived");
    if (manifest.record_revision !== input.expected_revision) fail("REVISION_CONFLICT", "record revision does not match");
    const next = structuredClone(manifest); await mutate(next, manifests, identity);
    const receiptInput = typeof transition === "function" ? transition(manifest, next) : transition;
    exactOptional(receiptInput, ["operation", "subjectKind", "subjectId", "previousState", "nextState", "evidence"], ["subjectDigest"], "transition", "INVALID_SCHEMA");
    if (manifest.control_finalization !== null && receiptInput.operation !== "control-archive") fail("CONTROL_FINALIZED", "control is finalized and only archive remains");
    const now = new Date().toISOString();
    next.record_revision += 1;
    next.transition_receipts.push(transitionReceipt({
      revision: next.record_revision, actorId: input.actor_id, recordedAt: now,
      previousReceiptDigest: manifest.transition_receipts.at(-1).receipt_digest, ...receiptInput,
    }));
    next.last_update = { actor_id: input.actor_id, updated_at: now };
    validateManifest(next);
    const closingReceipts = requiredClosingReceipts(next);
    if (next.transition_receipts.length + closingReceipts > ARRAY_LIMIT) fail("CONTROL_CAPACITY_RESERVED", "control must close before receipt capacity is exhausted", { closing_receipts: closingReceipts });
    validateGlobalManifests(manifests.map((entry) => entry.control_id === next.control_id ? next : entry));
    await atomicManifest(paths, next);
    return { manifest: next, revision: next.record_revision };
  });
}

function validateMutationBase(input, extraRequired, extraOptional = []) {
  apiInput(input, ["cwd", "control_id", "actor_id", "expected_revision", ...extraRequired], extraOptional);
  identifier(input.control_id, "input.control_id"); string(input.actor_id, "input.actor_id"); integer(input.expected_revision, "input.expected_revision");
}

async function ensureDocumentAvailable(identity, docRef) {
  repoPath(docRef, "doc_ref");
  if (identity.kind === "bare") {
    const result = await runGit(identity.cwd, ["rev-parse", `HEAD:${docRef}`], { allowFailure: true });
    const oid = result.stdout.toString().trim(); if (result.code !== 0 || !SHA1_RE.test(oid)) fail("IO_FAILURE", "task document is unavailable"); return;
  }
  await inspectScopePath(identity.worktreeRoot, { kind: "file", path: docRef });
  const result = await runGit(identity.worktreeRoot, ["hash-object", "--no-filters", "--", join(identity.worktreeRoot, ...docRef.split("/"))]);
  const oid = result.stdout.toString().trim(); if (!SHA1_RE.test(oid)) fail("GIT_FAILURE", "git returned invalid document oid");
}

async function inspectScopePath(root, entry) {
  if (root === null) return;
  const normalized = normalizeScope(entry); let current = root;
  for (const component of normalized.path.split("/")) {
    current = join(current, component);
    let info; try { info = await lstat(current); } catch (error) { if (error.code === "ENOENT") return; fail("IO_FAILURE", "scope path inspection failed", { cause: error.code }); }
    if (info.isSymbolicLink()) fail("STATE_PATH_UNSAFE", "scope contains a symlink");
  }
}

async function inspectTaskScopes(workspace, task) {
  if (workspace.kind === "bare") return;
  for (const entry of [...task.read_scope, ...task.write_scope]) await inspectScopePath(workspace.worktreeRoot, entry);
}

export async function init(input) {
  apiInput(input, ["cwd", "control_id", "objective_ref", "actor_id", "document_refs", "budget"], ["predecessor_control_id"]);
  identifier(input.control_id, "input.control_id"); repoPath(input.objective_ref, "input.objective_ref"); string(input.actor_id, "input.actor_id"); refs(input.document_refs, "input.document_refs");
  validateBudget(input.budget);
  const identity = await gitIdentity(input.cwd);
  return withLock(identity, async (paths) => {
    const manifests = await scanManifests(paths);
    if (manifests.some((entry) => entry.control_id === input.control_id)) fail("CONTROL_EXISTS", "control already exists");
    if (manifests.length >= ARRAY_LIMIT) fail("CONTROL_CAPACITY_REACHED", "control capacity is reached");
    let continuation = { predecessor_control_id: null, root_control_id: input.control_id, sequence: 0 };
    if (input.predecessor_control_id !== undefined) {
      identifier(input.predecessor_control_id, "input.predecessor_control_id");
      const predecessor = manifests.find((entry) => entry.control_id === input.predecessor_control_id);
      if (!predecessor || predecessor.status !== "archived") fail("CONTINUATION_NOT_READY", "predecessor control must exist and be archived");
      if (predecessor.declaration.objective_ref !== input.objective_ref) fail("CONTINUATION_NOT_READY", "successor objective must match predecessor");
      continuation = { predecessor_control_id: predecessor.control_id, root_control_id: predecessor.continuation.root_control_id, sequence: predecessor.continuation.sequence + 1 };
    }
    const initialFingerprint = identity.kind === "bare" ? null : await fingerprintWorkspace({ cwd: identity.worktreeRoot });
    if (initialFingerprint !== null && initialFingerprint.head !== identity.head) fail("WORKSPACE_DRIFT", "control workspace HEAD changed during initialization");
    const initialStatus = initialFingerprint === null
      ? { dirty: false, status_digest: null }
      : { dirty: initialFingerprint.files.length > 0, status_digest: initialFingerprint.status_digest };
    const now = new Date().toISOString();
    const initialReceipt = transitionReceipt({
      revision: 0, actorId: input.actor_id, operation: "control-init", subjectKind: "control", subjectId: input.control_id,
      previousState: null, nextState: "active", evidence: [], recordedAt: now, previousReceiptDigest: null,
    });
    const manifest = {
      schema_version: MANIFEST_SCHEMA, record_revision: 0, control_id: input.control_id, status: "active",
      declaration: {
        objective_ref: input.objective_ref, project_root_realpath: identity.projectRoot,
        common_dir_realpath: identity.commonDir, git_dir_realpath: identity.gitDir,
        git_dir_file_id: identity.gitDirFileId, base_sha: identity.kind === "bare" ? null : identity.head,
        initial_dirty: initialStatus.dirty, initial_status_digest: initialStatus.status_digest,
        initial_workspace_digest: initialFingerprint?.digest ?? null,
        created_at: now, created_by: input.actor_id,
      }, continuation, durability: structuredClone(DURABILITY_PROTOCOL),
      budget: structuredClone(input.budget), role_effect_policy: structuredClone(ROLE_EFFECT_POLICY), document_refs: [...input.document_refs], registry_observations: [], tasks: [], task_cancellations: [], worker_runs: [], consultations: [], campaigns: [], task_finalizations: [], control_finalization: null,
      transition_receipts: [initialReceipt], last_update: { actor_id: input.actor_id, updated_at: now },
    };
    await atomicManifest(paths, manifest, { newControl: true }); return { manifest, revision: 0 };
  });
}

export async function status(input) {
  apiInput(input, ["cwd", "control_id"]); identifier(input.control_id, "input.control_id");
  const identity = await gitIdentity(input.cwd); const paths = await statePaths(identity); const controlDir = join(paths.controls, input.control_id);
  await ensureDir(controlDir).catch((error) => { if (error instanceof ControlRecordError && error.code === "IO_FAILURE" && error.details?.cause === "ENOENT") fail("CONTROL_NOT_FOUND", "control does not exist"); throw error; });
  const manifest = await readManifest(join(controlDir, "manifest.json")).catch((error) => { if (error instanceof ControlRecordError && error.code === "IO_FAILURE") fail("CONTROL_NOT_FOUND", "control does not exist"); throw error; });
  if (manifest.control_id !== input.control_id) fail("INVALID_SCHEMA", "control id mismatch"); return manifest;
}

function registryUnknownFields(observation) {
  const fields = [];
  if (observation.enabled.value === "unknown") fields.push("enabled");
  for (const capability of observation.workflow_capabilities) if (capability.value === "unknown") fields.push(`capability:${capability.capability_id}`);
  if (observation.capacity.admission.value === "unknown") fields.push("capacity:admission");
  for (const field of ["hard_inflight_limit", "soft_inflight_limit", "observed_inflight"]) {
    if (observation.capacity[field].knowledge === "unknown") fields.push(`capacity:${field}`);
  }
  return fields.sort();
}

function briefManifest(manifest) {
  const finalizedTasks = new Set(manifest.task_finalizations.map((entry) => entry.task_id));
  const activeWorkers = manifest.worker_runs.filter((run) => WORKER_NONTERMINAL.has(run.state)).map((run) => ({
    worker_run_id: run.worker_run_id, task_id: run.task_id, state: run.state,
    executor: structuredClone(run.executor), workflow_id: run.workflow_id,
    executor_handle: structuredClone(run.executor_handle), executor_observation: structuredClone(run.executor_observation),
    cancel_request: structuredClone(run.cancel_request),
  }));
  const activeConsultations = manifest.consultations.filter((entry) => CONSULT_NONTERMINAL.has(entry.state)).map((entry) => ({
    consultation_id: entry.consultation_id, task_id: entry.task_id, state: entry.state,
    connector: entry.connector, slug: entry.slug, model: entry.model, effort: entry.effort,
    executor_observation: structuredClone(entry.executor_observation),
  }));
  const unknownRegistry = manifest.registry_observations.map((entry) => ({
    registry_observation_id: entry.registry_observation_id, fields: registryUnknownFields(entry),
  })).filter((entry) => entry.fields.length > 0);
  const workerUncollected = activeWorkers.filter((entry) => ["dispatched", "running", "unknown"].includes(entry.state)).map((entry) => entry.worker_run_id);
  const consultationUncollected = activeConsultations.filter((entry) => ["dispatched", "running", "unknown"].includes(entry.state)).map((entry) => entry.consultation_id);
  const campaigns = manifest.campaigns.map((campaign) => ({
    campaign_id: campaign.campaign_id, campaign_type: campaign.campaign_type,
    all_terminal: campaignAllTerminal(manifest, campaign), audit_required: campaign.audit_required,
    released: campaign.release !== null,
  }));
  return {
    schema_version: "dotagents.orchestration-status-brief.v3",
    control_id: manifest.control_id, manifest_schema_version: manifest.schema_version,
    record_revision: manifest.record_revision, status: manifest.status,
    objective_ref: manifest.declaration.objective_ref, last_update: structuredClone(manifest.last_update),
    counts: {
      tasks: manifest.tasks.length, registry_observations: manifest.registry_observations.length,
      task_cancellations: manifest.task_cancellations.length,
      worker_runs: manifest.worker_runs.length, consultations: manifest.consultations.length, campaigns: manifest.campaigns.length,
    },
    active: { worker_runs: activeWorkers, consultations: activeConsultations }, campaigns,
    cancellations: {
      task_ids: manifest.task_cancellations.map((entry) => entry.task_id).sort(),
      worker_run_ids: manifest.worker_runs.filter((run) => run.cancel_request !== null && WORKER_NONTERMINAL.has(run.state)).map((run) => run.worker_run_id).sort(),
    },
    unresolved: {
      task_ids: manifest.tasks.filter((task) => !finalizedTasks.has(task.task_id)).map((task) => task.task_id).sort(),
      worker_acceptance_ids: manifest.worker_runs.filter((run) => run.state === "completed" && run.acceptance === null).map((run) => run.worker_run_id).sort(),
      campaign_ids: campaigns.filter((campaign) => !campaign.released).map((campaign) => campaign.campaign_id).sort(),
      control_finalization_missing: manifest.control_finalization === null,
    },
    unknown: {
      worker_run_ids: manifest.worker_runs.filter((run) => run.state === "unknown").map((run) => run.worker_run_id).sort(),
      consultation_ids: manifest.consultations.filter((entry) => entry.state === "unknown").map((entry) => entry.consultation_id).sort(),
      registry_observations: unknownRegistry,
    },
    uncollected: { worker_run_ids: workerUncollected.sort(), consultation_ids: consultationUncollected.sort() },
  };
}

export async function statusBrief(input) {
  return briefManifest(await status(input));
}

function manifestEvidence(manifest) {
  const found = new Map();
  const visit = (value) => {
    if (Array.isArray(value)) { for (const entry of value) visit(entry); return; }
    if (!isObject(value)) return;
    const keys = Object.keys(value).sort();
    if (keys.length === 4 && keys.join("\0") === "digest\0observed_at\0ref\0type" && ["file", "command", "url", "executor-receipt", "decision"].includes(value.type)) {
      found.set(canonicalJson(value), structuredClone(value)); return;
    }
    for (const entry of Object.values(value)) visit(entry);
  };
  visit(manifest);
  return [...found.values()].sort((left, right) => left.type.localeCompare(right.type) || left.ref.localeCompare(right.ref) || left.digest.localeCompare(right.digest));
}

function resumeIssue(code, subjectKind, subjectId) {
  return { code, subject_kind: subjectKind, subject_id: subjectId };
}

function uniqueIssues(issues) {
  const unique = new Map(issues.map((entry) => [canonicalJson(entry), entry]));
  return [...unique.values()].sort((left, right) => left.code.localeCompare(right.code) || left.subject_kind.localeCompare(right.subject_kind) || left.subject_id.localeCompare(right.subject_id));
}

async function evidenceRetention(manifest, identity) {
  const descriptors = manifestEvidence(manifest); const local = []; const opaque = [];
  const budget = { remaining: FILES_LIMIT };
  for (const descriptor of descriptors) {
    if (!["file", "decision"].includes(descriptor.type)) {
      opaque.push({ type: descriptor.type, ref: descriptor.ref, digest: descriptor.digest }); continue;
    }
    if (identity.kind === "bare") {
      local.push({ type: descriptor.type, ref: descriptor.ref, digest: descriptor.digest, status: "unverifiable", observed_digest: null, error_code: "BARE_EVIDENCE_UNVERIFIED" });
      continue;
    }
    try {
      const observed = await hashRegularFile(identity.projectRoot, descriptor.ref, budget);
      local.push({
        type: descriptor.type, ref: descriptor.ref, digest: descriptor.digest,
        status: observed === null ? "missing" : observed === descriptor.digest ? "retained" : "digest-mismatch",
        observed_digest: observed, error_code: null,
      });
    } catch (error) {
      if (!(error instanceof ControlRecordError)) throw error;
      local.push({ type: descriptor.type, ref: descriptor.ref, digest: descriptor.digest, status: "unsafe", observed_digest: null, error_code: error.code });
    }
  }
  return { local, opaque };
}

export async function resumeCheck(input) {
  apiInput(input, ["cwd", "control_id"]); identifier(input.control_id, "input.control_id");
  const identity = await gitIdentity(input.cwd);
  return withLock(identity, async (paths) => {
    const manifests = await scanManifests(paths); const manifest = targetManifest(manifests, input.control_id);
    const brief = briefManifest(manifest); const blocking = []; const review = [];
    const fingerprintCache = new Map();
    const readResumeFingerprint = async (workspace, scopeGuard = []) => {
      if (workspace.kind === "bare") return null;
      const key = `${workspace.gitDirFileId}\0${workspace.worktreeRoot}\0${canonicalJson(scopeGuard)}`;
      if (!fingerprintCache.has(key)) fingerprintCache.set(key, fingerprintWorkspace({ cwd: workspace.worktreeRoot, scope_guard: scopeGuard }));
      return fingerprintCache.get(key);
    };
    let currentFingerprint = null; let controlFingerprintAvailable = true;
    if (identity.kind !== "bare") {
      try { currentFingerprint = await readResumeFingerprint(identity); }
      catch (error) {
        if (!(error instanceof ControlRecordError)) throw error;
        controlFingerprintAvailable = false;
        blocking.push(resumeIssue("control-workspace-unverifiable", "control", manifest.control_id));
      }
    }
    const currentStatus = identity.kind === "bare"
      ? { dirty: false, status_digest: null }
      : controlFingerprintAvailable
        ? { dirty: currentFingerprint.files.length > 0, status_digest: currentFingerprint.status_digest }
        : { dirty: null, status_digest: null };
    const identityMatches = manifest.declaration.project_root_realpath === identity.projectRoot
      && manifest.declaration.common_dir_realpath === identity.commonDir
      && manifest.declaration.git_dir_realpath === identity.gitDir
      && manifest.declaration.git_dir_file_id === identity.gitDirFileId;
    if (!identityMatches) blocking.push(resumeIssue("control-worktree-generation-changed", "control", manifest.control_id));
    if (currentFingerprint !== null && currentFingerprint.head !== identity.head) blocking.push(resumeIssue("control-workspace-changed-during-check", "control", manifest.control_id));
    if (manifest.declaration.base_sha !== identity.head) review.push(resumeIssue("control-head-changed", "control", manifest.control_id));
    if (controlFingerprintAvailable && (manifest.declaration.initial_dirty !== currentStatus.dirty || manifest.declaration.initial_status_digest !== currentStatus.status_digest)) review.push(resumeIssue("control-dirty-state-changed", "control", manifest.control_id));
    if (controlFingerprintAvailable && manifest.declaration.initial_workspace_digest !== currentFingerprint?.digest && !(manifest.declaration.initial_workspace_digest === null && currentFingerprint === null)) review.push(resumeIssue("control-workspace-content-changed", "control", manifest.control_id));
    for (const run of manifest.worker_runs.filter((entry) => WORKER_NONTERMINAL.has(entry.state))) {
      const active = ["dispatched", "running", "unknown"].includes(run.state);
      if (active && run.workspace_binding.mode === "executor-isolated" && run.workspace_binding.execution_workspace === null) {
        review.push(resumeIssue("worker-execution-workspace-unbound", "worker-run", run.worker_run_id));
        review.push(resumeIssue("worker-requery-required", "worker-run", run.worker_run_id));
        continue;
      }
      const storedWorkspace = active && run.workspace_binding.mode === "executor-isolated" ? run.workspace_binding.execution_workspace : run.workspace;
      let workspace;
      try { workspace = await gitIdentity(storedWorkspace.worktree_root_realpath ?? storedWorkspace.git_dir_realpath); }
      catch (error) {
        if (!(error instanceof ControlRecordError)) throw error;
        blocking.push(resumeIssue("worker-workspace-unavailable", "worker-run", run.worker_run_id)); continue;
      }
      if (!sameWorkspaceIdentity(storedWorkspace, workspace)) blocking.push(resumeIssue("worker-worktree-generation-changed", "worker-run", run.worker_run_id));
      const expectedHead = storedWorkspace.head_at_reservation ?? storedWorkspace.head_at_record;
      if (expectedHead !== workspace.head) {
        const code = run.write_mode !== "none" && RESERVED_WRITER.has(run.state) ? "writer-head-changed" : "worker-head-changed";
        (code === "writer-head-changed" ? blocking : review).push(resumeIssue(code, "worker-run", run.worker_run_id));
      }
      let workspaceFingerprint = null;
      const task = manifest.tasks.find((entry) => entry.task_id === run.task_id);
      const resumeScope = run.write_mode !== "none" ? task.write_scope : [];
      if (workspace.kind !== "bare") {
        try { workspaceFingerprint = await readResumeFingerprint(workspace, resumeScope); }
        catch (error) {
          if (!(error instanceof ControlRecordError)) throw error;
          blocking.push(resumeIssue("worker-workspace-unverifiable", "worker-run", run.worker_run_id));
        }
      }
      if (workspaceFingerprint !== null) {
        if (workspaceFingerprint.head !== workspace.head) blocking.push(resumeIssue("worker-workspace-changed-during-check", "worker-run", run.worker_run_id));
        if (run.write_mode === "none" || run.state === "planned") {
          if (run.recorded_workspace_fingerprint.digest !== workspaceFingerprint.digest) review.push(resumeIssue("worker-workspace-content-changed", "worker-run", run.worker_run_id));
        } else if (run.workspace_binding.mode === "executor-isolated") {
          const changed = fingerprintChangedPaths(workspaceFingerprint);
          if (changed.some((path) => !inWriteScope(path, task))) blocking.push(resumeIssue("writer-scope-drift", "worker-run", run.worker_run_id));
          else if (changed.length > 0) review.push(resumeIssue("writer-work-in-progress", "worker-run", run.worker_run_id));
        } else {
          try {
            const changed = changedPaths(run.baseline_workspace_fingerprint, workspaceFingerprint);
            if (changed.some((path) => !inWriteScope(path, task))) blocking.push(resumeIssue("writer-scope-drift", "worker-run", run.worker_run_id));
            else if (changed.length > 0) review.push(resumeIssue("writer-work-in-progress", "worker-run", run.worker_run_id));
          } catch (error) {
            if (!(error instanceof ControlRecordError)) throw error;
            blocking.push(resumeIssue("writer-workspace-drift", "worker-run", run.worker_run_id));
          }
        }
      }
      if (["dispatched", "running", "unknown"].includes(run.state)) review.push(resumeIssue("worker-requery-required", "worker-run", run.worker_run_id));
    }
    for (const consultation of manifest.consultations.filter((entry) => ["dispatched", "running", "unknown"].includes(entry.state))) {
      review.push(resumeIssue("consultation-requery-required", "consultation", consultation.consultation_id));
    }
    const retention = await evidenceRetention(manifest, identity);
    for (const entry of retention.local) {
      if (["missing", "digest-mismatch", "unsafe"].includes(entry.status)) blocking.push(resumeIssue(`evidence-${entry.status}`, "evidence", entry.ref));
      else if (entry.status === "unverifiable") review.push(resumeIssue("evidence-unverifiable", "evidence", entry.ref));
    }
    const blockingReasons = uniqueIssues(blocking); const reviewReasons = uniqueIssues(review);
    return {
      schema_version: "dotagents.orchestration-resume-check.v2", checked_at: new Date().toISOString(),
      outcome: blockingReasons.length > 0 ? "blocked" : reviewReasons.length > 0 ? "review-required" : "ready",
      brief,
      current_workspace: {
        kind: identity.kind, project_root_realpath: identity.projectRoot, common_dir_realpath: identity.commonDir,
        git_dir_realpath: identity.gitDir, git_dir_file_id: identity.gitDirFileId, head: identity.head,
        dirty: currentStatus.dirty, status_digest: currentStatus.status_digest,
        workspace_digest: currentFingerprint?.digest ?? null,
      },
      evidence_retention: retention, blocking_reasons: blockingReasons, review_reasons: reviewReasons,
    };
  });
}

export async function taskRecord(input) {
  validateMutationBase(input, ["task"]); validateTask(input.task, false);
  return mutation(input, { operation: "task-record", subjectKind: "task", subjectId: input.task.task_id, previousState: null, nextState: "recorded", evidence: [] }, async (manifest, manifests, identity) => {
    enforceRoleEffectPolicy(input.task, manifest.role_effect_policy);
    if (identity.kind === "bare" && input.task.effect === "write") fail("BARE_WRITE_FORBIDDEN", "bare repository cannot have write tasks");
    if (manifests.flatMap((entry) => entry.tasks).some((task) => task.task_id === input.task.task_id)) fail("DUPLICATE_ID", "task id already exists");
    if (input.task.depends_on.some((dependency) => !manifest.tasks.some((task) => task.task_id === dependency))) fail("INVALID_SCHEMA", "task dependency must already exist in this control");
    await ensureDocumentAvailable(identity, input.task.doc_ref);
    const stored = structuredClone(input.task); stored.admission_digest = taskAdmissionDigest(stored); manifest.tasks.push(stored);
  });
}

export async function taskCancelRecord(input) {
  validateMutationBase(input, ["task_id", "decision"]); identifier(input.task_id, "input.task_id"); validateEvidence(input.decision, "input.decision");
  if (input.decision.type !== "decision") fail("INVALID_SCHEMA", "task cancellation requires decision evidence");
  return mutation(input, { operation: "task-cancel-record", subjectKind: "task", subjectId: input.task_id, previousState: "active", nextState: "cancelled", evidence: [input.decision] }, async (manifest) => {
    if (!manifest.tasks.some((task) => task.task_id === input.task_id)) fail("INVALID_SCHEMA", "task does not exist");
    if (manifest.task_cancellations.some((entry) => entry.task_id === input.task_id)) fail("DUPLICATE_ID", "task cancellation already exists");
    if (manifest.task_finalizations.some((entry) => entry.task_id === input.task_id)) fail("INVALID_TRANSITION", "finalized task cannot be cancelled");
    manifest.task_cancellations.push({
      task_id: input.task_id, cancelled_from_revision: manifest.record_revision,
      decision: structuredClone(input.decision), cancelled_by: input.actor_id,
      cancelled_at: new Date().toISOString(),
    });
  });
}

export async function registryObservationRecord(input) {
  validateMutationBase(input, ["observation"]); validateRegistryObservation(input.observation);
  return mutation(input, {
    operation: "registry-observation-record", subjectKind: "registry-observation",
    subjectId: input.observation.registry_observation_id, previousState: null, nextState: "observed",
    evidence: [input.observation.verification.evidence],
  }, async (manifest, manifests) => {
    const all = manifests.flatMap((entry) => entry.registry_observations);
    if (all.some((entry) => entry.registry_observation_id === input.observation.registry_observation_id)) fail("DUPLICATE_ID", "registry observation id already exists");
    manifest.registry_observations.push(structuredClone(input.observation));
  });
}

const placementReason = new Map([
  ["ADAPTER_UNKNOWN", "adapter-unknown"], ["EXECUTOR_FORBIDDEN", "policy-forbidden"],
  ["CAPABILITY_MISMATCH", "capability-mismatch"], ["VERIFICATION_REQUIRED", "verification-insufficient"],
  ["BUDGET_EXCEEDED", "budget-exceeded"], ["BUDGET_UNKNOWN", "budget-unknown"],
  ["DEPENDENCY_NOT_READY", "dependency-not-ready"], ["WRITE_CONFLICT", "write-conflict"],
  ["CAMPAIGN_NOT_RELEASED", "campaign-not-released"],
  ["ASSIGNMENT_ACTIVE", "assignment-active"], ["APPROVAL_MISMATCH", "policy-forbidden"],
  ["APPROVAL_EXPIRED", "policy-forbidden"], ["ROLE_EFFECT_FORBIDDEN", "policy-forbidden"],
  ["BARE_WRITE_FORBIDDEN", "workspace-invalid"], ["WORKSPACE_DRIFT", "workspace-invalid"],
  ["NOT_GIT_REPOSITORY", "workspace-invalid"], ["STATE_PATH_UNSAFE", "workspace-invalid"],
  ["IO_FAILURE", "workspace-invalid"], ["GIT_FAILURE", "workspace-invalid"],
  ["INVALID_SCHEMA", "candidate-invalid"], ["DUPLICATE_ID", "worker-run-id-active"],
]);

function placementResult(candidate, hardReasons, reviewReasons) {
  const hard = [...new Set(hardReasons)].sort(); const review = [...new Set(reviewReasons)].sort();
  return {
    candidate_id: candidate.candidate_id,
    registry_observation_id: candidate.registry_observation_id,
    eligibility: hard.length ? "ineligible" : review.length ? "review-required" : "eligible",
    reasons: hard.length ? hard : review,
  };
}

function sameRegistryScope(left, right) {
  return left.workflow_id === right.workflow_id && canonicalJson(left.executor) === canonicalJson(right.executor);
}

function sameExecutorWorkflow(run, registry) {
  return sameRegistryScope(run, registry);
}

function registryRefreshState(manifests, registry, evaluatedAt) {
  const evaluated = Date.parse(evaluatedAt); const observed = Date.parse(registry.verification.observed_at);
  if (observed > evaluated) return { superseded: false, ambiguous: false, notYetObserved: true };
  const snapshots = manifests.flatMap((control) => control.registry_observations)
    .filter((entry) => sameRegistryScope(entry, registry) && Date.parse(entry.verification.observed_at) <= evaluated);
  const latestTime = snapshots.reduce((latest, entry) => Math.max(latest, Date.parse(entry.verification.observed_at)), Number.NEGATIVE_INFINITY);
  const latest = snapshots.filter((entry) => Date.parse(entry.verification.observed_at) === latestTime);
  const superseded = !latest.some((entry) => entry.registry_observation_id === registry.registry_observation_id);
  const bodies = new Set(latest.map((entry) => {
    const body = structuredClone(entry); delete body.registry_observation_id; return canonicalJson(body);
  }));
  return { superseded, ambiguous: bodies.size > 1, notYetObserved: false };
}

function dispatchEvidenceFrontier(run) {
  return Math.max(...run.dispatch_evidence.map((entry) => Date.parse(entry.observed_at)));
}

function unobservedCapacityReservations(manifests, registry) {
  const observedAt = registry.capacity.observed_inflight.evidence.observed_at;
  let reservations = 0; let ambiguous = false;
  for (const control of manifests) for (const run of control.worker_runs) {
    if (!sameExecutorWorkflow(run, registry)) continue;
    if (["planned", "admitted"].includes(run.state)) {
      reservations += 1;
      continue;
    }
    if (["dispatched", "running", "unknown"].includes(run.state)) {
      const comparison = dispatchEvidenceFrontier(run) - Date.parse(observedAt);
      if (comparison > 0) reservations += 1;
      else if (comparison === 0) ambiguous = true;
    }
  }
  return { reservations, ambiguous };
}

async function evaluatePlacementCandidate({ manifest, manifests, task, candidate, evaluatedAt }) {
  const hard = []; const review = [];
  const allWorkers = manifests.flatMap((entry) => entry.worker_runs);
  const allTasks = new Map(manifests.flatMap((entry) => entry.tasks).map((entry) => [entry.task_id, entry]));
  if (manifest.task_cancellations.some((entry) => entry.task_id === task.task_id)) return { result: placementResult(candidate, ["task-cancelled"], []), stored: null, registry: null };
  const pendingCampaigns = unreleasedCampaignsForTask(manifest, task.task_id);
  if (pendingCampaigns.length) return { result: placementResult(candidate, ["campaign-not-released"], []), stored: null, registry: null };
  const registry = manifest.registry_observations.find((entry) => entry.registry_observation_id === candidate.registry_observation_id);
  if (!registry) return { result: placementResult(candidate, ["registry-missing"], []), stored: null, registry: null };
  const refresh = registryRefreshState(manifests, registry, evaluatedAt);
  if (refresh.notYetObserved) hard.push("registry-not-yet-observed");
  if (refresh.superseded) hard.push("registry-superseded");
  if (refresh.ambiguous) review.push("registry-refresh-ambiguous");
  if (Date.parse(registry.expires_at) <= Date.parse(evaluatedAt)) hard.push("registry-expired");
  if (registry.enabled.value === "false") hard.push("enabled-false");
  else if (registry.enabled.value === "unknown") hard.push("enabled-unknown");
  if (!isKnownExecutorContract(registry.executor, registry.workflow_id)) hard.push("adapter-unknown");
  const rank = verificationRank.get(registry.verification.stage);
  if (registry.executor.adapter_id !== "parent" && rank < 3) hard.push("verification-insufficient");
  if (task.effect === "write" && registry.executor.adapter_id !== "parent" && rank !== 4) hard.push("verification-insufficient");
  if (registry.capacity.admission.value === "false") hard.push("capacity-admission-false");
  else if (registry.capacity.admission.value === "unknown") review.push("capacity-review-required");
  const hardLimit = registry.capacity.hard_inflight_limit; const softLimit = registry.capacity.soft_inflight_limit; const inflight = registry.capacity.observed_inflight;
  if (hardLimit.knowledge === "unknown" || inflight.knowledge === "unknown") review.push("capacity-review-required");
  else {
    const { reservations, ambiguous } = unobservedCapacityReservations(manifests, registry);
    const effectiveInflight = Number.isSafeInteger(inflight.value + reservations) ? inflight.value + reservations : Number.POSITIVE_INFINITY;
    if (effectiveInflight >= hardLimit.value) hard.push("capacity-hard-exhausted");
    if (softLimit.knowledge === "known" && effectiveInflight >= softLimit.value && effectiveInflight < hardLimit.value) review.push("capacity-review-required");
    if (ambiguous) review.push("capacity-review-required");
  }
  if (candidate.lineage.approach_family_ref === null) hard.push("approach-family-unknown");
  else if (allWorkers.filter((run) => run.lineage.approach_family_ref === candidate.lineage.approach_family_ref).length >= manifest.budget.max_runs_per_approach_family) hard.push("approach-family-limit");
  if (allWorkers.filter((run) => run.assignment_id === candidate.assignment_id).length >= manifest.budget.max_retries_per_assignment + 1) hard.push("retry-limit");
  if (task.role === "integrator" && allWorkers.filter((run) => allTasks.get(run.task_id)?.role === "integrator").length >= manifest.budget.max_integration_runs) hard.push("integration-capacity-exhausted");
  let stored = null;
  try {
    const workspace = await gitIdentity(candidate.workspace_cwd);
    const synthetic = {
      worker_run_id: candidate.candidate_id, task_id: task.task_id, assignment_id: candidate.assignment_id,
      executor: structuredClone(registry.executor), workflow_id: registry.workflow_id, role_ref: task.role,
      workspace_cwd: candidate.workspace_cwd, workspace_binding: candidate.workspace_binding, workflow_capabilities: structuredClone(registry.workflow_capabilities),
      budget_reservation: structuredClone(candidate.budget_reservation), write_mode: candidate.write_mode,
      operation_digest: candidate.operation_digest, execution_verification: structuredClone(registry.verification),
      lineage: structuredClone(candidate.lineage), placement_reservation: null, state: "planned", executor_handle: structuredClone(candidate.executor_handle),
      executor_observation: null, admission: null, cancel_request: null, dispatch_evidence: [], dispatch_attempt_evidence: [],
      terminal_evidence: [], result: null, acceptance: null,
    };
    validateWorker(synthetic, false); requireOperationalExecutor(synthetic); requireTaskCapabilities(synthetic, task);
    if (synthetic.role_ref !== task.role || JSON.stringify(synthetic.lineage.context_policy) !== JSON.stringify(task.context_policy)) fail("CAPABILITY_MISMATCH", "candidate lineage differs from task");
    if (workspace.commonDir !== manifest.declaration.common_dir_realpath) fail("WORKSPACE_DRIFT", "candidate common dir differs from control");
    if (task.effect === "write" && workspace.kind === "bare") fail("BARE_WRITE_FORBIDDEN", "bare workspace cannot write");
    requireTaskIsolation(manifest, task, workspace, candidate.workspace_binding);
    const expectedMode = task.effect === "write" ? new Set(["direct", "isolated-alternative"]) : new Set(["none"]);
    if (!expectedMode.has(synthetic.write_mode)) fail("INVALID_SCHEMA", "write mode contradicts task");
    if (task.classification === "F" && task.effect === "write" && registry.executor.adapter_id !== "parent") fail("EXECUTOR_FORBIDDEN", "F write task must use parent");
    if (task.classification === "H") {
      if (candidate.operation_digest !== task.approval.operation_digest) fail("APPROVAL_MISMATCH", "H operation digest differs from approval");
      if (task.approval.expires_at !== null && Date.parse(task.approval.expires_at) <= Date.parse(evaluatedAt)) fail("APPROVAL_EXPIRED", "H approval is expired");
    }
    if (synthetic.lineage.parent_worker_run_id === null) {
      if (synthetic.lineage.root_assignment_id !== synthetic.assignment_id) fail("INVALID_SCHEMA", "root lineage is invalid");
    } else {
      const parent = manifest.worker_runs.find((entry) => entry.worker_run_id === synthetic.lineage.parent_worker_run_id);
      if (!parent || parent.lineage.root_assignment_id !== synthetic.lineage.root_assignment_id) fail("INVALID_SCHEMA", "parent lineage is invalid");
    }
    requireDependenciesReady(manifest, task);
    if (allWorkers.some((run) => run.worker_run_id === synthetic.worker_run_id)) fail("DUPLICATE_ID", "worker run id already exists");
    assignmentAllows(allWorkers, synthetic.assignment_id, "worker");
    await inspectTaskScopes(workspace, task);
    stored = structuredClone(synthetic); delete stored.workspace_cwd; stored.workspace = workspaceObject(workspace); stored.workspace_binding = workspaceBindingObject(candidate.workspace_binding, stored.workspace); stored.recorded_workspace_fingerprint = null; stored.baseline_workspace_fingerprint = null;
    assertBudgetWithin(manifest, stored, null, { skipPlacementLimits: true });
    const conflicts = conflictList(manifests, stored, task); if (conflicts.length) fail("WRITE_CONFLICT", "candidate conflicts with active writer");
  } catch (error) {
    if (!(error instanceof ControlRecordError) || !placementReason.has(error.code)) throw error;
    hard.push(placementReason.get(error.code));
  }
  return { result: placementResult(candidate, hard, review), stored, registry };
}

export async function placementDryRun(input) {
  apiInput(input, ["cwd", "control_id", "task_id", "evaluated_at", "candidates"]);
  identifier(input.control_id, "input.control_id"); identifier(input.task_id, "input.task_id"); timestamp(input.evaluated_at, "input.evaluated_at");
  boundedArray(input.candidates, "input.candidates", validatePlacementCandidate, { min: 1 });
  const candidateIds = input.candidates.map((entry) => entry.candidate_id);
  if (new Set(candidateIds).size !== candidateIds.length) fail("INVALID_INPUT", "candidate ids must be unique");
  const identity = await gitIdentity(input.cwd);
  return withLock(identity, async (paths) => {
    const manifests = await scanManifests(paths); const manifest = targetManifest(manifests, input.control_id);
    requireOperationalManifest(manifest);
    if (manifest.status === "archived") fail("RECORD_ARCHIVED", "control is archived");
    if (manifest.control_finalization !== null) fail("CONTROL_FINALIZED", "control is finalized");
    const task = manifest.tasks.find((entry) => entry.task_id === input.task_id);
    if (!task) fail("INVALID_INPUT", "placement task does not exist");
    const results = [];
    for (const candidate of [...input.candidates].sort((left, right) => left.candidate_id.localeCompare(right.candidate_id))) {
      results.push((await evaluatePlacementCandidate({ manifest, manifests, task, candidate, evaluatedAt: input.evaluated_at })).result);
    }
    return { control_id: manifest.control_id, control_revision: manifest.record_revision, task_id: task.task_id, evaluated_at: input.evaluated_at, candidates: results };
  });
}

export async function reservePlacement(input) {
  validateMutationBase(input, ["task_id", "candidate", "review_decision"]);
  identifier(input.task_id, "input.task_id"); validatePlacementCandidate(input.candidate, "input.candidate");
  if (input.review_decision !== null) {
    validateEvidence(input.review_decision, "input.review_decision");
    if (input.review_decision.type !== "decision") fail("INVALID_SCHEMA", "placement review must be decision evidence");
  }
  return mutation(input, (before, next) => {
    const run = next.worker_runs.find((entry) => entry.worker_run_id === input.candidate.candidate_id);
    const evidence = run === undefined ? [] : [run.execution_verification.evidence, ...(run.placement_reservation.review_decision === null ? [] : [run.placement_reservation.review_decision])];
    return { operation: "placement-reserve", subjectKind: "worker-run", subjectId: input.candidate.candidate_id, subjectDigest: run === undefined ? null : placementReservationDigest(run.placement_reservation), previousState: null, nextState: "planned", evidence };
  }, async (manifest, manifests) => {
    const task = manifest.tasks.find((entry) => entry.task_id === input.task_id);
    if (!task) fail("INVALID_SCHEMA", "placement task does not exist");
    const evaluatedAt = new Date().toISOString();
    const evaluation = await evaluatePlacementCandidate({ manifest, manifests, task, candidate: input.candidate, evaluatedAt });
    if (evaluation.result.eligibility === "ineligible") fail("PLACEMENT_INELIGIBLE", "placement candidate is ineligible", { reasons: evaluation.result.reasons });
    if (evaluation.result.eligibility === "review-required" && input.review_decision === null) fail("PLACEMENT_REVIEW_REQUIRED", "placement candidate requires parent review", { reasons: evaluation.result.reasons });
    if (evaluation.result.eligibility === "eligible" && input.review_decision !== null) fail("INVALID_SCHEMA", "eligible placement cannot carry review approval");
    if (evaluation.stored === null || evaluation.registry === null) fail("PLACEMENT_INELIGIBLE", "placement candidate cannot be materialized");
    const stored = evaluation.stored;
    const registryObservationId = evaluation.registry.registry_observation_id;
    stored.recorded_workspace_fingerprint = stored.workspace.kind === "bare" ? null : await fingerprintWorkspace({ cwd: stored.workspace.worktree_root_realpath, scope_guard: task.effect === "write" ? task.write_scope : [] });
    stored.placement_reservation = {
      registry_observation_id: registryObservationId,
      candidate_digest: placementCandidateDigest(materializedPlacementCandidate(stored, registryObservationId)),
      selected_from_revision: manifest.record_revision,
      eligibility: evaluation.result.eligibility,
      review_reasons: [...evaluation.result.reasons],
      review_decision: structuredClone(input.review_decision),
      selected_by: input.actor_id,
      selected_at: evaluatedAt,
    };
    manifest.worker_runs.push(stored);
  });
}

const verificationRank = new Map([["unverified", 0], ["installed", 1], ["registered", 2], ["verified", 3], ["execution-verified", 4]]);

function assignmentAllows(allRuns, assignment, kind) {
  const prior = allRuns.filter((run) => run.assignment_id === assignment);
  for (const run of prior) {
    if (kind === "worker") {
      if (WORKER_NONTERMINAL.has(run.state) || (run.state === "completed" && run.acceptance?.decision !== "rejected")) fail("ASSIGNMENT_ACTIVE", "assignment is not eligible for retry");
    } else if (run.state !== "failed") fail("ASSIGNMENT_ACTIVE", "consultation assignment is not eligible for retry");
  }
}

export async function workerRunRecord(input) {
  validateMutationBase(input, ["worker_run"]);
  validateWorker(input.worker_run, false);
  if (input.worker_run.placement_reservation !== null) fail("INVALID_SCHEMA", "manual worker record cannot forge placement reservation");
  requireOperationalExecutor(input.worker_run);
  const workspaceIdentity = await gitIdentity(input.worker_run.workspace_cwd);
  return mutation(input, { operation: "worker-run-record", subjectKind: "worker-run", subjectId: input.worker_run.worker_run_id, previousState: null, nextState: "planned", evidence: [input.worker_run.execution_verification.evidence] }, async (manifest, manifests) => {
    const task = manifest.tasks.find((entry) => entry.task_id === input.worker_run.task_id); if (!task) fail("INVALID_SCHEMA", "worker task does not exist");
    requireTaskNotCancelled(manifest, task.task_id);
    requireTaskCapabilities(input.worker_run, task);
    if (input.worker_run.role_ref !== task.role) fail("INVALID_SCHEMA", "worker role differs from task snapshot");
    if (JSON.stringify(input.worker_run.lineage.context_policy) !== JSON.stringify(task.context_policy)) fail("INVALID_SCHEMA", "worker lineage context policy differs from task snapshot");
    if (workspaceIdentity.commonDir !== manifest.declaration.common_dir_realpath) fail("WORKSPACE_DRIFT", "worker common dir differs from control");
    if (task.effect === "write" && workspaceIdentity.kind === "bare") fail("BARE_WRITE_FORBIDDEN", "bare workspace cannot write");
    requireTaskIsolation(manifest, task, workspaceIdentity, input.worker_run.workspace_binding);
    const expectedMode = task.effect === "write" ? new Set(["direct", "isolated-alternative"]) : new Set(["none"]);
    if (!expectedMode.has(input.worker_run.write_mode)) fail("INVALID_SCHEMA", "write_mode contradicts task");
    const parentExecutor = input.worker_run.executor.adapter_id === "parent";
    if (task.classification === "F" && task.effect === "write" && !parentExecutor) fail("EXECUTOR_FORBIDDEN", "F write task must use parent");
    const rank = verificationRank.get(input.worker_run.execution_verification.stage);
    if (!parentExecutor && rank < 3) fail("VERIFICATION_REQUIRED", "external executor must be verified");
    if (task.effect === "write" && !parentExecutor && rank !== 4) fail("VERIFICATION_REQUIRED", "external writer must be execution-verified");
    const allWorkers = manifests.flatMap((entry) => entry.worker_runs);
    if (allWorkers.some((run) => run.worker_run_id === input.worker_run.worker_run_id)) fail("DUPLICATE_ID", "worker run id already exists");
    assignmentAllows(allWorkers, input.worker_run.assignment_id, "worker");
    if (input.worker_run.lineage.parent_worker_run_id === null) {
      if (input.worker_run.lineage.root_assignment_id !== input.worker_run.assignment_id) fail("INVALID_SCHEMA", "root worker lineage is invalid");
    } else {
      const parent = manifest.worker_runs.find((entry) => entry.worker_run_id === input.worker_run.lineage.parent_worker_run_id);
      if (!parent || input.worker_run.lineage.root_assignment_id !== parent.lineage.root_assignment_id) fail("INVALID_SCHEMA", "parent worker lineage is invalid");
    }
    await inspectTaskScopes(workspaceIdentity, task);
    const stored = structuredClone(input.worker_run); delete stored.workspace_cwd; stored.workspace = workspaceObject(workspaceIdentity); stored.workspace_binding = workspaceBindingObject(input.worker_run.workspace_binding, stored.workspace);
    stored.recorded_workspace_fingerprint = workspaceIdentity.kind === "bare" ? null : await fingerprintWorkspace({ cwd: workspaceIdentity.worktreeRoot, scope_guard: task.effect === "write" ? task.write_scope : [] });
    stored.baseline_workspace_fingerprint = null;
    assertBudgetWithin(manifest, stored, null);
    manifest.worker_runs.push(stored);
  });
}

export async function consultationRecord(input) {
  validateMutationBase(input, ["consultation"]); validateConsultation(input.consultation);
  if (input.consultation.state !== "planned" || input.consultation.executor_observation !== null || input.consultation.decision_ref !== null || input.consultation.terminal_evidence.length) fail("INVALID_SCHEMA", "new consultation must be pristine planned state");
  return mutation(input, { operation: "consultation-record", subjectKind: "consultation", subjectId: input.consultation.consultation_id, previousState: null, nextState: "planned", evidence: [] }, async (manifest, manifests) => {
    const task = manifest.tasks.find((entry) => entry.task_id === input.consultation.task_id); if (!task) fail("INVALID_SCHEMA", "consultation task does not exist");
    requireTaskNotCancelled(manifest, task.task_id);
    const all = manifests.flatMap((entry) => entry.consultations);
    if (all.some((entry) => entry.consultation_id === input.consultation.consultation_id)) fail("DUPLICATE_ID", "consultation id already exists");
    assignmentAllows(all, input.consultation.assignment_id, "consultation");
    assertBudgetWithin(manifest, null, input.consultation);
    manifest.consultations.push(structuredClone(input.consultation));
  });
}

function validateCampaignDeclaration(value) {
  exact(value, ["campaign_id", "campaign_type", "members", "gated_task_ids", "audit_required"], "campaign");
  identifier(value.campaign_id, "campaign.campaign_id");
  oneOf(value.campaign_type, ["discovery", "refutation", "design", "implementation", "final-audit"], "campaign.campaign_type");
  boundedArray(value.members, "campaign.members", validateCampaignMember, { min: 1 });
  if (new Set(value.members.map((entry) => `${entry.kind}\0${entry.id}`)).size !== value.members.length) fail("INVALID_SCHEMA", "campaign members contain duplicates");
  uniqueStringArray(value.gated_task_ids, "campaign.gated_task_ids", identifier, { min: 1 });
  if (typeof value.audit_required !== "boolean") fail("INVALID_SCHEMA", "campaign.audit_required must be boolean");
}

function campaignProjection(manifest, campaign) {
  const members = campaign.members.map((member) => ({ ...structuredClone(member), state: campaignMemberState(manifest, member) }));
  return {
    schema_version: "dotagents.campaign-status.v1", campaign_id: campaign.campaign_id,
    campaign_type: campaign.campaign_type, members, gated_task_ids: [...campaign.gated_task_ids],
    all_terminal: campaignAllTerminal(manifest, campaign), audit_required: campaign.audit_required,
    released: campaign.release !== null, release: structuredClone(campaign.release),
  };
}

export async function campaignRecord(input) {
  validateMutationBase(input, ["campaign"]); validateCampaignDeclaration(input.campaign);
  return mutation(input, { operation: "campaign-record", subjectKind: "campaign", subjectId: input.campaign.campaign_id, previousState: null, nextState: "declared", evidence: [] }, async (manifest, manifests) => {
    if (manifests.flatMap((entry) => entry.campaigns).some((campaign) => campaign.campaign_id === input.campaign.campaign_id)) fail("DUPLICATE_ID", "campaign id already exists");
    for (const taskId of input.campaign.gated_task_ids) if (!manifest.tasks.some((task) => task.task_id === taskId)) fail("INVALID_SCHEMA", "campaign gated task does not exist");
    for (const member of input.campaign.members) if (campaignMemberState(manifest, member) === null) fail("INVALID_SCHEMA", "campaign member does not exist");
    manifest.campaigns.push({
      ...structuredClone(input.campaign), declared_from_revision: manifest.record_revision,
      declared_by: input.actor_id, declared_at: new Date().toISOString(), release: null,
    });
  });
}

export async function campaignStatus(input) {
  apiInput(input, ["cwd", "control_id", "campaign_id"]); identifier(input.control_id, "input.control_id"); identifier(input.campaign_id, "input.campaign_id");
  const identity = await gitIdentity(input.cwd); const manifests = await scanManifests(await statePaths(identity)); const manifest = targetManifest(manifests, input.control_id);
  const campaign = manifest.campaigns.find((entry) => entry.campaign_id === input.campaign_id); if (!campaign) fail("INVALID_SCHEMA", "campaign does not exist");
  return campaignProjection(manifest, campaign);
}

export async function releaseCampaign(input) {
  validateMutationBase(input, ["campaign_id", "audit_evidence", "decision"]); identifier(input.campaign_id, "input.campaign_id");
  evidenceArray(input.audit_evidence, "input.audit_evidence"); validateEvidence(input.decision, "input.decision");
  if (input.decision.type !== "decision") fail("INVALID_SCHEMA", "campaign release requires decision evidence");
  const receiptEvidence = [input.decision, ...input.audit_evidence];
  if (receiptEvidence.length > ARRAY_LIMIT) fail("LIMIT_EXCEEDED", "campaign release receipt evidence exceeds limit");
  return mutation(input, { operation: "campaign-release", subjectKind: "campaign", subjectId: input.campaign_id, previousState: "declared", nextState: "released", evidence: receiptEvidence }, async (manifest) => {
    const campaign = manifest.campaigns.find((entry) => entry.campaign_id === input.campaign_id); if (!campaign) fail("INVALID_SCHEMA", "campaign does not exist");
    if (campaign.release !== null) fail("DUPLICATE_ID", "campaign is already released");
    if (!campaignAllTerminal(manifest, campaign)) fail("CAMPAIGN_NOT_TERMINAL", "campaign members are not all terminal");
    if (campaign.audit_required && input.audit_evidence.length === 0) fail("EVIDENCE_REQUIRED", "campaign release requires audit evidence");
    if (!campaign.audit_required && input.audit_evidence.length !== 0) fail("INVALID_SCHEMA", "campaign without audit requirement cannot store audit evidence");
    campaign.release = {
      released_from_revision: manifest.record_revision, audit_evidence: structuredClone(input.audit_evidence),
      decision: structuredClone(input.decision), released_by: input.actor_id, released_at: new Date().toISOString(),
    };
  });
}

function taskForRun(manifest, run) { const task = manifest.tasks.find((entry) => entry.task_id === run.task_id); if (!task) fail("INVALID_SCHEMA", "worker task missing"); return task; }

function requireTaskNotCancelled(manifest, taskId) {
  if (manifest.task_cancellations.some((entry) => entry.task_id === taskId)) fail("TASK_CANCELLED", "task is cancelled");
}

function requireDependenciesReady(manifest, task) {
  const finalized = new Set(manifest.task_finalizations.map((entry) => entry.task_id));
  const pending = task.depends_on.filter((dependency) => !finalized.has(dependency));
  if (pending.length) fail("DEPENDENCY_NOT_READY", "task dependencies are not finalized", { pending });
}

function unreleasedCampaignsForTask(manifest, taskId) {
  return manifest.campaigns.filter((campaign) => campaign.gated_task_ids.includes(taskId) && campaign.release === null).map((campaign) => campaign.campaign_id).sort();
}

function requireCampaignsReleased(manifest, taskId) {
  const pending = unreleasedCampaignsForTask(manifest, taskId);
  if (pending.length) fail("CAMPAIGN_NOT_RELEASED", "parent-declared campaign gate is not released", { pending });
}

function conflictList(manifests, candidate, candidateTask) {
  const conflicts = [];
  for (const control of manifests) for (const existing of control.worker_runs) {
    if (!RESERVED_WRITER.has(existing.state) || existing.write_mode === "none" || existing.worker_run_id === candidate.worker_run_id) continue;
    const existingTask = control.tasks.find((task) => task.task_id === existing.task_id); if (!existingTask) fail("INVALID_SCHEMA", "admitted worker task missing");
    const existingWorkspace = effectiveWorkspace(existing); const candidateWorkspace = effectiveWorkspace(candidate);
    const sameWorktree = existingWorkspace !== null && candidateWorkspace !== null && existingWorkspace.worktree_root_realpath === candidateWorkspace.worktree_root_realpath;
    const overlap = existingTask.write_scope.some((a) => candidateTask.write_scope.some((b) => scopesOverlap(a, b)));
    const alternative = !sameWorktree && overlap && existing.write_mode === "isolated-alternative" && candidate.write_mode === "isolated-alternative" && existingTask.alternative_group !== null && existingTask.alternative_group === candidateTask.alternative_group;
    if (sameWorktree || (overlap && !alternative)) conflicts.push({ control_id: control.control_id, worker_run_id: existing.worker_run_id, reason: sameWorktree ? "same-worktree-writer" : "overlapping-write-scope" });
  }
  return conflicts;
}

function validateGlobalManifests(manifests) {
  const uniqueGlobal = (items, key) => {
    const seen = new Set();
    for (const item of items) {
      if (seen.has(item[key])) fail("INVALID_SCHEMA", `global duplicate ${key}`);
      seen.add(item[key]);
    }
  };
  uniqueGlobal(manifests.flatMap((control) => control.tasks), "task_id");
  uniqueGlobal(manifests.flatMap((control) => control.registry_observations), "registry_observation_id");
  uniqueGlobal(manifests.flatMap((control) => control.worker_runs), "worker_run_id");
  uniqueGlobal(manifests.flatMap((control) => control.consultations), "consultation_id");
  uniqueGlobal(manifests.flatMap((control) => control.campaigns), "campaign_id");
  const byControlId = new Map(manifests.map((control) => [control.control_id, control]));
  for (const control of manifests) {
    if (control.continuation.predecessor_control_id === null) continue;
    const predecessor = byControlId.get(control.continuation.predecessor_control_id);
    if (!predecessor || predecessor.status !== "archived" || control.continuation.sequence !== predecessor.continuation.sequence + 1 || control.continuation.root_control_id !== predecessor.continuation.root_control_id || control.declaration.objective_ref !== predecessor.declaration.objective_ref) {
      fail("INVALID_SCHEMA", "control continuation chain is invalid");
    }
  }

  const assignments = new Map();
  for (const control of manifests) {
    for (const run of control.worker_runs) {
      const tuple = `worker\u0000${run.task_id}`;
      const previous = assignments.get(run.assignment_id);
      if (previous !== undefined && previous !== tuple) fail("INVALID_SCHEMA", "assignment immutable tuple changed");
      assignments.set(run.assignment_id, tuple);
    }
    for (const consultation of control.consultations) {
      const tuple = `consultation\u0000${consultation.task_id}`;
      const previous = assignments.get(consultation.assignment_id);
      if (previous !== undefined && previous !== tuple) fail("INVALID_SCHEMA", "assignment immutable tuple changed");
      assignments.set(consultation.assignment_id, tuple);
    }
  }

  const activeWriters = manifests.flatMap((control) => control.worker_runs
    .filter((run) => RESERVED_WRITER.has(run.state) && run.write_mode !== "none")
    .map((run) => ({ control, run, task: control.tasks.find((task) => task.task_id === run.task_id) })));
  for (let leftIndex = 0; leftIndex < activeWriters.length; leftIndex++) {
    const left = activeWriters[leftIndex];
    if (!left.task) fail("INVALID_SCHEMA", "active writer task is missing");
    for (let rightIndex = leftIndex + 1; rightIndex < activeWriters.length; rightIndex++) {
      const right = activeWriters[rightIndex];
      if (!right.task) fail("INVALID_SCHEMA", "active writer task is missing");
      const leftWorkspace = effectiveWorkspace(left.run); const rightWorkspace = effectiveWorkspace(right.run);
      const sameWorktree = leftWorkspace !== null && rightWorkspace !== null && leftWorkspace.worktree_root_realpath === rightWorkspace.worktree_root_realpath;
      const overlap = left.task.write_scope.some((a) => right.task.write_scope.some((b) => scopesOverlap(a, b)));
      const alternative = !sameWorktree && overlap && left.run.write_mode === "isolated-alternative" && right.run.write_mode === "isolated-alternative" && left.task.alternative_group !== null && left.task.alternative_group === right.task.alternative_group;
      if (sameWorktree || (overlap && !alternative)) fail("INVALID_SCHEMA", "active writer manifests conflict");
    }
  }
}

export async function admitWorker(input) {
  validateMutationBase(input, ["worker_run_id"]); identifier(input.worker_run_id, "input.worker_run_id");
  return mutation(input, { operation: "worker-admit", subjectKind: "worker-run", subjectId: input.worker_run_id, previousState: "planned", nextState: "admitted", evidence: [] }, async (manifest, manifests) => {
    const run = manifest.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id); if (!run) fail("INVALID_SCHEMA", "worker run does not exist");
    if (run.state !== "planned") fail("INVALID_TRANSITION", "only planned worker can be admitted");
    const task = taskForRun(manifest, run);
    requireTaskNotCancelled(manifest, task.task_id);
    requireDependenciesReady(manifest, task);
    requireCampaignsReleased(manifest, task.task_id);
    if (task.classification === "H") {
      if (run.operation_digest === null || run.operation_digest !== task.approval.operation_digest) fail("APPROVAL_MISMATCH", "worker operation is outside the H approval scope");
      if (task.approval.expires_at !== null && Date.now() >= Date.parse(task.approval.expires_at)) fail("APPROVAL_EXPIRED", "H approval has expired");
    }
    const workspace = await gitIdentity(run.workspace.worktree_root_realpath ?? run.workspace.git_dir_realpath);
    if (!sameWorkspaceIdentity(run.workspace, workspace)) fail("WORKSPACE_DRIFT", "workspace identity changed");
    requireTaskIsolation(manifest, task, workspace, run.workspace_binding.mode);
    await inspectTaskScopes(workspace, task);
    if (task.effect === "write") {
      const conflicts = conflictList(manifests, run, task); if (conflicts.length) fail("WRITE_CONFLICT", "write reservation conflicts", { conflicts });
      if (run.workspace_binding.mode === "fixed") {
        run.baseline_workspace_fingerprint = await fingerprintWorkspace({ cwd: workspace.worktreeRoot, scope_guard: task.write_scope });
        run.workspace.head_at_reservation = workspace.head;
      }
    }
    run.state = "admitted";
    run.admission = { admitted_by: input.actor_id, admitted_at: new Date().toISOString(), write_reservation: task.effect === "write" };
  });
}

export async function bindWorkerWorkspace(input) {
  validateMutationBase(input, ["worker_run_id", "workspace_cwd", "provider_binding", "binding_evidence"]);
  identifier(input.worker_run_id, "input.worker_run_id"); string(input.workspace_cwd, "input.workspace_cwd", 4096); validateSidecarProviderBinding(input.provider_binding); evidenceArray(input.binding_evidence, "input.binding_evidence", 1);
  let pathInfo;
  try { pathInfo = await lstat(resolve(input.workspace_cwd)); }
  catch (error) { fail("IO_FAILURE", "execution workspace cannot be inspected", { cause: error.code }); }
  if (pathInfo.isSymbolicLink()) fail("STATE_PATH_UNSAFE", "execution workspace path cannot be a symlink");
  const workspace = await gitIdentity(input.workspace_cwd);
  return mutation(input, (before, next) => {
    const run = before.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id);
    const bound = next.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id);
    return { operation: "worker-workspace-bind", subjectKind: "worker-run", subjectId: input.worker_run_id, subjectDigest: sidecarProviderBindingDigest(bound.workspace_binding.provider_binding), previousState: run?.state ?? null, nextState: run?.state ?? "missing", evidence: input.binding_evidence };
  }, async (manifest) => {
    const run = manifest.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id); if (!run) fail("INVALID_SCHEMA", "worker run does not exist");
    if (!["dispatched", "running", "unknown"].includes(run.state)) fail("INVALID_TRANSITION", "worker state cannot bind an execution workspace");
    if (run.workspace_binding.mode !== "executor-isolated") fail("INVALID_TRANSITION", "worker does not use executor-isolated workspace binding");
    if (run.workspace_binding.execution_workspace !== null) fail("DUPLICATE_ID", "execution workspace is already bound");
    if (run.executor.adapter_id !== "codex-sidecar" || run.workflow_id !== "work" || run.executor_handle === null || canonicalJson(run.executor_handle) !== canonicalJson(input.provider_binding.executor_handle)) fail("REPORT_CORRELATION_MISMATCH", "provider binding does not match the sidecar Run handle");
    if (workspace.kind !== "worktree" || workspace.commonDir !== manifest.declaration.common_dir_realpath || workspace.worktreeRoot === run.workspace.worktree_root_realpath || workspace.head !== run.workspace_binding.base_sha) fail("WORKSPACE_DRIFT", "execution workspace differs from the reserved sidecar base");
    if (resolve(input.provider_binding.worktree_path) !== workspace.worktreeRoot) fail("REPORT_CORRELATION_MISMATCH", "provider worktree path differs from the bound workspace");
    const task = taskForRun(manifest, run); requireTaskIsolation(manifest, task, workspace); await inspectTaskScopes(workspace, task);
    run.workspace_binding.execution_workspace = workspaceObject(workspace, workspace.head);
    run.workspace_binding.provider_binding = structuredClone(input.provider_binding);
    run.workspace_binding.bound_from_revision = manifest.record_revision;
    run.workspace_binding.binding_evidence = structuredClone(input.binding_evidence);
    run.workspace_binding.bound_by = input.actor_id;
    run.workspace_binding.bound_at = new Date().toISOString();
  });
}

export async function requestWorkerCancel(input) {
  validateMutationBase(input, ["worker_run_id", "decision"]); identifier(input.worker_run_id, "input.worker_run_id"); validateEvidence(input.decision, "input.decision");
  if (input.decision.type !== "decision") fail("INVALID_SCHEMA", "worker cancel request requires decision evidence");
  return mutation(input, (before) => {
    const run = before.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id);
    return { operation: "worker-cancel-request", subjectKind: "worker-run", subjectId: input.worker_run_id, previousState: run?.state ?? null, nextState: run?.state ?? "missing", evidence: [input.decision] };
  }, async (manifest) => {
    const run = manifest.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id); if (!run) fail("INVALID_SCHEMA", "worker run does not exist");
    if (!["admitted", "dispatched", "running", "unknown"].includes(run.state)) fail("INVALID_TRANSITION", "worker state cannot accept an external cancel request");
    if (run.cancel_request !== null) fail("DUPLICATE_ID", "worker cancel request already exists");
    if (run.executor_handle === null) fail("INVALID_TRANSITION", "worker cancel request requires an executor handle");
    run.cancel_request = {
      requested_from_revision: manifest.record_revision, decision: structuredClone(input.decision),
      executor_handle: structuredClone(run.executor_handle), requested_by: input.actor_id,
      requested_at: new Date().toISOString(),
    };
  });
}

const workerTransitions = {
  planned: new Set(["admitted", "cancelled"]), admitted: new Set(["dispatched", "cancelled"]), dispatched: new Set(["running", "unknown", "completed", "failed", "cancelled"]), running: new Set(["unknown", "completed", "failed", "cancelled"]), unknown: new Set(["running", "completed", "failed", "cancelled"]), completed: new Set(), failed: new Set(), cancelled: new Set(),
};

function observationCore(observation) { return { source: observation.source, observed_version: observation.observed_version, observed_at: observation.observed_at, raw_state: observation.raw_state }; }

function validateWorkerObservation(value, executor, workflowId) {
  exactOptional(value, ["state", "source", "observed_version", "observed_at", "raw_state"], ["executor_handle", "dispatch_evidence", "dispatch_attempt_evidence", "result", "terminal_evidence"], "observation");
  oneOf(value.state, ["running", "unknown", "completed", "failed", "cancelled", "dispatched"], "observation.state");
  validateObservation(observationCore(value));
  if (own(value, "executor_handle")) validateHandle(value.executor_handle, executor, workflowId, true);
  for (const field of ["dispatch_evidence", "dispatch_attempt_evidence", "terminal_evidence"]) if (own(value, field)) evidenceArray(value[field], `observation.${field}`, 1);
  if (own(value, "result")) validateResult(value.result, false);
}

function handlesEqual(a, b) { return a === null || b === null ? a === b : JSON.stringify(a) === JSON.stringify(b); }

function changedPaths(baseline, completed) {
  if (baseline.head !== completed.head) fail("WORKSPACE_DRIFT", "workspace HEAD changed");
  if (baseline.index_digest !== completed.index_digest) fail("WORKSPACE_DRIFT", "workspace index changed");
  if (JSON.stringify(baseline.ignored_files) !== JSON.stringify(completed.ignored_files)) fail("WORKSPACE_DRIFT", "ignored output changed");
  const before = new Map(baseline.files.map((entry) => [foldPath(entry.path), entry])); const after = new Map(completed.files.map((entry) => [foldPath(entry.path), entry]));
  const keys = new Set([...before.keys(), ...after.keys()]); const changed = [];
  for (const key of keys) if (JSON.stringify(before.get(key) ?? null) !== JSON.stringify(after.get(key) ?? null)) changed.push((after.get(key) ?? before.get(key)).path);
  return changed;
}

function fingerprintChangedPaths(fingerprint) {
  return [...new Set([...fingerprint.files.map((entry) => entry.path), ...fingerprint.ignored_files.map((entry) => entry.path)])].sort();
}

function inWriteScope(path, task) { return task.write_scope.some((entry) => scopesOverlap(entry, { kind: "file", path })); }

function workerObservationEvidence(observation) {
  if (own(observation, "dispatch_evidence")) return observation.dispatch_evidence;
  if (own(observation, "dispatch_attempt_evidence")) return observation.dispatch_attempt_evidence;
  if (own(observation, "terminal_evidence")) return observation.terminal_evidence;
  if (own(observation, "result")) return observation.result.evidence;
  return [];
}

function packetDigest(value) {
  const payload = structuredClone(value);
  delete payload.packet_digest;
  delete payload.record_revision;
  delete payload.worker.state;
  delete payload.report_template;
  if (payload.workspace_binding?.mode === "executor-isolated") {
    payload.workspace_binding.execution_workspace = null;
    payload.workspace_binding.provider_binding = null;
    payload.workspace_binding.bound_from_revision = null;
    payload.workspace_binding.binding_evidence = [];
    payload.workspace_binding.bound_by = null;
    payload.workspace_binding.bound_at = null;
  }
  return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function workerReportTemplate(packet) {
  return {
    schema_id: WORKER_REPORT_SCHEMA,
    packet_digest: packet.packet_digest,
    required_fields: ["schema_version", "control_id", "task_id", "worker_run_id", "assignment_id", "packet_digest", "executor_handle", "observed_state", "status", "result_digest", "evidence", "validation_results", "changed_paths", "claims"],
    prohibited_fields: ["prompt", "raw_log", "secret", "extra"],
  };
}

function delegationPacket(manifest, task, run, { allowCancelled = false, reportCorrelation = false } = {}) {
  requireOperationalExecutor(run);
  if (!allowCancelled) requireTaskNotCancelled(manifest, task.task_id);
  const allowedStates = reportCorrelation ? ["dispatched", "running", "unknown"] : ["planned", "admitted"];
  if (!allowedStates.includes(run.state)) fail("INVALID_TRANSITION", "worker state cannot receive a delegation packet");
  const packet = {
    schema_version: DELEGATION_PACKET_SCHEMA,
    packet_digest: "",
    control_id: manifest.control_id,
    record_revision: manifest.record_revision,
    task: structuredClone(task),
    worker: {
      worker_run_id: run.worker_run_id, assignment_id: run.assignment_id, state: run.state,
      role_ref: run.role_ref, write_mode: run.write_mode, operation_digest: run.operation_digest,
    },
    executor: structuredClone(run.executor),
    workflow_id: run.workflow_id,
    workspace: structuredClone(run.workspace),
    workspace_binding: structuredClone(run.workspace_binding),
    scope: { read_scope: structuredClone(task.read_scope), write_scope: structuredClone(task.write_scope) },
    classification: task.classification,
    effect: task.effect,
    capabilities: structuredClone(run.workflow_capabilities),
    budget: structuredClone(run.budget_reservation),
    lineage: structuredClone(run.lineage),
    validation: structuredClone(task.validation),
    non_goals: structuredClone(task.non_goals),
    known_traps: structuredClone(task.known_traps),
    report_schema_id: WORKER_REPORT_SCHEMA,
    report_template: null,
  };
  packet.packet_digest = packetDigest(packet);
  packet.report_template = workerReportTemplate(packet);
  return packet;
}

function validateReportValidation(value) {
  boundedArray(value, "worker_report.validation_results", (entry, name) => {
    exact(entry, ["validation_ref", "outcome", "evidence"], name);
    string(entry.validation_ref, `${name}.validation_ref`, 4096); oneOf(entry.outcome, ["passed", "failed", "unknown"], `${name}.outcome`);
    validateEvidence(entry.evidence, `${name}.evidence`);
  });
}

function validateWorkerReport(value, run, task) {
  exact(value, ["schema_version", "control_id", "task_id", "worker_run_id", "assignment_id", "packet_digest", "executor_handle", "observed_state", "status", "result_digest", "evidence", "validation_results", "changed_paths", "claims"], "worker_report");
  if (value.schema_version !== WORKER_REPORT_SCHEMA) fail("INVALID_SCHEMA", "unsupported worker report schema");
  identifier(value.control_id, "worker_report.control_id"); identifier(value.task_id, "worker_report.task_id"); identifier(value.worker_run_id, "worker_report.worker_run_id"); identifier(value.assignment_id, "worker_report.assignment_id");
  if (!SHA256_RE.test(value.packet_digest) || !SHA256_RE.test(value.result_digest)) fail("INVALID_SCHEMA", "worker report digest is invalid");
  validateHandle(value.executor_handle, run.executor, run.workflow_id, false);
  oneOf(value.observed_state, ["completed"], "worker_report.observed_state"); oneOf(value.status, ["completed"], "worker_report.status");
  evidenceArray(value.evidence, "worker_report.evidence", 1); validateReportValidation(value.validation_results);
  boundedArray(value.changed_paths, "worker_report.changed_paths", (entry, name) => repoPath(entry, name));
  uniqueStringArray(value.changed_paths, "worker_report.changed_paths", (entry, name) => repoPath(entry, name));
  uniqueStringArray(value.claims, "worker_report.claims", (entry, name) => string(entry, name, 1024));
  const validationRefs = value.validation_results.map((entry) => entry.validation_ref);
  if (validationRefs.length !== task.validation.length || new Set(validationRefs).size !== validationRefs.length || validationRefs.some((entry) => !task.validation.includes(entry))) fail("VALIDATION_INCOMPLETE", "worker report does not cover task validation");
  if (value.validation_results.some((entry) => entry.outcome === "failed")) fail("REPORT_NONZERO", "worker report contains a failed validation");
  if (value.validation_results.some((entry) => entry.outcome === "unknown")) fail("VALIDATION_INCOMPLETE", "worker report has unknown validation result");
}

export async function delegationPacketForWorker(input) {
  exact(input, ["cwd", "control_id", "worker_run_id"], "input"); string(input.cwd, "input.cwd", 4096); identifier(input.control_id, "input.control_id"); identifier(input.worker_run_id, "input.worker_run_id");
  const identity = await gitIdentity(input.cwd); const manifests = await scanManifests(await statePaths(identity)); const manifest = targetManifest(manifests, input.control_id);
  if (manifest.status === "archived") fail("RECORD_ARCHIVED", "control is archived"); requireOperationalManifest(manifest);
  const run = manifest.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id); if (!run) fail("INVALID_SCHEMA", "worker run does not exist");
  return delegationPacket(manifest, taskForRun(manifest, run), run);
}

export function workerReportTemplateForPacket(packet) {
  exact(packet, ["schema_version", "packet_digest", "control_id", "record_revision", "task", "worker", "executor", "workflow_id", "workspace", "workspace_binding", "scope", "classification", "effect", "capabilities", "budget", "lineage", "validation", "non_goals", "known_traps", "report_schema_id", "report_template"], "delegation_packet");
  if (packet.schema_version !== DELEGATION_PACKET_SCHEMA || packet.report_schema_id !== WORKER_REPORT_SCHEMA || packet.packet_digest !== packetDigest(packet)) fail("INVALID_SCHEMA", "delegation packet is invalid");
  return workerReportTemplate(packet);
}

export async function importWorkerReport(input) {
  validateMutationBase(input, ["worker_run_id", "report"]); identifier(input.worker_run_id, "input.worker_run_id");
  return mutation(input, (before) => {
    const run = before.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id);
    return { operation: "worker-report-import", subjectKind: "worker-run", subjectId: input.worker_run_id, previousState: run?.state ?? null, nextState: "completed", evidence: input.report?.evidence ?? [] };
  }, async (manifest) => {
    const run = manifest.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id); if (!run) fail("INVALID_SCHEMA", "worker run does not exist");
    const task = taskForRun(manifest, run);
    validateWorkerReport(input.report, run, task);
    if (!workerTransitions[run.state].has("completed") || !["dispatched", "running", "unknown"].includes(run.state)) fail("INVALID_TRANSITION", "only active worker can import a completed report");
    if (input.report.control_id !== manifest.control_id || input.report.task_id !== task.task_id || input.report.worker_run_id !== run.worker_run_id || input.report.assignment_id !== run.assignment_id) fail("REPORT_CORRELATION_MISMATCH", "worker report identity does not match assignment");
    const packet = delegationPacket(manifest, task, run, { allowCancelled: true, reportCorrelation: true });
    if (input.report.packet_digest !== packet.packet_digest) fail("REPORT_CORRELATION_MISMATCH", "worker report packet digest does not match");
    if (!handlesEqual(run.executor_handle, input.report.executor_handle)) fail("REPORT_CORRELATION_MISMATCH", "worker report executor handle does not match");
    if (run.workspace_binding.mode === "executor-isolated" && run.workspace_binding.provider_binding.result_digest !== input.report.result_digest) fail("REPORT_CORRELATION_MISMATCH", "worker report digest differs from the sidecar result");
    let result = { result_digest: input.report.result_digest, evidence: structuredClone(input.report.evidence) };
    if (run.write_mode !== "none") {
      const storedWorkspace = requiredExecutionWorkspace(run); const workspace = await gitIdentity(storedWorkspace.worktree_root_realpath);
      if (!sameWorkspaceIdentity(storedWorkspace, workspace)) fail("WORKSPACE_DRIFT", "workspace identity changed"); await inspectTaskScopes(workspace, task);
      const fingerprint = await fingerprintWorkspace({ cwd: workspace.worktreeRoot, scope_guard: task.write_scope });
      const actualChanged = run.workspace_binding.mode === "executor-isolated"
        ? fingerprintChangedPaths(fingerprint)
        : changedPaths(run.baseline_workspace_fingerprint, fingerprint);
      if (run.workspace_binding.mode === "executor-isolated" && fingerprint.head !== run.workspace_binding.base_sha) fail("WORKSPACE_DRIFT", "execution workspace HEAD differs from sidecar base");
      if (actualChanged.some((path) => !inWriteScope(path, task)) || input.report.changed_paths.some((path) => !inWriteScope(path, task)) || JSON.stringify([...actualChanged].sort()) !== JSON.stringify([...input.report.changed_paths].sort())) fail("WORKSPACE_DRIFT", "worker report changed paths do not match workspace scope");
      result.workspace_fingerprint = fingerprint;
    } else if (input.report.changed_paths.length !== 0) fail("WORKSPACE_DRIFT", "read-only worker report cannot claim changed paths");
    run.result = result; run.state = "completed";
    run.executor_observation = { source: run.executor.adapter_id, observed_version: run.execution_verification.observed_version, observed_at: new Date().toISOString(), raw_state: "completed-report-import" };
  });
}

export async function observeWorker(input) {
  validateMutationBase(input, ["worker_run_id", "observation"]); identifier(input.worker_run_id, "input.worker_run_id");
  return mutation(input, (before) => {
    const run = before.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id);
    return { operation: "worker-observe", subjectKind: "worker-run", subjectId: input.worker_run_id, previousState: run?.state ?? null, nextState: input.observation.state, evidence: workerObservationEvidence(input.observation) };
  }, async (manifest) => {
    const run = manifest.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id); if (!run) fail("INVALID_SCHEMA", "worker run does not exist");
    validateWorkerObservation(input.observation, run.executor, run.workflow_id); const observation = input.observation;
    if (!workerTransitions[run.state].has(observation.state)) fail("INVALID_TRANSITION", "worker transition is invalid");
    if (own(observation, "executor_handle")) {
      if (run.executor_handle !== null && !handlesEqual(run.executor_handle, observation.executor_handle)) fail("INVALID_SCHEMA", "executor handle conflicts");
      if (observation.executor_handle !== null) run.executor_handle = structuredClone(observation.executor_handle);
    }
    if (observation.state === "dispatched") {
      if (!own(observation, "dispatch_evidence") || observation.dispatch_evidence.length === 0 || run.executor_handle === null) fail("EVIDENCE_REQUIRED", "dispatch evidence and handle are required");
      if (own(observation, "result") || own(observation, "terminal_evidence") || own(observation, "dispatch_attempt_evidence")) fail("INVALID_SCHEMA", "invalid dispatched evidence fields");
      run.dispatch_evidence.push(...structuredClone(observation.dispatch_evidence));
    } else if (run.state === "admitted" && observation.state === "cancelled" && run.cancel_request === null) {
      if (!own(observation, "dispatch_attempt_evidence")) fail("EVIDENCE_REQUIRED", "dispatch attempt evidence is required");
      if (own(observation, "result") || own(observation, "terminal_evidence") || own(observation, "dispatch_evidence")) fail("INVALID_SCHEMA", "invalid cancelled evidence fields");
      run.dispatch_attempt_evidence.push(...structuredClone(observation.dispatch_attempt_evidence));
    } else if (run.state === "planned" && observation.state === "cancelled") {
      if (["executor_handle", "result", "terminal_evidence", "dispatch_evidence", "dispatch_attempt_evidence"].some((key) => own(observation, key))) fail("INVALID_SCHEMA", "planned cancellation cannot carry execution fields");
    } else if (observation.state === "completed") {
      if (!own(observation, "result")) fail("EVIDENCE_REQUIRED", "completed result evidence is required");
      if (own(observation, "terminal_evidence") || own(observation, "dispatch_evidence") || own(observation, "dispatch_attempt_evidence")) fail("INVALID_SCHEMA", "invalid completed evidence fields");
      const task = taskForRun(manifest, run); let result = structuredClone(observation.result);
      if (run.write_mode !== "none") {
        const storedWorkspace = requiredExecutionWorkspace(run); const workspace = await gitIdentity(storedWorkspace.worktree_root_realpath);
        if (!sameWorkspaceIdentity(storedWorkspace, workspace)) fail("WORKSPACE_DRIFT", "workspace identity changed"); await inspectTaskScopes(workspace, task);
        const fingerprint = await fingerprintWorkspace({ cwd: workspace.worktreeRoot, scope_guard: task.write_scope });
        const actualChanged = run.workspace_binding.mode === "executor-isolated" ? fingerprintChangedPaths(fingerprint) : changedPaths(run.baseline_workspace_fingerprint, fingerprint);
        if (run.workspace_binding.mode === "executor-isolated" && fingerprint.head !== run.workspace_binding.base_sha) fail("WORKSPACE_DRIFT", "execution workspace HEAD differs from sidecar base");
        if (actualChanged.some((path) => !inWriteScope(path, task))) fail("WORKSPACE_DRIFT", "workspace changed outside write scope");
        result.workspace_fingerprint = fingerprint;
      }
      run.result = result;
    } else if (["failed", "cancelled"].includes(observation.state) && run.state !== "planned") {
      if (!own(observation, "terminal_evidence")) fail("EVIDENCE_REQUIRED", "terminal evidence is required");
      if (own(observation, "result") || own(observation, "dispatch_evidence") || own(observation, "dispatch_attempt_evidence")) fail("INVALID_SCHEMA", "invalid terminal evidence fields");
      run.terminal_evidence.push(...structuredClone(observation.terminal_evidence));
    } else if (["running", "unknown"].includes(observation.state)) {
      if (["result", "terminal_evidence", "dispatch_evidence", "dispatch_attempt_evidence"].some((key) => own(observation, key))) fail("INVALID_SCHEMA", "nonterminal observation has terminal evidence");
    }
    run.state = observation.state; run.executor_observation = observationCore(observation);
  });
}

const consultTransitions = { planned: new Set(["dispatched"]), dispatched: new Set(["running", "unknown", "completed", "failed"]), running: new Set(["running", "unknown", "completed", "failed"]), unknown: new Set(["running", "unknown", "completed", "failed"]), completed: new Set(), failed: new Set() };

export async function observeConsultation(input) {
  validateMutationBase(input, ["consultation_id", "observation"]); identifier(input.consultation_id, "input.consultation_id");
  return mutation(input, (before) => {
    const consultation = before.consultations.find((entry) => entry.consultation_id === input.consultation_id);
    return { operation: "consultation-observe", subjectKind: "consultation", subjectId: input.consultation_id, previousState: consultation?.state ?? null, nextState: input.observation.state, evidence: input.observation.terminal_evidence ?? [] };
  }, async (manifest) => {
    const consultation = manifest.consultations.find((entry) => entry.consultation_id === input.consultation_id); if (!consultation) fail("INVALID_SCHEMA", "consultation does not exist");
    exactOptional(input.observation, ["state", "source", "observed_version", "observed_at", "raw_state"], ["decision_ref", "terminal_evidence"], "observation");
    const observation = input.observation; oneOf(observation.state, ["dispatched", "running", "unknown", "completed", "failed"], "observation.state"); validateObservation(observationCore(observation));
    if (!consultTransitions[consultation.state].has(observation.state)) fail("INVALID_TRANSITION", "consultation transition is invalid");
    if (consultation.state === "planned" && observation.state === "dispatched") {
      const task = manifest.tasks.find((entry) => entry.task_id === consultation.task_id); if (!task) fail("INVALID_SCHEMA", "consultation task is missing");
      requireTaskNotCancelled(manifest, task.task_id);
      requireDependenciesReady(manifest, task);
      requireCampaignsReleased(manifest, task.task_id);
    }
    if (observation.state === "completed") { if (!own(observation, "decision_ref")) fail("EVIDENCE_REQUIRED", "completed consultation requires decision_ref"); repoPath(observation.decision_ref, "observation.decision_ref"); if (own(observation, "terminal_evidence")) fail("INVALID_SCHEMA", "completed consultation cannot have terminal evidence"); consultation.decision_ref = observation.decision_ref; }
    else if (observation.state === "failed") { if (!own(observation, "terminal_evidence")) fail("EVIDENCE_REQUIRED", "failed consultation requires evidence"); evidenceArray(observation.terminal_evidence, "observation.terminal_evidence", 1); if (own(observation, "decision_ref")) fail("INVALID_SCHEMA", "failed consultation cannot have decision_ref"); consultation.terminal_evidence.push(...structuredClone(observation.terminal_evidence)); }
    else if (own(observation, "decision_ref") || own(observation, "terminal_evidence")) fail("INVALID_SCHEMA", "nonterminal consultation has terminal fields");
    consultation.state = observation.state; consultation.executor_observation = observationCore(observation);
  });
}

export async function conflictCheck(input) {
  apiInput(input, ["cwd", "control_id"], ["proposed_worker_run"]); identifier(input.control_id, "input.control_id");
  const identity = await gitIdentity(input.cwd); const paths = await statePaths(identity); const manifests = await scanManifests(paths); const manifest = targetManifest(manifests, input.control_id);
  if (input.proposed_worker_run !== undefined) {
    validateWorker(input.proposed_worker_run, false); requireOperationalExecutor(input.proposed_worker_run); const task = manifest.tasks.find((entry) => entry.task_id === input.proposed_worker_run.task_id); if (!task) fail("INVALID_SCHEMA", "proposed worker task missing");
    const workspace = await gitIdentity(input.proposed_worker_run.workspace_cwd); const candidate = { ...input.proposed_worker_run, workspace: workspaceObject(workspace) }; delete candidate.workspace_cwd;
    return { conflicts: conflictList(manifests, candidate, task) };
  }
  const conflicts = [];
  const admitted = manifests.flatMap((control) => control.worker_runs.filter((run) => RESERVED_WRITER.has(run.state)).map((run) => ({ control, run })));
  for (let index = 0; index < admitted.length; index++) {
    const { control, run } = admitted[index]; const task = control.tasks.find((entry) => entry.task_id === run.task_id);
    conflicts.push(...conflictList(manifests.slice(index + 1), run, task));
  }
  return { conflicts };
}

async function decide(input, decision) {
  validateMutationBase(input, ["worker_run_id", "result_digest", "verification_evidence", "decision_note", "decided_by"]);
  identifier(input.worker_run_id, "input.worker_run_id"); if (!SHA256_RE.test(input.result_digest)) fail("INVALID_SCHEMA", "result_digest is invalid"); evidenceArray(input.verification_evidence, "input.verification_evidence", 1); string(input.decision_note, "input.decision_note", 4096); string(input.decided_by, "input.decided_by");
  return mutation(input, { operation: decision === "accepted" ? "worker-accept" : "worker-reject", subjectKind: "worker-run", subjectId: input.worker_run_id, previousState: "acceptance-pending", nextState: decision, evidence: input.verification_evidence }, async (manifest) => {
    const run = manifest.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id); if (!run) fail("INVALID_SCHEMA", "worker run does not exist");
    if (run.state !== "completed" || run.result === null || run.acceptance !== null) fail("INVALID_TRANSITION", "worker cannot be accepted or rejected");
    if (run.result.result_digest !== input.result_digest) fail("INVALID_SCHEMA", "result digest differs from observation");
    if (run.write_mode !== "none") {
      const storedWorkspace = requiredExecutionWorkspace(run); const workspace = await gitIdentity(storedWorkspace.worktree_root_realpath); if (!sameWorkspaceIdentity(storedWorkspace, workspace)) fail("WORKSPACE_DRIFT", "workspace identity changed");
      const task = taskForRun(manifest, run); await inspectTaskScopes(workspace, task); const fingerprint = await fingerprintWorkspace({ cwd: workspace.worktreeRoot, scope_guard: task.write_scope });
      if (JSON.stringify(fingerprint) !== JSON.stringify(run.result.workspace_fingerprint)) fail("WORKSPACE_DRIFT", "workspace changed after completion");
    }
    run.acceptance = { decision, accepted_from_revision: manifest.record_revision, result_digest: input.result_digest, executor_handle: structuredClone(run.executor_handle), verification_evidence: structuredClone(input.verification_evidence), decision_note: input.decision_note, decided_by: input.decided_by, decided_at: new Date().toISOString() };
  });
}

export const accept = (input) => decide(input, "accepted");
export const reject = (input) => decide(input, "rejected");

export async function taskFinalizeRecord(input) {
  validateMutationBase(input, ["task_id", "finalization_ref", "recorded_by"]); identifier(input.task_id, "input.task_id"); repoPath(input.finalization_ref, "input.finalization_ref"); string(input.recorded_by, "input.recorded_by");
  return mutation(input, { operation: "task-finalize", subjectKind: "task-finalization", subjectId: input.task_id, previousState: "unfinalized", nextState: "finalized", evidence: [] }, async (manifest) => {
    if (!manifest.tasks.some((task) => task.task_id === input.task_id)) fail("INVALID_SCHEMA", "task does not exist");
    if (manifest.task_finalizations.some((entry) => entry.task_id === input.task_id)) fail("DUPLICATE_ID", "task finalization already exists");
    manifest.task_finalizations.push({ task_id: input.task_id, finalization_ref: input.finalization_ref, recorded_by: input.recorded_by, recorded_at: new Date().toISOString() });
  });
}

function assertControlReadyForFinalization(manifest, code) {
  const workerReady = manifest.worker_runs.every((run) => !WORKER_NONTERMINAL.has(run.state) && (run.state !== "completed" || run.acceptance !== null));
  const consultationReady = manifest.consultations.every((entry) => !CONSULT_NONTERMINAL.has(entry.state) && (entry.state !== "completed" || entry.decision_ref !== null));
  const tasksFinalized = manifest.tasks.every((task) => manifest.task_finalizations.some((entry) => entry.task_id === task.task_id));
  const campaignsReleased = manifest.campaigns.every((campaign) => campaign.release !== null);
  if (!workerReady || !consultationReady || !tasksFinalized || !campaignsReleased) fail(code, "control is not ready for finalization");
}

export async function finalizeControl(input) {
  validateMutationBase(input, ["acceptance_matrix_ref", "final_audit_evidence", "regression_evidence", "knowledge_return_refs", "parent_decision", "finalized_by"]);
  repoPath(input.acceptance_matrix_ref, "input.acceptance_matrix_ref");
  evidenceArray(input.final_audit_evidence, "input.final_audit_evidence", 1);
  evidenceArray(input.regression_evidence, "input.regression_evidence", 1);
  refs(input.knowledge_return_refs, "input.knowledge_return_refs", 1);
  validateEvidence(input.parent_decision, "input.parent_decision");
  if (input.parent_decision.type !== "decision") fail("INVALID_SCHEMA", "parent_decision must be decision evidence");
  string(input.finalized_by, "input.finalized_by");
  const receiptEvidence = [...input.final_audit_evidence, ...input.regression_evidence, input.parent_decision];
  if (receiptEvidence.length > ARRAY_LIMIT) fail("LIMIT_EXCEEDED", "control finalization receipt evidence exceeds limit");
  return mutation(input, { operation: "control-finalize", subjectKind: "control", subjectId: input.control_id, previousState: "active", nextState: "finalized", evidence: receiptEvidence }, async (manifest) => {
    if (manifest.control_finalization !== null) fail("DUPLICATE_ID", "control finalization already exists");
    assertControlReadyForFinalization(manifest, "FINALIZATION_NOT_READY");
    manifest.control_finalization = {
      objective_ref: manifest.declaration.objective_ref,
      acceptance_matrix_ref: input.acceptance_matrix_ref,
      final_audit_evidence: structuredClone(input.final_audit_evidence),
      regression_evidence: structuredClone(input.regression_evidence),
      knowledge_return_refs: [...input.knowledge_return_refs],
      parent_decision: structuredClone(input.parent_decision),
      finalized_from_revision: manifest.record_revision,
      finalized_by: input.finalized_by,
      finalized_at: new Date().toISOString(),
    };
  });
}

export async function archive(input) {
  validateMutationBase(input, []);
  return mutation(input, { operation: "control-archive", subjectKind: "control", subjectId: input.control_id, previousState: "finalized", nextState: "archived", evidence: [] }, async (manifest) => {
    if (manifest.control_finalization === null) fail("ARCHIVE_NOT_READY", "control-level finalization is required before archive");
    assertControlReadyForFinalization(manifest, "ARCHIVE_NOT_READY");
    manifest.status = "archived";
  });
}

function pidState(pid) {
  try { process.kill(pid, 0); return "live"; } catch (error) { if (error.code === "EPERM") return "live"; if (error.code === "ESRCH") return "dead"; fail("IO_FAILURE", "PID liveness is unknown", { cause: error.code }); }
}

export async function recoverLock(input) {
  apiInput(input, ["cwd", "expected_token"]); if (typeof input.expected_token !== "string" || !UUID_RE.test(input.expected_token)) fail("INVALID_INPUT", "expected_token must be a canonical UUID");
  const identity = await gitIdentity(input.cwd); const paths = await statePaths(identity); const path = join(paths.owners, `${input.expected_token}.owner`);
  let observed; try { observed = await readOwner(path); } catch (error) { if (error instanceof ControlRecordError && error.code === "IO_FAILURE" && error.details?.cause === "ENOENT") fail("LOCK_NOT_FOUND", "lock owner does not exist"); throw error; }
  if (observed.owner.token !== input.expected_token) fail("LOCK_TOKEN_MISMATCH", "lock token differs from owner body");
  if (pidState(observed.owner.pid) === "live") fail("LOCK_LIVE", "lock owner process is live");
  await safeUnlinkOwner(path, observed.owner, observed.stat); return { recovered: true, token: input.expected_token };
}

function parseStatus(buffer) {
  const records = decodeUtf8(buffer, "STATE_PATH_UNSAFE", "git status contains invalid UTF-8").split("\0"); const files = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index]; if (!record) continue;
    const kind = record[0]; let path; let state;
    if (kind === "?") { state = "?"; path = record.slice(2); }
    else if (kind === "1") { const parts = record.split(" "); if (parts.length < 9) fail("GIT_FAILURE", "malformed git status"); state = parts[1]; path = parts.slice(8).join(" "); }
    else if (kind === "2") { const parts = record.split(" "); if (parts.length < 10) fail("GIT_FAILURE", "malformed git status"); state = parts[1]; path = parts.slice(9).join(" "); index += 1; }
    else if (kind === "u") { const parts = record.split(" "); if (parts.length < 11) fail("GIT_FAILURE", "malformed git status"); state = parts[1]; path = parts.slice(10).join(" "); }
    else if (kind === "!") continue;
    else fail("GIT_FAILURE", "unknown git status record");
    try { repoPath(path, "status path"); } catch (error) { if (error instanceof ControlRecordError) fail("STATE_PATH_UNSAFE", "git status contains unsafe path"); throw error; }
    files.push({ path, state });
  }
  files.sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)) || a.state.localeCompare(b.state)); return files;
}

async function hashRegularFile(root, path, budget) {
  const full = join(root, ...path.split("/")); const rel = relative(root, full);
  if (rel.startsWith(`..${sep}`) || rel === ".." || isAbsolute(rel)) fail("STATE_PATH_UNSAFE", "file escapes worktree");
  await inspectScopePath(root, { kind: "file", path });
  let handle;
  try {
    handle = await open(full, FS.O_RDONLY | (FS.O_NOFOLLOW ?? 0)); const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1) fail("STATE_PATH_UNSAFE", "changed path is not a regular single-link file");
    if (before.size > budget.remaining) fail("LIMIT_EXCEEDED", "changed file content exceeds 64 MiB");
    budget.remaining -= before.size; const hash = createHash("sha256"); let total = 0;
    for await (const chunk of handle.createReadStream({ autoClose: false })) { total += chunk.length; if (total > before.size || total > FILES_LIMIT) fail("WORKSPACE_DRIFT", "file grew while hashing"); hash.update(chunk); }
    const after = await handle.stat(); const pathInfo = await lstat(full);
    if (total !== before.size || !after.isFile() || after.nlink !== 1 || pathInfo.isSymbolicLink() || !pathInfo.isFile() || pathInfo.nlink !== 1 || before.dev !== after.dev || before.ino !== after.ino || after.dev !== pathInfo.dev || after.ino !== pathInfo.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs) fail("WORKSPACE_DRIFT", "file changed while hashing");
    return hash.digest("hex");
  } catch (error) {
    if (error instanceof ControlRecordError) throw error;
    if (error.code === "ENOENT") return null;
    if (error.code === "ELOOP") fail("STATE_PATH_UNSAFE", "symlink is forbidden");
    fail("IO_FAILURE", "changed file hashing failed", { cause: error.code });
  } finally { await handle?.close().catch(() => {}); }
}

async function fingerprintPass(identity, scopeGuard) {
  if (identity.kind !== "worktree") fail("INVALID_INPUT", "fingerprint requires a worktree");
  const refreshed = await gitIdentity(identity.worktreeRoot); if (!sameWorkspaceIdentity(workspaceObject(identity), refreshed)) fail("WORKSPACE_DRIFT", "workspace identity changed");
  const indexPathRaw = (await runGit(identity.worktreeRoot, ["rev-parse", "--git-path", "index"])).stdout.toString().trim();
  const indexPath = isAbsolute(indexPathRaw) ? indexPathRaw : resolve(identity.worktreeRoot, indexPathRaw);
  let indexBuffer;
  try { indexBuffer = (await safeBoundedFile(indexPath, GIT_OUTPUT_LIMIT)).buffer; } catch (error) { if (error instanceof ControlRecordError && error.code === "IO_FAILURE" && error.details?.cause === "ENOENT") indexBuffer = Buffer.alloc(0); else throw error; }
  const statusBuffer = (await runGit(identity.worktreeRoot, ["status", "--porcelain=v2", "-z", "--untracked-files=all", "--no-renames"], { limit: GIT_OUTPUT_LIMIT })).stdout;
  const statusFiles = parseStatus(statusBuffer); const budget = { remaining: FILES_LIMIT }; const files = [];
  for (const entry of statusFiles) {
    const full = join(identity.worktreeRoot, ...entry.path.split("/")); let info;
    try { info = await lstat(full); } catch (error) { if (error.code !== "ENOENT") fail("IO_FAILURE", "changed path inspection failed", { cause: error.code }); }
    let digest = null;
    if (info) {
      if (info.isSymbolicLink() || !info.isFile() || info.nlink !== 1) fail("STATE_PATH_UNSAFE", "changed path is not a regular single-link file");
      digest = await hashRegularFile(identity.worktreeRoot, entry.path, budget);
    }
    files.push({ path: entry.path, state: entry.state, file_mode: info ? info.mode : null, content_digest: digest });
  }
  const ignoredFiles = [];
  if (scopeGuard.length > 0) {
    const ignoredBuffer = (await runGit(identity.worktreeRoot, ["ls-files", "--others", "--ignored", "--exclude-standard", "-z", "--", ...scopeGuard.map((entry) => entry.path)], { limit: GIT_OUTPUT_LIMIT })).stdout;
    const ignoredPaths = decodeUtf8(ignoredBuffer, "STATE_PATH_UNSAFE", "ignored paths contain invalid UTF-8").split("\0").filter(Boolean);
    if (ignoredPaths.length > ARRAY_LIMIT) fail("LIMIT_EXCEEDED", "too many ignored files in write scope");
    ignoredPaths.sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
    for (const path of ignoredPaths) {
      repoPath(path, "ignored path");
      const contentDigest = await hashRegularFile(identity.worktreeRoot, path, budget);
      if (contentDigest === null) fail("WORKSPACE_DRIFT", "ignored file disappeared during fingerprint");
      ignoredFiles.push({ path, content_digest: contentDigest });
    }
  }
  const value = { head: refreshed.head, index_digest: createHash("sha256").update(indexBuffer).digest("hex"), status_digest: createHash("sha256").update(statusBuffer).digest("hex"), files, ignored_files: ignoredFiles };
  return { digest: createHash("sha256").update(JSON.stringify(value)).digest("hex"), ...value };
}

export async function fingerprintWorkspace(input) {
  apiInput(input, ["cwd"], ["scope_guard"]); const scopeGuard = input.scope_guard ?? []; validateScopeArray(scopeGuard, "input.scope_guard");
  const identity = await gitIdentity(input.cwd); const first = await fingerprintPass(identity, scopeGuard); const second = await fingerprintPass(identity, scopeGuard);
  if (JSON.stringify(first) !== JSON.stringify(second)) fail("WORKSPACE_DRIFT", "workspace changed during fingerprint"); return first;
}
