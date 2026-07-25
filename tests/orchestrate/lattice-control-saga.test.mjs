import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

import { canonicalJson } from "../../lib/orchestrate/canonical-json.mjs";
import { ROOT } from "./helpers.mjs";

const saga = await import("../../lib/orchestrate/lattice-control-saga.mjs");
const code = (expected) => (error) => error.code === expected;

const SHA = "a".repeat(40);
const FRONTIER_DIGEST = "1".repeat(64);
const STATUS_DIGEST = "2".repeat(64);
const RUN_LIST_DIGEST = "3".repeat(64);
const REVISION_DIGEST = "4".repeat(64);
const PACKET_DIGEST = "5".repeat(64);
const RECEIPT_DIGEST = "6".repeat(64);
const CHECKPOINT_DIGEST = "7".repeat(64);
const CONTEXT_DIGEST = "8".repeat(64);
const EVIDENCE_DIGEST = "9".repeat(64);

const head = () => ({
  plan_key: "master",
  plan_version: "rev-1",
  through_sequence: 3,
  journal_head_digest: "a".repeat(64),
  reconciliation_state: "reconciled",
  revision_digest: REVISION_DIGEST,
  reconciliation_digest: "b".repeat(64),
});

const task = (taskId) => ({ plan_key: "master", task_id: taskId, label: `Task ${taskId}` });

const todoStatus = ({ ready = ["todo-1"], active = [], blocked = [] } = {}) => ({
  schema: "lattice.todo_status_result.v4",
  project_id: "dotagents",
  active_set: active.map((taskId) => ({ ...task(taskId), unmet_dependencies: [] })),
  next_ready: ready.map(task),
  dispatch_frontier: {
    schema: "lattice.todo_dispatch_frontier.v1",
    selection_source: "next_ready",
    policy: "all_ready_parallel_by_default",
    recommended_parallelism: ready.length,
    subset_requires_reason: ready.length > 1,
    parallel_start_flag: "--parallel-frontier",
    frontier_digest: FRONTIER_DIGEST,
  },
  blocked: blocked.map((taskId) => ({
    plan_key: "master", task_id: taskId, reason: "dependency blocked",
  })),
  member_heads: [head()],
  result_digest: STATUS_DIGEST,
});

const runList = (active = false, overrides = {}) => ({
  schema: "lattice.run_list.v1",
  active_runs: active ? [{
    run_id: "request-1",
    run_ref: ".lattice/runs/request-1",
    base_sha: SHA,
    executor_adapter: "codex",
    ...overrides,
  }] : [],
  result_digest: RUN_LIST_DIGEST,
});

const evidence = (ref = "docs/child.md") => ({
  type: "file",
  ref,
  digest: EVIDENCE_DIGEST,
  observed_at: "2026-07-25T00:00:00.000Z",
});

const externalTask = (taskId) => ({
  task_id: `control-${taskId}`,
  external_source: {
    namespace: "lattice.todo",
    contract_version: "lattice.todo_status_result.v4",
    external_id: `master/rev-1/${taskId}`,
    immutable_digest: REVISION_DIGEST,
  },
});

const worker = (taskId, state = "planned", overrides = {}) => {
  const completed = state === "completed";
  return {
    worker_run_id: `worker-${taskId}`,
    task_id: `control-${taskId}`,
    placement_reservation: { candidate_digest: "c".repeat(64) },
    state,
    result: completed ? { result_digest: RECEIPT_DIGEST, evidence: [evidence()] } : null,
    acceptance: null,
    ...overrides,
  };
};

const acceptedWorker = (taskId) => worker(taskId, "completed", {
  acceptance: {
    decision: "accepted",
    accepted_from_revision: 7,
    result_digest: RECEIPT_DIGEST,
    executor_handle: { idempotency_key: "A".repeat(22) },
    verification_evidence: [evidence("docs/accepted.md")],
    decision_note: "accepted",
    decided_by: "parent",
    decided_at: "2026-07-25T00:01:00.000Z",
  },
});

