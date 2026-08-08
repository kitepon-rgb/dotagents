import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

import { canonicalJson } from "../../lib/orchestrate/canonical-json.mjs";
import {
  readProjectState,
  readRunStatus,
  readTodoFrontier,
} from "../../lib/orchestrate/lattice-projection.mjs";
import { projectLatticeReceipts } from "../../lib/orchestrate/lattice-receipt-projection.mjs";
import { nextLatticeControlAction } from "../../lib/orchestrate/lattice-control-saga.mjs";
import { ROOT } from "./helpers.mjs";

const SHA = "a".repeat(40);
const OTHER_SHA = "b".repeat(40);
const FRONTIER_DIGEST = "1".repeat(64);
const STATUS_DIGEST = "2".repeat(64);
const RUN_LIST_DIGEST = "3".repeat(64);
const REVISION_DIGEST = "4".repeat(64);
const PACKET_DIGEST = "5".repeat(64);
const RECEIPT_DIGEST = "6".repeat(64);
const CHECKPOINT_DIGEST = "7".repeat(64);
const CONTEXT_DIGEST = "8".repeat(64);
const EVIDENCE_DIGEST = "9".repeat(64);

const code = (expected) => (error) => error.code === expected;
const jsonRunner = (value, overrides = {}) => async () => ({
  stdout: JSON.stringify(value),
  stderr: "",
  code: 0,
  ...overrides,
});

const head = () => ({
  plan_key: "master",
  plan_version: "rev-1",
  through_sequence: 3,
  journal_head_digest: "a".repeat(64),
  reconciliation_state: "reconciled",
  revision_digest: REVISION_DIGEST,
  reconciliation_digest: "b".repeat(64),
});

const task = (taskId) => ({
  plan_key: "master",
  task_id: taskId,
  label: `Task ${taskId}`,
});

