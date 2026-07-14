export const ADAPTER_SCHEMA = "dotagents.executor-adapter.v1";

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MAX_INTERFACES = 32;
const MAX_OPERATIONS = 64;

export class ExecutorAdapterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ExecutorAdapterError";
    this.code = code;
  }
}

const fail = (code, message) => { throw new ExecutorAdapterError(code, message); };
const object = (value, name) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("INVALID_SCHEMA", `${name} must be an object`);
  return value;
};
const exact = (value, keys, name) => {
  object(value, name);
  const actual = Object.keys(value).sort(); const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail("INVALID_SCHEMA", `${name} has invalid fields`);
};
const identifier = (value, name) => {
  if (typeof value !== "string" || !ID_RE.test(value)) fail("INVALID_SCHEMA", `${name} is not a bounded identifier`);
};
const boundedArray = (value, name, maximum, validator, minimum = 1) => {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) fail("INVALID_SCHEMA", `${name} has invalid length`);
  value.forEach((entry, index) => validator(entry, `${name}[${index}]`));
};

function validateRestrictions(value) {
  exact(value, ["node_execution", "credential_access", "dispatch_authority"], "restrictions");
  if (value.node_execution !== "forbidden") fail("INVALID_SCHEMA", "restrictions.node_execution must be forbidden");
  if (value.credential_access !== "forbidden") fail("INVALID_SCHEMA", "restrictions.credential_access must be forbidden");
  if (!["parent", "external-product", "projection-only"].includes(value.dispatch_authority)) fail("INVALID_SCHEMA", "restrictions.dispatch_authority is invalid");
}

function validateOperation(value, name) {
  exact(value, ["operation_id", "transport", "tool_name", "effect"], name);
  identifier(value.operation_id, `${name}.operation_id`);
  if (!["host-tool", "mcp", "pty", "projection"].includes(value.transport)) fail("INVALID_SCHEMA", `${name}.transport is invalid`);
  if (typeof value.tool_name !== "string" || value.tool_name.length === 0 || value.tool_name.length > 256 || value.tool_name.includes("\0")) fail("INVALID_SCHEMA", `${name}.tool_name is invalid`);
  if (!["control", "observe"].includes(value.effect)) fail("INVALID_SCHEMA", `${name}.effect is invalid`);
}

function validateInterface(value, name) {
  exact(value, ["interface_id", "operations"], name);
  identifier(value.interface_id, `${name}.interface_id`);
  boundedArray(value.operations, `${name}.operations`, MAX_OPERATIONS, validateOperation);
  const ids = value.operations.map((entry) => entry.operation_id);
  if (new Set(ids).size !== ids.length) fail("DUPLICATE_OPERATION", `${name}.operations contains duplicate ids`);
}

export function validateAdapterDescriptor(value) {
  exact(value, ["schema_version", "adapter_id", "contract_version", "lane", "interfaces", "restrictions"], "adapter");
  if (value.schema_version !== ADAPTER_SCHEMA) fail("INVALID_SCHEMA", "adapter schema is unsupported");
  identifier(value.adapter_id, "adapter.adapter_id"); identifier(value.contract_version, "adapter.contract_version");
  if (!["worker", "consultation", "host-projection"].includes(value.lane)) fail("INVALID_SCHEMA", "adapter.lane is invalid");
  boundedArray(value.interfaces, "adapter.interfaces", MAX_INTERFACES, validateInterface);
  if (new Set(value.interfaces.map((entry) => entry.interface_id)).size !== value.interfaces.length) fail("DUPLICATE_INTERFACE", "adapter.interfaces contains duplicate ids");
  validateRestrictions(value.restrictions);
  if (value.adapter_id === "gpt-connector" && value.lane !== "consultation") fail("LANE_FORBIDDEN", "gpt-connector is consultation-only");
  if (value.adapter_id === "claude-internal") {
    const projection = value.interfaces.length === 1 && value.interfaces[0].interface_id === "appendix-projection"
      && value.interfaces[0].operations.length === 1 && value.interfaces[0].operations[0].operation_id === "observe"
      && value.interfaces[0].operations[0].transport === "projection" && value.interfaces[0].operations[0].tool_name === "appendix_projection"
      && value.interfaces[0].operations[0].effect === "observe";
    if (value.lane !== "host-projection" || !projection) fail("LANE_FORBIDDEN", "claude-internal is observation-projection only");
  }
  return value;
}

export function validateAdapterCatalog(value) {
  boundedArray(value, "adapter_catalog", MAX_INTERFACES, validateAdapterDescriptor);
  const keys = value.map((entry) => `${entry.adapter_id}\0${entry.contract_version}`);
  if (new Set(keys).size !== keys.length) fail("DUPLICATE_ADAPTER", "adapter catalog contains duplicate adapter contracts");
  return value;
}

