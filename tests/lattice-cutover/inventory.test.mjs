import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DEFAULT_SOURCE_REFS,
  inventorySources,
  verifyLiveSourceCutover,
} from '../../bin/lattice-todo-inventory.mjs';

const git = (root, args) => execFileSync('git', args, {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    GIT_AUTHOR_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  },
});

test('既定のlive source監査に憲章PLANを含める', () => {
  assert.equal(DEFAULT_SOURCE_REFS.includes('PLAN.md'), true);
});

test('HEAD blobだけからcode fence外のbullet・番号付きcheckboxを安定集計する', async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), 'lattice-todo-inventory-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  git(root, ['init', '--quiet']);
  await mkdir(path.join(root, 'docs'));
  const source = [
    '# Phase',
    '- [ ] top',
    '  - [x] child',
    '6a. [x] numbered',
    '```js',
    '- [ ] fenced',
    '```',
    '~~~',
    '1. [ ] fenced too',
    '~~~',
    '',
  ].join('\n');
  await writeFile(path.join(root, 'docs/plan.md'), source);
  git(root, ['add', '--', 'docs/plan.md']);
  git(root, ['commit', '--quiet', '-m', 'fixture']);
  const commit = git(root, ['rev-parse', 'HEAD']).trim();

  await writeFile(path.join(root, 'docs/plan.md'), `${source}- [ ] dirty only\n`);
  const first = inventorySources({ repoRoot: root, sourceRefs: ['docs/plan.md'], sourceCommit: commit });
  const second = inventorySources({ repoRoot: root, sourceRefs: ['docs/plan.md'], sourceCommit: commit });

  assert.equal(first.total, 3);
  assert.equal(first.checked, 2);
  assert.equal(first.unchecked, 1);
  assert.equal(first.inventory_digest, second.inventory_digest);
  assert.deepEqual(first.sources[0].tasks.map(({ line, marker, parent_line, heading_path }) => ({
    line, marker, parent_line, heading_path,
  })), [
    { line: 2, marker: '-', parent_line: null, heading_path: ['Phase'] },
    { line: 3, marker: '-', parent_line: 2, heading_path: ['Phase'] },
    { line: 4, marker: '6a.', parent_line: null, heading_path: ['Phase'] },
  ]);
});

test('unsafeまたは重複source refをfail closedに拒否する', () => {
  assert.throws(() => inventorySources({ sourceRefs: ['../secret.md'] }), /safe repo-relative/u);
  assert.throws(() => inventorySources({ sourceRefs: ['docs/a.md', 'docs/a.md'] }), /unique safe/u);
});

test('Lattice登録済みlive Markdownへのcheckbox再導入をworktree bytesで拒否する', async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), 'lattice-source-cutover-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'docs'));
  await writeFile(path.join(root, 'docs/plan.md'), '# Plan\n<!-- Latticeへ移管済み: T1 -->\n');
  assert.deepEqual(verifyLiveSourceCutover({ repoRoot: root, sourceRefs: ['docs/plan.md'] }), {
    schema: 'dotagents.lattice_live_source_cutover_verify.v1', source_count: 1, checkbox_count: 0,
  });
  await writeFile(path.join(root, 'docs/plan.md'), '# Plan\n- [ ] 復活\n');
  assert.throws(() => verifyLiveSourceCutover({ repoRoot: root, sourceRefs: ['docs/plan.md'] }),
    /docs\/plan\.md#L2/u);
});
