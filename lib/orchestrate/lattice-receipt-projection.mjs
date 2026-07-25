// Lattice子receiptをControlのstrict Worker Report断片へ投影するpure module。
// I/O・process・network・filesystemを持たず、呼び出し側が取得済みのJSON値だけを扱う。
// Latticeの導入状態やCLIの生死を型境界へ持ち込まない（ADR 0122と同じ単体成立方針）。

export const LATTICE_RECEIPT_PROJECTION_SCHEMA = "dotagents.lattice-receipt-projection.v1";
export const LATTICE_EXECUTOR_RECEIPT_SCHEMA = "lattice.executor_receipt.v1";
export const LATTICE_EXECUTOR_PACKET_SCHEMA = "lattice.executor_packet.v1";
export const LATTICE_TODO_BINDING_PROJECTION_SCHEMA = "lattice.todo_binding_projection.v1";

const RECEIPT_KEYS = Object.freeze([
  "schema", "receipt_id", "executor_handle", "worktree_id", "base_sha", "plan_epoch",
  "packet_digest", "todo_id", "checkpoint_digest", "observed_diff", "receipt_digest",
]);
const PACKET_KEYS = Object.freeze([
  "schema", "packet_id", "todo_id", "task_ref", "scope", "base_sha", "plan_ref",
  "plan_epoch", "verifier_refs", "forbidden_operations", "context_content_digest", "packet_digest",
]);
const BINDING_PROJECTION_KEYS = Object.freeze([
  "schema", "project_id", "plan_key", "bindings", "result_digest",
]);
const BINDING_KEYS = Object.freeze([
  "project_id", "plan_key", "plan_version", "task_id", "compile_binding",
]);
const COMPILE_BINDING_KEYS = Object.freeze([
  "boundary_manifest_digest", "compiled_plan_digest", "topology_digest", "base_sha",
]);
const CHILD_REQUIRED_KEYS = Object.freeze(["receipt", "packet", "dispatch", "write_scope"]);
const CHILD_OPTIONAL_KEYS = Object.freeze(["binding_projection"]);
const DISPATCH_KEYS = Object.freeze(["executor_handle", "worktree_id"]);
const SCOPE_KEYS = Object.freeze(["kind", "path"]);

const IDENTIFIER = /^[0-9A-Za-z](?:[0-9A-Za-z._-]{0,127})$/u;
const DIGEST = /^[0-9a-f]{64}$/u;
const GIT_SHA = /^[0-9a-f]{40}$/u;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;
const BACKSLASH = /\\/u;
const GLOB_META = /[*?\[\]{}]/u;
const CHANGES = new Set(["added", "modified", "deleted"]);
const MAX_CHILDREN = 256;
const MAX_OBSERVED_DIFF = 256;
const MAX_PACKET_REFS = 256;
const MAX_BINDINGS = 2_000;
const MAX_WRITE_SCOPE = 256;
const MAX_PATH_LENGTH = 1_024;
const MAX_PACKET_TEXT = 4_096;
const MAX_JSON_DEPTH = 8;
const MAX_JSON_NODES = 4_096;
const MAX_JSON_KEYS = 256;
const MAX_JSON_KEY_LENGTH = 128;

export class LatticeReceiptProjectionError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "LatticeReceiptProjectionError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

const fail = (code, message, details) => {
  throw new LatticeReceiptProjectionError(code, message, details);
};
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;
const own = (value, key) => Object.hasOwn(value, key);