const manifest = ({ taskIds = ["todo-1"], workers = [] } = {}) => ({
  schema_version: "dotagents.orchestration-control.v30",
  control_id: "control-1",
  status: "active",
  tasks: taskIds.map(externalTask),
  worker_runs: workers,
});

const request = (taskIds = ["todo-1"], overrides = {}) => {
  const value = {
    schema: "lattice.run_request.v1",
    request_id: "request-1",
    repo: { base_sha: SHA, root_kind: "worktree" },
    capacity: { executors: taskIds.length },
    todos: taskIds.map((todoId) => ({ todo_id: todoId })),
    manual_witness: Object.fromEntries(taskIds.map((taskId) => [taskId, {}])),
    sensor_query_set: { queries: [] },
    executor_capability: { adapters: ["codex"] },
    claim_mode: "exact_minimum",
    request_digest: "",
    ...overrides,
  };
  const unsigned = structuredClone(value);
  delete unsigned.request_digest;
  value.request_digest = createHash("sha256").update(canonicalJson(unsigned)).digest("hex");
  return value;
};

const packet = (taskId = "todo-1") => ({
  schema: "lattice.executor_packet.v1",
  packet_id: `packet-${taskId}`,
  todo_id: taskId,
  task_ref: `task-${taskId}`,
  scope: { writes: ["lib/orchestrate/"] },
  base_sha: SHA,
  plan_ref: "plan-1",
  plan_epoch: 7,
  verifier_refs: ["node-test"],
  forbidden_operations: ["commit"],
  context_content_digest: CONTEXT_DIGEST,
  packet_digest: PACKET_DIGEST,
});

const receipt = (taskId = "todo-1", overrides = {}) => ({
  schema: "lattice.executor_receipt.v1",
  receipt_id: `receipt-${taskId}`,
  executor_handle: `executor-${taskId}`,
  worktree_id: `worktree-${taskId}`,
  base_sha: SHA,
  plan_epoch: 7,
  packet_digest: PACKET_DIGEST,
  todo_id: taskId,
  checkpoint_digest: CHECKPOINT_DIGEST,
  observed_diff: [{ path: `lib/orchestrate/${taskId}.mjs`, change: "modified" }],
  receipt_digest: RECEIPT_DIGEST,
  ...overrides,
});

const child = (taskId = "todo-1", overrides = {}) => ({
  receipt: receipt(taskId),
  packet: packet(taskId),
  dispatch: {
    executor_handle: `executor-${taskId}`,
    worktree_id: `worktree-${taskId}`,
  },
  write_scope: [{ kind: "directory", path: "lib/orchestrate" }],
  ...overrides,
});

const input = (overrides = {}) => ({
  todo_status: todoStatus(),
  run_list: runList(),
  control_manifest: manifest(),
  selection: null,
  run_request: null,
  children: [],
  ...overrides,
});

test("正常系はready選択から単一actionずつ段送りする", () => {
  const selected = saga.nextLatticeControlAction(input());
  assert.equal(selected.kind, "lattice_todo_start");
  assert.equal(selected.stage, "ready_selection");
  assert.deepEqual(selected.selected_tasks, [{ plan_key: "master", task_id: "todo-1" }]);
  assert.equal(selected.parallel_start_flag, "--parallel-frontier");

  const placed = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
    run_request: request(),
  }));
  assert.equal(placed.kind, "control_placement");

  const started = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
    run_request: request(),
    control_manifest: manifest({ workers: [worker("todo-1")] }),
  }));
  assert.equal(started.kind, "lattice_run_start");

  const imported = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
    run_list: runList(true),
    run_request: request(),
    control_manifest: manifest({ workers: [worker("todo-1")] }),
    children: [child()],
  }));
  assert.equal(imported.kind, "control_child_import");
  assert.equal(imported.imports[0].worker_run_id, "worker-todo-1");

  const accepted = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
    run_list: runList(),
    run_request: request(),
    control_manifest: manifest({ workers: [worker("todo-1", "completed")] }),
  }));
  assert.equal(accepted.kind, "control_child_acceptance");

  const reflected = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
    run_list: runList(),
    run_request: request(),
    control_manifest: manifest({ workers: [acceptedWorker("todo-1")] }),
  }));
  assert.equal(reflected.kind, "lattice_todo_done");
  assert.deepEqual(reflected.evidence_descriptors, [evidence("docs/accepted.md")]);
});

