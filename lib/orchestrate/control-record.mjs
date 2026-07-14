import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants as FS, createReadStream } from "node:fs";
import {
  chmod, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, stat, unlink,
} from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";

const MANIFEST_SCHEMA = "dotagents.orchestration-control.v4";
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
const OPAQUE_HANDLE_LIMIT = 4096;
const OPAQUE_HANDLE_DEPTH = 4;

const EXECUTOR_CONTRACTS = new Set([
  "parent\u0000v1\u0000direct\u0000parent.correlation.v1",
  "codex-native\u0000v1\u0000native-subagent\u0000codex-native.agent-id.v1",
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
  exact(value, ["objective_ref", "project_root_realpath", "common_dir_realpath", "git_dir_realpath", "base_sha", "initial_dirty", "created_at", "created_by"], "declaration");
  repoPath(value.objective_ref, "declaration.objective_ref");
  if (value.project_root_realpath !== null) string(value.project_root_realpath, "declaration.project_root_realpath", 4096);
  string(value.common_dir_realpath, "declaration.common_dir_realpath", 4096);
  string(value.git_dir_realpath, "declaration.git_dir_realpath", 4096);
  if (value.base_sha !== null && !SHA1_RE.test(value.base_sha)) fail("INVALID_SCHEMA", "declaration.base_sha is invalid");
  if (typeof value.initial_dirty !== "boolean") fail("INVALID_SCHEMA", "declaration.initial_dirty must be boolean");
  if (value.project_root_realpath === null && value.initial_dirty !== false) fail("INVALID_SCHEMA", "bare declaration cannot be dirty");
  timestamp(value.created_at, "declaration.created_at");
  string(value.created_by, "declaration.created_by");
}

function validateContextPolicy(value, name) {
  exact(value, ["share_objective", "share_current_candidate", "share_existing_findings", "share_failed_approaches", "share_test_results"], name);
  for (const [key, current] of Object.entries(value)) if (typeof current !== "boolean") fail("INVALID_SCHEMA", `${name}.${key} must be boolean`);
}

function validateTask(value, stored = true) {
  const keys = ["task_id", "title", "classification", "effect", "doc_ref", "role", "lane", "depends_on", "required_capabilities", "isolation", "context_policy", "validation", "non_goals", "known_traps", "read_scope", "write_scope", "approval_ref", "alternative_group", ...(stored ? ["admission_digest"] : [])];
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
  if (value.approval_ref !== null) repoPath(value.approval_ref, "task.approval_ref");
  if (value.classification === "H" && value.approval_ref === null) fail("INVALID_SCHEMA", "H task requires approval_ref");
  if (value.alternative_group !== null) identifier(value.alternative_group, "task.alternative_group");
  if (stored && (!SHA256_RE.test(value.admission_digest) || value.admission_digest !== taskAdmissionDigest(value))) fail("INVALID_SCHEMA", "task.admission_digest is invalid");
}

function validateVerification(value) {
  exact(value, ["stage", "observed_version", "observed_at", "evidence"], "execution_verification");
  oneOf(value.stage, ["unverified", "installed", "registered", "verified", "execution-verified"], "execution_verification.stage");
  string(value.observed_version, "execution_verification.observed_version");
  timestamp(value.observed_at, "execution_verification.observed_at");
  validateEvidence(value.evidence, "execution_verification.evidence");
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

function validateWorkflowCapabilities(value) {
  boundedArray(value, "workflow_capabilities", (entry, name) => {
    exact(entry, ["capability_id", "value", "evidence"], name);
    identifier(entry.capability_id, `${name}.capability_id`);
    oneOf(entry.value, ["true", "false", "unknown"], `${name}.value`);
    if (entry.evidence === null) {
      if (entry.value !== "unknown") fail("INVALID_SCHEMA", `${name}.evidence is required for known capability values`);
    } else validateEvidence(entry.evidence, `${name}.evidence`);
  }, { min: 1 });
  const ids = value.map((entry) => entry.capability_id);
  if (new Set(ids).size !== ids.length) fail("INVALID_SCHEMA", "workflow_capabilities contains duplicates");
  const sorted = [...ids].sort();
  if (ids.some((entry, index) => entry !== sorted[index])) fail("INVALID_SCHEMA", "workflow_capabilities must be sorted by capability_id");
}

function validateBudget(value) {
  exact(value, ["max_worker_runs", "max_consultations", "max_external_runs", "max_wall_time_seconds", "max_cost_microusd"], "budget");
  integer(value.max_worker_runs, "budget.max_worker_runs");
  integer(value.max_consultations, "budget.max_consultations");
  integer(value.max_external_runs, "budget.max_external_runs");
  nullableInteger(value.max_wall_time_seconds, "budget.max_wall_time_seconds");
  nullableInteger(value.max_cost_microusd, "budget.max_cost_microusd");
}

function validateBudgetReservation(value, name = "budget_reservation") {
  exact(value, ["wall_time_seconds", "cost_microusd"], name);
  nullableInteger(value.wall_time_seconds, `${name}.wall_time_seconds`, { min: 1 });
  nullableInteger(value.cost_microusd, `${name}.cost_microusd`, { min: 0 });
}

function externalWorker(worker) {
  return !["parent", "codex-native"].includes(worker.executor.adapter_id);
}

function assertBudgetWithin(manifest, extraWorker = null, extraConsultation = null, { allowUnknown = false } = {}) {
  const workers = extraWorker === null ? manifest.worker_runs : [...manifest.worker_runs, extraWorker];
  const consultations = extraConsultation === null ? manifest.consultations : [...manifest.consultations, extraConsultation];
  if (workers.length > manifest.budget.max_worker_runs) fail("BUDGET_EXCEEDED", "worker run budget is exceeded");
  if (consultations.length > manifest.budget.max_consultations) fail("BUDGET_EXCEEDED", "consultation budget is exceeded");
  if (workers.filter(externalWorker).length > manifest.budget.max_external_runs) fail("BUDGET_EXCEEDED", "external worker run budget is exceeded");
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
      "codex-native.agent-id.v1", "codex-sidecar.synchronous.v1", "aiterm.session.v1", "claude-native.session.v1",
    ].includes(schema);
    if (nullAllowed) return;
    fail("INVALID_SCHEMA", "executor_handle cannot be null for this handle schema");
  }
  if (schema === "parent.correlation.v1") {
    exact(value, ["correlation_id"], "executor_handle"); identifier(value.correlation_id, "executor_handle.correlation_id");
  } else if (schema === "codex-native.agent-id.v1") {
    exact(value, ["agent_id"], "executor_handle"); identifier(value.agent_id, "executor_handle.agent_id");
  } else if (schema === "codex-sidecar.idempotency-key.v1") {
    exact(value, ["idempotency_key"], "executor_handle"); string(value.idempotency_key, "executor_handle.idempotency_key");
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
  exact(value, ["digest", "head", "index_digest", "status_digest", "files"], "workspace_fingerprint");
  if (!SHA256_RE.test(value.digest) || !SHA256_RE.test(value.index_digest) || !SHA256_RE.test(value.status_digest)) fail("INVALID_SCHEMA", "fingerprint digest is invalid");
  if (value.head !== null && !SHA1_RE.test(value.head)) fail("INVALID_SCHEMA", "fingerprint HEAD is invalid");
  boundedArray(value.files, "workspace_fingerprint.files", (entry) => {
    exact(entry, ["path", "state", "content_digest"], "fingerprint file");
    repoPath(entry.path, "fingerprint file.path"); string(entry.state, "fingerprint file.state", 16);
    if (entry.content_digest !== null && !SHA256_RE.test(entry.content_digest)) fail("INVALID_SCHEMA", "file digest is invalid");
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
  const location = stored ? ["workspace", "baseline_workspace_fingerprint"] : ["workspace_cwd"];
  exact(value, [...common, ...location, "workflow_capabilities", "budget_reservation", "write_mode", "execution_verification", "lineage", "state", "executor_handle", "executor_observation", "admission", "dispatch_evidence", "dispatch_attempt_evidence", "terminal_evidence", "result", "acceptance"], "worker_run");
  identifier(value.worker_run_id, "worker_run.worker_run_id"); identifier(value.task_id, "worker_run.task_id"); identifier(value.assignment_id, "worker_run.assignment_id");
  validateExecutorEnvelope(value.executor); identifier(value.workflow_id, "worker_run.workflow_id");
  validateWorkflowCapabilities(value.workflow_capabilities);
  validateBudgetReservation(value.budget_reservation);
  string(value.role_ref, "worker_run.role_ref");
  if (stored) validateWorkspace(value.workspace); else string(value.workspace_cwd, "worker_run.workspace_cwd", 4096);
  oneOf(value.write_mode, ["none", "direct", "isolated-alternative"], "worker_run.write_mode");
  validateVerification(value.execution_verification);
  validateLineage(value.lineage);
  oneOf(value.state, ["planned", "admitted", "dispatched", "running", "unknown", "completed", "failed", "cancelled"], "worker_run.state");
  validateHandle(value.executor_handle, value.executor, value.workflow_id, true);
  validateWorkflowCapabilityContract(value);
  if (value.executor_observation !== null) validateObservation(value.executor_observation);
  if (value.admission !== null) validateAdmission(value.admission);
  evidenceArray(value.dispatch_evidence, "worker_run.dispatch_evidence");
  evidenceArray(value.dispatch_attempt_evidence, "worker_run.dispatch_attempt_evidence");
  evidenceArray(value.terminal_evidence, "worker_run.terminal_evidence");
  if (!stored && (value.state !== "planned" || value.executor_observation !== null || value.admission !== null || value.dispatch_evidence.length || value.dispatch_attempt_evidence.length || value.terminal_evidence.length || value.result !== null || value.acceptance !== null)) fail("INVALID_SCHEMA", "new worker must be pristine planned state");
  if (stored) {
    if (value.baseline_workspace_fingerprint !== null) validateFingerprint(value.baseline_workspace_fingerprint);
    if (value.write_mode === "none" && value.baseline_workspace_fingerprint !== null) fail("INVALID_SCHEMA", "read run cannot have baseline fingerprint");
    if (value.write_mode !== "none" && RESERVED_WRITER.has(value.state) && value.baseline_workspace_fingerprint === null) fail("INVALID_SCHEMA", "admitted writer requires baseline fingerprint");
    if (value.result !== null) validateResult(value.result, value.write_mode !== "none");
    if (value.acceptance !== null) validateAcceptance(value.acceptance, value.executor, value.workflow_id);
    const dispatched = value.dispatch_evidence.length > 0;
    const attempted = value.dispatch_attempt_evidence.length > 0;
    const terminal = value.terminal_evidence.length > 0;
    const admitted = value.admission !== null;
    const observed = value.executor_observation !== null;
    if (admitted && value.admission.write_reservation !== (value.write_mode !== "none")) fail("INVALID_SCHEMA", "admission contradicts write mode");
    if (value.write_mode !== "none" && admitted && value.baseline_workspace_fingerprint === null) fail("INVALID_SCHEMA", "admitted writer requires baseline fingerprint");
    if (value.state === "planned" && (admitted || observed || dispatched || attempted || terminal || value.result !== null || value.acceptance !== null)) fail("INVALID_SCHEMA", "planned worker truth table is invalid");
    if (value.state === "admitted" && (!admitted || observed || dispatched || attempted || terminal || value.result !== null || value.acceptance !== null)) fail("INVALID_SCHEMA", "admitted worker truth table is invalid");
    if (["dispatched", "running", "unknown"].includes(value.state) && (!admitted || !observed || !dispatched || attempted || terminal || value.executor_handle === null || value.result !== null || value.acceptance !== null)) fail("INVALID_SCHEMA", "active worker truth table is invalid");
    if (value.state === "completed" && (!admitted || !observed || !dispatched || attempted || terminal || value.executor_handle === null || value.result === null)) fail("INVALID_SCHEMA", "completed worker truth table is invalid");
    if (value.state === "failed" && (!admitted || !observed || !dispatched || attempted || !terminal || value.result !== null || value.acceptance !== null)) fail("INVALID_SCHEMA", "failed worker truth table is invalid");
    if (value.state === "cancelled") {
      const validPlanned = !admitted && observed && !dispatched && !attempted && !terminal;
      const validAdmitted = admitted && observed && !dispatched && attempted && !terminal;
      const validDispatched = admitted && observed && dispatched && !attempted && terminal;
      if ((!validPlanned && !validAdmitted && !validDispatched) || value.result !== null || value.acceptance !== null) fail("INVALID_SCHEMA", "cancelled worker truth table is invalid");
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

const TRANSITION_OPERATIONS = [
  "control-init", "task-record", "worker-run-record", "consultation-record", "worker-admit",
  "worker-observe", "consultation-observe", "worker-accept", "worker-reject", "task-finalize", "control-archive",
];

function receiptDigest(value) {
  const payload = structuredClone(value);
  delete payload.receipt_digest;
  return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function validateTransitionReceipt(value, name) {
  exact(value, ["revision", "actor_id", "operation", "subject", "previous_state", "next_state", "evidence", "recorded_at", "previous_receipt_digest", "receipt_digest"], name);
  integer(value.revision, `${name}.revision`); string(value.actor_id, `${name}.actor_id`);
  oneOf(value.operation, TRANSITION_OPERATIONS, `${name}.operation`);
  exact(value.subject, ["kind", "id"], `${name}.subject`);
  oneOf(value.subject.kind, ["control", "task", "worker-run", "consultation", "task-finalization"], `${name}.subject.kind`);
  identifier(value.subject.id, `${name}.subject.id`);
  if (value.previous_state !== null) string(value.previous_state, `${name}.previous_state`);
  string(value.next_state, `${name}.next_state`);
  evidenceArray(value.evidence, `${name}.evidence`);
  timestamp(value.recorded_at, `${name}.recorded_at`);
  if (value.previous_receipt_digest !== null && !SHA256_RE.test(value.previous_receipt_digest)) fail("INVALID_SCHEMA", `${name}.previous_receipt_digest is invalid`);
  if (!SHA256_RE.test(value.receipt_digest) || value.receipt_digest !== receiptDigest(value)) fail("INVALID_SCHEMA", `${name}.receipt_digest is invalid`);
}

export function validateManifest(value) {
  exact(value, ["schema_version", "record_revision", "control_id", "status", "declaration", "budget", "document_refs", "tasks", "worker_runs", "consultations", "task_finalizations", "transition_receipts", "last_update"], "manifest");
  if (value.schema_version !== MANIFEST_SCHEMA) fail("INVALID_SCHEMA", "unsupported manifest schema");
  integer(value.record_revision, "manifest.record_revision"); identifier(value.control_id, "manifest.control_id"); oneOf(value.status, ["active", "archived"], "manifest.status");
  validateDeclaration(value.declaration); validateBudget(value.budget); refs(value.document_refs, "manifest.document_refs");
  boundedArray(value.tasks, "manifest.tasks", (entry) => validateTask(entry, true));
  boundedArray(value.worker_runs, "manifest.worker_runs", (entry) => validateWorker(entry, true));
  boundedArray(value.consultations, "manifest.consultations", validateConsultation);
  boundedArray(value.task_finalizations, "manifest.task_finalizations", validateFinalization);
  boundedArray(value.transition_receipts, "manifest.transition_receipts", validateTransitionReceipt, { min: 1 });
  exact(value.last_update, ["actor_id", "updated_at"], "last_update"); string(value.last_update.actor_id, "last_update.actor_id"); timestamp(value.last_update.updated_at, "last_update.updated_at");
  if (value.transition_receipts.length !== value.record_revision + 1) fail("INVALID_SCHEMA", "transition receipt count differs from record revision");
  for (let index = 0; index < value.transition_receipts.length; index++) {
    const receipt = value.transition_receipts[index];
    if (receipt.revision !== index) fail("INVALID_SCHEMA", "transition receipt revision is not contiguous");
    const expectedPrevious = index === 0 ? null : value.transition_receipts[index - 1].receipt_digest;
    if (receipt.previous_receipt_digest !== expectedPrevious) fail("INVALID_SCHEMA", "transition receipt chain is invalid");
  }
  const firstReceipt = value.transition_receipts[0];
  if (firstReceipt.operation !== "control-init" || firstReceipt.subject.kind !== "control" || firstReceipt.subject.id !== value.control_id || firstReceipt.previous_state !== null || firstReceipt.next_state !== "active") fail("INVALID_SCHEMA", "initial transition receipt is invalid");
  const lastReceipt = value.transition_receipts.at(-1);
  if (lastReceipt.actor_id !== value.last_update.actor_id || lastReceipt.recorded_at !== value.last_update.updated_at) fail("INVALID_SCHEMA", "last update differs from transition receipt");
  if ((value.status === "archived") !== (lastReceipt.operation === "control-archive" && lastReceipt.next_state === "archived")) fail("INVALID_SCHEMA", "control status differs from transition receipt");
  const unique = (items, key) => { const seen = new Set(); for (const item of items) { if (seen.has(item[key])) fail("INVALID_SCHEMA", `duplicate ${key}`); seen.add(item[key]); } };
  unique(value.tasks, "task_id"); unique(value.worker_runs, "worker_run_id"); unique(value.consultations, "consultation_id"); unique(value.task_finalizations, "task_id");
  assertBudgetWithin(value, null, null, { allowUnknown: true });
  const tasks = new Map(value.tasks.map((task) => [task.task_id, task]));
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
    if ((task.effect === "write") !== (run.write_mode !== "none")) fail("INVALID_SCHEMA", "worker write mode contradicts task");
    if (JSON.stringify(run.lineage.context_policy) !== JSON.stringify(task.context_policy)) fail("INVALID_SCHEMA", "worker lineage context policy contradicts task");
    requireTaskCapabilities(run, task);
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

function sameWorkspaceIdentity(stored, actual) {
  return stored.kind === actual.kind && stored.worktree_root_realpath === actual.worktreeRoot && stored.git_dir_realpath === actual.gitDir && stored.git_dir_file_id === actual.gitDirFileId && stored.common_dir_realpath === actual.commonDir;
}

async function ensureDir(path, { create = false } = {}) {
  try {
    if (create) await mkdir(path, { mode: 0o700 });
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink()) fail("STATE_PATH_UNSAFE", "state path is not a safe directory");
    if (create && process.platform !== "win32") await chmod(path, 0o700);
  } catch (error) {
    if (error instanceof ControlRecordError) throw error;
    if (create && error.code === "EEXIST") return ensureDir(path);
    fail("IO_FAILURE", "state directory operation failed", { cause: error.code });
  }
}

async function statePaths(identity, create = false) {
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

async function safeBoundedFile(path, limit, unsafeCode = "STATE_PATH_UNSAFE") {
  let handle;
  try {
    handle = await open(path, FS.O_RDONLY | (FS.O_NOFOLLOW ?? 0));
    const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1) fail(unsafeCode, "path is not a safe regular file");
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
  const { buffer } = await safeBoundedFile(path, MANIFEST_LIMIT);
  let parsed; try { parsed = JSON.parse(buffer.toString("utf8")); } catch { fail("INVALID_SCHEMA", "manifest is not valid JSON"); }
  return validateManifest(parsed);
}

async function scanManifests(paths) {
  let entries;
  try { entries = await readdir(paths.controls); } catch (error) { fail("IO_FAILURE", "controls cannot be listed", { cause: error.code }); }
  if (entries.length > ARRAY_LIMIT) fail("LIMIT_EXCEEDED", "too many controls");
  const manifests = [];
  for (const entry of entries.sort()) {
    if (!ID_RE.test(entry) || entry === "." || entry === "..") fail("STATE_PATH_UNSAFE", "unknown controls entry");
    const dir = join(paths.controls, entry); const info = await lstat(dir).catch((error) => fail("IO_FAILURE", "control cannot be inspected", { cause: error.code }));
    if (!info.isDirectory() || info.isSymbolicLink()) fail("STATE_PATH_UNSAFE", "control entry is unsafe");
    const children = await readdir(dir);
    if (children.length !== 1 || children[0] !== "manifest.json") fail("STATE_PATH_UNSAFE", "control directory has unknown entries");
    const manifest = await readManifest(join(dir, "manifest.json"));
    if (manifest.control_id !== entry) fail("INVALID_SCHEMA", "control directory and manifest disagree");
    manifests.push(manifest);
  }
  return manifests;
}

function validateOwner(value) {
  exact(value, ["schema_version", "token", "pid", "acquired_at"], "lock owner", "LOCK_MALFORMED");
  if (value.schema_version !== OWNER_SCHEMA || typeof value.token !== "string" || !UUID_RE.test(value.token) || !Number.isSafeInteger(value.pid) || value.pid <= 0 || typeof value.acquired_at !== "string" || new Date(value.acquired_at).toISOString() !== value.acquired_at) fail("LOCK_MALFORMED", "lock owner is malformed");
  return value;
}

async function readOwner(path) {
  let data;
  try { data = await safeBoundedFile(path, OWNER_LIMIT); } catch (error) {
    if (error instanceof ControlRecordError && ["STATE_PATH_UNSAFE", "LIMIT_EXCEEDED"].includes(error.code)) throw error;
    throw error;
  }
  let parsed; try { parsed = JSON.parse(data.buffer.toString("utf8")); } catch { fail("LOCK_MALFORMED", "lock owner is malformed"); }
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
  try { await unlink(path); } catch (error) { fail("IO_FAILURE", "lock owner unlink failed", { cause: error.code }); }
}

async function acquireLock(paths) {
  const token = randomUUID(); const owner = { schema_version: OWNER_SCHEMA, token, pid: process.pid, acquired_at: new Date().toISOString() };
  const pending = join(paths.owners, `.${token}.pending`); const published = join(paths.owners, `${token}.owner`);
  await writeSynced(pending, Buffer.from(`${JSON.stringify(owner)}\n`));
  try { await rename(pending, published); await syncDirectory(paths.owners); }
  catch (error) { await rm(pending, { force: true }).catch(() => {}); if (error instanceof ControlRecordError) throw error; fail("IO_FAILURE", "lock publication failed", { cause: error.code }); }
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
  if (newControl) await ensureDir(dir, { create: true }); else await ensureDir(dir);
  const temp = join(dir, `.manifest.${randomUUID()}.tmp`);
  let renamed = false;
  try {
    await writeSynced(temp, encoded); await rename(temp, target); renamed = true; await syncDirectory(dir);
  } catch (error) {
    await rm(temp, { force: true }).catch(() => {});
    if (!renamed) {
      if (newControl) await rm(dir, { recursive: false, force: true }).catch(() => {});
      if (error instanceof ControlRecordError) throw error;
      fail("IO_FAILURE", "manifest commit failed", { cause: error.code });
    }
    try {
      const observed = await readManifest(target);
      if (observed.record_revision === manifest.record_revision && createHash("sha256").update(JSON.stringify(observed)).digest("hex") === createHash("sha256").update(JSON.stringify(manifest)).digest("hex")) return;
    } catch {}
    fail("COMMIT_OUTCOME_UNKNOWN", "manifest commit outcome is unknown");
  }
}

function targetManifest(manifests, controlId) {
  const manifest = manifests.find((entry) => entry.control_id === controlId);
  if (!manifest) fail("CONTROL_NOT_FOUND", "control does not exist");
  return manifest;
}

function transitionReceipt({ revision, actorId, operation, subjectKind, subjectId, previousState, nextState, evidence, recordedAt, previousReceiptDigest }) {
  const receipt = {
    revision, actor_id: actorId, operation, subject: { kind: subjectKind, id: subjectId },
    previous_state: previousState, next_state: nextState, evidence: structuredClone(evidence),
    recorded_at: recordedAt, previous_receipt_digest: previousReceiptDigest, receipt_digest: "",
  };
  receipt.receipt_digest = receiptDigest(receipt);
  return receipt;
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
    exact(receiptInput, ["operation", "subjectKind", "subjectId", "previousState", "nextState", "evidence"], "transition", "INVALID_SCHEMA");
    const now = new Date().toISOString();
    next.record_revision += 1;
    next.transition_receipts.push(transitionReceipt({
      revision: next.record_revision, actorId: input.actor_id, recordedAt: now,
      previousReceiptDigest: manifest.transition_receipts.at(-1).receipt_digest, ...receiptInput,
    }));
    next.last_update = { actor_id: input.actor_id, updated_at: now };
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
  apiInput(input, ["cwd", "control_id", "objective_ref", "actor_id", "document_refs", "budget"]);
  identifier(input.control_id, "input.control_id"); repoPath(input.objective_ref, "input.objective_ref"); string(input.actor_id, "input.actor_id"); refs(input.document_refs, "input.document_refs");
  validateBudget(input.budget);
  const identity = await gitIdentity(input.cwd);
  return withLock(identity, async (paths) => {
    const manifests = await scanManifests(paths);
    if (manifests.some((entry) => entry.control_id === input.control_id)) fail("CONTROL_EXISTS", "control already exists");
    let dirty = false;
    if (identity.kind === "worktree") dirty = (await runGit(identity.worktreeRoot, ["status", "--porcelain=v2", "-z", "--untracked-files=all", "--no-renames"])).stdout.length > 0;
    const now = new Date().toISOString();
    const initialReceipt = transitionReceipt({
      revision: 0, actorId: input.actor_id, operation: "control-init", subjectKind: "control", subjectId: input.control_id,
      previousState: null, nextState: "active", evidence: [], recordedAt: now, previousReceiptDigest: null,
    });
    const manifest = {
      schema_version: MANIFEST_SCHEMA, record_revision: 0, control_id: input.control_id, status: "active",
      declaration: { objective_ref: input.objective_ref, project_root_realpath: identity.projectRoot, common_dir_realpath: identity.commonDir, git_dir_realpath: identity.gitDir, base_sha: identity.kind === "bare" ? null : identity.head, initial_dirty: dirty, created_at: now, created_by: input.actor_id },
      budget: structuredClone(input.budget), document_refs: [...input.document_refs], tasks: [], worker_runs: [], consultations: [], task_finalizations: [],
      transition_receipts: [initialReceipt], last_update: { actor_id: input.actor_id, updated_at: now },
    };
    await atomicManifest(paths, manifest, { newControl: true }); return { manifest, revision: 0 };
  });
}

export async function status(input) {
  apiInput(input, ["cwd", "control_id"]); identifier(input.control_id, "input.control_id");
  const identity = await gitIdentity(input.cwd); const paths = await statePaths(identity); const manifest = await readManifest(join(paths.controls, input.control_id, "manifest.json")).catch((error) => { if (error instanceof ControlRecordError && error.code === "IO_FAILURE") fail("CONTROL_NOT_FOUND", "control does not exist"); throw error; });
  if (manifest.control_id !== input.control_id) fail("INVALID_SCHEMA", "control id mismatch"); return manifest;
}

export async function taskRecord(input) {
  validateMutationBase(input, ["task"]); validateTask(input.task, false);
  return mutation(input, { operation: "task-record", subjectKind: "task", subjectId: input.task.task_id, previousState: null, nextState: "recorded", evidence: [] }, async (manifest, manifests, identity) => {
    if (identity.kind === "bare" && input.task.effect === "write") fail("BARE_WRITE_FORBIDDEN", "bare repository cannot have write tasks");
    if (manifests.flatMap((entry) => entry.tasks).some((task) => task.task_id === input.task.task_id)) fail("DUPLICATE_ID", "task id already exists");
    if (input.task.depends_on.some((dependency) => !manifest.tasks.some((task) => task.task_id === dependency))) fail("INVALID_SCHEMA", "task dependency must already exist in this control");
    await ensureDocumentAvailable(identity, input.task.doc_ref);
    const stored = structuredClone(input.task); stored.admission_digest = taskAdmissionDigest(stored); manifest.tasks.push(stored);
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
  requireOperationalExecutor(input.worker_run);
  const workspaceIdentity = await gitIdentity(input.worker_run.workspace_cwd);
  return mutation(input, { operation: "worker-run-record", subjectKind: "worker-run", subjectId: input.worker_run.worker_run_id, previousState: null, nextState: "planned", evidence: [input.worker_run.execution_verification.evidence] }, async (manifest, manifests) => {
    const task = manifest.tasks.find((entry) => entry.task_id === input.worker_run.task_id); if (!task) fail("INVALID_SCHEMA", "worker task does not exist");
    requireTaskCapabilities(input.worker_run, task);
    if (input.worker_run.role_ref !== task.role) fail("INVALID_SCHEMA", "worker role differs from task snapshot");
    if (JSON.stringify(input.worker_run.lineage.context_policy) !== JSON.stringify(task.context_policy)) fail("INVALID_SCHEMA", "worker lineage context policy differs from task snapshot");
    if (workspaceIdentity.commonDir !== manifest.declaration.common_dir_realpath) fail("WORKSPACE_DRIFT", "worker common dir differs from control");
    if (task.effect === "write" && workspaceIdentity.kind === "bare") fail("BARE_WRITE_FORBIDDEN", "bare workspace cannot write");
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
    const stored = structuredClone(input.worker_run); delete stored.workspace_cwd; stored.workspace = workspaceObject(workspaceIdentity); stored.baseline_workspace_fingerprint = null;
    assertBudgetWithin(manifest, stored, null);
    manifest.worker_runs.push(stored);
  });
}

export async function consultationRecord(input) {
  validateMutationBase(input, ["consultation"]); validateConsultation(input.consultation);
  if (input.consultation.state !== "planned" || input.consultation.executor_observation !== null || input.consultation.decision_ref !== null || input.consultation.terminal_evidence.length) fail("INVALID_SCHEMA", "new consultation must be pristine planned state");
  return mutation(input, { operation: "consultation-record", subjectKind: "consultation", subjectId: input.consultation.consultation_id, previousState: null, nextState: "planned", evidence: [] }, async (manifest, manifests) => {
    const task = manifest.tasks.find((entry) => entry.task_id === input.consultation.task_id); if (!task) fail("INVALID_SCHEMA", "consultation task does not exist");
    const all = manifests.flatMap((entry) => entry.consultations);
    if (all.some((entry) => entry.consultation_id === input.consultation.consultation_id)) fail("DUPLICATE_ID", "consultation id already exists");
    assignmentAllows(all, input.consultation.assignment_id, "consultation");
    assertBudgetWithin(manifest, null, input.consultation);
    manifest.consultations.push(structuredClone(input.consultation));
  });
}

function taskForRun(manifest, run) { const task = manifest.tasks.find((entry) => entry.task_id === run.task_id); if (!task) fail("INVALID_SCHEMA", "worker task missing"); return task; }

function requireDependenciesReady(manifest, task) {
  const finalized = new Set(manifest.task_finalizations.map((entry) => entry.task_id));
  const pending = task.depends_on.filter((dependency) => !finalized.has(dependency));
  if (pending.length) fail("DEPENDENCY_NOT_READY", "task dependencies are not finalized", { pending });
}

function conflictList(manifests, candidate, candidateTask) {
  const conflicts = [];
  for (const control of manifests) for (const existing of control.worker_runs) {
    if (!RESERVED_WRITER.has(existing.state) || existing.write_mode === "none" || existing.worker_run_id === candidate.worker_run_id) continue;
    const existingTask = control.tasks.find((task) => task.task_id === existing.task_id); if (!existingTask) fail("INVALID_SCHEMA", "admitted worker task missing");
    const sameWorktree = existing.workspace.worktree_root_realpath === candidate.workspace.worktree_root_realpath;
    const overlap = existingTask.write_scope.some((a) => candidateTask.write_scope.some((b) => scopesOverlap(a, b)));
    const alternative = !sameWorktree && overlap && existing.write_mode === "isolated-alternative" && candidate.write_mode === "isolated-alternative" && existingTask.alternative_group !== null && existingTask.alternative_group === candidateTask.alternative_group;
    if (sameWorktree || (overlap && !alternative)) conflicts.push({ control_id: control.control_id, worker_run_id: existing.worker_run_id, reason: sameWorktree ? "same-worktree-writer" : "overlapping-write-scope" });
  }
  return conflicts;
}

export async function admitWorker(input) {
  validateMutationBase(input, ["worker_run_id"]); identifier(input.worker_run_id, "input.worker_run_id");
  return mutation(input, { operation: "worker-admit", subjectKind: "worker-run", subjectId: input.worker_run_id, previousState: "planned", nextState: "admitted", evidence: [] }, async (manifest, manifests) => {
    const run = manifest.worker_runs.find((entry) => entry.worker_run_id === input.worker_run_id); if (!run) fail("INVALID_SCHEMA", "worker run does not exist");
    if (run.state !== "planned") fail("INVALID_TRANSITION", "only planned worker can be admitted");
    const task = taskForRun(manifest, run);
    requireDependenciesReady(manifest, task);
    const workspace = await gitIdentity(run.workspace.worktree_root_realpath ?? run.workspace.git_dir_realpath);
    if (!sameWorkspaceIdentity(run.workspace, workspace)) fail("WORKSPACE_DRIFT", "workspace identity changed");
    await inspectTaskScopes(workspace, task);
    if (task.effect === "write") {
      const conflicts = conflictList(manifests, run, task); if (conflicts.length) fail("WRITE_CONFLICT", "write reservation conflicts", { conflicts });
      run.baseline_workspace_fingerprint = await fingerprintWorkspace({ cwd: workspace.worktreeRoot });
      run.workspace.head_at_reservation = workspace.head;
    }
    run.state = "admitted";
    run.admission = { admitted_by: input.actor_id, admitted_at: new Date().toISOString(), write_reservation: task.effect === "write" };
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
  const before = new Map(baseline.files.map((entry) => [foldPath(entry.path), entry])); const after = new Map(completed.files.map((entry) => [foldPath(entry.path), entry]));
  const keys = new Set([...before.keys(), ...after.keys()]); const changed = [];
  for (const key of keys) if (JSON.stringify(before.get(key) ?? null) !== JSON.stringify(after.get(key) ?? null)) changed.push((after.get(key) ?? before.get(key)).path);
  return changed;
}

function inWriteScope(path, task) { return task.write_scope.some((entry) => scopesOverlap(entry, { kind: "file", path })); }

function workerObservationEvidence(observation) {
  if (own(observation, "dispatch_evidence")) return observation.dispatch_evidence;
  if (own(observation, "dispatch_attempt_evidence")) return observation.dispatch_attempt_evidence;
  if (own(observation, "terminal_evidence")) return observation.terminal_evidence;
  if (own(observation, "result")) return observation.result.evidence;
  return [];
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
    } else if (run.state === "admitted" && observation.state === "cancelled") {
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
        const workspace = await gitIdentity(run.workspace.worktree_root_realpath);
        if (!sameWorkspaceIdentity(run.workspace, workspace)) fail("WORKSPACE_DRIFT", "workspace identity changed"); await inspectTaskScopes(workspace, task);
        const fingerprint = await fingerprintWorkspace({ cwd: workspace.worktreeRoot });
        if (run.baseline_workspace_fingerprint === null) fail("INVALID_SCHEMA", "writer baseline is missing");
        if (changedPaths(run.baseline_workspace_fingerprint, fingerprint).some((path) => !inWriteScope(path, task))) fail("WORKSPACE_DRIFT", "workspace changed outside write scope");
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
      requireDependenciesReady(manifest, task);
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
      const workspace = await gitIdentity(run.workspace.worktree_root_realpath); if (!sameWorkspaceIdentity(run.workspace, workspace)) fail("WORKSPACE_DRIFT", "workspace identity changed");
      const task = taskForRun(manifest, run); await inspectTaskScopes(workspace, task); const fingerprint = await fingerprintWorkspace({ cwd: workspace.worktreeRoot });
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

export async function archive(input) {
  validateMutationBase(input, []);
  return mutation(input, { operation: "control-archive", subjectKind: "control", subjectId: input.control_id, previousState: "active", nextState: "archived", evidence: [] }, async (manifest) => {
    const workerReady = manifest.worker_runs.every((run) => !WORKER_NONTERMINAL.has(run.state) && (run.state !== "completed" || run.acceptance !== null));
    const consultationReady = manifest.consultations.every((entry) => !CONSULT_NONTERMINAL.has(entry.state) && (entry.state !== "completed" || entry.decision_ref !== null));
    const finalized = manifest.tasks.every((task) => manifest.task_finalizations.some((entry) => entry.task_id === task.task_id));
    if (!workerReady || !consultationReady || !finalized) fail("ARCHIVE_NOT_READY", "control is not ready to archive"); manifest.status = "archived";
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
  const records = buffer.toString("utf8").split("\0"); const files = [];
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

async function fingerprintPass(identity) {
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
    files.push({ path: entry.path, state: entry.state, content_digest: digest });
  }
  const value = { head: refreshed.head, index_digest: createHash("sha256").update(indexBuffer).digest("hex"), status_digest: createHash("sha256").update(statusBuffer).digest("hex"), files };
  return { digest: createHash("sha256").update(JSON.stringify(value)).digest("hex"), ...value };
}

export async function fingerprintWorkspace(input) {
  apiInput(input, ["cwd"]); const identity = await gitIdentity(input.cwd); const first = await fingerprintPass(identity); const second = await fingerprintPass(identity);
  if (JSON.stringify(first) !== JSON.stringify(second)) fail("WORKSPACE_DRIFT", "workspace changed during fingerprint"); return first;
}