function exact(value, keys, name, code) {
  if (!plain(value)) fail(code, `${name} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(code, `${name} has invalid fields`);
  }
  return value;
}

function exactOptional(value, required, optional, name, code) {
  if (!plain(value)) fail(code, `${name} must be an object`);
  for (const key of required) if (!own(value, key)) fail(code, `${name}.${key} is required`);
  const allowed = new Set([...required, ...optional]);
  if (Object.keys(value).some((key) => !allowed.has(key))) fail(code, `${name} has invalid fields`);
  return value;
}

function identifier(value, name, code) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    fail(code, `${name} must be a bounded identifier`);
  }
  return value;
}

function digest(value, name, code) {
  if (typeof value !== "string" || !DIGEST.test(value)) fail(code, `${name} must be a lowercase SHA-256`);
  return value;
}

function gitSha(value, name, code) {
  if (typeof value !== "string" || !GIT_SHA.test(value)) fail(code, `${name} must be a 40-character git SHA`);
  return value;
}

function safeInteger(value, name, code) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code, `${name} must be a non-negative safe integer`);
  return value;
}

function boundedString(value, name, code, limit, { nonempty = false } = {}) {
  if (typeof value !== "string" || (nonempty && value.length === 0)
    || [...value].length > limit || CONTROL_CHARACTER.test(value)) {
    fail(code, `${name} must be a bounded string`);
  }
  return value;
}

// strict Worker Reportへそのまま差し込めるよう、Lattice schemaよりControl側の
// canonical repo-relative path制約を追加する。曖昧なpathをscope内へ丸めない。
function repoPath(value, name, code) {
  boundedString(value, name, code, MAX_PATH_LENGTH, { nonempty: true });
  if (value !== value.normalize("NFC") || value.startsWith("/") || BACKSLASH.test(value)
    || GLOB_META.test(value)) {
    fail(code, `${name} must be a canonical repository-relative path`);
  }
  if (value.split("/").some((part) => part.length === 0 || part === "." || part === "..")) {
    fail(code, `${name} must be a literal repository-relative path`);
  }
  return value;
}

function boundedArray(value, name, code, limit, validator, { min = 0 } = {}) {
  if (!Array.isArray(value)) fail(code, `${name} must be an array`);
  if (value.length < min) fail(code, `${name} must contain at least ${min} entries`);
  if (value.length > limit) fail(code, `${name} exceeds ${limit} entries`);
  for (let index = 0; index < value.length; index += 1) {
    validator(value[index], `${name}[${index}]`);
  }
  return value;
}

// packet.scopeは公開schema上objectだけが規定されているため、未知keyを推測で解釈せず、
// JSON値・深さ・node数・key数・文字列長だけを閉じて受理する。
function boundedJsonObject(value, name, code) {
  if (!plain(value)) fail(code, `${name} must be a JSON object`);
  const seen = new Set();
  let nodes = 0;
  const visit = (entry, entryName, depth) => {
    nodes += 1;
    if (nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) fail(code, `${name} exceeds its JSON bounds`);
    if (entry === null || typeof entry === "boolean") return;
    if (typeof entry === "string") {
      boundedString(entry, entryName, code, MAX_PACKET_TEXT);
      return;
    }
    if (typeof entry === "number") {
      if (!Number.isFinite(entry)) fail(code, `${entryName} must be a finite JSON number`);
      return;
    }
    if (typeof entry !== "object") fail(code, `${entryName} must contain only JSON values`);
    if (seen.has(entry)) fail(code, `${entryName} must not contain cycles`);
    seen.add(entry);
    if (Array.isArray(entry)) {
      if (entry.length > MAX_PACKET_REFS) fail(code, `${entryName} exceeds ${MAX_PACKET_REFS} entries`);
      for (let index = 0; index < entry.length; index += 1) {
        visit(entry[index], `${entryName}[${index}]`, depth + 1);
      }
    } else {
      if (!plain(entry)) fail(code, `${entryName} must be a plain JSON object`);
      const keys = Object.keys(entry);
      if (keys.length > MAX_JSON_KEYS) fail(code, `${entryName} exceeds ${MAX_JSON_KEYS} keys`);
      for (const key of keys) {
        boundedString(key, `${entryName} key`, code, MAX_JSON_KEY_LENGTH, { nonempty: true });
        visit(entry[key], `${entryName}.${key}`, depth + 1);
      }
    }
    seen.delete(entry);
  };
  visit(value, name, 0);
  return value;
}

function validateReceipt(value) {
  const code = "INVALID_RECEIPT";
  exact(value, RECEIPT_KEYS, "receipt", code);
  if (value.schema !== LATTICE_EXECUTOR_RECEIPT_SCHEMA) fail(code, "receipt.schema is unsupported");
  identifier(value.receipt_id, "receipt.receipt_id", code);
  identifier(value.executor_handle, "receipt.executor_handle", code);
  identifier(value.worktree_id, "receipt.worktree_id", code);
  gitSha(value.base_sha, "receipt.base_sha", code);
  safeInteger(value.plan_epoch, "receipt.plan_epoch", code);
  digest(value.packet_digest, "receipt.packet_digest", code);
  identifier(value.todo_id, "receipt.todo_id", code);
  digest(value.checkpoint_digest, "receipt.checkpoint_digest", code);
  boundedArray(value.observed_diff, "receipt.observed_diff", code, MAX_OBSERVED_DIFF, (entry, name) => {
    exact(entry, ["path", "change"], name, code);
    repoPath(entry.path, `${name}.path`, code);
    if (!CHANGES.has(entry.change)) fail(code, `${name}.change is invalid`);
  });
  const observedPaths = value.observed_diff.map((entry) => entry.path);
  if (new Set(observedPaths).size !== observedPaths.length) {
    fail(code, "receipt.observed_diff contains duplicate paths");
  }
  digest(value.receipt_digest, "receipt.receipt_digest", code);
  return value;
}

function validatePacket(value) {
  const code = "INVALID_PACKET";
  exact(value, PACKET_KEYS, "packet", code);
  if (value.schema !== LATTICE_EXECUTOR_PACKET_SCHEMA) fail(code, "packet.schema is unsupported");
  identifier(value.packet_id, "packet.packet_id", code);
  identifier(value.todo_id, "packet.todo_id", code);
  identifier(value.task_ref, "packet.task_ref", code);
  boundedJsonObject(value.scope, "packet.scope", code);
  gitSha(value.base_sha, "packet.base_sha", code);
  identifier(value.plan_ref, "packet.plan_ref", code);
  safeInteger(value.plan_epoch, "packet.plan_epoch", code);
  boundedArray(value.verifier_refs, "packet.verifier_refs", code, MAX_PACKET_REFS,
    (entry, name) => boundedString(entry, name, code, MAX_PACKET_TEXT));
  boundedArray(value.forbidden_operations, "packet.forbidden_operations", code, MAX_PACKET_REFS,
    (entry, name) => boundedString(entry, name, code, MAX_PACKET_TEXT), { min: 1 });
  digest(value.context_content_digest, "packet.context_content_digest", code);
  digest(value.packet_digest, "packet.packet_digest", code);
  return value;
}

function validateBindingProjection(value) {
  const code = "INVALID_BINDING_PROJECTION";
  exact(value, BINDING_PROJECTION_KEYS, "binding_projection", code);
  if (value.schema !== LATTICE_TODO_BINDING_PROJECTION_SCHEMA) {
    fail(code, "binding_projection.schema is unsupported");
  }
  identifier(value.project_id, "binding_projection.project_id", code);
  if (value.plan_key !== null) identifier(value.plan_key, "binding_projection.plan_key", code);
  boundedArray(value.bindings, "binding_projection.bindings", code, MAX_BINDINGS, (entry, name) => {
    exact(entry, BINDING_KEYS, name, code);
    identifier(entry.project_id, `${name}.project_id`, code);
    identifier(entry.plan_key, `${name}.plan_key`, code);
    identifier(entry.plan_version, `${name}.plan_version`, code);
    identifier(entry.task_id, `${name}.task_id`, code);
    exact(entry.compile_binding, COMPILE_BINDING_KEYS, `${name}.compile_binding`, code);
    digest(entry.compile_binding.boundary_manifest_digest, `${name}.compile_binding.boundary_manifest_digest`, code);
    digest(entry.compile_binding.compiled_plan_digest, `${name}.compile_binding.compiled_plan_digest`, code);
    digest(entry.compile_binding.topology_digest, `${name}.compile_binding.topology_digest`, code);
    gitSha(entry.compile_binding.base_sha, `${name}.compile_binding.base_sha`, code);
    if (entry.project_id !== value.project_id
      || (value.plan_key !== null && entry.plan_key !== value.plan_key)) {
      fail(code, `${name} is outside the binding projection identity`);
    }
  });
  const identities = value.bindings.map((entry) => [
    entry.project_id, entry.plan_key, entry.plan_version, entry.task_id,
  ].join("\0"));
  if (new Set(identities).size !== identities.length) {
    fail(code, "binding_projection.bindings contains duplicate identities");
  }
  digest(value.result_digest, "binding_projection.result_digest", code);
  return value;
}

function validateDispatch(value) {
  const code = "INVALID_DISPATCH";
  exact(value, DISPATCH_KEYS, "dispatch", code);
  identifier(value.executor_handle, "dispatch.executor_handle", code);
  identifier(value.worktree_id, "dispatch.worktree_id", code);
  return value;
}

function validateWriteScope(value) {
  const code = "INVALID_WRITE_SCOPE";
  boundedArray(value, "write_scope", code, MAX_WRITE_SCOPE, (entry, name) => {
    exact(entry, SCOPE_KEYS, name, code);
    if (!["file", "directory"].includes(entry.kind)) fail(code, `${name}.kind is invalid`);
    repoPath(entry.path, `${name}.path`, code);
  });
  const identities = value.map((entry) => `${entry.kind}\0${entry.path}`);
  if (new Set(identities).size !== identities.length) fail(code, "write_scope contains duplicates");
  return value;
}

function inWriteScope(path, writeScope) {
  return writeScope.some((entry) => entry.path === path
    || (entry.kind === "directory" && path.startsWith(`${entry.path}/`)));
}

const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const reason = (code, message, details = null) => ({ code, message, details });

function identityFromChild(child) {
  const receipt = plain(child) && plain(child.receipt) ? child.receipt : null;
  return {
    receipt_id: receipt !== null && typeof receipt.receipt_id === "string"
      && IDENTIFIER.test(receipt.receipt_id) ? receipt.receipt_id : null,
    todo_id: receipt !== null && typeof receipt.todo_id === "string"
      && IDENTIFIER.test(receipt.todo_id) ? receipt.todo_id : null,
  };
}

function failedValidation(reasons, evaluated) {
  if (!evaluated) {
    return { scope: "not_evaluated", digest: "not_evaluated", dispatch_owner: "not_evaluated" };
  }
  const codes = new Set(reasons.map((entry) => entry.code));
  return {
    scope: codes.has("SCOPE_VIOLATION") ? "failed" : "passed",
    digest: [...codes].some((code) => [
      "PACKET_DIGEST_MISMATCH", "BASE_SHA_MISMATCH", "PACKET_CORRELATION_MISMATCH",
      "BINDING_NOT_FOUND", "BINDING_AMBIGUOUS",
    ].includes(code)) ? "failed" : "passed",
    dispatch_owner: codes.has("DISPATCH_OWNER_MISMATCH") ? "failed" : "passed",
  };
}

function projectChild(child, childIndex) {
  exactOptional(child, CHILD_REQUIRED_KEYS, CHILD_OPTIONAL_KEYS, `children[${childIndex}]`, "INVALID_CHILD");
  const receipt = validateReceipt(child.receipt);
  const packet = validatePacket(child.packet);
  const dispatch = validateDispatch(child.dispatch);
  const writeScope = validateWriteScope(child.write_scope);
  const bindingProjection = own(child, "binding_projection")
    ? validateBindingProjection(child.binding_projection)
    : null;

  const changedPaths = receipt.observed_diff.map((entry) => entry.path).sort(compareText);
  const reasons = [];
  const outsideScope = changedPaths.filter((path) => !inWriteScope(path, writeScope));
  if (outsideScope.length > 0) {
    reasons.push(reason("SCOPE_VIOLATION", "receipt contains paths outside write_scope", {
      paths: outsideScope,
    }));
  }

  if (receipt.packet_digest !== packet.packet_digest) {
    reasons.push(reason("PACKET_DIGEST_MISMATCH", "receipt packet_digest differs from packet", {
      expected: packet.packet_digest,
      actual: receipt.packet_digest,
    }));
  }
  if (receipt.base_sha !== packet.base_sha) {
    reasons.push(reason("BASE_SHA_MISMATCH", "receipt base_sha differs from packet", {
      source: "packet",
      expected: packet.base_sha,
      actual: receipt.base_sha,
    }));
  }
  const packetCorrelationFields = [];
  if (receipt.todo_id !== packet.todo_id) packetCorrelationFields.push("todo_id");
  if (receipt.plan_epoch !== packet.plan_epoch) packetCorrelationFields.push("plan_epoch");
  if (packetCorrelationFields.length > 0) {
    reasons.push(reason("PACKET_CORRELATION_MISMATCH", "receipt identity differs from packet", {
      fields: packetCorrelationFields,
    }));
  }

  if (bindingProjection !== null) {
    const matches = bindingProjection.bindings.filter((entry) => entry.task_id === packet.todo_id);
    if (matches.length === 0) {
      reasons.push(reason("BINDING_NOT_FOUND", "binding projection has no entry for packet.todo_id", {
        todo_id: packet.todo_id,
      }));
    } else if (matches.length > 1) {
      reasons.push(reason("BINDING_AMBIGUOUS", "binding projection has multiple entries for packet.todo_id", {
        todo_id: packet.todo_id,
      }));
    } else if (matches[0].compile_binding.base_sha !== packet.base_sha) {
      reasons.push(reason("BASE_SHA_MISMATCH", "binding base_sha differs from packet", {
        source: "binding",
        expected: packet.base_sha,
        actual: matches[0].compile_binding.base_sha,
      }));
    }
  }

  const ownerFields = [];
  if (receipt.executor_handle !== dispatch.executor_handle) ownerFields.push("executor_handle");
  if (receipt.worktree_id !== dispatch.worktree_id) ownerFields.push("worktree_id");
  if (ownerFields.length > 0) {
    reasons.push(reason("DISPATCH_OWNER_MISMATCH", "receipt owner differs from dispatch record", {
      fields: ownerFields,
    }));
  }

  if (reasons.length > 0) {
    return {
      ok: false,
      value: {
        child_index: childIndex,
        receipt_id: receipt.receipt_id,
        todo_id: receipt.todo_id,
        validation: failedValidation(reasons, true),
        reasons,
      },
    };
  }
  return {
    ok: true,
    value: {
      child_index: childIndex,
      receipt_id: receipt.receipt_id,
      todo_id: receipt.todo_id,
      report_fragment: {
        changed_paths: changedPaths,
        result_digest: receipt.receipt_digest,
        executor_handle: receipt.executor_handle,
      },
      validation: {
        scope: "passed",
        digest: "passed",
        dispatch_owner: "passed",
      },
    },
  };
}

/**
 * 複数のLattice子receiptを独立に検証し、成功と失敗を分離して返す。
 * batch envelope自体の不正はtyped exception、子ごとの不正はfailed要素になる。
 *
 * **前提（binding_projectionを渡す場合のみ）**: `packet.todo_id`とTODO storeの
 * `task_id`を同じ値で運用していること。Latticeの`run_request.v1`の`todo_id`はrequestを
 * 書いたhostが決める値であり、TODO storeの`project_id`／`plan_key`／`plan_version`修飾を
 * 持たない別namespaceである（Lattice ADR 0124の非目標）。両者を突き合わせられるのは、
 * dispatchしたhostが`todo_id`に`task_id`を使った場合だけとする。
 * 規約から外れたrequestでは`BINDING_NOT_FOUND`でfail closedになり、誤った子へ
 * bindすることはない。「一致しなかった」を「binding無し」へ丸めないよう、
 * この前提を満たさないrequestでは`binding_projection`を渡さないこと。
 *
 * @param {{children: Array<{
 *   receipt: object,
 *   packet: object,
 *   dispatch: {executor_handle: string, worktree_id: string},
 *   write_scope: Array<{kind: "file"|"directory", path: string}>,
 *   binding_projection?: object
 * }>}} input
 * @returns {{
 *   schema_version: string,
 *   status: "success"|"partial_failure"|"failure",
 *   succeeded: object[],
 *   failed: object[]
 * }}
 */
export function projectLatticeReceipts(input) {
  exact(input, ["children"], "input", "INVALID_INPUT");
  boundedArray(input.children, "input.children", "INVALID_INPUT", MAX_CHILDREN, () => {}, { min: 1 });
  const succeeded = [];
  const failed = [];
  for (let childIndex = 0; childIndex < input.children.length; childIndex += 1) {
    const child = input.children[childIndex];
    try {
      const projection = projectChild(child, childIndex);
      (projection.ok ? succeeded : failed).push(projection.value);
    } catch (error) {
      if (!(error instanceof LatticeReceiptProjectionError)) throw error;
      failed.push({
        child_index: childIndex,
        ...identityFromChild(child),
        validation: failedValidation([], false),
        reasons: [reason(error.code, error.message, error.details ?? null)],
      });
    }
  }
  const status = failed.length === 0 ? "success"
    : succeeded.length === 0 ? "failure"
      : "partial_failure";
  return {
    schema_version: LATTICE_RECEIPT_PROJECTION_SCHEMA,
    status,
    succeeded,
    failed,
  };
}