test("段1完了・段2未了の観測はControl placementを返す", () => {
  const result = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
    run_request: request(),
  }));
  assert.equal(result.kind, "control_placement");
  assert.equal(result.control_task_id, "control-todo-1");
  assert.match(result.idempotency_key, /^[0-9a-f]{64}$/u);
});

test("段3済み・Control未更新でもrun startを再発行せず段4へ進む", () => {
  const observed = input({
    todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
    run_list: runList(true),
    run_request: request(),
    control_manifest: manifest({ workers: [worker("todo-1")] }),
    children: [child()],
  });
  const first = saga.nextLatticeControlAction(observed);
  const second = saga.nextLatticeControlAction(structuredClone(observed));
  assert.equal(first.kind, "control_child_import");
  assert.equal(first.idempotency_key, second.idempotency_key);
  assert.notEqual(first.kind, "lattice_run_start");
});

test("段5まで済んだ観測はidleとなり重複doneを出さない", () => {
  const result = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: [] }),
    run_list: runList(),
    run_request: request(),
    control_manifest: manifest({ workers: [acceptedWorker("todo-1")] }),
  }));
  assert.deepEqual(result, {
    schema_version: "dotagents.lattice-control-action.v1",
    kind: "idle",
    reason: "saga_complete",
    selected_tasks: [{ plan_key: "master", task_id: "todo-1" }],
  });
});

test("Lattice done相当なのにControl workerがrunningならtyped不整合になる", () => {
  assert.throws(() => saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: [] }),
    run_request: request(),
    control_manifest: manifest({ workers: [worker("todo-1", "running")] }),
  })), code("OBSERVATION_INCONSISTENT"));
});

test("既存placementとactive runを観測したら両副作用を冪等にskipする", () => {
  const result = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
    run_list: runList(true),
    run_request: request(),
    control_manifest: manifest({ workers: [worker("todo-1", "running")] }),
  }));
  assert.equal(result.kind, "control_child_import");
  assert.deepEqual(result.imports, []);
  assert.deepEqual(result.pending, [{
    todo_id: "todo-1",
    control_task_id: "control-todo-1",
    worker_run_id: "worker-todo-1",
  }]);
});

test("terminal runがactive一覧から消えControlがrunningでもrunを再発行せず段4で待つ", () => {
  const result = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
    run_list: runList(),
    run_request: request(),
    control_manifest: manifest({ workers: [worker("todo-1", "running")] }),
  }));
  assert.equal(result.kind, "control_child_import");
  assert.equal(result.projection_status, "pending");
  assert.deepEqual(result.pending.map((entry) => entry.todo_id), ["todo-1"]);
});

test("all-ready既定とrecommended parallelismを尊重する", () => {
  const status = todoStatus({ ready: ["todo-1", "todo-2"] });
  const selected = saga.nextLatticeControlAction(input({
    todo_status: status,
    control_manifest: manifest({ taskIds: ["todo-1", "todo-2"] }),
  }));
  assert.equal(selected.kind, "lattice_todo_start");
  assert.equal(selected.recommended_parallelism, 2);
  assert.equal(selected.selected_parallelism, 2);
  assert.deepEqual(selected.selected_tasks.map((entry) => entry.task_id), ["todo-1", "todo-2"]);

  const started = saga.nextLatticeControlAction(input({
    todo_status: status,
    control_manifest: manifest({
      taskIds: ["todo-1", "todo-2"],
      workers: [worker("todo-1"), worker("todo-2")],
    }),
    run_request: request(["todo-1", "todo-2"]),
  }));
  assert.equal(started.kind, "lattice_run_start");
  assert.equal(started.run_request.capacity.executors, 2);
});

