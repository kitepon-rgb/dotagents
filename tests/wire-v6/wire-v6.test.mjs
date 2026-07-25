import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { validateReportV5, validateReportV6 } from '../../lib/factory/contract.mjs';
import { V5_PRODUCT_IDS } from '../../lib/factory/v5.mjs';
import { V6_PRODUCT_IDS } from '../../lib/factory/v6.mjs';

const EXPECTED = [...V5_PRODUCT_IDS, 'observer'];

const product = (contractVersion = '6.0') => ({
  presence_status: 'installed',
  installed_version: '0.1.0',
  contract_version: contractVersion,
  checks: [],
  runtime_errors: [],
  resolutions: [],
});

function reportV6() {
  return {
    schema_version: '6.0',
    report_id: '019f57f0-6bb7-7bc1-b94a-18f648f2d901',
    host_id: 'mac-kite',
    host_profile: 'mac',
    platform: { os: 'darwin', arch: 'arm64' },
    report_mode: 'full',
    observed_at: '2026-07-25T00:00:00.000Z',
    created_at: '2026-07-25T00:00:00.000Z',
    reporter: { version: '6.0.0', dotagents_revision: 'abc1234' },
    products: Object.fromEntries(EXPECTED.map((id) => [id, product()])),
  };
}

test('v6はv5順序を保持してObserverを14番目へ追加する', () => {
  assert.deepEqual(V6_PRODUCT_IDS, EXPECTED);
  assert.equal(new Set(V6_PRODUCT_IDS).size, 14);
});

test('v6 validatorは固定14製品だけを受理し、v5を変更しない', () => {
  const report = reportV6();
  assert.doesNotThrow(() => validateReportV6(report));
  assert.throws(
    () => validateReportV6({ ...report, products: Object.fromEntries(V5_PRODUCT_IDS.map((id) => [id, product()])) }),
    /固定14製品/,
  );
  const v5 = {
    ...report,
    schema_version: '5.0',
    reporter: { ...report.reporter, version: '5.0.0' },
    products: Object.fromEntries(V5_PRODUCT_IDS.map((id) => [id, product('5.0')])),
  };
  assert.doesNotThrow(() => validateReportV5(v5));
});

test('Observer safe_contextは空allowlistのため拒否する', () => {
  const report = reportV6();
  report.products.observer.checks = [{
    check_id: 'native_diagnostics',
    status: 'unverified',
    reason_code: 'native_schema_invalid',
    safe_context: { watch_id: 'w_private' },
  }];
  assert.throws(() => validateReportV6(report), /safe_context/);
});

function run(script, args, env = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [script, ...args], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolveRun({
      code,
      stdout,
      stderr,
      json: stdout ? JSON.parse(stdout) : null,
    }));
  });
}

test('v6 reporterはv6 reportだけを受理し、v5とstateを共有しない', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wire-v6-reporter-'));
  try {
    const reportPath = join(root, 'report.json');
    const configPath = join(root, 'config.json');
    const reporter = resolve(import.meta.dirname, '../../bin/factory-reporter-v6.mjs');
    await writeFile(reportPath, JSON.stringify(reportV6()));
    await writeFile(configPath, JSON.stringify({
      schema_version: '1.0',
      host: { id: 'mac-kite', profile: 'mac' },
      collection: { enabled: false },
      reporting: { enabled: false },
    }));
    const preview = await run(reporter, ['preview', '--report', reportPath, '--config', configPath], {
      XDG_STATE_HOME: join(root, 'state'),
    });
    assert.equal(preview.code, 0, preview.stderr);
    assert.equal(preview.json.report.schema_version, '6.0');

    const v5 = reportV6();
    v5.schema_version = '5.0';
    v5.reporter.version = '5.0.0';
    delete v5.products.observer;
    for (const productValue of Object.values(v5.products)) productValue.contract_version = '5.0';
    await writeFile(reportPath, JSON.stringify(v5));
    const rejected = await run(reporter, ['preview', '--report', reportPath, '--config', configPath], {
      XDG_STATE_HOME: join(root, 'state'),
    });
    assert.equal(rejected.code, 1);
    assert.equal(rejected.json.code, 'FACTORY_REPORTER_V6_ERROR');

    const source = await readFile(reporter, 'utf8');
    assert.match(source, /factory-reporter-v5\.mjs/u, 'v5の検証済みtransport実装を共有する');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('schedulerはv6 endpoint・runner・専用stateを同じmajorへ束縛する', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wire-v6-scheduler-'));
  try {
    const configPath = join(root, 'config.json');
    const credentialPath = join(root, 'credential');
    const scheduler = resolve(import.meta.dirname, '../../bin/factory-reporter-scheduler.mjs');
    await writeFile(credentialPath, 'unit-test-token\n', { mode: 0o600 });
    await writeFile(configPath, JSON.stringify({
      schema_version: '1.0',
      host: { id: 'mac-kite', profile: 'mac' },
      collection: { enabled: true },
      reporting: {
        enabled: true,
        endpoint: 'http://127.0.0.1:1/api/factory/v6/reports',
        credential_file: credentialPath,
      },
    }));
    const result = await run(scheduler, [
      'install', '--dry-run', '--platform', 'darwin', '--wire-major', 'v6', '--config', configPath,
    ], {
      HOME: root,
      XDG_STATE_HOME: join(root, 'state'),
    });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.json.wire_major, 'v6');
    assert.match(result.json.artifact_content, /factory-reporter-v6-schedule-runner/u);
    assert.match(result.json.state, /factory-reporter-v6$/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
