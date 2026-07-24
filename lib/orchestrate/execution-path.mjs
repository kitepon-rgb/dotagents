// 同一repo writerの直列化判定（ADR 0122）。pure module: I/O・process・network・filesystemを持たない。
//
// この判定は四つの実行経路（固定Recipe／Control direct／Lattice standalone／明示直列化）で共通であり、
// 正本は shared/orchestrate/composition.md「同一repo writerの直列化」節である。
//
// **Latticeを型で必須にしない**: 本moduleはlattice-projection.mjsをimportせず、Latticeの状態を
// `lattice_selected` のboolean一つとしてだけ受け取る。Lattice CLIが不在でもこのmoduleは完全に動作し、
// 非依存はテストではなくAPI境界の型が保証する（lane-admission.mjsと同型の設計）。
import { createHash } from "node:crypto";

import { canonicalJson } from "./canonical-json.mjs";

export const EXECUTION_PATH_CONTRACT_VERSION = "dotagents.execution-path.v1";
export const EXECUTION_PATH_PLAN_SCHEMA = "dotagents.execution-path-plan.v1";

export const WRITER_EFFECTS = Object.freeze(["read", "write"]);
export const SERIALIZATION_REASONS = Object.freeze([
  "same_repo_writers_without_lattice",
  "unidentified_repo_writers",
]);

const WRITER_KEYS = Object.freeze(["id", "repo_root", "effect"]);
const IDENTIFIER = /^[0-9A-Za-z](?:[0-9A-Za-z._-]{0,127})$/u;
const MAX_WRITERS = 1_000;

export class ExecutionPathError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ExecutionPathError";
    this.code = code;
  }
}

const fail = (code, message) => { throw new ExecutionPathError(code, message); };
const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;
const isBoundedText = (value, limit) => typeof value === "string" && [...value].length > 0
  && [...value].length <= limit
  && [...value].every((character) => character.codePointAt(0) >= 0x20 && character !== "\x7f");

// closed record: 余剰キー・欠落キー・型違いはすべて拒否する。判定に使う事実だけを受け取り、
// title・prompt・任意metadataのような文字列は一切読まない（意味推測の余地を型で消す）。
function validateWriter(value, index) {
  const at = `writers[${index}]`;
  if (!isPlainObject(value)) fail("INVALID_WRITERS", `${at} must be an object`);
  const keys = Object.keys(value);
  if (keys.length !== WRITER_KEYS.length || WRITER_KEYS.some((key) => !Object.hasOwn(value, key))) {
    fail("INVALID_WRITERS", `${at} must have exactly the keys ${WRITER_KEYS.join(", ")}`);
  }
  if (typeof value.id !== "string" || !IDENTIFIER.test(value.id)) fail("INVALID_WRITERS", `${at}.id must be a bounded identifier`);
  if (value.repo_root !== null && !isBoundedText(value.repo_root, 16_384)) fail("INVALID_WRITERS", `${at}.repo_root must be a path string or null`);
  if (!WRITER_EFFECTS.includes(value.effect)) fail("INVALID_WRITERS", `${at}.effect must be one of ${WRITER_EFFECTS.join(" | ")}`);
  return { id: value.id, repo_root: value.repo_root, effect: value.effect };
}

export function validateWriters(value) {
  if (!Array.isArray(value)) fail("INVALID_WRITERS", "writers must be an array");
  if (value.length > MAX_WRITERS) fail("INVALID_WRITERS", `writers must have at most ${MAX_WRITERS} entries`);
  const normalized = value.map(validateWriter);
  const seen = new Set();
  for (const writer of normalized) {
    if (seen.has(writer.id)) fail("INVALID_WRITERS", `writers contain a duplicate id: ${writer.id}`);
    seen.add(writer.id);
  }
  return normalized;
}

// repo外対象（repo_root: null）は互いに交差判定できないため、単一の判定不能groupとして扱う。
// 「判定できない」を「交差しない」へ丸めない（composition.md の直列化規則）。
const UNIDENTIFIED = Symbol("unidentified_repo");
const groupKey = (writer) => (writer.repo_root === null ? UNIDENTIFIED : writer.repo_root);

/**
 * 与えられたwriter集合を、並列に投入してよい単位へ分ける。
 *
 * @param {{ writers: Array<{id: string, repo_root: string|null, effect: "read"|"write"}>,
 *           lattice_selected: boolean }} input
 * @returns {{ schema_version: string, contract_version: string, mode: "parallel"|"serialized",
 *             parallel: string[], serialized_groups: Array<{repo_root: string|null, reason: string, writer_ids: string[]}>,
 *             lattice_selected: boolean, decision_digest: string }}
 */
export function planWriterExecution(input) {
  if (!isPlainObject(input)) fail("INVALID_INPUT", "input must be an object");
  const keys = Object.keys(input);
  if (keys.length !== 2 || !Object.hasOwn(input, "writers") || !Object.hasOwn(input, "lattice_selected")) {
    fail("INVALID_INPUT", "input must have exactly the keys writers, lattice_selected");
  }
  if (typeof input.lattice_selected !== "boolean") fail("INVALID_INPUT", "lattice_selected must be a boolean");
  const writers = validateWriters(input.writers);

  // read-onlyのfan-outは制限を受けない。直列化の対象になるのはeffect:"write"だけ。
  const writeGroups = new Map();
  for (const writer of writers) {
    if (writer.effect !== "write") continue;
    const key = groupKey(writer);
    if (!writeGroups.has(key)) writeGroups.set(key, []);
    writeGroups.get(key).push(writer);
  }

  const serializedGroups = [];
  const serializedIds = new Set();
  for (const [key, group] of writeGroups) {
    if (group.length < 2) continue;
    // Latticeが選択されていれば、交差判定はplan compileの競合検出が所有するため直列化しない。
    // ただしrepo identityを持たない対象群はLatticeも交差判定できないため、選択の有無によらず直列化する。
    const unidentified = key === UNIDENTIFIED;
    if (input.lattice_selected && !unidentified) continue;
    serializedGroups.push({
      repo_root: unidentified ? null : key,
      reason: unidentified ? "unidentified_repo_writers" : "same_repo_writers_without_lattice",
      writer_ids: group.map((writer) => writer.id),
    });
    for (const writer of group) serializedIds.add(writer.id);
  }

  // 出力順はwriterの入力順に従う（同じ入力は常に同じ計画とdigestになる）。
  serializedGroups.sort((left, right) => writers.findIndex((writer) => writer.id === left.writer_ids[0])
    - writers.findIndex((writer) => writer.id === right.writer_ids[0]));

  const parallel = writers.filter((writer) => !serializedIds.has(writer.id)).map((writer) => writer.id);
  const mode = serializedGroups.length > 0 ? "serialized" : "parallel";
  const identity = {
    contract_version: EXECUTION_PATH_CONTRACT_VERSION,
    lattice_selected: input.lattice_selected,
    mode,
    parallel,
    serialized_groups: serializedGroups,
  };
  return {
    schema_version: EXECUTION_PATH_PLAN_SCHEMA,
    contract_version: EXECUTION_PATH_CONTRACT_VERSION,
    mode,
    parallel,
    serialized_groups: serializedGroups,
    lattice_selected: input.lattice_selected,
    decision_digest: createHash("sha256").update(canonicalJson(identity)).digest("hex"),
  };
}
