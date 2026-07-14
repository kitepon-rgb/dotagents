import assert from "node:assert/strict";
import { test } from "node:test";

import { createExecutorContractRegistry } from "../../lib/orchestrate/executor-contracts.mjs";
import { ControlRecordError, EXECUTOR_CONTRACT_REGISTRY, validateExecutorContractSnapshot, validateWorkerRecord } from "../../lib/orchestrate/control-record.mjs";
import { makeWorkerRun } from "./helpers.mjs";
import { syntheticContract, syntheticExecutor } from "./fixtures/executor-contract.mjs";

const controlCode = (expected) => (error) => { assert.ok(error instanceof ControlRecordError); assert.equal(error.code, expected); return true; };

test("executor contract registryはexact key・不変性・未知fail-closedを提供する", () => {
  const registry = createExecutorContractRegistry([syntheticContract]);
  assert.equal(registry.get(syntheticExecutor, "ticket-work"), registry.contracts[0]);
  assert.equal(registry.has({ ...syntheticExecutor, handle_schema_id: "other.v1" }, "ticket-work"), false);
  assert.throws(() => createExecutorContractRegistry([{ ...syntheticContract, extra: true }]), TypeError);
  assert.throws(() => createExecutorContractRegistry([syntheticContract, syntheticContract]), TypeError);
  assert.throws(() => { registry.contracts.push(syntheticContract); }, TypeError);
  assert.throws(() => { registry.contracts[0].external = false; }, TypeError);
});

test("synthetic contractはhandle・capability・reservation属性をcore schema変更なしで注入する", () => {
  const registry = createExecutorContractRegistry([syntheticContract]);
  const contract = registry.get(syntheticExecutor, "ticket-work");
  contract.validate_handle({ ticket: "ticket-42" });
  assert.throws(() => contract.validate_handle({ ticket: "wrong" }), TypeError);
  contract.validate_capabilities([{ capability_id: "synthetic.execute", value: "true" }]);
  assert.throws(() => contract.validate_capabilities([{ capability_id: "synthetic.execute", value: "false" }]), TypeError);
  assert.equal(contract.external, true);
  assert.equal(registry.get({ ...syntheticExecutor, adapter_id: "unknown" }, "ticket-work"), null);
  const snapshot = { executor: syntheticExecutor, workflow_id: "ticket-work", executor_handle: { ticket: "ticket-42" }, workflow_capabilities: [{ capability_id: "synthetic.execute", value: "true", evidence: { type: "file", ref: "docs/synthetic.md", digest: "a".repeat(64), observed_at: "2026-07-14T00:00:00.000Z" } }] };
  assert.deepEqual(validateExecutorContractSnapshot(snapshot, registry), { external: true, handle_schema_id: "synthetic.ticket.v1" });
  assert.throws(() => validateExecutorContractSnapshot({ ...snapshot, executor_handle: { ticket: "invalid" } }, registry), controlCode("INVALID_SCHEMA"));
});

test("synthetic registryは実Worker record validation pathでtypedに検証される", () => {
  const registry = createExecutorContractRegistry([syntheticContract]);
  const worker = makeWorkerRun({ executor: syntheticExecutor, workflow_id: "ticket-work", executor_handle: { ticket: "ticket-42" }, workflow_capabilities: [{ capability_id: "synthetic.execute", value: "true", evidence: { type: "file", ref: "docs/synthetic.md", digest: "a".repeat(64), observed_at: "2026-07-14T00:00:00.000Z" } }] });
  assert.equal(validateWorkerRecord(worker, { registry }), worker);
  assert.throws(() => validateWorkerRecord({ ...worker, executor_handle: { ticket: "bad" } }, { registry }), controlCode("INVALID_SCHEMA"));
  assert.throws(() => validateWorkerRecord({ ...worker, workflow_capabilities: [{ ...worker.workflow_capabilities[0], value: "false" }] }, { registry }), controlCode("CAPABILITY_MISMATCH"));
  assert.throws(() => validateWorkerRecord({ ...worker, executor: { ...syntheticExecutor, adapter_id: "unknown" } }, { registry }), controlCode("ADAPTER_UNKNOWN"));
});

test("production registryは既存の検証済みexecutorだけを公開する", () => {
  assert.equal(EXECUTOR_CONTRACT_REGISTRY.has({ adapter_id: "codex-sidecar", contract_version: "v1", instance_id: "local-default", handle_schema_id: "codex-sidecar.idempotency-key.v1" }, "work"), true);
  assert.equal(EXECUTOR_CONTRACT_REGISTRY.has({ adapter_id: "claude-internal", contract_version: "v1", instance_id: "legacy", handle_schema_id: "claude.session.v1" }, "native-subagent"), false);
});
