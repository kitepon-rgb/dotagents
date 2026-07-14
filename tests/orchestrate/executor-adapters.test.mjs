import assert from "node:assert/strict";
import { test } from "node:test";

import * as adapters from "../../lib/orchestrate/executor-adapters.mjs";

const code = (expected) => (error) => {
  assert.ok(error instanceof adapters.ExecutorAdapterError); assert.equal(error.code, expected); return true;
};

test("default catalogは製品固有のoptional operationだけを公開する", () => {
  const catalog = adapters.defaultAdapterCatalog();
  assert.equal(catalog.length, 5);
  assert.deepEqual(adapters.lookupInterface({ adapter_id: "codex-sidecar", contract_version: "v1", interface_id: "durable-work" }).interface.operations.map((entry) => [entry.operation_id, entry.tool_name, entry.effect]), [
    ["start", "codex_work_start", "control"], ["result", "codex_work_result", "observe"], ["cancel", "codex_work_cancel", "control"],
    ["inspect-recovery", "codex_work_recover", "observe"], ["quarantine", "codex_work_recover", "control"],
  ]);
  assert.deepEqual(adapters.lookupInterface({ adapter_id: "codex-native", contract_version: "v1", interface_id: "native-agent" }).interface.operations.map((entry) => entry.tool_name), ["spawn_agent", "followup_task", "interrupt_agent"]);
  assert.deepEqual(adapters.lookupInterface({ adapter_id: "aiterm", contract_version: "v1", interface_id: "interactive-session" }).interface.operations.map((entry) => entry.tool_name), ["codex_agent", "grok_agent", "composer_agent", "pty_read", "pty_send", "pty_key", "pty_close", "pty_list"]);
  assert.equal(adapters.lookupOperation({ adapter_id: "gpt-connector", contract_version: "v1", interface_id: "consultation-job", operation_id: "consult" }).adapter.lane, "consultation");
  assert.deepEqual(adapters.lookupInterface({ adapter_id: "claude-internal", contract_version: "v1", interface_id: "appendix-projection" }).interface.operations.map((entry) => entry.effect), ["observe"]);
});

test("catalog descriptorはexact shape、unique id、bounds、lane制約をfail closedにする", () => {
  const descriptor = adapters.defaultAdapterCatalog()[0];
  assert.throws(() => adapters.validateAdapterDescriptor({ ...descriptor, extra: true }), code("INVALID_SCHEMA"));
  assert.throws(() => adapters.validateAdapterDescriptor({ ...descriptor, interfaces: [descriptor.interfaces[0], descriptor.interfaces[0]] }), code("DUPLICATE_INTERFACE"));
  assert.throws(() => adapters.validateAdapterDescriptor({ ...descriptor, interfaces: [{ ...descriptor.interfaces[0], operations: [descriptor.interfaces[0].operations[0], descriptor.interfaces[0].operations[0]] }] }), code("DUPLICATE_OPERATION"));
  assert.throws(() => adapters.validateAdapterDescriptor({ ...descriptor, interfaces: Array.from({ length: 33 }, () => descriptor.interfaces[0]) }), code("INVALID_SCHEMA"));
  const gpt = adapters.defaultAdapterCatalog().find((entry) => entry.adapter_id === "gpt-connector");
  assert.throws(() => adapters.validateAdapterDescriptor({ ...gpt, lane: "worker" }), code("LANE_FORBIDDEN"));
  const claude = adapters.defaultAdapterCatalog().find((entry) => entry.adapter_id === "claude-internal");
  assert.throws(() => adapters.validateAdapterDescriptor({ ...claude, interfaces: [{ ...claude.interfaces[0], operations: [{ ...claude.interfaces[0].operations[0], effect: "control" }] }] }), code("LANE_FORBIDDEN"));
  assert.throws(() => adapters.validateAdapterDescriptor({ ...claude, interfaces: [{ ...claude.interfaces[0], operations: [{ ...claude.interfaces[0].operations[0], operation_id: "dispatch" }] }] }), code("LANE_FORBIDDEN"));
});

