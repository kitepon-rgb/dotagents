export const syntheticExecutor = Object.freeze({ adapter_id: "synthetic", contract_version: "v1", instance_id: "fixture", handle_schema_id: "synthetic.ticket.v1" });

export const syntheticContract = Object.freeze({
  adapter_id: "synthetic", contract_version: "v1", workflow_id: "ticket-work", handle_schema_id: "synthetic.ticket.v1",
  external: true, nullable_handle: false, active_handle_required: true,
  validate_handle(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 1 || typeof value.ticket !== "string" || !/^ticket-[0-9]+$/.test(value.ticket)) throw new TypeError("synthetic ticket handle is invalid");
  },
  validate_capabilities(capabilities) {
    const values = new Map(capabilities.map((entry) => [entry.capability_id, entry.value]));
    if (values.get("synthetic.execute") !== "true") throw new TypeError("synthetic execute capability is required");
  },
});

export const syntheticAdapterDescriptor = Object.freeze({
  schema_version: "dotagents.executor-adapter.v1", adapter_id: "synthetic", contract_version: "v1", lane: "worker",
  interfaces: [{ interface_id: "ticket-work", operations: [{ operation_id: "submit", transport: "host-tool", tool_name: "synthetic_submit", effect: "control" }, { operation_id: "inspect", transport: "host-tool", tool_name: "synthetic_inspect", effect: "observe" }] }],
  restrictions: { node_execution: "forbidden", credential_access: "forbidden", dispatch_authority: "parent" },
});
