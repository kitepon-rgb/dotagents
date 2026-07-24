// Canonical JSON shared by control-record digests and the pure lane-admission module.
// Dependency-free so both sides import this file without a cycle (ADR 0114 Decision 2 / A-1追補).
// Semantics are byte-identical to the historical control-record.mjs definition (ADR 0054):
// sorted object keys, array order preserved, JSON.stringify for leaves.
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
