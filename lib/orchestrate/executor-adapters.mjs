import { createHash } from "node:crypto";

export const ADAPTER_SCHEMA = "dotagents.executor-adapter.v1";

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MAX_INTERFACES = 32;
const MAX_OPERATIONS = 64;
const MAX_CHANGED_FILES = 256;
const SIDECAR_REQUEST_SCHEMA = "dotagents.codex-sidecar.request.v1";
const SIDECAR_OBSERVATION_SCHEMA = "dotagents.codex-sidecar.observation.v1";
const CODEX_NATIVE_REQUEST_SCHEMA = "dotagents.codex-native.request.v1";
const CODEX_NATIVE_OBSERVATION_SCHEMA = "dotagents.codex-native.observation.v1";
const SIDECAR_OUTPUT_LIMIT = 64 * 1024;
const CODEX_NATIVE_OUTPUT_LIMIT = 64 * 1024;
const CODEX_NATIVE_STATUSES = new Set(["created", "running", "completed", "failed", "unknown", "interrupted"]);
const HANDSHAKE_ONLY_MESSAGE = "Routing smoke only. Do not perform work. Report your agent path, role recognition, and readiness to wait.";

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
const exactOptional = (value, required, optional, name) => {
  object(value, name);
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !Object.hasOwn(value, key)) || Object.keys(value).some((key) => !allowed.has(key))) fail("INVALID_SCHEMA", `${name} has invalid fields`);
};
const identifier = (value, name) => {
  if (typeof value !== "string" || !ID_RE.test(value)) fail("INVALID_SCHEMA", `${name} is not a bounded identifier`);
};
const boundedArray = (value, name, maximum, validator, minimum = 1) => {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) fail("INVALID_SCHEMA", `${name} has invalid length`);
  value.forEach((entry, index) => validator(entry, `${name}[${index}]`));
};
const boundedString = (value, name, maximum = 4096) => {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || value.includes("\0")) fail("INVALID_SCHEMA", `${name} is not a bounded string`);
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

function sidecarOperation(operation_id) {
  return lookupOperation({ adapter_id: "codex-sidecar", contract_version: "v1", interface_id: "durable-work", operation_id }).operation;
}

function nativeOperation(operation_id) {
  return lookupOperation({ adapter_id: "codex-native", contract_version: "v1", interface_id: "native-agent", operation_id }).operation;
}

function nativeAgentPath(value, name = "agent_path") {
  boundedString(value, name, 1024);
  if (!/^\/root(?:\/[a-z0-9_]+)+$/.test(value)) fail("INVALID_SCHEMA", `${name} is not a canonical native agent path`);
  return value;
}

function nativeTask(value, name) {
  boundedString(value, name, 16 * 1024);
  return value;
}

function routingField(value, name, maximum = 4096) {
  boundedString(value, name, maximum);
  return value;
}

function validateRoutingIdentity(value, name) {
  exact(value, ["agent_path", "agent_role", "model", "effort", "developer_instructions"], name);
  routingField(value.agent_path, `${name}.agent_path`, 1024);
  identifier(value.agent_role, `${name}.agent_role`);
  routingField(value.model, `${name}.model`, 256);
  routingField(value.effort, `${name}.effort`, 64);
  routingField(value.developer_instructions, `${name}.developer_instructions`, 16 * 1024);
  return value;
}

function validateGreenRoutingVerification(value, name = "routing_verification") {
  exact(value, ["status", "expected", "observed"], name);
  if (value.status !== "green") fail("ROUTING_VERIFICATION_REQUIRED", `${name}.status must be green`);
  validateRoutingIdentity(value.expected, `${name}.expected`);
  validateRoutingIdentity(value.observed, `${name}.observed`);
  if (canonicalJson(value.expected) !== canonicalJson(value.observed)) fail("ROUTING_VERIFICATION_MISMATCH", `${name} does not match the routed agent`);
  return value;
}