const restrictions = (dispatchAuthority) => ({ node_execution: "forbidden", credential_access: "forbidden", dispatch_authority: dispatchAuthority });

const DEFAULT_CATALOG = Object.freeze(validateAdapterCatalog([
  {
    schema_version: ADAPTER_SCHEMA, adapter_id: "codex-sidecar", contract_version: "v1", lane: "worker", restrictions: restrictions("external-product"),
    interfaces: [{ interface_id: "durable-work", operations: [
      { operation_id: "start", transport: "mcp", tool_name: "codex_work_start", effect: "control" },
      { operation_id: "result", transport: "mcp", tool_name: "codex_work_result", effect: "observe" },
      { operation_id: "cancel", transport: "mcp", tool_name: "codex_work_cancel", effect: "control" },
      { operation_id: "inspect-recovery", transport: "mcp", tool_name: "codex_work_recover", effect: "observe" },
      { operation_id: "quarantine", transport: "mcp", tool_name: "codex_work_recover", effect: "control" },
    ] }],
  },
  {
    schema_version: ADAPTER_SCHEMA, adapter_id: "codex-native", contract_version: "v1", lane: "worker", restrictions: restrictions("parent"),
    interfaces: [{ interface_id: "native-agent", operations: [
      { operation_id: "spawn", transport: "host-tool", tool_name: "spawn_agent", effect: "control" },
      { operation_id: "followup", transport: "host-tool", tool_name: "followup_task", effect: "control" },
      { operation_id: "interrupt", transport: "host-tool", tool_name: "interrupt_agent", effect: "control" },
    ] }],
  },
  {
    schema_version: ADAPTER_SCHEMA, adapter_id: "aiterm", contract_version: "v1", lane: "worker", restrictions: restrictions("external-product"),
    interfaces: [{ interface_id: "interactive-session", operations: [
      ...["codex_agent", "grok_agent", "composer_agent", "pty_read", "pty_send", "pty_key", "pty_close", "pty_list"].map((tool_name) => ({ operation_id: tool_name, transport: "pty", tool_name, effect: tool_name === "pty_read" || tool_name === "pty_list" ? "observe" : "control" })),
    ] }],
  },
  {
    schema_version: ADAPTER_SCHEMA, adapter_id: "gpt-connector", contract_version: "v1", lane: "consultation", restrictions: restrictions("external-product"),
    interfaces: [{ interface_id: "consultation-job", operations: [
      { operation_id: "consult", transport: "mcp", tool_name: "consult", effect: "control" },
      { operation_id: "sessions", transport: "mcp", tool_name: "sessions", effect: "observe" },
    ] }],
  },
  {
    schema_version: ADAPTER_SCHEMA, adapter_id: "claude-internal", contract_version: "v1", lane: "host-projection", restrictions: restrictions("projection-only"),
    interfaces: [{ interface_id: "appendix-projection", operations: [
      { operation_id: "observe", transport: "projection", tool_name: "appendix_projection", effect: "observe" },
    ] }],
  },
]));

export function defaultAdapterCatalog() {
  return structuredClone(DEFAULT_CATALOG);
}

export function lookupAdapter({ adapter_id, contract_version }, catalog = DEFAULT_CATALOG) {
  identifier(adapter_id, "lookup.adapter_id"); identifier(contract_version, "lookup.contract_version"); validateAdapterCatalog(catalog);
  const adapter = catalog.find((entry) => entry.adapter_id === adapter_id && entry.contract_version === contract_version);
  if (!adapter) fail("ADAPTER_UNKNOWN", "adapter contract is unknown");
  return structuredClone(adapter);
}

export function lookupInterface({ adapter_id, contract_version, interface_id }, catalog = DEFAULT_CATALOG) {
  identifier(interface_id, "lookup.interface_id"); const adapter = lookupAdapter({ adapter_id, contract_version }, catalog);
  const iface = adapter.interfaces.find((entry) => entry.interface_id === interface_id);
  if (!iface) fail("INTERFACE_UNKNOWN", "adapter interface is unknown");
  return { adapter, interface: structuredClone(iface) };
}

export function lookupOperation({ adapter_id, contract_version, interface_id, operation_id }, catalog = DEFAULT_CATALOG) {
  identifier(operation_id, "lookup.operation_id"); const { adapter, interface: iface } = lookupInterface({ adapter_id, contract_version, interface_id }, catalog);
  const operation = iface.operations.find((entry) => entry.operation_id === operation_id);
  if (!operation) fail("OPERATION_UNKNOWN", "adapter operation is unknown");
  return { adapter, interface: iface, operation: structuredClone(operation) };
}
