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