const todoStatus = ({
  ready = ["todo-1"],
  active = [],
  frontierDigest = FRONTIER_DIGEST,
} = {}) => ({
  schema: "lattice.todo_status_result.v6",
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
    frontier_digest: frontierDigest,
  },
  blocked: [],
  audit_pending: [],
  plan_notes: [],
  coordination: [],
  parallel_candidates: [],
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
    result: completed ? {
      result_digest: RECEIPT_DIGEST,
      evidence: [evidence()],
    } : null,
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

const rejectedWorker = (taskId) => worker(taskId, "completed", {
  acceptance: {
    decision: "rejected",
    accepted_from_revision: 7,
    result_digest: RECEIPT_DIGEST,
    executor_handle: { idempotency_key: "B".repeat(22) },
    verification_evidence: [evidence("docs/rejected.md")],
    decision_note: "rejected",
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
  observed_diff: [{
    path: `lib/orchestrate/${taskId}.mjs`,
    change: "modified",
  }],
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

const sagaInput = (overrides = {}) => ({
  todo_status: todoStatus(),
  run_list: runList(),
  control_manifest: manifest(),
  selection: null,
  run_request: null,
  children: [],
  ...overrides,
});

// 工程ToDoの8軸を、軸・ケース・保証が一覧できるfixture tableとして固定する。
const fixtureMatrix = [
  {
    axis: "1. 単体",
    caseName: "pure moduleをLatticeなしで実呼出し",
    guarantee: "receipt projectionとsagaがCLI projectionをimportせず単体動作する",
    async run() {
      const [receiptSource, sagaSource] = await Promise.all([
        readFile(join(ROOT, "lib", "orchestrate", "lattice-receipt-projection.mjs"), "utf8"),
        readFile(join(ROOT, "lib", "orchestrate", "lattice-control-saga.mjs"), "utf8"),
      ]);
      for (const source of [receiptSource, sagaSource]) {
        assert.doesNotMatch(source, /from\s+["'][^"']*lattice-projection\.mjs["']/u);
        assert.doesNotMatch(source, /node:child_process/u);
      }

      const projected = projectLatticeReceipts({ children: [child()] });
      assert.equal(projected.status, "success");
      assert.deepEqual(projected.succeeded.map((entry) => entry.todo_id), ["todo-1"]);

      const next = nextLatticeControlAction(sagaInput());
      assert.equal(next.kind, "lattice_todo_start");
      assert.equal(next.frontier_digest, FRONTIER_DIGEST);
    },
  },
  {
    axis: "2. 非導入",
    caseName: "lattice executableがENOENT",
    guarantee: "未導入を空のproject stateへ丸めずtyped failureとして返す",
    async run() {
      const result = await readProjectState({
        runner: async () => ({
          stdout: "",
          stderr: "",
          error: Object.assign(new Error("spawn lattice ENOENT"), { code: "ENOENT" }),
        }),
      });
      assert.deepEqual(result, {
        kind: "cli_unavailable",
        command: "lattice",
        args: ["status", "--json"],
        reason: "spawn_failed",
      });
      assert.equal(Object.hasOwn(result, "value"), false);
    },
  },
  {
    axis: "3. 停止",
    caseName: "runner timeoutとCLI異常終了",
    guarantee: "無応答と不正終了を有効な観測や空集合として扱わない",
    async run() {
      const timeout = await readTodoFrontier({
        runner: async () => {
          throw Object.assign(new Error("lattice timed out"), { code: "ETIMEDOUT" });
        },
      });
      assert.deepEqual(timeout, {
        kind: "cli_unavailable",
        command: "lattice",
        args: ["todo", "status", "--json"],
        reason: "runner_failed",
      });

      const abnormalExit = await readRunStatus({
        runner: async () => ({
          stdout: "",
          stderr: "lattice stopped",
          code: 70,
        }),
      });
      assert.deepEqual(abnormalExit, {
        kind: "cli_unavailable",
        command: "lattice",
        args: ["run", "list", "--json"],
        reason: "invalid_stdout",
      });
      assert.equal(Object.hasOwn(abnormalExit, "value"), false);
    },
  },
  {
    axis: "4. unknown version",
    caseName: "todo statusの旧v5と将来v7",
    guarantee: "未知schemaを既知v6として解釈せずobserved version付きでfail closedにする",
    async run() {
      for (const observedSchema of [
        "lattice.todo_status_result.v5",
        "lattice.todo_status_result.v7",
      ]) {
        const result = await readTodoFrontier({
          runner: jsonRunner({ schema: observedSchema }),
        });
        assert.deepEqual(result, {
          kind: "version_mismatch",
          command: "lattice",
          args: ["todo", "status", "--json"],
          expected_schema: "lattice.todo_status_result.v6",
          observed_schema: observedSchema,
        });
      }
    },
  },
  {
    axis: "5. stale frontier/base",
    caseName: "古いfrontier digestとrun base不一致",
    guarantee: "base不一致もstale frontierもdispatch前にfail closedにする",
    run() {
      assert.throws(() => nextLatticeControlAction(sagaInput({
        todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
        run_list: runList(true, { base_sha: OTHER_SHA }),
        run_request: request(),
        control_manifest: manifest({ workers: [worker("todo-1")] }),
      })), code("OBSERVATION_INCONSISTENT"));

      // selectionは「どのfrontierを見て選んだか」を伴う。観測中のfrontierと違えば、
      // 形式上validな古いdigestでもstaleとして拒否する。
      const staleDigest = "0".repeat(64);
      assert.throws(() => nextLatticeControlAction(sagaInput({
        selection: {
          tasks: [{ plan_key: "master", task_id: "todo-1" }],
          reason: null,
          frontier_digest: staleDigest,
        },
      })), code("STALE_FRONTIER"));
    },
  },
  {
    axis: "6. invalid run store",
    caseName: "run listがINVALID_RUN_STOREをstderrへ返す",
    guarantee: "invalid storeを空集合へ丸めず、typed codeを一般化もしない",
    async run() {
      const cliError = {
        schema: "lattice.cli_error.v2",
        code: "INVALID_RUN_STORE",
        message: "run storeのartifact bindingが不正",
      };
      const result = await readRunStatus({
        runner: async () => ({
          stdout: "",
          stderr: JSON.stringify(cliError),
          code: 1,
        }),
      });
      // Latticeは失敗envelopeをstderrへ出すため、stdoutだけを見るとtyped codeが
      // invalid_stdoutへ一般化される。原因の型を保つことまでを受入条件にする。
      assert.deepEqual(result, {
        kind: "cli_error",
        command: "lattice",
        args: ["run", "list", "--json"],
        code: "INVALID_RUN_STORE",
        message: "run storeのartifact bindingが不正",
      });
      assert.notEqual(result.kind, "run_status");
      assert.equal(Object.hasOwn(result, "active_runs"), false);
      assert.equal(Object.hasOwn(result, "value"), false);
    },
  },
  {
    axis: "7. 部分失敗",
    caseName: "2子の成功1件・scope失敗1件",
    guarantee: "成功分だけをimportし失敗分だけをretryへ残す",
    run() {
      const failedChild = child("todo-2", {
        receipt: receipt("todo-2", {
          observed_diff: [{
            path: "outside/todo-2.mjs",
            change: "modified",
          }],
        }),
      });
      const result = nextLatticeControlAction(sagaInput({
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
      assert.equal(result.retry[0].reasons[0].code, "SCOPE_VIOLATION");
    },
  },
  {
    axis: "8. crash/resume/close/abandon",
    caseName: "durable途中状態への再入と4 lifecycle判断",
    guarantee: "再dispatchせず回収し、完了はclose相当、棄却は明示retry待ちへ送る",
    run() {
      const lifecycleCases = [
        {
          lifecycle: "crash",
          observed: sagaInput({
            todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
            run_list: runList(true),
            run_request: request(),
            control_manifest: manifest({ workers: [worker("todo-1")] }),
            children: [child()],
          }),
          expectedKind: "control_child_import",
          verify: (result) => assert.deepEqual(
            result.imports.map((entry) => entry.todo_id),
            ["todo-1"],
          ),
        },
        {
          lifecycle: "resume",
          observed: sagaInput({
            todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
            run_list: runList(true),
            run_request: request(),
            control_manifest: manifest({ workers: [worker("todo-1", "unknown")] }),
          }),
          expectedKind: "control_child_import",
          verify: (result) => assert.deepEqual(
            result.pending.map((entry) => entry.worker_run_id),
            ["worker-todo-1"],
          ),
        },
        {
          lifecycle: "close",
          observed: sagaInput({
            todo_status: todoStatus({ ready: [], active: [] }),
            run_list: runList(),
            run_request: request(),
            control_manifest: manifest({ workers: [acceptedWorker("todo-1")] }),
          }),
          expectedKind: "idle",
          verify: (result) => assert.equal(result.reason, "saga_complete"),
        },
        {
          lifecycle: "abandon",
          observed: sagaInput({
            todo_status: todoStatus({ ready: [], active: ["todo-1"] }),
            run_list: runList(),
            run_request: request(),
            control_manifest: manifest({ workers: [rejectedWorker("todo-1")] }),
          }),
          expectedKind: "control_placement",
          verify: (result) => assert.equal(result.control_task_id, "control-todo-1"),
        },
      ];

      for (const lifecycleCase of lifecycleCases) {
        const result = nextLatticeControlAction(lifecycleCase.observed);
        assert.equal(result.kind, lifecycleCase.expectedKind, lifecycleCase.lifecycle);
        assert.notEqual(result.kind, "lattice_run_start", lifecycleCase.lifecycle);
        lifecycleCase.verify(result);
      }
    },
  },
];

for (const fixture of fixtureMatrix) {
  test(
    `fixture matrix [${fixture.axis}] ${fixture.caseName} — ${fixture.guarantee}`,
    fixture.run,
  );
}
