import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';

const CLI = resolve(import.meta.dirname, '..', '..', 'bin', 'bughub-external-probe.mjs');
const IDS = ['database', 'schema', 'pull_poll', 'factory_ingest', 'factory_delivery'];

function body(status = 'ready', mutate = () => {}) {
  const value = {
    schema_version: 'bughub.readiness.v1',
    product_version: '0.1.0',
    status,
    checks: IDS.map((id) => ({
      id, status: status === 'ready' ? 'pass' : id === 'pull_poll' ? 'fail' : 'pass',
      reason_code: status === 'ready' ? 'ready' : id === 'pull_poll' ? 'stale' : 'ready',
      observed_at: null, age_ms: null, affected_count: 0,
    })),
  };
  mutate(value);
  return JSON.stringify(value);
}

function run(url) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [CLI, '--json'], {
      env: { ...process.env, BUGHUB_READINESS_URL: url }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => done({ code, stderr, json: stdout ? JSON.parse(stdout) : null }));
  });
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
  for (const [status, httpStatus, exitCode] of [['ready', 200, 0], ['not_ready', 503, 1]]) {
    const local = await server(httpStatus, body(status));
    t.after(local.close);
    const result = await run(local.url);
    assert.equal(result.code, exitCode, result.stderr);
    assert.equal(result.json.status, status);
    assert.deepEqual(result.json.checks.map(({ id }) => id), IDS);
    assert.deepEqual(Object.keys(result.json.checks[0]), ['id', 'status', 'reason_code']);
  }
});

test('到達不能、schema不正、HTTPとstatus矛盾をgreenへ丸めず生値を漏らさない', async (t) => {
  const malformed = await server(200, body('ready', (value) => { value.secret_path = '/Users/kite/private'; }));
  t.after(malformed.close);
  const invalid = await run(malformed.url);
  assert.equal(invalid.code, 1);
  assert.deepEqual(invalid.json, {
    schema_version: 'dotagents.bughub-external-probe.v1', product_version: null,
    status: 'unverified', reason_code: 'contract_invalid', checks: [],
  });
  assert.equal(JSON.stringify(invalid).includes('Users'), false);

  const contradictory = await server(200, body('not_ready'));
  t.after(contradictory.close);
  assert.equal((await run(contradictory.url)).json.reason_code, 'contract_invalid');

  const unavailable = await run('http://127.0.0.1:1/readyz');
  assert.equal(unavailable.code, 1);
  assert.equal(unavailable.json.reason_code, 'unreachable');
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