test("subset_requires_reasonなのに理由なしの部分選択を拒否する", () => {
  assert.throws(() => saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: ["todo-1", "todo-2"] }),
    control_manifest: manifest({ taskIds: ["todo-1", "todo-2"] }),
    selection: { tasks: [{ plan_key: "master", task_id: "todo-1" }], reason: null, frontier_digest: FRONTIER_DIGEST },
  })), code("SUBSET_REASON_REQUIRED"));

  const selected = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: ["todo-1", "todo-2"] }),
    control_manifest: manifest({ taskIds: ["todo-1", "todo-2"] }),
    selection: {
      tasks: [{ plan_key: "master", task_id: "todo-1" }],
      reason: "一方を先に実測する",
      frontier_digest: FRONTIER_DIGEST,
    },
  }));
  assert.equal(selected.kind, "lattice_todo_start");
  assert.equal(selected.selected_parallelism, 1);
  assert.equal(selected.parallel_start_flag, null);
});

// fm-0671のfixture matrixが見つけた欠陥の回帰。形式的に正しいがfrontierが変わった後の
// 選択は、既にreadyでなくなったToDoを指しうるためdispatchへ通さない。
test("選択時と観測中でfrontier digestが違えばstaleとして拒否する", () => {
  assert.throws(() => saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: ["todo-1", "todo-2"] }),
    control_manifest: manifest({ taskIds: ["todo-1", "todo-2"] }),
    selection: {
      tasks: [{ plan_key: "master", task_id: "todo-1" }],
      reason: "一方を先に実測する",
      frontier_digest: "f".repeat(64),
    },
  })), code("STALE_FRONTIER"));

  // selectionを渡さない場合は観測中のfrontierをそのまま使うので、staleになりようがない。
  const derived = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: ["todo-1"] }),
    control_manifest: manifest({ taskIds: ["todo-1"] }),
    selection: null,
  }));
  assert.equal(derived.kind, "lattice_todo_start");
});

test("partial failureは成功子だけimportし失敗子をretryへ残す", () => {
  const failedChild = child("todo-2", {
    receipt: receipt("todo-2", {
      observed_diff: [{ path: "outside/todo-2.mjs", change: "modified" }],
    }),
  });
  const result = saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: ["todo-1", "todo-2"] }),
    run_list: runList(true),
    control_manifest: manifest({
      taskIds: ["todo-1", "todo-2"],
      workers: [worker("todo-1", "running"), worker("todo-2", "running")],
    }),
    run_request: request(["todo-1", "todo-2"]),
    children: [child("todo-1"), failedChild],
  }));
  assert.equal(result.kind, "control_child_import");
  assert.equal(result.projection_status, "partial_failure");
  assert.deepEqual(result.imports.map((entry) => entry.todo_id), ["todo-1"]);
  assert.deepEqual(result.retry.map((entry) => entry.todo_id), ["todo-2"]);
});

test("不正観測・run相関不一致・Lattice readyに対応するControl binding欠落をtyped拒否する", () => {
  const invalidStatus = todoStatus();
  invalidStatus.extra = true;
  assert.throws(() => saga.nextLatticeControlAction(input({
    todo_status: invalidStatus,
  })), code("INVALID_OBSERVATION"));

  assert.throws(() => saga.nextLatticeControlAction(input({
    todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
    run_list: runList(true, { base_sha: "b".repeat(40) }),
    run_request: request(),
    control_manifest: manifest({ workers: [worker("todo-1")] }),
  })), code("OBSERVATION_INCONSISTENT"));

  assert.throws(() => saga.nextLatticeControlAction(input({
    run_request: request(),
    control_manifest: manifest({ taskIds: [] }),
  })), code("OBSERVATION_INCONSISTENT"));
});

test("pure moduleはlattice-projectionをimportせずCLI spawnも持たない", async () => {
  const source = await readFile(
    join(ROOT, "lib", "orchestrate", "lattice-control-saga.mjs"),
    "utf8",
  );
  assert.doesNotMatch(source, /from\s+["'][^"']*lattice-projection\.mjs["']/u);
  assert.doesNotMatch(source, /\bspawn\s*\(/u);
  assert.doesNotMatch(source, /node:child_process/u);
});
