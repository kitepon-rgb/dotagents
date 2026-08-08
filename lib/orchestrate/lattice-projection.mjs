// Read-only typed projection of the Lattice public CLI (ADR 0116 Decision 5).
// `run_status` describes managed runtime runs under `.lattice/runs/`; it is a
// namespace distinct from todo runs (`project_state.active_runs`) and the two
// must never be correlated by this module.
import { spawn } from "node:child_process";

export const PROJECT_STATUS_SCHEMA = "lattice.project_status.v1";
export const TODO_STATUS_SCHEMA = "lattice.todo_status_result.v6";
export const RUN_LIST_SCHEMA = "lattice.run_list.v1";

const DIGEST = /^[0-9a-f]{64}$/u;
const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const IDENTIFIER = /^[0-9A-Za-z](?:[0-9A-Za-z._-]{0,127})$/u;
const PROJECT_STATES = new Set(["uninitialized", "ready", "active_run", "invalid"]);
const text = (value, limit) => typeof value === "string" && [...value].length > 0
  && [...value].length <= limit && [...value].every((character) => character.codePointAt(0) >= 0x20 && character !== "\x7f");
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const identifier = (value) => typeof value === "string" && IDENTIFIER.test(value);
const digest = (value) => typeof value === "string" && DIGEST.test(value);
const safeInt = (value) => Number.isSafeInteger(value) && value >= 0;
const list = (value, validator) => Array.isArray(value) && value.length <= 2_000 && value.every(validator);

function projectStatus(value) {
  if (!exact(value, ["schema", "cli", "project", "state", "store", "active_plans", "active_runs", "can_create_plan", "next_action", "result_digest"])
    || value.schema !== PROJECT_STATUS_SCHEMA || !PROJECT_STATES.has(value.state)
    || !exact(value.cli, ["available", "version"]) || value.cli.available !== true || !text(value.cli.version, 64)
    || !exact(value.store, ["ref", "absolute_path"]) || value.store.ref !== ".lattice/todo"
    || (value.store.absolute_path !== null && !text(value.store.absolute_path, 16_384))
    || !Array.isArray(value.active_plans) || value.active_plans.length > 256
    || !value.active_plans.every((entry) => exact(entry, ["plan_key", "plan_version"]) && identifier(entry.plan_key) && identifier(entry.plan_version))
    || !list(value.active_runs, (entry) => exact(entry, ["plan_key", "task_id", "label"]) && identifier(entry.plan_key) && identifier(entry.task_id) && text(entry.label, 160))
    || typeof value.can_create_plan !== "boolean" || !plain(value.next_action) || !digest(value.result_digest)) return false;
  if (value.project !== null && (!exact(value.project, ["root", "git_head", "project_id"])
    || !text(value.project.root, 16_384) || (value.project.git_head !== null && (typeof value.project.git_head !== "string" || !SHA.test(value.project.git_head)))
    || (value.project.project_id !== null && !identifier(value.project.project_id)))) return false;
  if (value.state === "uninitialized") return value.project !== null && value.project.project_id === null
    && value.can_create_plan === true && exact(value.next_action, ["command", "input_schema", "schema_command"])
    && text(value.next_action.command, 16_384) && text(value.next_action.input_schema, 128) && text(value.next_action.schema_command, 16_384);
  if (value.state === "invalid") return value.can_create_plan === false
    && exact(value.next_action, ["command", "reason"]) && text(value.next_action.command, 16_384) && text(value.next_action.reason, 16_384);
  return value.project !== null && identifier(value.project.project_id) && value.can_create_plan === false
    && exact(value.next_action, ["command", "reason"]) && text(value.next_action.command, 16_384) && text(value.next_action.reason, 16_384)
    && (value.state !== "active_run" || value.active_runs.length > 0) && (value.state !== "ready" || value.active_runs.length === 0);
}

