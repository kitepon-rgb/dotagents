import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { projectServerManagerProbe } from '../../lib/factory/scan.mjs';
import { validateReport } from '../../lib/factory/contract.mjs';

const CLI = resolve(import.meta.dirname, '..', '..', 'bin', 'bughub-external-probe.mjs');
const IDS = ['database', 'schema', 'pull_poll', 'factory_ingest', 'factory_delivery', 'source_revision'];
const REVISION = '0123456789abcdef0123456789abcdef01234567';
const OBSERVED = '2026-07-13T00:00:00.000Z';

function validateProjection(product) {
  const empty = () => ({
    presence_status: 'not_applicable', contract_version: '1.0', checks: [], runtime_errors: [], resolutions: [],
  });
  const ids = ['caveat', 'throughline', 'spotter', 'codegraph', 'markitdown', 'oracle', 'aiterm-mcp', 'codex-sidecar'];
  validateReport({
    schema_version: '1.0', report_id: '018f0000-0000-8000-8000-0000000000dd',
    host_id: 'main-server', host_profile: 'server', platform: { os: 'linux', arch: 'x64' }, report_mode: 'full',
    observed_at: OBSERVED, created_at: OBSERVED,
    reporter: { version: '1.0.0', dotagents_revision: '1234567' },
    products: { ...Object.fromEntries(ids.map((id) => [id, empty()])), servermanager: product },
  });
}

function body(status = 'ready', mutate = () => {}) {
  const value = {
    schema_version: 'bughub.readiness.v1',
    product_version: '0.1.0',
    status,
    source_revision: REVISION,
    checks: IDS.map((id) => ({
      id, status: status === 'ready' ? 'pass' : id === 'pull_poll' ? 'fail' : 'pass',
      reason_code: id === 'source_revision' ? 'revision_match' : status === 'ready' ? 'ready' : id === 'pull_poll' ? 'stale' : 'ready',
      observed_at: null, age_ms: null, affected_count: 0,
    })),
  };
  mutate(value);
  return JSON.stringify(value);
}

function run(url, env = {}) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [CLI, '--json'], {
      env: { ...process.env, BUGHUB_READINESS_URL: url, ...env }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => done({ code, stderr, json: stdout ? JSON.parse(stdout) : null }));
  });
}

async function revisionManifest(content) {
  const dir = await mkdtemp(join(tmpdir(), 'bughub-revision-'));
  const path = join(dir, 'deploy-source-revision');
  if (content !== undefined) await writeFile(path, content);
  return { path, remove: () => rm(dir, { recursive: true, force: true }) };
}

async function server(status, payload) {
  const instance = createServer((req, res) => { res.statusCode = status; res.end(payload); });
  await new Promise((resolveListen) => instance.listen(0, '127.0.0.1', resolveListen));
  return {
    url: `http://127.0.0.1:${instance.address().port}/readyz`,
    close: () => new Promise((resolveClose) => instance.close(resolveClose)),
  };
}

test('readyとnot_readyを固定checkだけへ投影する', async (t) => {
  const manifest = await revisionManifest(`${REVISION}\n`);
  t.after(manifest.remove);
  for (const [status, httpStatus, exitCode] of [['ready', 200, 0], ['not_ready', 503, 1]]) {
    const local = await server(httpStatus, body(status));
    t.after(local.close);
    const result = await run(local.url, { BUGHUB_DEPLOY_REVISION_FILE: manifest.path });
    assert.equal(result.code, exitCode, result.stderr);
    assert.equal(result.json.status, status);
    assert.deepEqual(result.json.checks.map(({ id }) => id), IDS);
    assert.deepEqual(Object.keys(result.json.checks[0]), ['id', 'status', 'reason_code']);
    assert.equal(result.json.source_revision, REVISION);
  }
});

test('到達不能、schema不正、HTTPとstatus矛盾をgreenへ丸めず生値を漏らさない', async (t) => {
  const manifest = await revisionManifest(REVISION);
  t.after(manifest.remove);
  const malformed = await server(200, body('ready', (value) => { value.secret_path = '/Users/kite/private'; }));
  t.after(malformed.close);
  const invalid = await run(malformed.url, { BUGHUB_DEPLOY_REVISION_FILE: manifest.path });
  assert.equal(invalid.code, 1);
  assert.deepEqual(invalid.json, {
    schema_version: 'dotagents.bughub-external-probe.v1', product_version: null,
    status: 'unverified', reason_code: 'contract_invalid', source_revision: null, checks: [],
  });
  assert.equal(JSON.stringify(invalid).includes('Users'), false);

  const contradictory = await server(200, body('not_ready'));
  t.after(contradictory.close);
  assert.equal((await run(contradictory.url, { BUGHUB_DEPLOY_REVISION_FILE: manifest.path })).json.reason_code, 'contract_invalid');

  const unavailable = await run('http://127.0.0.1:1/readyz');
  assert.equal(unavailable.code, 1);
  assert.equal(unavailable.json.reason_code, 'unreachable');
});

