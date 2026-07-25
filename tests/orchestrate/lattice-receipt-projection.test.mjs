import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

import { ROOT } from "./helpers.mjs";

const projection = await import("../../lib/orchestrate/lattice-receipt-projection.mjs");
const code = (expected) => (error) => error.code === expected;

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const PACKET_DIGEST = "1".repeat(64);
const RECEIPT_DIGEST = "2".repeat(64);
const CHECKPOINT_DIGEST = "3".repeat(64);
const CONTEXT_DIGEST = "4".repeat(64);
const BINDING_DIGEST = "5".repeat(64);

const packet = (overrides = {}) => ({
  schema: "lattice.executor_packet.v1",
  packet_id: "packet-1",
  todo_id: "todo-1",
  task_ref: "task-1",
  scope: { writes: ["lib/orchestrate/"] },
  base_sha: SHA_A,
  plan_ref: "plan-1",
  plan_epoch: 7,
  verifier_refs: ["node-test"],
  forbidden_operations: ["commit"],
  context_content_digest: CONTEXT_DIGEST,
  packet_digest: PACKET_DIGEST,
  ...overrides,
});

const receipt = (overrides = {}) => ({
  schema: "lattice.executor_receipt.v1",
  receipt_id: "receipt-1",
  executor_handle: "executor-1",
  worktree_id: "worktree-1",
  base_sha: SHA_A,
  plan_epoch: 7,
  packet_digest: PACKET_DIGEST,
  todo_id: "todo-1",
  checkpoint_digest: CHECKPOINT_DIGEST,
  observed_diff: [
    { path: "tests/orchestrate/projection.test.mjs", change: "modified" },
    { path: "lib/orchestrate/projection.mjs", change: "added" },
  ],
  receipt_digest: RECEIPT_DIGEST,
  ...overrides,
});

const bindingProjection = (compileBindingOverrides = {}, overrides = {}) => ({
  schema: "lattice.todo_binding_projection.v1",
  project_id: "dotagents",
  plan_key: "factory-master",
  bindings: [{
    project_id: "dotagents",
    plan_key: "factory-master",
    plan_version: "rev-1",
    task_id: "todo-1",
    compile_binding: {
      boundary_manifest_digest: "6".repeat(64),
      compiled_plan_digest: "7".repeat(64),
      topology_digest: "8".repeat(64),
      base_sha: SHA_A,
      ...compileBindingOverrides,
    },
  }],
  result_digest: BINDING_DIGEST,
  ...overrides,
});

const child = (overrides = {}) => ({
  receipt: receipt(),
  packet: packet(),
  dispatch: { executor_handle: "executor-1", worktree_id: "worktree-1" },
  write_scope: [
    { kind: "directory", path: "lib/orchestrate" },
    { kind: "directory", path: "tests/orchestrate" },
  ],
  binding_projection: bindingProjection(),
  ...overrides,
});

const run = (...children) => projection.projectLatticeReceipts({ children });
const reasonCodes = (failure) => failure.reasons.map((reason) => reason.code);

test("全相関が一致するreceiptをstrict Worker Report断片へ投影する", () => {
  const result = run(child());
  assert.equal(result.schema_version, "dotagents.lattice-receipt-projection.v1");
  assert.equal(result.status, "success");
  assert.deepEqual(result.failed, []);
  assert.deepEqual(result.succeeded, [{
    child_index: 0,
    receipt_id: "receipt-1",
    todo_id: "todo-1",
    report_fragment: {
      changed_paths: [
        "lib/orchestrate/projection.mjs",
        "tests/orchestrate/projection.test.mjs",
      ],
      result_digest: RECEIPT_DIGEST,
      executor_handle: "executor-1",
    },
    validation: {
      scope: "passed",
      digest: "passed",
      dispatch_owner: "passed",
    },
  }]);
});

test("scope逸脱を拒否し、全ての逸脱pathを昇順で報告する", () => {
  const result = run(child({
    receipt: receipt({ observed_diff: [
      { path: "outside/z.mjs", change: "added" },
      { path: "lib/orchestrate/ok.mjs", change: "modified" },
      { path: "outside/a.mjs", change: "deleted" },
    ] }),
  }));
  assert.equal(result.status, "failure");
  assert.deepEqual(result.succeeded, []);
  assert.equal(result.failed[0].validation.scope, "failed");
  assert.equal(result.failed[0].reasons[0].code, "SCOPE_VIOLATION");
  assert.deepEqual(result.failed[0].reasons[0].details.paths, [
    "outside/a.mjs",
    "outside/z.mjs",
  ]);
});

test("packet_digest不一致をtypedに拒否し、別packetへのreceipt付け替えを許さない", () => {
  const result = run(child({
    receipt: receipt({ packet_digest: "9".repeat(64) }),
  }));
  assert.equal(result.failed[0].validation.digest, "failed");
  assert.deepEqual(reasonCodes(result.failed[0]), ["PACKET_DIGEST_MISMATCH"]);
  assert.equal(result.failed[0].reasons[0].details.expected, PACKET_DIGEST);
});

