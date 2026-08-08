import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  PROJECT_STATUS_SCHEMA, RUN_LIST_SCHEMA, TODO_STATUS_SCHEMA,
  readProjectState, readRunStatus, readTodoFrontier,
} from "../../lib/orchestrate/lattice-projection.mjs";

const fixture = async (name) => readFile(fileURLToPath(new URL(`./fixtures/lattice-projection/${name}`, import.meta.url)), "utf8");
const runner = (stdout, extra = {}) => async (command, args) => ({ stdout, command, args, ...extra });

test("project projection validates the exact v1 envelope and ignores exit 1 after valid stdout", async () => {
  const stdout = await fixture("project-invalid.json");
  const result = await readProjectState({ runner: runner(stdout, { code: 1 }) });
  assert.equal(result.kind, "project_state");
  assert.equal(result.schema, PROJECT_STATUS_SCHEMA);
  assert.equal(result.value.state, "invalid");
  assert.equal(result.result_digest, result.value.result_digest);
});

test("project projection returns a valid ready state from its fixed fixture", async () => {
  const result = await readProjectState({ runner: runner(await fixture("project-ready.json")) });
  assert.equal(result.kind, "project_state");
  assert.equal(result.value.state, "ready");
});

test("todo and managed-runtime projections use their distinct read-only CLI commands", async () => {
  const calls = [];
  const fixtureRunner = async (command, args) => {
    calls.push({ command, args });
    if (args[0] === "todo") return { stdout: await fixture("todo-frontier.json") };
    return { stdout: await fixture("run-list.json") };
  };
  const todo = await readTodoFrontier({ runner: fixtureRunner });
  const runs = await readRunStatus({ runner: fixtureRunner });
  assert.equal(todo.kind, "todo_frontier");
  assert.equal(todo.schema, TODO_STATUS_SCHEMA);
  assert.equal(todo.result_digest, todo.value.result_digest);
  assert.equal(runs.kind, "run_status");
  assert.equal(runs.schema, RUN_LIST_SCHEMA);
  assert.deepEqual(calls, [
    { command: "lattice", args: ["todo", "status", "--json"] },
    { command: "lattice", args: ["run", "list", "--json"] },
  ]);
});

test("public digests are format-validated and relayed without recreating Lattice internals", async () => {
  const todo = JSON.parse(await fixture("todo-frontier.json"));
  todo.result_digest = "d".repeat(64);
  todo.dispatch_frontier.frontier_digest = "e".repeat(64);
  const result = await readTodoFrontier({ runner: runner(JSON.stringify(todo)) });
  assert.equal(result.kind, "todo_frontier");
  assert.equal(result.result_digest, "d".repeat(64));
  assert.equal(result.value.dispatch_frontier.frontier_digest, "e".repeat(64));
});

test("schema disagreement is version_mismatch and preserves the observed version", async () => {
  const result = await readTodoFrontier({ runner: runner(JSON.stringify({ schema: "lattice.todo_status_result.v5" })) });
  assert.deepEqual(result, {
    kind: "version_mismatch", command: "lattice", args: ["todo", "status", "--json"],
    expected_schema: TODO_STATUS_SCHEMA, observed_schema: "lattice.todo_status_result.v5",
  });
});

test("v6 surfaces the three process fields and rejects the v5 shape that omits them", async () => {
  const accepted = await readTodoFrontier({ runner: runner(await fixture("todo-frontier.json")) });
  assert.equal(accepted.kind, "todo_frontier");
  assert.equal(accepted.schema, "lattice.todo_status_result.v6");
  assert.deepEqual(accepted.value.audit_pending, [{
    plan_key: "legacy", phase_id: "terminal-audit", phase_status: "gate_ready", implicit: true,
    required_evidence_slots: ["terminal-audit"],
    next_commands: [
      "lattice todo phase review --plan legacy --phase terminal-audit --reason <text>",
      "lattice todo phase close-unaudited --plan legacy --phase terminal-audit --reason <text>",
    ],
  }]);
  // v6の3欄が射影を素通りして届く。中身の検証は下のtestが持つ。
  assert.equal(accepted.value.plan_notes[0].plan_note_head_digest, "1".repeat(64));
  assert.equal(accepted.value.coordination[0].mode, "conversation");
  assert.deepEqual(accepted.value.parallel_candidates[0].unjudged_task_ids, ["task-2"]);

  // 欄を1つでも落とした応答は受理しない。欄の欠落は「無い」ではなく「答えていない」であり、
  // そこを空扱いすると、この工程が直している失念がそのまま戻る。v6の3欄すべてで同じ。
  const invalid = { kind: "cli_unavailable", command: "lattice", args: ["todo", "status", "--json"], reason: "invalid_envelope" };
  for (const key of ["audit_pending", "plan_notes", "coordination", "parallel_candidates"]) {
    const withoutField = JSON.parse(await fixture("todo-frontier.json"));
    delete withoutField[key];
    assert.deepEqual(await readTodoFrontier({ runner: runner(JSON.stringify(withoutField)) }), invalid,
      `${key} を落とした応答が受理された`);
  }
});