function todoStatus(value) {
  const task = (entry) => exact(entry, ["plan_key", "task_id", "label"])
    && identifier(entry.plan_key) && identifier(entry.task_id) && text(entry.label, 160);
  const active = (entry) => exact(entry, ["plan_key", "task_id", "label", "unmet_dependencies"])
    && task({ plan_key: entry.plan_key, task_id: entry.task_id, label: entry.label })
    && list(entry.unmet_dependencies, (dependency) => exact(dependency, ["plan_key", "task_id"])
      && identifier(dependency.plan_key) && identifier(dependency.task_id));
  const blocked = (entry) => exact(entry, ["plan_key", "task_id", "reason"])
    && identifier(entry.plan_key) && identifier(entry.task_id) && text(entry.reason, 512);
  // v5で加わった監査待ちPhase欄。task entryではなくPhase entryなので`status`ではなく
  // `phase_status`を持ち、値域は監査待ちの3状態だけ（acceptedとclosed_unauditedは出ない）。
  // `next_commands`はverbatim実行可能なフル形コマンドで、監査待ちである以上必ず1つ以上ある。
  const auditPending = (entry) => exact(entry, ["plan_key", "phase_id", "phase_status", "implicit", "required_evidence_slots", "next_commands"])
    && identifier(entry.plan_key) && identifier(entry.phase_id)
    && ["gate_ready", "reviewing", "rejected"].includes(entry.phase_status)
    && typeof entry.implicit === "boolean"
    && list(entry.required_evidence_slots, identifier)
    && list(entry.next_commands, (command) => text(command, 16_384)) && entry.next_commands.length > 0;
  // v6で加わった3欄。いずれも「工程に属する事実」であって task の状態ではないので、
  // task entryとは別の形を持つ（ADR 0160）。
  //
  // plan_notes: plan単位noteの存在だけを述べ、本文は載せない（`next_commands`が指す
  // `note list`が持つ）。`plan_note_head_digest`が`note_context.note_head_digest`と
  // 別名なのは、後者がtask chainのheadで前者がplan chainのheadだから——同名にすると
  // 型が同じ64hexなので、取り違えてもこのvalidatorを通り抜ける。
  const planNotes = (entry) => exact(entry, ["plan_key", "plan_note_head_digest", "count", "latest", "next_commands"])
    && identifier(entry.plan_key) && digest(entry.plan_note_head_digest)
    && safeInt(entry.count) && entry.count > 0
    && Array.isArray(entry.latest) && entry.latest.length > 0 && entry.latest.length <= entry.count
    && entry.latest.every((item) => exact(item, ["event_digest", "actor_agent", "recorded_at"])
      && digest(item.event_digest) && text(item.actor_agent, 160) && text(item.recorded_at, 64))
    && entry.latest[0].event_digest === entry.plan_note_head_digest
    && list(entry.next_commands, (command) => text(command, 16_384)) && entry.next_commands.length > 0;
  // coordination: 調整方式の宣言。**宣言済みのplanだけ**が並ぶ。未宣言は
  // 「member_headsに居てcoordinationに居ない」で引く（Lattice側の設計判断・ADR 0160）。
  const coordination = (entry) => exact(entry, ["plan_key", "mode", "declared_by", "declared_at", "reason"])
    && identifier(entry.plan_key) && ["witness", "conversation"].includes(entry.mode)
    && exact(entry.declared_by, ["host", "session", "agent"])
    && ["host", "session", "agent"].every((key) => text(entry.declared_by[key], 160))
    && text(entry.declared_at, 64) && text(entry.reason, 512);
  // parallel_candidates: 並列候補の逐次判定の導線。`coverage`はLattice側の
  // `TODO_INDEPENDENCE_COVERAGE`と同じ4値で、ここではリテラルで焼く——5値目が来たら
  // それはwire versionの変更として来るべきものであり、黙って受理してはいけない。
  const parallelCandidates = (entry) => exact(entry, ["plan_key", "coverage", "unjudged_task_ids", "verified_parallel_groups", "serialize_pairs", "next_commands"])
    && identifier(entry.plan_key)
    && ["verified", "stale", "superseded", "missing"].includes(entry.coverage)
    && list(entry.unjudged_task_ids, identifier)
    && list(entry.verified_parallel_groups, (group) => exact(group, ["task_ids"])
      && Array.isArray(group.task_ids) && group.task_ids.length > 0 && group.task_ids.every(identifier))
    && list(entry.serialize_pairs, (pair) => exact(pair, ["task_ids", "type", "detail"])
      && Array.isArray(pair.task_ids) && pair.task_ids.length === 2 && pair.task_ids.every(identifier)
      && text(pair.type, 160) && text(pair.detail, 512))
    && list(entry.next_commands, (command) => text(command, 16_384)) && entry.next_commands.length > 0;
  const head = (entry) => exact(entry, ["plan_key", "plan_version", "through_sequence", "journal_head_digest", "reconciliation_state", "revision_digest", "reconciliation_digest"])
    && identifier(entry.plan_key) && identifier(entry.plan_version) && safeInt(entry.through_sequence) && digest(entry.journal_head_digest)
    && ["registered_unreconciled", "reconciled"].includes(entry.reconciliation_state) && digest(entry.reconciliation_digest)
    && ((entry.reconciliation_state === "registered_unreconciled" && entry.revision_digest === null)
      || (entry.reconciliation_state === "reconciled" && digest(entry.revision_digest)));
  if (!exact(value, ["schema", "project_id", "active_set", "next_ready", "dispatch_frontier", "blocked", "audit_pending", "plan_notes", "coordination", "parallel_candidates", "member_heads", "result_digest"])
    || value.schema !== TODO_STATUS_SCHEMA || !identifier(value.project_id) || !list(value.active_set, active)
    || !list(value.next_ready, task) || !list(value.blocked, blocked) || !list(value.audit_pending, auditPending)
    || !list(value.plan_notes, planNotes) || !list(value.coordination, coordination)
    || !list(value.parallel_candidates, parallelCandidates)
    || !list(value.member_heads, head) || !digest(value.result_digest)
    || !exact(value.dispatch_frontier, ["schema", "selection_source", "policy", "recommended_parallelism", "subset_requires_reason", "parallel_start_flag", "frontier_digest"])
    || value.dispatch_frontier.schema !== "lattice.todo_dispatch_frontier.v1" || value.dispatch_frontier.selection_source !== "next_ready"
    || value.dispatch_frontier.policy !== "all_ready_parallel_by_default" || !safeInt(value.dispatch_frontier.recommended_parallelism)
    || value.dispatch_frontier.recommended_parallelism !== value.next_ready.length || value.dispatch_frontier.subset_requires_reason !== (value.next_ready.length > 1)
    || value.dispatch_frontier.parallel_start_flag !== "--parallel-frontier" || !digest(value.dispatch_frontier.frontier_digest)) return false;
  return true;
}

