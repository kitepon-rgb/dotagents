function keyOf(executor, workflowId) {
  return [executor.adapter_id, executor.contract_version, workflowId, executor.handle_schema_id].join("\0");
}

function immutableContract(value) {
  const keys = ["adapter_id", "contract_version", "workflow_id", "handle_schema_id", "external", "nullable_handle", "active_handle_required", "validate_handle", "validate_capabilities"];
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some((key) => !(key in value))) throw new TypeError("executor contract has invalid fields");
  for (const key of ["adapter_id", "contract_version", "workflow_id", "handle_schema_id"]) if (typeof value[key] !== "string" || value[key].length === 0) throw new TypeError(`executor contract ${key} is invalid`);
  if (typeof value.external !== "boolean" || typeof value.nullable_handle !== "boolean" || typeof value.active_handle_required !== "boolean" || typeof value.validate_handle !== "function" || typeof value.validate_capabilities !== "function") throw new TypeError("executor contract has invalid validators");
  if (!value.nullable_handle && !value.active_handle_required) throw new TypeError("executor contract cannot waive an active handle when null is never valid");
  return Object.freeze({ ...value });
}

/** Compile-time registry: callers supply all contracts at creation; no later registration exists. */
export function createExecutorContractRegistry(contracts) {
  if (!Array.isArray(contracts) || contracts.length === 0) throw new TypeError("executor contracts must be a nonempty array");
  const entries = contracts.map(immutableContract); const byKey = new Map();
  for (const entry of entries) {
    const key = keyOf(entry, entry.workflow_id);
    if (byKey.has(key)) throw new TypeError("executor contracts contain duplicate key");
    byKey.set(key, entry);
  }
  return Object.freeze({
    contracts: Object.freeze(entries),
    get(executor, workflowId) { return byKey.get(keyOf(executor, workflowId)) ?? null; },
    has(executor, workflowId) { return byKey.has(keyOf(executor, workflowId)); },
  });
}