test("v6の3欄はfieldごとに検証され、素通しされない", async () => {
  const mutate = async (key, patch) => {
    const value = JSON.parse(await fixture("todo-frontier.json"));
    patch(value[key][0]);
    return readTodoFrontier({ runner: runner(JSON.stringify(value)) });
  };
  const invalid = { kind: "cli_unavailable", command: "lattice", args: ["todo", "status", "--json"], reason: "invalid_envelope" };

  // plan_notes: 先頭がheadである不変を消費側でも守る。ここが崩れた応答は
  // 「最新のnoteはどれか」を答えられていない。
  assert.deepEqual(await mutate("plan_notes", (e) => { e.latest[0].event_digest = "3".repeat(64); }), invalid);
  assert.deepEqual(await mutate("plan_notes", (e) => { e.count = 0; }), invalid);
  // note_head_digest は v6 で plan_note_head_digest へ改名された。旧名は別chainのheadを指す。
  assert.deepEqual(await mutate("plan_notes", (e) => {
    e.note_head_digest = e.plan_note_head_digest; delete e.plan_note_head_digest;
  }), invalid);

  // coordination: modeは2値。値域を開けると「宣言していない」が「未知の方式」に化ける。
  assert.deepEqual(await mutate("coordination", (e) => { e.mode = "auto"; }), invalid);
  assert.deepEqual(await mutate("coordination", (e) => { delete e.declared_by.agent; }), invalid);
  assert.equal((await mutate("coordination", (e) => { e.mode = "witness"; })).kind, "todo_frontier");

  // parallel_candidates: coverageはLattice側のTODO_INDEPENDENCE_COVERAGEと同じ4値だけ。
  // 5値目が来たらそれはwire versionの変更として来るべきもので、黙って受理しない。
  assert.deepEqual(await mutate("parallel_candidates", (e) => { e.coverage = "ready"; }), invalid);
  assert.deepEqual(await mutate("parallel_candidates", (e) => {
    e.serialize_pairs = [{ task_ids: ["a"], type: "state", detail: "共有状態" }];
  }), invalid, "serialize_pairs の task_ids は2件ちょうど");
  for (const coverage of ["verified", "stale", "superseded", "missing"]) {
    assert.equal((await mutate("parallel_candidates", (e) => { e.coverage = coverage; })).kind, "todo_frontier",
      `coverage=${coverage} が拒否された`);
  }
});

test("audit_pending entries are validated per field, not relayed unchecked", async () => {
  const mutate = async (patch) => {
    const value = JSON.parse(await fixture("todo-frontier.json"));
    patch(value.audit_pending[0]);
    return readTodoFrontier({ runner: runner(JSON.stringify(value)) });
  };
  const invalid = { kind: "cli_unavailable", command: "lattice", args: ["todo", "status", "--json"], reason: "invalid_envelope" };
  // acceptedとclosed_unauditedは監査待ちではない。値域を開けると「閉じた工程」が残作業に化ける。
  assert.deepEqual(await mutate((entry) => { entry.phase_status = "accepted"; }), invalid);
  assert.deepEqual(await mutate((entry) => { entry.implicit = "true"; }), invalid);
  // 次の一手が空の監査待ちは、次アクション面としては何も答えていないのと同じである。
  assert.deepEqual(await mutate((entry) => { entry.next_commands = []; }), invalid);
  assert.deepEqual(await mutate((entry) => { entry.status = "gate_ready"; }), invalid);
  assert.equal((await mutate((entry) => { entry.phase_status = "reviewing"; })).kind, "todo_frontier");
});

test("unknown project states and malformed stdout are typed failures, never a missing state", async () => {
  const unknown = JSON.parse(await fixture("project-ready.json"));
  unknown.state = "missing";
  const unknownResult = await readProjectState({ runner: runner(JSON.stringify(unknown)) });
  assert.deepEqual(unknownResult, { kind: "cli_unavailable", command: "lattice", args: ["status", "--json"], reason: "invalid_envelope" });
  const malformedResult = await readRunStatus({ runner: runner("not json") });
  assert.deepEqual(malformedResult, { kind: "cli_unavailable", command: "lattice", args: ["run", "list", "--json"], reason: "invalid_stdout" });
});

test("runner spawn and runner exceptions are cli_unavailable", async () => {
  const spawnFailure = await readRunStatus({ runner: runner("", { error: new Error("ENOENT") }) });
  assert.deepEqual(spawnFailure, { kind: "cli_unavailable", command: "lattice", args: ["run", "list", "--json"], reason: "spawn_failed" });
  const runnerFailure = await readRunStatus({ runner: async () => { throw new Error("runner failure"); } });
  assert.deepEqual(runnerFailure, { kind: "cli_unavailable", command: "lattice", args: ["run", "list", "--json"], reason: "runner_failed" });
});