function codexNativeRequest(operation_id, argumentsValue) {
  const operation = nativeOperation(operation_id);
  return { schema_version: CODEX_NATIVE_REQUEST_SCHEMA, operation_id, tool_name: operation.tool_name, arguments: structuredClone(argumentsValue) };
}

// These functions build invocation packets only. Calling the parent host tool remains the parent's responsibility.
export function codexNativeSpawnRequest(input) {
  exact(input, ["agent_type", "task_name"], "codex native spawn input");
  if (!["implementer", "refuter", "sorter"].includes(input.agent_type)) fail("INVALID_SCHEMA", "codex native spawn input.agent_type is not a registered role");
  identifier(input.task_name, "codex native spawn input.task_name");
  return codexNativeRequest("spawn", {
    agent_type: input.agent_type, fork_turns: "none", message: HANDSHAKE_ONLY_MESSAGE, task_name: input.task_name,
  });
}

export function codexNativeFollowupRequest(input) {
  exact(input, ["agent_path", "task", "routing_verification"], "codex native followup input");
  nativeAgentPath(input.agent_path, "codex native followup input.agent_path"); nativeTask(input.task, "codex native followup input.task");
  validateGreenRoutingVerification(input.routing_verification, "codex native followup input.routing_verification");
  if (input.routing_verification.observed.agent_path !== input.agent_path) fail("ROUTING_VERIFICATION_MISMATCH", "followup target differs from the verified agent path");
  return codexNativeRequest("followup", { target: input.agent_path, message: input.task });
}

export function codexNativeInterruptRequest(input) {
  exact(input, ["agent_path"], "codex native interrupt input"); nativeAgentPath(input.agent_path, "codex native interrupt input.agent_path");
  return codexNativeRequest("interrupt", { target: input.agent_path });
}

export function projectCodexNativeObservation(value) {
  exact(value, ["agent_path", "status", "routing_verification", "report_ref", "evidence_refs"], "codex native observation");
  nativeAgentPath(value.agent_path, "codex native observation.agent_path");
  if (!CODEX_NATIVE_STATUSES.has(value.status)) fail("INVALID_SCHEMA", "codex native observation.status is invalid");
  if (value.routing_verification !== null) validateGreenRoutingVerification(value.routing_verification, "codex native observation.routing_verification");
  if (value.routing_verification !== null && value.routing_verification.observed.agent_path !== value.agent_path) fail("ROUTING_VERIFICATION_MISMATCH", "observation target differs from the verified agent path");
  if (value.report_ref !== null) boundedString(value.report_ref, "codex native observation.report_ref", 1024);
  boundedArray(value.evidence_refs, "codex native observation.evidence_refs", 64, (entry, name) => boundedString(entry, name, 1024), 0);
  if (new Set(value.evidence_refs).size !== value.evidence_refs.length) fail("INVALID_SCHEMA", "codex native observation.evidence_refs contains duplicates");
  if (Buffer.byteLength(canonicalJson(value), "utf8") > CODEX_NATIVE_OUTPUT_LIMIT) fail("LIMIT_EXCEEDED", "codex native observation exceeds projection limit");
  return {
    schema_version: CODEX_NATIVE_OBSERVATION_SCHEMA, agent_path: value.agent_path, status: value.status,
    routing_verification: value.routing_verification === null ? null : structuredClone(value.routing_verification),
    report_ref: value.report_ref, evidence_refs: structuredClone(value.evidence_refs),
  };
}