test("lookupはunknown adapter/interface/operationをtyped errorで拒否し、catalogを実行しない", () => {
  assert.throws(() => adapters.lookupAdapter({ adapter_id: "unknown", contract_version: "v1" }), code("ADAPTER_UNKNOWN"));
  assert.throws(() => adapters.lookupInterface({ adapter_id: "aiterm", contract_version: "v1", interface_id: "missing" }), code("INTERFACE_UNKNOWN"));
  assert.throws(() => adapters.lookupOperation({ adapter_id: "aiterm", contract_version: "v1", interface_id: "interactive-session", operation_id: "missing" }), code("OPERATION_UNKNOWN"));
  const first = adapters.defaultAdapterCatalog(); first[0].interfaces[0].operations[0].tool_name = "tampered";
  assert.equal(adapters.defaultAdapterCatalog()[0].interfaces[0].operations[0].tool_name, "codex_work_start");
});

test("codex-native requestはhost toolを実行せず、routing smokeとgreen照合後のfollowupだけを投影する", () => {
  const spawn = adapters.codexNativeSpawnRequest({ agent_type: "implementer", task_name: "routing_smoke" });
  assert.deepEqual(spawn, {
    schema_version: "dotagents.codex-native.request.v1", operation_id: "spawn", tool_name: "spawn_agent",
    arguments: { agent_type: "implementer", fork_turns: "none", message: "Routing smoke only. Do not perform work. Report your agent path, role recognition, and readiness to wait.", task_name: "routing_smoke" },
  });
  assert.equal(spawn.arguments.message.includes("implement the task"), false);
  const routing = {
    status: "green",
    expected: { agent_path: "/root/routing_smoke", agent_role: "implementer", model: "gpt-5.6-terra", effort: "medium", developer_instructions: "implementation only" },
    observed: { agent_path: "/root/routing_smoke", agent_role: "implementer", model: "gpt-5.6-terra", effort: "medium", developer_instructions: "implementation only" },
  };
  assert.deepEqual(adapters.codexNativeFollowupRequest({ agent_path: "/root/routing_smoke", task: "Implement the bounded adapter packet.", routing_verification: routing }).arguments, { target: "/root/routing_smoke", message: "Implement the bounded adapter packet." });
  assert.deepEqual(adapters.codexNativeInterruptRequest({ agent_path: "/root/routing_smoke" }).arguments, { target: "/root/routing_smoke" });
  assert.throws(() => adapters.codexNativeFollowupRequest({ agent_path: "/root/routing_smoke", task: "must not dispatch", routing_verification: { ...routing, status: "pending" } }), code("ROUTING_VERIFICATION_REQUIRED"));
  assert.throws(() => adapters.codexNativeFollowupRequest({ agent_path: "/root/routing_smoke", task: "must not dispatch", routing_verification: { ...routing, observed: { ...routing.observed, effort: "high" } } }), code("ROUTING_VERIFICATION_MISMATCH"));
  assert.throws(() => adapters.codexNativeFollowupRequest({ agent_path: "/root/other", task: "must not dispatch", routing_verification: routing }), code("ROUTING_VERIFICATION_MISMATCH"));
  assert.throws(() => adapters.codexNativeSpawnRequest({ agent_type: "implementer", task_name: "routing_smoke", message: "task" }), code("INVALID_SCHEMA"));
});

test("codex-native observationはboundedなagent状態とrouting/report/evidence参照だけを投影する", () => {
  const routing = {
    status: "green",
    expected: { agent_path: "/root/routing_smoke", agent_role: "implementer", model: "gpt-5.6-terra", effort: "medium", developer_instructions: "implementation only" },
    observed: { agent_path: "/root/routing_smoke", agent_role: "implementer", model: "gpt-5.6-terra", effort: "medium", developer_instructions: "implementation only" },
  };
  const projected = adapters.projectCodexNativeObservation({ agent_path: "/root/routing_smoke", status: "completed", routing_verification: routing, report_ref: "reports/agent_001.md", evidence_refs: ["tests/orchestrate/executor-adapters.test.mjs"] });
  assert.deepEqual(projected, { schema_version: "dotagents.codex-native.observation.v1", agent_path: "/root/routing_smoke", status: "completed", routing_verification: routing, report_ref: "reports/agent_001.md", evidence_refs: ["tests/orchestrate/executor-adapters.test.mjs"] });
  assert.throws(() => adapters.projectCodexNativeObservation({ agent_path: "/root/routing_smoke", status: "running", routing_verification: null, report_ref: null, evidence_refs: [], raw_prompt: "secret" }), code("INVALID_SCHEMA"));
  assert.throws(() => adapters.projectCodexNativeObservation({ agent_path: "/root/routing_smoke", status: "running", routing_verification: null, report_ref: null, evidence_refs: ["same", "same"] }), code("INVALID_SCHEMA"));
});