test("receipt・packet・bindingのbase_sha不一致をそれぞれ拒否する", () => {
  const receiptMismatch = run(child({ receipt: receipt({ base_sha: SHA_B }) }));
  assert.deepEqual(reasonCodes(receiptMismatch.failed[0]), ["BASE_SHA_MISMATCH"]);
  assert.equal(receiptMismatch.failed[0].reasons[0].details.source, "packet");

  const bindingMismatch = run(child({
    binding_projection: bindingProjection({ base_sha: SHA_B }),
  }));
  assert.deepEqual(reasonCodes(bindingMismatch.failed[0]), ["BASE_SHA_MISMATCH"]);
  assert.equal(bindingMismatch.failed[0].reasons[0].details.source, "binding");
});

test("executor_handleとworktree_idはreceiptでなくdispatch記録を基準に照合する", () => {
  for (const field of ["executor_handle", "worktree_id"]) {
    const changedReceipt = receipt({ [field]: `forged-${field}` });
    const result = run(child({ receipt: changedReceipt }));
    assert.equal(result.status, "failure");
    assert.equal(result.failed[0].validation.dispatch_owner, "failed");
    assert.deepEqual(reasonCodes(result.failed[0]), ["DISPATCH_OWNER_MISMATCH"]);
    assert.deepEqual(result.failed[0].reasons[0].details.fields, [field]);
  }
});

test("3件中1件が失敗しても成功2件を捨てずpartial failureとして分離する", () => {
  const second = child({
    receipt: receipt({
      receipt_id: "receipt-2",
      todo_id: "todo-2",
      observed_diff: [{ path: "lib/orchestrate/two.mjs", change: "modified" }],
    }),
    packet: packet({ packet_id: "packet-2", todo_id: "todo-2" }),
    binding_projection: undefined,
  });
  delete second.binding_projection;
  const failed = child({
    receipt: receipt({
      receipt_id: "receipt-3",
      todo_id: "todo-3",
      observed_diff: [{ path: "outside/three.mjs", change: "added" }],
    }),
    packet: packet({ packet_id: "packet-3", todo_id: "todo-3" }),
    binding_projection: undefined,
  });
  delete failed.binding_projection;

  const result = run(child(), failed, second);
  assert.equal(result.status, "partial_failure");
  assert.deepEqual(result.succeeded.map((entry) => entry.receipt_id), ["receipt-1", "receipt-2"]);
  assert.deepEqual(result.failed.map((entry) => entry.receipt_id), ["receipt-3"]);
  assert.deepEqual(reasonCodes(result.failed[0]), ["SCOPE_VIOLATION"]);
});

test("未知field・欠落field・不正digest・非repo相対pathのreceiptをtypedに拒否する", () => {
  const unknown = receipt({ unexpected: true });
  const missing = receipt();
  delete missing.receipt_id;
  const invalidDigest = receipt({ receipt_digest: "ABC" });
  const absolutePath = receipt({
    observed_diff: [{ path: "/tmp/escape.mjs", change: "added" }],
  });

  for (const invalid of [unknown, missing, invalidDigest, absolutePath]) {
    const result = run(child({ receipt: invalid }));
    assert.equal(result.status, "failure");
    assert.deepEqual(result.succeeded, []);
    assert.deepEqual(reasonCodes(result.failed[0]), ["INVALID_RECEIPT"]);
    assert.deepEqual(result.failed[0].validation, {
      scope: "not_evaluated",
      digest: "not_evaluated",
      dispatch_owner: "not_evaluated",
    });
  }
});

test("不正入力を空成功へ丸めず、batch不正はtyped exception・子不正はtyped failureにする", () => {
  assert.throws(() => projection.projectLatticeReceipts({ children: [] }), code("INVALID_INPUT"));
  assert.throws(
    () => projection.projectLatticeReceipts({ children: [child()], extra: true }),
    code("INVALID_INPUT"),
  );

  const result = run({ receipt: null, packet: packet(), dispatch: {}, write_scope: [] });
  assert.equal(result.status, "failure");
  assert.equal(result.succeeded.length, 0);
  assert.equal(result.failed.length, 1);
  assert.deepEqual(reasonCodes(result.failed[0]), ["INVALID_RECEIPT"]);

  const sparse = projection.projectLatticeReceipts({ children: new Array(1) });
  assert.equal(sparse.status, "failure");
  assert.equal(sparse.succeeded.length, 0);
  assert.deepEqual(reasonCodes(sparse.failed[0]), ["INVALID_CHILD"]);
});

test("pure moduleはlattice-projectionをimportせずCLI spawnも持たない", async () => {
  const source = await readFile(
    join(ROOT, "lib", "orchestrate", "lattice-receipt-projection.mjs"),
    "utf8",
  );
  assert.doesNotMatch(source, /from\s+["'][^"']*lattice-projection\.mjs["']/u);
  assert.doesNotMatch(source, /\bspawn\s*\(/u);
  assert.doesNotMatch(source, /node:child_process/u);
});
