import assert from 'node:assert/strict';
import test from 'node:test';
import { CURRENT_WIRE_PRODUCT_IDS, MANAGED_PRODUCT_IDS, hostProjection, postUpdateFailures } from '../../lib/factory/deployment-contract.mjs';
import { V7_PRODUCT_IDS } from '../../lib/factory/v7.mjs';

test('deployment contractは管理12製品とv7 wire 15 IDを固定する', () => {
  assert.deepEqual(MANAGED_PRODUCT_IDS, [
    'caveat', 'throughline', 'spotter', 'lattice', 'markitdown', 'gpt-connector',
    'aiterm-mcp', 'codex-sidecar', 'aishell', 'observer', 'servermanager', 'peertable',
  ]);
  assert.deepEqual(CURRENT_WIRE_PRODUCT_IDS, V7_PRODUCT_IDS);
  assert.deepEqual(hostProjection({ profile: 'mac', os: 'darwin', arch: 'arm64', macosMajor: 15 }).required, ['caveat', 'throughline', 'spotter', 'lattice', 'markitdown', 'gpt-connector', 'aiterm-mcp', 'codex-sidecar', 'aishell', 'observer', 'peertable']);
  assert.deepEqual(hostProjection({ profile: 'server', os: 'linux', arch: 'arm64' }).required, ['caveat', 'throughline', 'spotter', 'lattice', 'markitdown', 'gpt-connector', 'aiterm-mcp', 'codex-sidecar', 'servermanager', 'peertable']);
});

test('host projectionはprofile/OS/arch/macOS majorの未知値と不整合をfail-closedにする', () => {
  assert.throws(() => hostProjection({ profile: 'mac', os: 'linux', arch: 'arm64', macosMajor: 15 }), /不整合/u);
  assert.throws(() => hostProjection({ profile: 'mac', os: 'darwin', arch: 'mips64', macosMajor: 15 }), /arch/u);
  assert.throws(() => hostProjection({ profile: 'mac', os: 'darwin', arch: 'arm64' }), /macOS major/u);
  assert.throws(() => hostProjection({ profile: 'mac', os: 'darwin', arch: 'arm64', macosMajor: 14.5 }), /macOS major/u);
  assert.deepEqual(hostProjection({ profile: 'mac', os: 'darwin', arch: 'arm64', macosMajor: 14 }).expected.aishell, 'unsupported');
});

test('host別required集合はmatrix全行と完全一致する', () => {
  const required = (facts) => hostProjection(facts).required;
  assert.deepEqual(required({ profile: 'mac', os: 'darwin', arch: 'arm64', macosMajor: 15 }), ['caveat','throughline','spotter','lattice','markitdown','gpt-connector','aiterm-mcp','codex-sidecar','aishell','observer','peertable']);
  assert.deepEqual(required({ profile: 'mac', os: 'darwin', arch: 'arm64', macosMajor: 14 }), ['caveat','throughline','spotter','lattice','markitdown','gpt-connector','aiterm-mcp','codex-sidecar','observer','peertable']);
  assert.deepEqual(required({ profile: 'server', os: 'linux', arch: 'arm64' }), ['caveat','throughline','spotter','lattice','markitdown','gpt-connector','aiterm-mcp','codex-sidecar','servermanager','peertable']);
  assert.deepEqual(required({ profile: 'wsl', os: 'linux', arch: 'x64' }), ['caveat','throughline','spotter','lattice','markitdown','gpt-connector','aiterm-mcp','codex-sidecar','peertable']);
  assert.deepEqual(required({ profile: 'windows-native', os: 'win32', arch: 'x64' }), ['caveat','throughline','spotter','lattice','markitdown','gpt-connector','aiterm-mcp','codex-sidecar','peertable']);
});

test('post-update gateは対応hostのAIShell・Observer・peertable欠落を拒否し、非対応を要求しない', () => {
  const mac = hostProjection({ profile: 'mac', os: 'darwin', arch: 'arm64', macosMajor: 15 });
  const products = Object.fromEntries([...mac.required, 'claude-code', 'codex-cli'].map((id) => [id, { presence_status: 'installed', compatibility_status: 'compatible', checks: [] }]));
  const report = { products };
  assert.deepEqual(postUpdateFailures(report, { profile: 'mac', os: 'darwin', arch: 'arm64', macosMajor: 15 }), []);
  for (const id of ['aishell', 'observer', 'peertable']) {
    const broken = structuredClone(report); delete broken.products[id];
    assert.deepEqual(postUpdateFailures(broken, { profile: 'mac', os: 'darwin', arch: 'arm64', macosMajor: 15 }), [`${id}:presence`]);
    for (const status of ['fail', 'unverified']) { const invalid = structuredClone(report); invalid.products[id].checks = [{ check_id: 'diagnostic', status, reason_code: 'diagnostic_failed' }]; assert.deepEqual(postUpdateFailures(invalid, { profile: 'mac', os: 'darwin', arch: 'arm64', macosMajor: 15 }), [`${id}:diagnostic`]); }
  }
  const windows = { products: Object.fromEntries(['caveat', 'throughline', 'spotter', 'lattice', 'markitdown', 'gpt-connector', 'aiterm-mcp', 'codex-sidecar', 'peertable'].map((id) => [id, { presence_status: 'installed', compatibility_status: 'compatible', checks: [] }])) };
  assert.deepEqual(postUpdateFailures(windows, { profile: 'windows-native', os: 'win32', arch: 'x64' }), []);
});