test("aiterm requestは実tool schemaに従う同一sessionの対話packetだけを純粋に投影する", () => {
  const start = adapters.aitermAgentStartRequest({ agent_kind: "codex", prompt: "Implement the bounded adapter.", workspace_cwd: "/workspace/source", agent_done: true, model: "gpt-5.6-terra", reasoning_effort: "medium", session_name: "aiterm_agent_001" });
  assert.deepEqual(start, { schema_version: "dotagents.aiterm.request.v1", operation_id: "codex_agent", tool_name: "codex_agent", arguments: { prompt: "Implement the bounded adapter.", cwd: "/workspace/source", agent_done: true, model: "gpt-5.6-terra", reasoning_effort: "medium", session_name: "aiterm_agent_001" } });
  const handle = { session_id: "aiterm_agent_001", agent_kind: "codex", workspace_cwd: "/workspace/source" };
  assert.deepEqual(adapters.aitermFollowupRequest({ handle, task: "Run focused tests.", timeout: 120 }).arguments, { session_id: "aiterm_agent_001", text: "Run focused tests.", enter: true, wait: "agent_done", timeout: 120, screen: true, mark: false, force: false, rtk: false, raw: false });
  assert.deepEqual(adapters.aitermTimeoutRecoveryRequest({ handle }).arguments, { session_id: "aiterm_agent_001", wait: false, screen: true, full: false, raw: false, rtk: false, agent_transcript: false });
  assert.deepEqual(adapters.aitermKeyRequest({ handle, key: "C-c" }).arguments, { session_id: "aiterm_agent_001", key: "C-c" });
  assert.deepEqual(adapters.aitermCloseRequest({ handle }).arguments, { session_id: "aiterm_agent_001" });
  assert.deepEqual(adapters.aitermListRequest().arguments, {});
  assert.throws(() => adapters.aitermAgentStartRequest({ agent_kind: "grok", prompt: "task", workspace_cwd: "/workspace/source", agent_done: true, reasoning_effort: "high" }), code("INVALID_SCHEMA"));
  assert.throws(() => adapters.aitermFollowupRequest({ handle, task: "task", timeout: 0 }), code("INVALID_SCHEMA"));
});

test("aiterm observationはsession相関とboundedな状態・参照だけを残しterminal成功を捏造しない", () => {
  const handle = { session_id: "aiterm_agent_001", agent_kind: "composer", workspace_cwd: "/workspace/source" };
  assert.deepEqual(adapters.projectAitermLaunchObservation(handle), { schema_version: "dotagents.aiterm.observation.v1", executor_handle: handle, state: "running", terminal: null });
  assert.deepEqual(adapters.projectAitermObservation({ handle, status: "unknown", report_ref: null, evidence_refs: ["docs/aiterm-timeout.md"] }), { schema_version: "dotagents.aiterm.observation.v1", executor_handle: handle, state: "unknown", report_ref: null, evidence_refs: ["docs/aiterm-timeout.md"] });
  assert.throws(() => adapters.projectAitermObservation({ handle, status: "completed", report_ref: null, evidence_refs: [], raw_terminal: "must not persist" }), code("INVALID_SCHEMA"));
  assert.throws(() => adapters.projectAitermObservation({ handle, status: "timeout", report_ref: null, evidence_refs: [] }), code("INVALID_SCHEMA"));
});

test("gpt-connectorはConsultation専用のconsult/sessions packetをcaller既知slugへ純粋に投影する", () => {
  const consult = adapters.gptConnectorConsultRequest({ prompt: "Review this design.", model: "gpt-5.6", effort: "high", slug: "design-review-001" });
  assert.deepEqual(consult, { schema_version: "dotagents.gpt-connector.request.v1", operation_id: "consult", tool_name: "consult", arguments: { prompt: "Review this design.", model: "gpt-5.6", effort: "high", slug: "design-review-001", keepOpen: false, dryRun: false } });
  assert.deepEqual(adapters.gptConnectorSessionsRequest({ slug: "design-review-001" }).arguments, { slug: "design-review-001" });
  assert.deepEqual(adapters.gptConnectorTimeoutRecoveryRequest({ slug: "design-review-001" }).arguments, { slug: "design-review-001" });
  assert.throws(() => adapters.gptConnectorConsultRequest({ prompt: "Review this design.", model: "gpt-5.6", effort: "high", slug: "unknown slug" }), code("INVALID_SCHEMA"));
  assert.throws(() => adapters.gptConnectorConsultRequest({ prompt: "Review this design.", model: "gpt-5.6", slug: "design-review-001" }), code("INVALID_SCHEMA"));
  assert.throws(() => adapters.gptConnectorConsultRequest({ prompt: "Review this design.", model: "gpt-5.6", effort: "high", slug: "design-review-001", files: ["secret.txt"] }), code("INVALID_SCHEMA"));
});