function runList(value) {
  return exact(value, ["schema", "active_runs", "result_digest"]) && value.schema === RUN_LIST_SCHEMA
    && list(value.active_runs, (entry) => exact(entry, ["run_id", "run_ref", "base_sha", "executor_adapter"])
      && text(entry.run_id, 256) && text(entry.run_ref, 1_024) && typeof entry.base_sha === "string" && SHA.test(entry.base_sha) && text(entry.executor_adapter, 256))
    && digest(value.result_digest);
}

async function defaultRunner(command, args, { cwd } = {}) {
  return new Promise((resolve) => {
    let child;
    try { child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] }); } catch (error) { resolve({ error }); return; }
    let stdout = ""; let stderr = ""; let settled = false;
    const finish = (result) => { if (!settled) { settled = true; resolve(result); } };
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => finish({ stdout, stderr, error }));
    child.on("close", (code) => finish({ stdout, stderr, code }));
  });
}

export const CLI_ERROR_SCHEMA = "lattice.cli_error.v2";

/** stderrの`lattice.cli_error.v2` envelopeを取り出す。取れなければnull（推測で埋めない）。 */
function cliError(stderr) {
  const raw = typeof stderr === "string" ? stderr
    : Buffer.isBuffer(stderr) ? stderr.toString("utf8") : null;
  if (raw === null || raw.length === 0 || raw.length > 64 * 1024) return null;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    let value;
    try { value = JSON.parse(trimmed); } catch { continue; }
    if (!plain(value) || value.schema !== CLI_ERROR_SCHEMA) continue;
    if (!identifier(value.code) || !text(value.message, 1_024)) return null;
    return { code: value.code, message: value.message };
  }
  return null;
}

async function read(command, args, expectedSchema, validator, kind, { runner = defaultRunner, cwd } = {}) {
  let execution;
  try { execution = await runner(command, args, { cwd }); } catch (error) { return { kind: "cli_unavailable", command, args, reason: "runner_failed" }; }
  const stdout = typeof execution?.stdout === "string" ? execution.stdout : Buffer.isBuffer(execution?.stdout) ? execution.stdout.toString("utf8") : null;
  if (execution?.error || stdout === null) return { kind: "cli_unavailable", command, args, reason: "spawn_failed" };
  let value;
  try { value = JSON.parse(stdout); } catch {
    // Latticeはstdoutへversioned JSONだけを出し、失敗envelope（lattice.cli_error.v2）は
    // stderrへ出す。stdoutだけを見るとINVALID_RUN_STORE等のtyped codeが
    // invalid_stdoutへ一般化され、原因の型が失われる。stderrのenvelopeを拾って保つ。
    const failure = cliError(execution?.stderr);
    if (failure !== null) return { kind: "cli_error", command, args, code: failure.code, message: failure.message };
    return { kind: "cli_unavailable", command, args, reason: "invalid_stdout" };
  }
  if (!plain(value)) return { kind: "cli_unavailable", command, args, reason: "invalid_envelope" };
  if (typeof value.schema === "string" && value.schema !== expectedSchema) return { kind: "version_mismatch", command, args, expected_schema: expectedSchema, observed_schema: value.schema };
  if (!validator(value)) return { kind: "cli_unavailable", command, args, reason: "invalid_envelope" };
  return { kind, schema: expectedSchema, result_digest: value.result_digest, value };
}

export const readProjectState = (options) => read("lattice", ["status", "--json"], PROJECT_STATUS_SCHEMA, projectStatus, "project_state", options);
export const readTodoFrontier = (options) => read("lattice", ["todo", "status", "--json"], TODO_STATUS_SCHEMA, todoStatus, "todo_frontier", options);
export const readRunStatus = (options) => read("lattice", ["run", "list", "--json"], RUN_LIST_SCHEMA, runList, "run_status", options);