test('manifestの正常・欠落・不正とrevision mismatchを安全な固定failへ投影する', async (t) => {
  const normal = await revisionManifest(`${REVISION}\n`);
  const missing = await revisionManifest(undefined);
  const invalid = await revisionManifest('NOT-A-REVISION\n');
  const mismatch = await revisionManifest('abcdefabcdefabcdefabcdefabcdefabcdefabcd\n');
  t.after(normal.remove); t.after(missing.remove); t.after(invalid.remove); t.after(mismatch.remove);
  for (const [manifest, reason, httpStatus] of [
    [normal, 'revision_match', 200],
    [missing, 'revision_missing', 503],
    [invalid, 'revision_invalid', 503],
    [mismatch, 'revision_mismatch', 503],
  ]) {
    const local = await server(httpStatus, body(httpStatus === 200 ? 'ready' : 'not_ready', (value) => {
      value.checks.at(-1).status = reason === 'revision_match' ? 'pass' : 'fail';
      value.checks.at(-1).reason_code = reason;
    }));
    t.after(local.close);
    const result = await run(local.url, { BUGHUB_DEPLOY_REVISION_FILE: manifest.path });
    assert.equal(result.code, reason === 'revision_match' ? 0 : 1);
    assert.equal(result.json.source_revision, REVISION);
    assert.deepEqual(result.json.checks.at(-1), {
      id: 'source_revision', status: reason === 'revision_match' ? 'pass' : 'fail', reason_code: reason,
    });
    validateProjection(projectServerManagerProbe({ ok: result.code === 0 }, result.json, OBSERVED));
    assert.equal(JSON.stringify(result).includes('NOT-A-REVISION'), false);
  }
});

test('revision manifest未設定時はHOME配下の既定pathを使う', async (t) => {
  const home = await mkdtemp(join(tmpdir(), 'bughub-home-'));
  const manifestPath = join(home, 'bughub', 'data', 'deploy-source-revision');
  await mkdir(join(home, 'bughub', 'data'), { recursive: true });
  await writeFile(manifestPath, `${REVISION}\n`);
  t.after(() => rm(home, { recursive: true, force: true }));
  const local = await server(200, body());
  t.after(local.close);
  const result = await run(local.url, { HOME: home, BUGHUB_DEPLOY_REVISION_FILE: '' });
  assert.equal(result.code, 0);
  assert.equal(result.json.source_revision, REVISION);
});

test('endpointのsource_revision check矛盾はcontract_invalidへ落とす', async (t) => {
  const manifest = await revisionManifest(REVISION);
  t.after(manifest.remove);
  const local = await server(200, body('ready', (value) => {
    value.checks.at(-1).status = 'fail';
    value.checks.at(-1).reason_code = 'revision_mismatch';
  }));
  t.after(local.close);
  const result = await run(local.url, { BUGHUB_DEPLOY_REVISION_FILE: manifest.path });
  assert.equal(result.code, 1);
  assert.equal(result.json.reason_code, 'contract_invalid');
  assert.equal(result.json.source_revision, null);
});

test('endpointのrevision_mismatchは異なるmanifestにだけ整合し、baked revisionを保持する', async (t) => {
  const manifest = await revisionManifest('abcdefabcdefabcdefabcdefabcdefabcdefabcd\n');
  t.after(manifest.remove);
  const local = await server(503, body('not_ready', (value) => {
    value.checks.at(-1).status = 'fail';
    value.checks.at(-1).reason_code = 'revision_mismatch';
  }));
  t.after(local.close);
  const result = await run(local.url, { BUGHUB_DEPLOY_REVISION_FILE: manifest.path });
  assert.equal(result.code, 1);
  assert.equal(result.json.source_revision, REVISION);
  assert.deepEqual(result.json.checks.at(-1), {
    id: 'source_revision', status: 'fail', reason_code: 'revision_mismatch',
  });
});

test('loopback readyz以外、credential、queryをfetch前に拒否する', async () => {
  for (const url of [
    'http://192.168.1.2:39310/readyz',
    'https://127.0.0.1:39310/readyz',
    'http://user:pass@127.0.0.1:39310/readyz',
    'http://127.0.0.1:39310/healthz',
    'http://127.0.0.1:39310/readyz?token=secret',
  ]) {
    const result = await run(url);
    assert.equal(result.code, 2, url);
    assert.equal(result.json, null, url);
    assert.match(result.stderr, /endpoint_invalid/);
    assert.equal(result.stderr.includes('secret'), false);
  }
});