test("gpt-connector observationはraw answerを保持せず、timeoutをunknownとして同一slugへ回収する", () => {
  const timestamps = { createdAt: "2026-07-14T00:00:00.000Z", updatedAt: "2026-07-14T00:01:00.000Z" };
  const active = { slug: "design-review-001", state: "running", ...timestamps, result: null, error: null };
  assert.deepEqual(adapters.projectGptConnectorObservation({ slug: "design-review-001", provider: active }), { schema_version: "dotagents.gpt-connector.observation.v1", consultation_handle: { slug: "design-review-001" }, state: "running", raw_status: "running", terminal: null });
  const succeeded = { slug: "design-review-001", state: "succeeded", ...timestamps, result: { text: "raw answer is accepted then discarded", status: "finished", endTurn: true, resolvedModel: "gpt-5.6", resolvedEffort: "high", sessionId: "123e4567-e89b-12d3-a456-426614174000", attachments: { count: 1, names: ["private.txt"], mimeTypes: ["text/plain"], readBack: "confirmed", retention: "unknown", cleanup: "deleted" }, archived: true }, error: null };
  assert.deepEqual(adapters.projectGptConnectorObservation({ slug: "design-review-001", provider: succeeded }), { schema_version: "dotagents.gpt-connector.observation.v1", consultation_handle: { slug: "design-review-001" }, state: "completed", raw_status: "succeeded", terminal: { resolved_model: "gpt-5.6", resolved_effort: "high", session_id: "123e4567-e89b-12d3-a456-426614174000", archived: true } });
  const failed = { slug: "design-review-001", state: "failed", ...timestamps, result: null, error: { code: "AUTH_REQUIRED", message: "raw error message is discarded", retry: "after_auth", partialUpload: { count: 1, cleanup: "failed" } } };
  assert.deepEqual(adapters.projectGptConnectorObservation({ slug: "design-review-001", provider: failed }), { schema_version: "dotagents.gpt-connector.observation.v1", consultation_handle: { slug: "design-review-001" }, state: "failed", raw_status: "failed", terminal: { error_code: "AUTH_REQUIRED", retry: "after_auth" } });
  assert.deepEqual(adapters.projectGptConnectorTimeoutObservation({ slug: "design-review-001" }), { schema_version: "dotagents.gpt-connector.observation.v1", consultation_handle: { slug: "design-review-001" }, state: "unknown", raw_status: "caller_timeout", terminal: null });
  assert.throws(() => adapters.projectGptConnectorObservation({ slug: "other-slug", provider: succeeded }), code("INVALID_SCHEMA"));
  assert.throws(() => adapters.projectGptConnectorObservation({ slug: "design-review-001", provider: { ...succeeded, extra: "not in ConsultSnapshot" } }), code("INVALID_SCHEMA"));
  assert.throws(() => adapters.projectGptConnectorObservation({ slug: "design-review-001", provider: { ...failed, error: { ...failed.error, extra: "not in ConsultFailure" } } }), code("INVALID_SCHEMA"));
});

test("claude-internalはappendix由来のunknown projectionだけを提供し、未確認dispatchを発明しない", () => {
  assert.deepEqual(adapters.projectClaudeInternalAppendixObservation({ observed_at: "2026-07-14T00:00:00.000Z" }), {
    schema_version: "dotagents.claude-internal.observation.v1", adapter_id: "claude-internal",
    appendix_ref: "claude/skills/orchestrate/SKILL.md", observed_at: "2026-07-14T00:00:00.000Z",
    state: "unknown", executor_handle: null, terminal: null,
  });
  assert.throws(() => adapters.projectClaudeInternalAppendixObservation({ observed_at: "2026-07-14T00:00:00.000Z", raw_prompt: "secret" }), code("INVALID_SCHEMA"));
  assert.throws(() => adapters.projectClaudeInternalAppendixObservation({ observed_at: "not-a-timestamp" }), code("INVALID_SCHEMA"));
  assert.throws(() => adapters.projectClaudeInternalAppendixObservation({ observed_at: "2026-07-14" }), code("INVALID_SCHEMA"));
});