function sidecarHandle(value, name = "handle") {
  exact(value, ["idempotency_key"], name); boundedString(value.idempotency_key, `${name}.idempotency_key`, 128);
  if (!/^(?:[A-Za-z0-9_-]{22,128}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.test(value.idempotency_key)) fail("INVALID_SCHEMA", `${name}.idempotency_key is not accepted by codex-sidecar`);
  return value;
}

function sidecarProjectRoot(value, name) {
  boundedString(value, name);
  if (!/^(?:\/|[A-Za-z]:[\\/])/.test(value)) fail("INVALID_SCHEMA", `${name} must be an absolute source workspace`);
}

function sidecarPath(value, name) {
  boundedString(value, name, 1024);
  if (/^(?:\/|[A-Za-z]:[\\/])/.test(value) || value.includes("\\") || value.split("/").some((part) => part === "" || part === "." || part === "..")) fail("INVALID_SCHEMA", `${name} is not a safe repo-relative path`);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function sidecarRequest(operation_id, argumentsValue) {
  const operation = sidecarOperation(operation_id);
  return { schema_version: SIDECAR_REQUEST_SCHEMA, operation_id, tool_name: operation.tool_name, arguments: structuredClone(argumentsValue) };
}

export function codexSidecarStartRequest(input) {
  exact(input, ["projectRoot", "handle", "baseRef", "prompt", "allowedPaths", "denyPaths", "turnTimeoutMs"], "sidecar start input");
  sidecarProjectRoot(input.projectRoot, "sidecar start input.projectRoot"); sidecarHandle(input.handle, "sidecar start input.handle");
  if (typeof input.baseRef !== "string" || !/^[0-9a-f]{40}$/.test(input.baseRef)) fail("INVALID_SCHEMA", "sidecar start input.baseRef must be a fixed commit SHA");
  boundedString(input.prompt, "sidecar start input.prompt", 16 * 1024);
  boundedArray(input.allowedPaths, "sidecar start input.allowedPaths", MAX_CHANGED_FILES, sidecarPath);
  boundedArray(input.denyPaths, "sidecar start input.denyPaths", MAX_CHANGED_FILES, sidecarPath, 0);
  if (!Number.isSafeInteger(input.turnTimeoutMs) || input.turnTimeoutMs < 1) fail("INVALID_SCHEMA", "sidecar start input.turnTimeoutMs must be positive");
  return sidecarRequest("start", {
    projectRoot: input.projectRoot, idempotencyKey: input.handle.idempotency_key, baseRef: input.baseRef,
    prompt: input.prompt, allowedPaths: structuredClone(input.allowedPaths), denyPaths: structuredClone(input.denyPaths),
    turnTimeoutMs: input.turnTimeoutMs, interruptOnTimeout: true, allowWork: true, preserveWorktree: true,
  });
}

export function codexSidecarResultRequest(input) {
  exact(input, ["projectRoot", "handle"], "sidecar result input"); sidecarProjectRoot(input.projectRoot, "sidecar result input.projectRoot"); sidecarHandle(input.handle);
  return sidecarRequest("result", { projectRoot: input.projectRoot, idempotencyKey: input.handle.idempotency_key });
}

export function codexSidecarCancelRequest(input) {
  exact(input, ["projectRoot", "handle"], "sidecar cancel input"); sidecarProjectRoot(input.projectRoot, "sidecar cancel input.projectRoot"); sidecarHandle(input.handle);
  return sidecarRequest("cancel", { projectRoot: input.projectRoot, idempotencyKey: input.handle.idempotency_key });
}

export function codexSidecarRecoveryInspectionRequest(input) {
  exact(input, ["projectRoot", "handle"], "sidecar recovery inspection input"); sidecarProjectRoot(input.projectRoot, "sidecar recovery inspection input.projectRoot"); sidecarHandle(input.handle);
  return sidecarRequest("inspect-recovery", { projectRoot: input.projectRoot, idempotencyKey: input.handle.idempotency_key });
}

export function codexSidecarQuarantineRequest(input) {
  exact(input, ["projectRoot", "handle", "confirmNoRunningProcesses"], "sidecar quarantine input"); sidecarProjectRoot(input.projectRoot, "sidecar quarantine input.projectRoot"); sidecarHandle(input.handle);
  if (input.confirmNoRunningProcesses !== true) fail("QUARANTINE_CONFIRMATION_REQUIRED", "sidecar quarantine requires explicit process confirmation");
  return sidecarRequest("quarantine", { projectRoot: input.projectRoot, idempotencyKey: input.handle.idempotency_key, action: "quarantine", confirmNoRunningProcesses: true });
}

function validateChangedFiles(value) {
  boundedArray(value, "sidecar observation.changedFiles", MAX_CHANGED_FILES, sidecarPath, 0);
  if (new Set(value).size !== value.length) fail("INVALID_SCHEMA", "sidecar observation.changedFiles contains duplicates");
}

function validateSidecarResult(value) {
  const required = ["status", "workflow", "summary", "confidence", "recommendedNextAction"];
  const optional = ["findings", "risks", "pass", "missingTools", "openQuestions", "missingTests", "residualRisks", "fileReferences", "changedFiles", "tests", "worktreePath", "worktreePreserved", "sourceBoundaries", "costNotes", "recommendation", "objections", "assumptions", "failureModes", "generated", "normalizationNotes", "unvalidatedReport", "rawEventLogRef", "normalizedRequest", "modelPolicy", "error"];
  exactOptional(value, required, optional, "sidecar result");
  if (!["ok", "partial", "failed", "refused", "dry-run"].includes(value.status) || value.workflow !== "work") fail("INVALID_SCHEMA", "sidecar result status or workflow is invalid");
  boundedString(value.summary, "sidecar result.summary", 16 * 1024); object(value.confidence, "sidecar result.confidence"); boundedString(value.recommendedNextAction, "sidecar result.recommendedNextAction", 16 * 1024);
  const changedFiles = value.changedFiles ?? []; validateChangedFiles(changedFiles);
  if (value.worktreePath !== undefined) sidecarProjectRoot(value.worktreePath, "sidecar result.worktreePath");
  if (value.worktreePreserved !== undefined && typeof value.worktreePreserved !== "boolean") fail("INVALID_SCHEMA", "sidecar result.worktreePreserved is invalid");
  if (Buffer.byteLength(canonicalJson(value), "utf8") > SIDECAR_OUTPUT_LIMIT) fail("LIMIT_EXCEEDED", "sidecar result exceeds projection limit");
  return { changedFiles, digest: createHash("sha256").update(canonicalJson(value)).digest("hex") };
}

export function projectCodexSidecarObservation(value) {
  exact(value, ["handle", "provider"], "sidecar observation"); sidecarHandle(value.handle); object(value.provider, "sidecar observation.provider");
  if (Buffer.byteLength(canonicalJson(value.provider), "utf8") > SIDECAR_OUTPUT_LIMIT) fail("LIMIT_EXCEEDED", "sidecar provider observation exceeds projection limit");
  const base = { schema_version: SIDECAR_OBSERVATION_SCHEMA, executor_handle: structuredClone(value.handle) };
  if (value.provider.kind === "run_handle") {
    exact(value.provider, ["kind", "workflow", "runId", "state", "createdAt", "pollAfterMs"], "sidecar run handle");
    if (value.provider.workflow !== "work" || !["starting", "queued", "running"].includes(value.provider.state)) fail("INVALID_SCHEMA", "sidecar run handle is invalid");
    identifier(value.provider.runId, "sidecar run handle.runId"); boundedString(value.provider.createdAt, "sidecar run handle.createdAt");
    if (!Number.isSafeInteger(value.provider.pollAfterMs) || value.provider.pollAfterMs < 0) fail("INVALID_SCHEMA", "sidecar run handle.pollAfterMs is invalid");
    return { ...base, provider_run_id: value.provider.runId, state: value.provider.state === "running" ? "running" : "dispatched", raw_status: value.provider.state, terminal: null };
  }
  if (value.provider.kind === "run_pending") {
    exactOptional(value.provider, ["kind", "runId", "state", "phase", "pollAfterMs"], ["heartbeatAt", "worktreePath"], "sidecar pending run");
    if (!["starting", "queued", "running"].includes(value.provider.state)) fail("INVALID_SCHEMA", "sidecar pending state is invalid");
    identifier(value.provider.runId, "sidecar pending run.runId"); boundedString(value.provider.phase, "sidecar pending run.phase");
    if (!Number.isSafeInteger(value.provider.pollAfterMs) || value.provider.pollAfterMs < 0) fail("INVALID_SCHEMA", "sidecar pending run.pollAfterMs is invalid");
    if (value.provider.heartbeatAt !== undefined) boundedString(value.provider.heartbeatAt, "sidecar pending run.heartbeatAt");
    if (value.provider.worktreePath !== undefined) sidecarProjectRoot(value.provider.worktreePath, "sidecar pending run.worktreePath");
    return { ...base, provider_run_id: value.provider.runId, state: value.provider.state === "running" ? "running" : "dispatched", raw_status: value.provider.state, terminal: null };
  }
  if (value.provider.kind === "run_interrupted") {
    exactOptional(value.provider, ["kind", "runId", "state", "error", "processGroup", "salvageAllowed", "terminal"], ["worktreePath", "pollAfterMs"], "sidecar interrupted run");
    if (!["interrupted", "orphaned"].includes(value.provider.state) || value.provider.terminal !== false || value.provider.salvageAllowed !== false || !["stopped", "alive", "unknown"].includes(value.provider.processGroup)) fail("INVALID_SCHEMA", "sidecar interrupted run is invalid");
    identifier(value.provider.runId, "sidecar interrupted run.runId"); exact(value.provider.error, ["code", "message"], "sidecar interrupted run.error"); boundedString(value.provider.error.code, "sidecar interrupted run.error.code"); boundedString(value.provider.error.message, "sidecar interrupted run.error.message", 16 * 1024);
    if (value.provider.worktreePath !== undefined) sidecarProjectRoot(value.provider.worktreePath, "sidecar interrupted run.worktreePath");
    if (value.provider.pollAfterMs !== undefined && (!Number.isSafeInteger(value.provider.pollAfterMs) || value.provider.pollAfterMs < 0)) fail("INVALID_SCHEMA", "sidecar interrupted run.pollAfterMs is invalid");
    return { ...base, provider_run_id: value.provider.runId, state: "unknown", raw_status: value.provider.state, terminal: null };
  }
  if (value.provider.kind === "run_error") {
    exactOptional(value.provider, ["kind", "error", "retryable"], ["runId"], "sidecar run error"); exact(value.provider.error, ["code", "message"], "sidecar run error.error"); boundedString(value.provider.error.code, "sidecar run error.error.code"); boundedString(value.provider.error.message, "sidecar run error.error.message", 16 * 1024);
    if (typeof value.provider.retryable !== "boolean") fail("INVALID_SCHEMA", "sidecar run error retryable is invalid");
    if (value.provider.runId !== undefined) identifier(value.provider.runId, "sidecar run error.runId");
    return { ...base, provider_run_id: value.provider.runId ?? null, state: "unknown", raw_status: "run_error", terminal: null };
  }
  if (value.provider.kind !== "run_terminal") fail("INVALID_SCHEMA", "sidecar observation kind is invalid");
  exact(value.provider, ["kind", "runId", "state", "result", "cleanup"], "sidecar terminal run"); identifier(value.provider.runId, "sidecar terminal run.runId");
  if (!["completed", "failed", "cancelled"].includes(value.provider.state) || !["not-requested", "pending", "completed", "failed"].includes(value.provider.cleanup)) fail("INVALID_SCHEMA", "sidecar terminal run is invalid");
  const projected = validateSidecarResult(value.provider.result); const result = value.provider.result;
  const success = value.provider.state === "completed" && result.status === "ok";
  if (success && (result.worktreePreserved !== true || result.worktreePath === undefined)) fail("INVALID_SCHEMA", "successful sidecar work requires a preserved worktree");
  const state = success ? "completed" : value.provider.state === "cancelled" ? "cancelled" : "failed";
  const terminal = result.worktreePath === undefined ? null : { worktree_path: result.worktreePath, changed_files: structuredClone(projected.changedFiles), result_digest: success ? projected.digest : null };
  return { ...base, provider_run_id: value.provider.runId, state, raw_status: result.status, terminal };
}
