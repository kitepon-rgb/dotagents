import assert from 'node:assert/strict';
import test from 'node:test';
import { aishellProduct } from '../../lib/factory/scan.mjs';

const valid = (overrides = {}) => ({
  schemaVersion: 'aishell.native_factory_diagnostics.v1',
  product: { identifier: 'aishell', version: '0.2.1' },
  platform: { operatingSystem: 'macos', architecture: 'arm64', minimumOperatingSystem: '15.0', supported: true },
  runtime: {
    schemaVersion: 'aishell.runtime_configuration.v2', configurationState: 'valid',
    migrationStatus: 'compatible_on_read', operationReadiness: 'ready', isPaused: false,
    configuredRootCount: 3, automaticGitWorktreeCount: 2, effectiveRootCount: 5,
  },
  mcp: { transport: 'stdio', protocolVersion: '2025-11-25', ready: true },
  manager: { applicationBundleState: 'available', ready: true },
  privacy: {
    exposesAllowedRootPaths: false, exposesOperationHistory: false,
    exposesFileContents: false, exposesProcessArguments: false,
  },
  ready: true,
  issues: [],
  ...overrides,
});

const runnerFor = (diagnostic, ok = true) => async (command, args, options) => {
  assert.equal(command, 'aishell-mcp');
  assert.deepEqual(args, []);
  assert.match(options.input, /factory_diagnostics/);
  return {
    ok, stdout: `${JSON.stringify({ jsonrpc: '2.0', id: 2, result: { structuredContent: diagnostic } })}\n`,
  };
};

test('AIShell native diagnosticsをpath非露出の製品状態へ射影する', async () => {
  const product = await aishellProduct({ runner: runnerFor(valid()) }, '2026-07-19T00:00:00.000Z');
  assert.equal(product.presence_status, 'installed');
  assert.equal(product.installed_version, '0.2.1');
  assert.equal(product.state_schema_version, 'aishell.runtime_configuration.v2');
  assert.equal(product.migration_status, 'current');
  assert.equal(product.compatibility_status, 'compatible');
  assert.deepEqual(product.checks, [{ check_id: 'native_diagnostics', status: 'pass' }]);
});

test('非対応hostはprocessを起動せずnot_applicableにする', async () => {
  let called = false;
  const product = await aishellProduct({ profile: 'server', runner: async () => { called = true; } });
  assert.equal(called, false);
  assert.equal(product.presence_status, 'not_applicable');
  assert.equal(product.compatibility_status, 'unsupported');
  assert.deepEqual(product.checks, [{
    check_id: 'native_diagnostics', status: 'unsupported', reason_code: 'platform_unsupported',
  }]);
});

test('not readyは固定fingerprintのfailureへ射影する', async () => {
  const diagnostic = valid({
    runtime: { ...valid().runtime, configurationState: 'invalid', migrationStatus: 'blocked', operationReadiness: 'invalid_configuration', isPaused: null, configuredRootCount: null, automaticGitWorktreeCount: null, effectiveRootCount: null },
    ready: false, issues: ['runtime.invalid_configuration'],
  });
  const product = await aishellProduct({ runner: runnerFor(diagnostic) }, '2026-07-19T00:00:00.000Z');
  assert.equal(product.compatibility_status, 'incompatible');
  assert.equal(product.checks[0].status, 'fail');
  assert.match(product.checks[0].fingerprint, /^[0-9a-f]{64}$/);
});

test('schema drift・privacy緩和・path混入を受理しない', async () => {
  const cases = [
    { ...valid(), extra: true },
    valid({ privacy: { ...valid().privacy, exposesAllowedRootPaths: true } }),
    valid({ issues: ['/Users/kite/secret'], ready: false }),
    valid({ product: { identifier: 'aishell', version: 'dev' } }),
  ];
  for (const diagnostic of cases) {
    const product = await aishellProduct({ runner: runnerFor(diagnostic) });
    assert.deepEqual(product.checks, [{
      check_id: 'native_diagnostics', status: 'unverified', reason_code: 'native_schema_invalid',
    }]);
  }
});

test('CLI不在はmissing、transport失敗はunverifiedを維持する', async () => {
  const missing = await aishellProduct({ runner: async () => ({
    ok: false, reason: 'spawn', error: { code: 'ENOENT' }, stdout: '',
  }) });
  assert.equal(missing.presence_status, 'missing');
  const failed = await aishellProduct({ runner: runnerFor(valid(), false) });
  assert.equal(failed.presence_status, 'unverified');
  assert.equal(failed.checks[0].reason_code, 'native_schema_invalid');
});