test("codex-sidecar requestは実tool schemaの固定値とcaller handleを純粋に投影する", () => {
  const handle = { idempotency_key: "A".repeat(22) };
  const start = adapters.codexSidecarStartRequest({ projectRoot: "/workspace/source", handle, baseRef: "a".repeat(40), prompt: "Delegation Packetに従って実装する", allowedPaths: ["lib/orchestrate"], denyPaths: [".env"], turnTimeoutMs: 60000 });
  assert.deepEqual(start, {
    schema_version: "dotagents.codex-sidecar.request.v1", operation_id: "start", tool_name: "codex_work_start",
    arguments: { projectRoot: "/workspace/source", idempotencyKey: "A".repeat(22), baseRef: "a".repeat(40), prompt: "Delegation Packetに従って実装する", allowedPaths: ["lib/orchestrate"], denyPaths: [".env"], turnTimeoutMs: 60000, interruptOnTimeout: true, allowWork: true, preserveWorktree: true },
  });
  assert.deepEqual(adapters.codexSidecarResultRequest({ projectRoot: "/workspace/source", handle }).arguments, { projectRoot: "/workspace/source", idempotencyKey: "A".repeat(22) });
  assert.deepEqual(adapters.codexSidecarCancelRequest({ projectRoot: "/workspace/source", handle }).arguments, { projectRoot: "/workspace/source", idempotencyKey: "A".repeat(22) });
  assert.deepEqual(adapters.codexSidecarRecoveryInspectionRequest({ projectRoot: "/workspace/source", handle }).arguments, { projectRoot: "/workspace/source", idempotencyKey: "A".repeat(22) });
  assert.throws(() => adapters.codexSidecarQuarantineRequest({ projectRoot: "/workspace/source", handle, confirmNoRunningProcesses: false }), code("QUARANTINE_CONFIRMATION_REQUIRED"));
  assert.deepEqual(adapters.codexSidecarQuarantineRequest({ projectRoot: "/workspace/source", handle, confirmNoRunningProcesses: true }).arguments, { projectRoot: "/workspace/source", idempotencyKey: "A".repeat(22), action: "quarantine", confirmNoRunningProcesses: true });
  assert.throws(() => adapters.codexSidecarStartRequest({ projectRoot: "relative", handle, baseRef: "a".repeat(40), prompt: "x", allowedPaths: ["lib"], denyPaths: [], turnTimeoutMs: 1 }), code("INVALID_SCHEMA"));
});

test("codex-sidecar observationはunknownと非成功terminalをcompletedへ昇格しない", () => {
  const handle = { idempotency_key: "A".repeat(22) }; const runId = "b".repeat(64);
  const result = (status, overrides = {}) => ({ status, workflow: "work", summary: "summary", confidence: { level: "high" }, recommendedNextAction: "review", changedFiles: ["lib/x.mjs"], worktreePath: "/workspace/worktree", worktreePreserved: true, ...overrides });
  const completed = adapters.projectCodexSidecarObservation({ handle, provider: { kind: "run_terminal", runId, state: "completed", result: result("ok"), cleanup: "not-requested" } });
  assert.equal(completed.state, "completed"); assert.match(completed.terminal.result_digest, /^[a-f0-9]{64}$/);
  assert.equal(adapters.projectCodexSidecarObservation({ handle, provider: { kind: "run_interrupted", runId, state: "orphaned", error: { code: "RUN_ORPHANED", message: "lost" }, processGroup: "unknown", salvageAllowed: false, terminal: false } }).state, "unknown");
  for (const status of ["partial", "failed", "refused", "dry-run"]) assert.equal(adapters.projectCodexSidecarObservation({ handle, provider: { kind: "run_terminal", runId, state: "completed", result: result(status), cleanup: "not-requested" } }).state, "failed");
  assert.equal(adapters.projectCodexSidecarObservation({ handle, provider: { kind: "run_pending", runId, state: "running", phase: "worker", pollAfterMs: 1000 } }).state, "running");
  assert.throws(() => adapters.projectCodexSidecarObservation({ handle, provider: { kind: "run_terminal", runId, state: "completed", result: result("ok", { worktreePreserved: false }), cleanup: "completed" } }), code("INVALID_SCHEMA"));
  assert.throws(() => adapters.projectCodexSidecarObservation({ handle, provider: { kind: "run_terminal", runId, state: "completed", result: result("ok", { changedFiles: ["../escape"] }), cleanup: "not-requested" } }), code("INVALID_SCHEMA"));
});
