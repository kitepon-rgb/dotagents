#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(repoRoot, "docs/canon-migration-manifest.json");
const violations = [];
let manifest;

try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  violations.push(`${manifestPath}: 読み込みまたはJSON解析に失敗: ${error.message}`);
}

if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
  if (violations.length === 0) violations.push(`${manifestPath}: root はobjectでなければならない`);
} else {
  if (manifest.schema !== "dotagents.canon-migration.v1") {
    violations.push(`${manifestPath}: schema は dotagents.canon-migration.v1 でなければならない`);
  }
  if (!Array.isArray(manifest.entries)) {
    violations.push(`${manifestPath}: entries は配列でなければならない`);
  } else {
    const fields = ["receiver_path", "receiver_phrase", "l0_path", "l0_pointer_phrase"];
    manifest.entries.forEach((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        violations.push(`entries[${index}]: object でなければならない`);
        return;
      }
      const invalidFields = fields.filter(
        (field) => typeof entry[field] !== "string" || entry[field].length === 0,
      );
      for (const field of invalidFields) {
        violations.push(`entries[${index}].${field}: 空でない文字列でなければならない`);
      }
      if (!invalidFields.some((field) => field === "receiver_path" || field === "receiver_phrase")) {
        verifyPhrase(index, "receiver", entry.receiver_path, entry.receiver_phrase);
      }
      if (!invalidFields.some((field) => field === "l0_path" || field === "l0_pointer_phrase")) {
        verifyPhrase(index, "l0", entry.l0_path, entry.l0_pointer_phrase);
      }
    });
  }
}

if (violations.length > 0) {
  for (const violation of violations) console.error(`FAIL: ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`canon migration manifest: OK (${manifest.entries.length} entries)`);
}

function verifyPhrase(index, label, relativePath, phrase) {
  const path = resolve(repoRoot, relativePath);
  let content;
  try {
    content = readFileSync(path, "utf8");
  } catch (error) {
    violations.push(`entries[${index}].${label}_path: ${relativePath} を読めない: ${error.message}`);
    return;
  }
  if (!content.includes(phrase)) {
    violations.push(`entries[${index}].${label}_phrase: ${relativePath} に必須句「${phrase}」がない`);
  }
}
