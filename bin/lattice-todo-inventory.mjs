#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_SOURCE_REFS = Object.freeze([
  'PLAN.md',
  'docs/plan_factory-master.md',
]);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const checkbox = /^(\s*)([-+*]|\d+[A-Za-z]?\.|\d+\))\s+\[([ xX])\]\s+(.*)$/u;
const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/u;
const fence = /^( {0,3})(`{3,}|~{3,})(.*)$/u;
const safeRef = (value) => typeof value === 'string' && value.length > 0
  && !path.posix.isAbsolute(value) && !value.split('/').includes('..')
  && !value.includes('\\') && !/[\u0000-\u001f\u007f]/u.test(value);

function git(repoRoot, args, options = {}) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: options.encoding ?? 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

export function parseMarkdownInventory(bytes) {
  const lines = bytes.toString('utf8').split('\n');
  const headings = [];
  const taskStack = [];
  const tasks = [];
  let openFence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = fence.exec(line);
    if (openFence !== null) {
      if (fenceMatch !== null && fenceMatch[2][0] === openFence.marker
        && fenceMatch[2].length >= openFence.length && fenceMatch[3].trim() === '') {
        openFence = null;
      }
      continue;
    }
    if (fenceMatch !== null) {
      openFence = { marker: fenceMatch[2][0], length: fenceMatch[2].length };
      continue;
    }
    const headingMatch = heading.exec(line);
    if (headingMatch !== null) {
      const level = headingMatch[1].length;
      headings.length = level - 1;
      headings[level - 1] = headingMatch[2];
      continue;
    }
    const match = checkbox.exec(line);
    if (match === null) continue;
    const indentation = match[1].replaceAll('\t', '    ').length;
    while (taskStack.length > 0 && taskStack.at(-1).indentation >= indentation) taskStack.pop();
    const parent = taskStack.at(-1) ?? null;
    const task = {
      line: index + 1,
      checked: match[3].toLowerCase() === 'x',
      marker: match[2],
      indentation,
      markdown_depth: taskStack.length,
      parent_line: parent?.line ?? null,
      title: match[4],
      heading_path: headings.filter(Boolean),
      source_line_digest: sha256(line),
    };
    tasks.push(task);
    taskStack.push({ line: task.line, indentation });
  }
  return tasks;
}

export function inventorySources({
  repoRoot = process.cwd(), sourceRefs = DEFAULT_SOURCE_REFS, sourceCommit = 'HEAD',
} = {}) {
  const root = path.resolve(repoRoot);
  if (!Array.isArray(sourceRefs) || sourceRefs.length === 0
    || sourceRefs.some((sourceRef) => !safeRef(sourceRef))
    || new Set(sourceRefs).size !== sourceRefs.length) {
    throw new TypeError('source refs must be unique safe repo-relative paths');
  }
  const commit = git(root, ['rev-parse', '--verify', `${sourceCommit}^{commit}`]).trim();
  const sources = sourceRefs.map((sourceRef) => {
    const bytes = git(root, ['show', `${commit}:${sourceRef}`], { encoding: 'buffer' });
    const tasks = parseMarkdownInventory(bytes);
    return {
      source_ref: sourceRef,
      source_digest: sha256(bytes),
      total: tasks.length,
      checked: tasks.filter(({ checked }) => checked).length,
      unchecked: tasks.filter(({ checked }) => !checked).length,
      tasks,
    };
  });
  const inventory = {
    schema: 'dotagents.lattice_todo_inventory.v1',
    source_commit: commit,
    sources,
    total: sources.reduce((sum, source) => sum + source.total, 0),
    checked: sources.reduce((sum, source) => sum + source.checked, 0),
    unchecked: sources.reduce((sum, source) => sum + source.unchecked, 0),
    inventory_digest: '',
  };
  inventory.inventory_digest = sha256(JSON.stringify({ source_commit: commit, sources }));
  return inventory;
}

export function verifyLiveSourceCutover({
  repoRoot = process.cwd(), sourceRefs = DEFAULT_SOURCE_REFS,
} = {}) {
  const root = path.resolve(repoRoot);
  if (!Array.isArray(sourceRefs) || sourceRefs.length === 0
    || sourceRefs.some((sourceRef) => !safeRef(sourceRef))
    || new Set(sourceRefs).size !== sourceRefs.length) {
    throw new TypeError('source refs must be unique safe repo-relative paths');
  }
  const violations = sourceRefs.flatMap((sourceRef) => parseMarkdownInventory(
    readFileSync(path.resolve(root, sourceRef)),
  ).map(({ line }) => `${sourceRef}#L${line}`));
  if (violations.length > 0) {
    throw new Error(`registered live Markdown must not contain checkbox TODO: ${violations.join(', ')}`);
  }
  return { schema: 'dotagents.lattice_live_source_cutover_verify.v1',
    source_count: sourceRefs.length, checkbox_count: 0 };
}

function parseArgs(argv) {
  let summary = false;
  let verifyCutover = false;
  let sourceCommit = 'HEAD';
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--summary') summary = true;
    else if (argv[index] === '--verify-cutover') verifyCutover = true;
    else if (argv[index] === '--source-commit' && index + 1 < argv.length) sourceCommit = argv[++index];
    else throw new TypeError(`unsupported argument: ${argv[index]}`);
  }
  if (verifyCutover && (summary || sourceCommit !== 'HEAD')) {
    throw new TypeError('--verify-cutover cannot be combined with inventory options');
  }
  return { summary, sourceCommit, verifyCutover };
}

function main() {
  const { summary, sourceCommit, verifyCutover } = parseArgs(process.argv.slice(2));
  if (verifyCutover) {
    process.stdout.write(`${JSON.stringify(verifyLiveSourceCutover())}\n`);
    return;
  }
  const inventory = inventorySources({ sourceCommit });
  const output = summary ? {
    schema: inventory.schema,
    source_commit: inventory.source_commit,
    sources: inventory.sources.map(({ tasks: _tasks, ...source }) => source),
    total: inventory.total,
    checked: inventory.checked,
    unchecked: inventory.unchecked,
    inventory_digest: inventory.inventory_digest,
  } : inventory;
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

const invoked = process.argv[1] === undefined ? null : path.resolve(process.argv[1]);
if (invoked !== null && invoked === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`lattice-todo-inventory: ${error.message}\n`);
    process.exitCode = 1;
  }
}
