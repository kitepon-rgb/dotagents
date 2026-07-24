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
