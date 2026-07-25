// Lattice工程・runtime run・Control manifestの既存durable stateだけから、
// 次の一手を計算するpure saga。進行state、I/O、CLI実行を持たず、再観測がrecoveryになる。
import { createHash } from "node:crypto";

import { canonicalJson } from "./canonical-json.mjs";
import { projectLatticeReceipts } from "./lattice-receipt-projection.mjs";

export const LATTICE_CONTROL_SAGA_SCHEMA = "dotagents.lattice-control-saga.v1";
export const LATTICE_CONTROL_ACTION_SCHEMA = "dotagents.lattice-control-action.v1";

const TODO_STATUS_SCHEMA = "lattice.todo_status_result.v4";
const RUN_LIST_SCHEMA = "lattice.run_list.v1";
const RUN_REQUEST_SCHEMA = "lattice.run_request.v1";
const CONTROL_SCHEMA = "dotagents.orchestration-control.v30";
const EXTERNAL_SOURCE_NAMESPACE = "lattice.todo";
const FRONTIER_SCHEMA = "lattice.todo_dispatch_frontier.v1";

const INPUT_KEYS = Object.freeze([
  "todo_status", "run_list", "control_manifest", "selection", "run_request", "children",
]);
const TODO_STATUS_KEYS = Object.freeze([
  "schema", "project_id", "active_set", "next_ready", "dispatch_frontier", "blocked",
  "member_heads", "result_digest",
]);
const FRONTIER_KEYS = Object.freeze([
  "schema", "selection_source", "policy", "recommended_parallelism",
  "subset_requires_reason", "parallel_start_flag", "frontier_digest",
]);
const RUN_REQUEST_KEYS = Object.freeze([
  "schema", "request_id", "repo", "capacity", "todos", "manual_witness",
  "sensor_query_set", "executor_capability", "claim_mode", "request_digest",
]);
// selectionは「どのfrontierを見て選んだか」を必ず伴う。frontier_digestは候補集合の
// identityであり（Lattice ADR 0063）、観測中のfrontierと違えばその選択はstaleである。
const SELECTION_KEYS = Object.freeze(["tasks", "reason", "frontier_digest"]);
const TASK_REF_KEYS = Object.freeze(["plan_key", "task_id"]);
const EVIDENCE_KEYS = Object.freeze(["type", "ref", "digest", "observed_at"]);
const ACCEPTANCE_KEYS = Object.freeze([
  "decision", "accepted_from_revision", "result_digest", "executor_handle",
  "verification_evidence", "decision_note", "decided_by", "decided_at",
]);

const IDENTIFIER = /^[0-9A-Za-z](?:[0-9A-Za-z._-]{0,127})$/u;
const DIGEST = /^[0-9a-f]{64}$/u;
const GIT_SHA = /^[0-9a-f]{40}$/u;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;
const MAX_TASKS = 256;
const MAX_CONTROL_TASKS = 2_000;
const MAX_WORKER_RUNS = 2_000;
const MAX_CHILDREN = 256;
const MAX_TEXT = 4_096;
const MAX_JSON_DEPTH = 8;
const MAX_JSON_NODES = 4_096;
const MAX_JSON_KEYS = 256;
const MAX_JSON_ARRAY = 256;
const WORKER_STATES = new Set([
  "planned", "admitted", "dispatched", "running", "unknown", "completed", "failed", "cancelled",
]);
const ACTIVE_WORKER_STATES = new Set(["planned", "admitted", "dispatched", "running", "unknown"]);
const RUN_STARTED_WORKER_STATES = new Set(["dispatched", "running", "unknown"]);

export class LatticeControlSagaError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "LatticeControlSagaError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

const fail = (code, message, details) => {
  throw new LatticeControlSagaError(code, message, details);
};
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;
const own = (value, key) => Object.hasOwn(value, key);

