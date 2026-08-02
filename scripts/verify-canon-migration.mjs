#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(repoRoot, "docs/canon-migration-manifest.json");
const { base } = parseArgs(process.argv.slice(2));
const violations = [];
let manifest;
let coverage = null;

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
    const fields = [
      "receiver_path",
      "receiver_phrase",
      "l0_path",
      "l0_pointer_phrase",
      "source_text",
      "source_ref",
      "receiver_text",
    ];
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
      if (!invalidFields.some((field) => field === "receiver_path" || field === "receiver_text")) {
        verifyReceiverText(index, entry.receiver_path, entry.receiver_text);
      }
      if (!invalidFields.some((field) => field === "l0_path" || field === "l0_pointer_phrase")) {
        verifyPhrase(index, "l0", entry.l0_path, entry.l0_pointer_phrase);
      }
    });
    if (base && violations.length === 0) coverage = verifyBaseCoverage(base, manifest.entries);
  }
}

if (violations.length > 0) {
  for (const violation of violations) console.error(`FAIL: ${violation}`);
  process.exitCode = 1;
} else if (coverage) {
  console.log(
    `canon migration manifest: OK (${manifest.entries.length} entries; base ${base}: `
      + `deleted=${coverage.total}, source_text=${coverage.sourceText}, l0=${coverage.l0})`,
  );
} else {
  console.log(`canon migration manifest: OK (${manifest.entries.length} entries)`);
}

function parseArgs(args) {
  if (args.length === 0) return { base: null };
  if (args.length === 2 && args[0] === "--base" && args[1].length > 0) return { base: args[1] };
  console.error("usage: verify-canon-migration.mjs [--base <rev>]");
  process.exit(2);
}

function readRepoFile(relativePath, violationLabel) {
  const path = resolve(repoRoot, relativePath);
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    violations.push(`${violationLabel}: ${relativePath} を読めない: ${error.message}`);
    return null;
  }
}

function visibleMarkdown(content) {
  return content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!--[\s\S]*$/g, "");
}

function verifyReceiverText(index, relativePath, receiverText) {
  const content = readRepoFile(relativePath, `entries[${index}].receiver_path`);
  if (content !== null && !visibleMarkdown(content).includes(receiverText)) {
    violations.push(
      `entries[${index}].receiver_text: ${relativePath} の可視本文に現行規範全文が逐語で含まれない`,
    );
  }
}

function verifyPhrase(index, label, relativePath, phrase) {
  const content = readRepoFile(relativePath, `entries[${index}].${label}_path`);
  if (content !== null && !content.includes(phrase)) {
    violations.push(`entries[${index}].${label}_phrase: ${relativePath} に必須句「${phrase}」がない`);
  }
}

function verifyBaseCoverage(baseRevision, entries) {
  let resolvedBase;
  try {
    resolvedBase = execFileSync(
      "git",
      ["rev-parse", "--verify", "--end-of-options", `${baseRevision}^{commit}`],
      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
  } catch (error) {
    violations.push(`--base ${baseRevision}: commitを解決できない: ${error.stderr?.trim() || error.message}`);
    return null;
  }

  const sourceTexts = entries.map((entry) => entry.source_text);
  const l0Paths = [...new Set(entries.map((entry) => entry.l0_path))];
  const result = { total: 0, sourceText: 0, l0: 0 };

  for (const l0Path of l0Paths) {
    const rawCurrentContent = readRepoFile(l0Path, `--base ${baseRevision}`);
    if (rawCurrentContent === null) continue;
    const currentContent = visibleMarkdown(rawCurrentContent);
    let diff;
    try {
      diff = execFileSync(
        "git",
        ["diff", "--unified=0", "--no-color", resolvedBase, "--", l0Path],
        { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (error) {
      violations.push(`--base ${baseRevision}: ${l0Path} のdiff取得に失敗: ${error.stderr?.trim() || error.message}`);
      continue;
    }

    for (const diffLine of diff.split("\n")) {
      if (!diffLine.startsWith("-") || diffLine.startsWith("---")) continue;
      const deletedLine = diffLine.slice(1);
      if (deletedLine.trim().length === 0 || deletedLine.trimStart().startsWith("#")) continue;
      result.total += 1;
      if (sourceTexts.some((sourceText) => sourceText.includes(deletedLine))) {
        result.sourceText += 1;
      } else if (currentContent.includes(deletedLine)) {
        result.l0 += 1;
      } else {
        violations.push(
          `--base ${baseRevision}: ${l0Path} の削除行が未被覆: 「${deletedLine}」`,
        );
      }
    }
  }

  return result;
}