function exact(value, keys, name, code = "INVALID_OBSERVATION") {
  if (!plain(value)) fail(code, `${name} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(code, `${name} has invalid fields`);
  }
  return value;
}

function required(value, keys, name, code = "INVALID_OBSERVATION") {
  if (!plain(value) || keys.some((key) => !own(value, key))) {
    fail(code, `${name} is missing required fields`);
  }
  return value;
}

function identifier(value, name, code = "INVALID_OBSERVATION") {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    fail(code, `${name} must be a bounded identifier`);
  }
  return value;
}

function digest(value, name, code = "INVALID_OBSERVATION") {
  if (typeof value !== "string" || !DIGEST.test(value)) {
    fail(code, `${name} must be a lowercase SHA-256`);
  }
  return value;
}

function gitSha(value, name, code = "INVALID_OBSERVATION") {
  if (typeof value !== "string" || !GIT_SHA.test(value)) {
    fail(code, `${name} must be a 40-character git SHA`);
  }
  return value;
}

function boundedText(value, name, { nullable = false, limit = MAX_TEXT } = {},
  code = "INVALID_OBSERVATION") {
  if (nullable && value === null) return value;
  if (typeof value !== "string" || value.length === 0 || [...value].length > limit
    || CONTROL_CHARACTER.test(value)) {
    fail(code, `${name} must be a bounded string`);
  }
  return value;
}

function safeInteger(value, name, { min = 0, max = Number.MAX_SAFE_INTEGER } = {},
  code = "INVALID_OBSERVATION") {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    fail(code, `${name} must be a bounded safe integer`);
  }
  return value;
}

function boundedArray(value, name, limit, validator, { min = 0 } = {},
  code = "INVALID_OBSERVATION") {
  if (!Array.isArray(value)) fail(code, `${name} must be an array`);
  if (value.length < min) fail(code, `${name} must contain at least ${min} entries`);
  if (value.length > limit) fail(code, `${name} exceeds ${limit} entries`);
  for (let index = 0; index < value.length; index += 1) validator(value[index], `${name}[${index}]`);
  return value;
}

function boundedJson(value, name, code = "INVALID_RUN_REQUEST") {
  const seen = new Set();
  let nodes = 0;
  const visit = (entry, entryName, depth) => {
    nodes += 1;
    if (nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) {
      fail(code, `${name} exceeds its JSON bounds`);
    }
    if (entry === null || typeof entry === "boolean") return;
    if (typeof entry === "string") {
      if ([...entry].length > MAX_TEXT || CONTROL_CHARACTER.test(entry)) {
        fail(code, `${entryName} must be a bounded string`);
      }
      return;
    }
    if (typeof entry === "number") {
      if (!Number.isFinite(entry)) fail(code, `${entryName} must be a finite JSON number`);
      return;
    }
    if (typeof entry !== "object") fail(code, `${entryName} must contain only JSON values`);
    if (seen.has(entry)) fail(code, `${entryName} must not contain cycles`);
    seen.add(entry);
    if (Array.isArray(entry)) {
      if (entry.length > MAX_JSON_ARRAY) fail(code, `${entryName} exceeds ${MAX_JSON_ARRAY} entries`);
      entry.forEach((child, index) => visit(child, `${entryName}[${index}]`, depth + 1));
    } else {
      if (!plain(entry)) fail(code, `${entryName} must be a plain JSON object`);
      const keys = Object.keys(entry);
      if (keys.length > MAX_JSON_KEYS) fail(code, `${entryName} exceeds ${MAX_JSON_KEYS} keys`);
      for (const key of keys) {
        boundedText(key, `${entryName} key`, { limit: 128 }, code);
        visit(entry[key], `${entryName}.${key}`, depth + 1);
      }
    }
    seen.delete(entry);
  };
  visit(value, name, 0);
  return value;
}

const identity = (task) => `${task.plan_key}\0${task.task_id}`;
const publicTask = (task) => ({ plan_key: task.plan_key, task_id: task.task_id });
const actionKey = (kind, payload) => createHash("sha256")
  .update(canonicalJson({ schema: LATTICE_CONTROL_SAGA_SCHEMA, kind, payload }))
  .digest("hex");
const action = (kind, stage, payload) => ({
  schema_version: LATTICE_CONTROL_ACTION_SCHEMA,
  kind,
  stage,
  idempotency_key: actionKey(kind, payload),
  ...payload,
});
const idle = (reason, selectedTasks = []) => ({
  schema_version: LATTICE_CONTROL_ACTION_SCHEMA,
  kind: "idle",
  reason,
  selected_tasks: selectedTasks.map(publicTask),
});
const blocked = (code, message, details = null) => ({
  schema_version: LATTICE_CONTROL_ACTION_SCHEMA,
  kind: "blocked",
  code,
  message,
  details,
});

function validateTaskRef(value, name, code = "INVALID_SELECTION") {
  exact(value, TASK_REF_KEYS, name, code);
  identifier(value.plan_key, `${name}.plan_key`, code);
  identifier(value.task_id, `${name}.task_id`, code);
  return value;
}

function validateTodoStatus(value) {
  exact(value, TODO_STATUS_KEYS, "todo_status");
  if (value.schema !== TODO_STATUS_SCHEMA) fail("INVALID_OBSERVATION", "todo_status.schema is unsupported");
  identifier(value.project_id, "todo_status.project_id");
  const task = (entry, name) => {
    exact(entry, ["plan_key", "task_id", "label"], name);
    identifier(entry.plan_key, `${name}.plan_key`);
    identifier(entry.task_id, `${name}.task_id`);
    boundedText(entry.label, `${name}.label`, { limit: 160 });
  };
  boundedArray(value.active_set, "todo_status.active_set", MAX_CONTROL_TASKS, (entry, name) => {
    exact(entry, ["plan_key", "task_id", "label", "unmet_dependencies"], name);
    task({ plan_key: entry.plan_key, task_id: entry.task_id, label: entry.label }, name);
    boundedArray(entry.unmet_dependencies, `${name}.unmet_dependencies`, MAX_CONTROL_TASKS,
      (dependency, dependencyName) => validateTaskRef(dependency, dependencyName, "INVALID_OBSERVATION"));
  });
  boundedArray(value.next_ready, "todo_status.next_ready", MAX_CONTROL_TASKS, task);
  boundedArray(value.blocked, "todo_status.blocked", MAX_CONTROL_TASKS, (entry, name) => {
    exact(entry, ["plan_key", "task_id", "reason"], name);
    identifier(entry.plan_key, `${name}.plan_key`);
    identifier(entry.task_id, `${name}.task_id`);
    boundedText(entry.reason, `${name}.reason`, { limit: 512 });
  });
  boundedArray(value.member_heads, "todo_status.member_heads", MAX_CONTROL_TASKS, (entry, name) => {
    exact(entry, [
      "plan_key", "plan_version", "through_sequence", "journal_head_digest",
      "reconciliation_state", "revision_digest", "reconciliation_digest",
    ], name);
    identifier(entry.plan_key, `${name}.plan_key`);
    identifier(entry.plan_version, `${name}.plan_version`);
    safeInteger(entry.through_sequence, `${name}.through_sequence`);
    digest(entry.journal_head_digest, `${name}.journal_head_digest`);
    if (!["registered_unreconciled", "reconciled"].includes(entry.reconciliation_state)) {
      fail("INVALID_OBSERVATION", `${name}.reconciliation_state is invalid`);
    }
    if (entry.reconciliation_state === "reconciled") {
      digest(entry.revision_digest, `${name}.revision_digest`);
    } else if (entry.revision_digest !== null) {
      fail("INVALID_OBSERVATION", `${name}.revision_digest must be null before reconciliation`);
    }
    digest(entry.reconciliation_digest, `${name}.reconciliation_digest`);
  });
  exact(value.dispatch_frontier, FRONTIER_KEYS, "todo_status.dispatch_frontier");
  const frontier = value.dispatch_frontier;
  if (frontier.schema !== FRONTIER_SCHEMA || frontier.selection_source !== "next_ready"
    || frontier.policy !== "all_ready_parallel_by_default"
    || frontier.parallel_start_flag !== "--parallel-frontier") {
    fail("INVALID_OBSERVATION", "todo_status.dispatch_frontier contract is unsupported");
  }
  safeInteger(frontier.recommended_parallelism, "todo_status.dispatch_frontier.recommended_parallelism",
    { max: MAX_CONTROL_TASKS });
  if (frontier.recommended_parallelism !== value.next_ready.length
    || frontier.subset_requires_reason !== (value.next_ready.length > 1)) {
    fail("INVALID_OBSERVATION", "todo_status.dispatch_frontier differs from next_ready");
  }
  digest(frontier.frontier_digest, "todo_status.dispatch_frontier.frontier_digest");
  digest(value.result_digest, "todo_status.result_digest");

  for (const [name, entries] of [
    ["active_set", value.active_set], ["next_ready", value.next_ready],
    ["blocked", value.blocked], ["member_heads", value.member_heads],
  ]) {
    const ids = entries.map((entry) => name === "member_heads" ? entry.plan_key : identity(entry));
    if (new Set(ids).size !== ids.length) fail("INVALID_OBSERVATION", `todo_status.${name} contains duplicates`);
  }
  const active = new Set(value.active_set.map(identity));
  if (value.next_ready.some((entry) => active.has(identity(entry)))) {
    fail("INVALID_OBSERVATION", "todo_status task cannot be active and ready simultaneously");
  }
  return value;
}

function validateRunList(value) {
  exact(value, ["schema", "active_runs", "result_digest"], "run_list");
  if (value.schema !== RUN_LIST_SCHEMA) fail("INVALID_OBSERVATION", "run_list.schema is unsupported");
  boundedArray(value.active_runs, "run_list.active_runs", MAX_CONTROL_TASKS, (entry, name) => {
    exact(entry, ["run_id", "run_ref", "base_sha", "executor_adapter"], name);
    boundedText(entry.run_id, `${name}.run_id`, { limit: 256 });
    boundedText(entry.run_ref, `${name}.run_ref`, { limit: 1_024 });
    gitSha(entry.base_sha, `${name}.base_sha`);
    boundedText(entry.executor_adapter, `${name}.executor_adapter`, { limit: 256 });
  });
  const ids = value.active_runs.map((entry) => entry.run_id);
  if (new Set(ids).size !== ids.length) fail("INVALID_OBSERVATION", "run_list.active_runs contains duplicate run_id");
  digest(value.result_digest, "run_list.result_digest");
  return value;
}

function validateSelection(value) {
  if (value === null) return null;
  exact(value, SELECTION_KEYS, "selection", "INVALID_SELECTION");
  boundedArray(value.tasks, "selection.tasks", MAX_TASKS,
    (entry, name) => validateTaskRef(entry, name), { min: 1 }, "INVALID_SELECTION");
  const ids = value.tasks.map(identity);
  if (new Set(ids).size !== ids.length) fail("INVALID_SELECTION", "selection.tasks contains duplicates");
  boundedText(value.reason, "selection.reason", { nullable: true, limit: 1_024 }, "INVALID_SELECTION");
  digest(value.frontier_digest, "selection.frontier_digest", "INVALID_SELECTION");
  return value;
}

function validateRunRequest(value) {
  if (value === null) return null;
  exact(value, RUN_REQUEST_KEYS, "run_request", "INVALID_RUN_REQUEST");
  if (value.schema !== RUN_REQUEST_SCHEMA) fail("INVALID_RUN_REQUEST", "run_request.schema is unsupported");
  identifier(value.request_id, "run_request.request_id", "INVALID_RUN_REQUEST");
  exact(value.repo, ["base_sha", "root_kind"], "run_request.repo", "INVALID_RUN_REQUEST");
  gitSha(value.repo.base_sha, "run_request.repo.base_sha", "INVALID_RUN_REQUEST");
  identifier(value.repo.root_kind, "run_request.repo.root_kind", "INVALID_RUN_REQUEST");
  exact(value.capacity, ["executors"], "run_request.capacity", "INVALID_RUN_REQUEST");
  safeInteger(value.capacity.executors, "run_request.capacity.executors",
    { min: 1, max: MAX_TASKS }, "INVALID_RUN_REQUEST");
  boundedArray(value.todos, "run_request.todos", MAX_TASKS, (entry, name) => {
    exact(entry, ["todo_id"], name, "INVALID_RUN_REQUEST");
    identifier(entry.todo_id, `${name}.todo_id`, "INVALID_RUN_REQUEST");
  }, { min: 1 }, "INVALID_RUN_REQUEST");
  const todoIds = value.todos.map((entry) => entry.todo_id);
  if (new Set(todoIds).size !== todoIds.length) fail("INVALID_RUN_REQUEST", "run_request.todos contains duplicates");
  if (!plain(value.manual_witness)
    || Object.keys(value.manual_witness).length !== todoIds.length
    || todoIds.some((todoId) => !own(value.manual_witness, todoId))) {
    fail("INVALID_RUN_REQUEST", "run_request.manual_witness keys must equal todos");
  }
  boundedJson(value.manual_witness, "run_request.manual_witness");
  exact(value.sensor_query_set, ["queries"], "run_request.sensor_query_set", "INVALID_RUN_REQUEST");
  boundedJson(value.sensor_query_set.queries, "run_request.sensor_query_set.queries");
  exact(value.executor_capability, ["adapters"], "run_request.executor_capability", "INVALID_RUN_REQUEST");
  boundedArray(value.executor_capability.adapters, "run_request.executor_capability.adapters", MAX_TASKS,
    (entry, name) => identifier(entry, name, "INVALID_RUN_REQUEST"), { min: 1 }, "INVALID_RUN_REQUEST");
  if (new Set(value.executor_capability.adapters).size !== value.executor_capability.adapters.length) {
    fail("INVALID_RUN_REQUEST", "run_request.executor_capability.adapters contains duplicates");
  }
  if (value.claim_mode !== "exact_minimum") fail("INVALID_RUN_REQUEST", "run_request.claim_mode is unsupported");
  digest(value.request_digest, "run_request.request_digest", "INVALID_RUN_REQUEST");
  const unsigned = structuredClone(value);
  delete unsigned.request_digest;
  const expected = createHash("sha256").update(canonicalJson(unsigned)).digest("hex");
  if (value.request_digest !== expected) {
    fail("INVALID_RUN_REQUEST", "run_request.request_digest does not match the public self-digest rule");
  }
  return value;
}

function validateEvidence(value, name) {
  exact(value, EVIDENCE_KEYS, name);
  boundedText(value.type, `${name}.type`, { limit: 128 });
  boundedText(value.ref, `${name}.ref`);
  digest(value.digest, `${name}.digest`);
  boundedText(value.observed_at, `${name}.observed_at`, { limit: 128 });
  if (!Number.isFinite(Date.parse(value.observed_at))) {
    fail("INVALID_OBSERVATION", `${name}.observed_at must be a timestamp`);
  }
}

function validateAcceptance(value, name) {
  if (value === null) return;
  exact(value, ACCEPTANCE_KEYS, name);
  if (!["accepted", "rejected"].includes(value.decision)) {
    fail("INVALID_OBSERVATION", `${name}.decision is invalid`);
  }
  safeInteger(value.accepted_from_revision, `${name}.accepted_from_revision`);
  digest(value.result_digest, `${name}.result_digest`);
  if (!plain(value.executor_handle)) fail("INVALID_OBSERVATION", `${name}.executor_handle must be an object`);
  boundedArray(value.verification_evidence, `${name}.verification_evidence`, MAX_TASKS,
    validateEvidence, { min: 1 });
  boundedText(value.decision_note, `${name}.decision_note`);
  boundedText(value.decided_by, `${name}.decided_by`);
  boundedText(value.decided_at, `${name}.decided_at`, { limit: 128 });
  if (!Number.isFinite(Date.parse(value.decided_at))) {
    fail("INVALID_OBSERVATION", `${name}.decided_at must be a timestamp`);
  }
}

function validateControlManifest(value) {
  required(value, ["schema_version", "control_id", "status", "tasks", "worker_runs"], "control_manifest");
  if (value.schema_version !== CONTROL_SCHEMA) {
    fail("INVALID_OBSERVATION", "control_manifest.schema_version must support external_source");
  }
  identifier(value.control_id, "control_manifest.control_id");
  if (value.status !== "active") fail("INVALID_OBSERVATION", "control_manifest must be active");
  boundedArray(value.tasks, "control_manifest.tasks", MAX_CONTROL_TASKS, (entry, name) => {
    required(entry, ["task_id", "external_source"], name);
    identifier(entry.task_id, `${name}.task_id`);
    if (entry.external_source !== null) {
      exact(entry.external_source, [
        "namespace", "contract_version", "external_id", "immutable_digest",
      ], `${name}.external_source`);
      identifier(entry.external_source.namespace, `${name}.external_source.namespace`);
      boundedText(entry.external_source.contract_version, `${name}.external_source.contract_version`,
        { limit: 256 });
      boundedText(entry.external_source.external_id, `${name}.external_source.external_id`,
        { limit: 1_024 });
      digest(entry.external_source.immutable_digest, `${name}.external_source.immutable_digest`);
    }
  });
  boundedArray(value.worker_runs, "control_manifest.worker_runs", MAX_WORKER_RUNS, (entry, name) => {
    required(entry, [
      "worker_run_id", "task_id", "placement_reservation", "state", "result", "acceptance",
    ], name);
    identifier(entry.worker_run_id, `${name}.worker_run_id`);
    identifier(entry.task_id, `${name}.task_id`);
    if (!WORKER_STATES.has(entry.state)) fail("INVALID_OBSERVATION", `${name}.state is invalid`);
    if (entry.placement_reservation !== null && !plain(entry.placement_reservation)) {
      fail("INVALID_OBSERVATION", `${name}.placement_reservation must be an object or null`);
    }
    if (entry.state === "completed") {
      required(entry.result, ["result_digest", "evidence"], `${name}.result`);
      digest(entry.result.result_digest, `${name}.result.result_digest`);
      boundedArray(entry.result.evidence, `${name}.result.evidence`, MAX_TASKS, validateEvidence, { min: 1 });
    } else if (entry.result !== null) {
      fail("INVALID_OBSERVATION", `${name}.result contradicts worker state`);
    }
    validateAcceptance(entry.acceptance, `${name}.acceptance`);
    if (entry.acceptance !== null
      && (entry.state !== "completed" || entry.acceptance.result_digest !== entry.result.result_digest)) {
      fail("INVALID_OBSERVATION", `${name}.acceptance contradicts worker result`);
    }
  });
  for (const [name, entries, key] of [
    ["tasks", value.tasks, "task_id"], ["worker_runs", value.worker_runs, "worker_run_id"],
  ]) {
    const ids = entries.map((entry) => entry[key]);
    if (new Set(ids).size !== ids.length) {
      fail("INVALID_OBSERVATION", `control_manifest.${name} contains duplicate ${key}`);
    }
  }
  return value;
}

function validateInput(input) {
  exact(input, INPUT_KEYS, "input", "INVALID_INPUT");
  validateTodoStatus(input.todo_status);
  validateRunList(input.run_list);
  validateControlManifest(input.control_manifest);
  validateSelection(input.selection);
  validateRunRequest(input.run_request);
  boundedArray(input.children, "input.children", MAX_CHILDREN, () => {}, {}, "INVALID_INPUT");
  return input;
}

function currentPosition(status, task) {
  const taskIdentity = identity(task);
  if (status.next_ready.some((entry) => identity(entry) === taskIdentity)) return "ready";
  if (status.active_set.some((entry) => identity(entry) === taskIdentity)) return "active";
  if (status.blocked.some((entry) => identity(entry) === taskIdentity)) return "blocked";
  return "absent";
}

function headFor(status, planKey) {
  const head = status.member_heads.find((entry) => entry.plan_key === planKey);
  if (head === undefined || head.reconciliation_state !== "reconciled") {
    fail("OBSERVATION_INCONSISTENT", "selected task has no reconciled member head", { plan_key: planKey });
  }
  return head;
}

function boundControlTask(status, manifest, task) {
  const head = headFor(status, task.plan_key);
  const externalId = `${task.plan_key}/${head.plan_version}/${task.task_id}`;
  const matches = manifest.tasks.filter((entry) => entry.external_source !== null
    && entry.external_source.namespace === EXTERNAL_SOURCE_NAMESPACE
    && entry.external_source.contract_version === TODO_STATUS_SCHEMA
    && entry.external_source.external_id === externalId
    && entry.external_source.immutable_digest === head.revision_digest);
  if (matches.length !== 1) {
    fail("OBSERVATION_INCONSISTENT", "selected Lattice task must have exactly one immutable Control binding", {
      plan_key: task.plan_key,
      task_id: task.task_id,
      matches: matches.length,
    });
  }
  return matches[0];
}

function currentWorker(manifest, controlTask) {
  const runs = manifest.worker_runs.filter((entry) => entry.task_id === controlTask.task_id);
  const current = runs.filter((entry) => ACTIVE_WORKER_STATES.has(entry.state)
    || (entry.state === "completed" && entry.acceptance?.decision !== "rejected"));
  if (current.length > 1) {
    fail("OBSERVATION_INCONSISTENT", "Control task has multiple current worker runs", {
      control_task_id: controlTask.task_id,
      worker_run_ids: current.map((entry) => entry.worker_run_id),
    });
  }
  return current[0] ?? null;
}

function inferTaskRef(status, manifest, todoId) {
  const observed = [
    ...status.next_ready, ...status.active_set, ...status.blocked,
  ].filter((entry) => entry.task_id === todoId).map(publicTask);
  const bound = manifest.tasks.flatMap((entry) => {
    const source = entry.external_source;
    if (source === null || source.namespace !== EXTERNAL_SOURCE_NAMESPACE
      || source.contract_version !== TODO_STATUS_SCHEMA) return [];
    const parts = source.external_id.split("/");
    if (parts.length !== 3 || parts[2] !== todoId) return [];
    return [{ plan_key: parts[0], task_id: parts[2] }];
  });
  const unique = new Map([...observed, ...bound].map((entry) => [identity(entry), entry]));
  if (unique.size !== 1) {
    fail("INVALID_SELECTION", "run_request todo_id does not resolve to exactly one Lattice task", {
      todo_id: todoId,
      matches: unique.size,
    });
  }
  return [...unique.values()][0];
}

function selectedTasks(input) {
  // 選択時のfrontierと観測中のfrontierが違えば、その選択はもう別の候補集合に対する
  // ものである。形式的に正しい古いdigestを通すと、既にreadyでなくなったToDoへ
  // dispatchしうるため、ここでfail closedにする。
  if (input.selection !== null
    && input.selection.frontier_digest !== input.todo_status.dispatch_frontier.frontier_digest) {
    fail("STALE_FRONTIER", "selection was made against a different dispatch frontier", {
      selected_frontier_digest: input.selection.frontier_digest,
      observed_frontier_digest: input.todo_status.dispatch_frontier.frontier_digest,
    });
  }
  if (input.run_request === null) {
    const selected = input.selection === null
      ? input.todo_status.next_ready.map(publicTask)
      : input.selection.tasks.map(publicTask);
    const ready = new Set(input.todo_status.next_ready.map(identity));
    if (selected.some((entry) => !ready.has(identity(entry)))) {
      fail("INVALID_SELECTION", "selection contains a task outside next_ready");
    }
    if (selected.length !== input.todo_status.next_ready.length
      && input.todo_status.dispatch_frontier.subset_requires_reason
      && input.selection?.reason === null) {
      fail("SUBSET_REASON_REQUIRED", "partial ready selection requires a reason");
    }
    return selected;
  }

  const selected = input.selection === null
    ? input.run_request.todos.map((entry) => inferTaskRef(
      input.todo_status, input.control_manifest, entry.todo_id,
    ))
    : input.selection.tasks.map(publicTask);
  const requestIds = input.run_request.todos.map((entry) => entry.todo_id);
  if (selected.length !== requestIds.length
    || selected.some((entry, index) => entry.task_id !== requestIds[index])) {
    fail("INVALID_SELECTION", "selection must match run_request.todos in order");
  }
  if (input.run_request.capacity.executors !== selected.length) {
    fail("INVALID_RUN_REQUEST", "run_request capacity must equal selected parallelism");
  }
  const ready = new Set(input.todo_status.next_ready.map(identity));
  const selectedReady = selected.filter((entry) => ready.has(identity(entry)));
  if (selectedReady.length === selected.length
    && selected.length !== input.todo_status.next_ready.length
    && input.todo_status.dispatch_frontier.subset_requires_reason
    && input.selection?.reason === null) {
    fail("SUBSET_REASON_REQUIRED", "partial ready selection requires a reason");
  }
  return selected;
}

function matchingRun(input) {
  if (input.run_request === null) return null;
  const matches = input.run_list.active_runs.filter(
    (entry) => entry.run_id === input.run_request.request_id,
  );
  if (matches.length === 0) return null;
  const run = matches[0];
  if (run.run_ref !== `.lattice/runs/${input.run_request.request_id}`
    || run.base_sha !== input.run_request.repo.base_sha
    || !input.run_request.executor_capability.adapters.includes(run.executor_adapter)) {
    fail("OBSERVATION_INCONSISTENT", "active Lattice run differs from compiled request", {
      run_id: run.run_id,
    });
  }
  return run;
}

function mappedState(input, selected) {
  return selected.map((task) => {
    const controlTask = boundControlTask(input.todo_status, input.control_manifest, task);
    const worker = currentWorker(input.control_manifest, controlTask);
    return {
      task,
      position: currentPosition(input.todo_status, task),
      controlTask,
      worker,
    };
  });
}

function validateCrossObservation(input, mapped, run) {
  for (const entry of mapped) {
    if (entry.position === "absent" && entry.worker?.acceptance?.decision !== "accepted") {
      fail("OBSERVATION_INCONSISTENT", "Lattice task is absent before Control acceptance", {
        plan_key: entry.task.plan_key,
        task_id: entry.task.task_id,
        worker_state: entry.worker?.state ?? null,
      });
    }
    if (entry.position === "blocked" && entry.worker !== null) {
      fail("OBSERVATION_INCONSISTENT", "blocked Lattice task already has a Control worker", {
        plan_key: entry.task.plan_key,
        task_id: entry.task.task_id,
      });
    }
    if (entry.worker !== null && entry.worker.placement_reservation === null) {
      fail("OBSERVATION_INCONSISTENT", "Lattice saga worker lacks a placement reservation", {
        worker_run_id: entry.worker.worker_run_id,
      });
    }
  }
  if (run !== null && mapped.some((entry) => entry.worker === null)) {
    fail("OBSERVATION_INCONSISTENT", "active Lattice run has no corresponding Control worker");
  }
  if (run !== null && mapped.every((entry) => entry.position === "absent")) {
    fail("OBSERVATION_INCONSISTENT", "Lattice run remains active after all selected tasks are done");
  }
}

function projectionForChildren(input, mapped) {
  const selectedIds = new Set(mapped.map((entry) => entry.task.task_id));
  for (const child of input.children) {
    const todoId = plain(child) && plain(child.receipt) ? child.receipt.todo_id : null;
    if (typeof todoId === "string" && IDENTIFIER.test(todoId) && !selectedIds.has(todoId)) {
      fail("OBSERVATION_INCONSISTENT", "child receipt belongs to an unselected task", {
        todo_id: todoId,
      });
    }
  }
  if (input.children.length === 0) {
    return { status: "pending", succeeded: [], failed: [] };
  }
  return projectLatticeReceipts({ children: input.children });
}

function readySelectionAction(input, selected) {
  const payload = {
    frontier_digest: input.todo_status.dispatch_frontier.frontier_digest,
    selected_tasks: selected.map(publicTask),
    recommended_parallelism: input.todo_status.dispatch_frontier.recommended_parallelism,
    selected_parallelism: selected.length,
    subset_reason: input.selection?.reason ?? null,
    parallel_start_flag: selected.length === input.todo_status.next_ready.length
      ? input.todo_status.dispatch_frontier.parallel_start_flag
      : null,
  };
  return action("lattice_todo_start", "ready_selection", payload);
}

function placementAction(input, selected, entry) {
  const keyPayload = {
    control_id: input.control_manifest.control_id,
    control_task_id: entry.controlTask.task_id,
    lattice_task: publicTask(entry.task),
    request_digest: input.run_request.request_digest,
  };
  const idempotencyKey = actionKey("control_placement", keyPayload);
  return {
    schema_version: LATTICE_CONTROL_ACTION_SCHEMA,
    kind: "control_placement",
    stage: "control_placement",
    idempotency_key: idempotencyKey,
    control_id: input.control_manifest.control_id,
    control_task_id: entry.controlTask.task_id,
    lattice_task: publicTask(entry.task),
    suggested_worker_run_id: `lattice-${idempotencyKey.slice(0, 40)}`,
    selected_tasks: selected.map(publicTask),
  };
}

function runStartAction(input, selected) {
  return action("lattice_run_start", "lattice_run_start", {
    request_id: input.run_request.request_id,
    request_digest: input.run_request.request_digest,
    run_request: structuredClone(input.run_request),
    selected_tasks: selected.map(publicTask),
  });
}

function doneAction(input, entry) {
  return action("lattice_todo_done", "lattice_todo_done", {
    project_id: input.todo_status.project_id,
    plan_key: entry.task.plan_key,
    task_id: entry.task.task_id,
    control_id: input.control_manifest.control_id,
    control_task_id: entry.controlTask.task_id,
    worker_run_id: entry.worker.worker_run_id,
    result_digest: entry.worker.acceptance.result_digest,
    evidence_descriptors: structuredClone(entry.worker.acceptance.verification_evidence),
  });
}

function acceptanceAction(input, entry) {
  return action("control_child_acceptance", "control_child_acceptance", {
    control_id: input.control_manifest.control_id,
    control_task_id: entry.controlTask.task_id,
    worker_run_id: entry.worker.worker_run_id,
    result_digest: entry.worker.result.result_digest,
    evidence_descriptors: structuredClone(entry.worker.result.evidence),
  });
}

function childImportAction(input, mapped, projection) {
  const byTodo = new Map(mapped.map((entry) => [entry.task.task_id, entry]));
  const imports = projection.succeeded.flatMap((success) => {
    const entry = byTodo.get(success.todo_id);
    if (entry === undefined) {
      fail("OBSERVATION_INCONSISTENT", "projected receipt has no selected Control task", {
        todo_id: success.todo_id,
      });
    }
    if (entry.worker === null) {
      fail("OBSERVATION_INCONSISTENT", "projected receipt has no Control worker", {
        todo_id: success.todo_id,
      });
    }
    if (entry.worker.state === "completed") return [];
    if (!ACTIVE_WORKER_STATES.has(entry.worker.state)) {
      fail("OBSERVATION_INCONSISTENT", "projected receipt targets a terminal Control worker", {
        worker_run_id: entry.worker.worker_run_id,
        state: entry.worker.state,
      });
    }
    return [{
      todo_id: success.todo_id,
      receipt_id: success.receipt_id,
      control_task_id: entry.controlTask.task_id,
      worker_run_id: entry.worker.worker_run_id,
      report_fragment: structuredClone(success.report_fragment),
      validation: structuredClone(success.validation),
    }];
  });
  const failedTodoIds = new Set(projection.failed.flatMap(
    (failure) => failure.todo_id === null ? [] : [failure.todo_id],
  ));
  const observedTodoIds = new Set([
    ...projection.succeeded.map((entry) => entry.todo_id),
    ...failedTodoIds,
  ]);
  const pending = mapped.filter((entry) => entry.worker !== null
    && entry.worker.state !== "completed" && !observedTodoIds.has(entry.task.task_id))
    .map((entry) => ({
      todo_id: entry.task.task_id,
      control_task_id: entry.controlTask.task_id,
      worker_run_id: entry.worker.worker_run_id,
    }));
  return action("control_child_import", "control_child_acceptance", {
    control_id: input.control_manifest.control_id,
    run_id: input.run_request.request_id,
    projection_status: projection.status,
    imports,
    retry: structuredClone(projection.failed),
    pending,
  });
}

/**
 * 既存durable stateの観測値から次の単一actionを返す。
 * actionは実行せず、同じ観測値には同じidempotency_keyを返す。
 *
 * @param {{
 *   todo_status: object,
 *   run_list: object,
 *   control_manifest: object,
 *   selection: null|{tasks: Array<{plan_key: string, task_id: string}>, reason: string|null},
 *   run_request: object|null,
 *   children: object[]
 * }} input
 * @returns {object}
 */
export function nextLatticeControlAction(input) {
  validateInput(input);
  const selected = selectedTasks(input);

  if (selected.length === 0) {
    if (input.todo_status.blocked.length > 0 || input.todo_status.active_set.length > 0) {
      return blocked("LATTICE_NOT_READY", "Lattice has no ready task", {
        active: input.todo_status.active_set.map(publicTask),
        blocked: input.todo_status.blocked.map((entry) => ({
          plan_key: entry.plan_key,
          task_id: entry.task_id,
          reason: entry.reason,
        })),
      });
    }
    return idle("no_ready_task");
  }
  if (input.run_request === null) return readySelectionAction(input, selected);

  const mapped = mappedState(input, selected);
  const run = matchingRun(input);
  validateCrossObservation(input, mapped, run);

  const missingPlacement = mapped.find((entry) => entry.worker === null);
  if (missingPlacement !== undefined) return placementAction(input, selected, missingPlacement);

  const startedByControl = mapped.some((entry) => RUN_STARTED_WORKER_STATES.has(entry.worker.state)
    || entry.worker.state === "completed");
  const hasReceiptObservation = input.children.length > 0;
  if (run === null && !startedByControl && !hasReceiptObservation) {
    return runStartAction(input, selected);
  }
  const acceptedNeedingDone = mapped.find((entry) => entry.worker.acceptance?.decision === "accepted"
    && entry.position !== "absent");
  if (acceptedNeedingDone !== undefined) {
    if (acceptedNeedingDone.position !== "active") {
      fail("OBSERVATION_INCONSISTENT", "accepted Control child is not reflectable to Lattice", {
        task_id: acceptedNeedingDone.task.task_id,
        position: acceptedNeedingDone.position,
      });
    }
    return doneAction(input, acceptedNeedingDone);
  }

  const rejected = mapped.find((entry) => entry.worker.acceptance?.decision === "rejected");
  if (rejected !== undefined) {
    return blocked("CONTROL_CHILD_REJECTED", "rejected child requires an explicit retry placement", {
      control_task_id: rejected.controlTask.task_id,
      worker_run_id: rejected.worker.worker_run_id,
    });
  }

  const completed = mapped.find((entry) => entry.worker.state === "completed"
    && entry.worker.acceptance === null);
  if (completed !== undefined) return acceptanceAction(input, completed);

  if (mapped.every((entry) => entry.position === "absent"
    && entry.worker.acceptance?.decision === "accepted")) {
    return idle("saga_complete", selected);
  }

  const projection = projectionForChildren(input, mapped);
  return childImportAction(input, mapped, projection);
}
