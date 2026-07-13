import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReport, validateReportV2 } from '../../lib/factory/contract.mjs';

const V1_IDS = [
  'caveat', 'throughline', 'spotter', 'codegraph', 'markitdown',
  'oracle', 'aiterm-mcp', 'codex-sidecar', 'servermanager',
];
const V2_IDS = [
  'caveat', 'throughline', 'spotter', 'codegraph', 'markitdown',
  'gpt-connector', 'aiterm-mcp', 'codex-sidecar', 'servermanager',
  'claude-code', 'codex-cli', 'grok-build',
];

function product() {
  return {
    presence_status: 'missing', contract_version: '2.0',
    checks: [], runtime_errors: [], resolutions: [],
  };
}

function report(schemaVersion, productIds) {
  return {
    schema_version: schemaVersion,
    report_id: '018f0000-0000-8000-8000-0000000000aa',
    host_id: 'test-host',
    host_profile: 'mac',
    platform: { os: 'darwin', arch: 'arm64' },
    report_mode: 'full',
    observed_at: '2026-07-13T00:00:00.000Z',
    created_at: '2026-07-13T00:00:01.000Z',
    reporter: { version: '2.0.0', dotagents_revision: '1234567' },
    products: Object.fromEntries(productIds.map((id) => [id, product()])),
  };
}

test('v1 validatorはOracleを含む固定9製品契約を維持する', () => {
  assert.doesNotThrow(() => validateReport(report('1.0', V1_IDS)));
  assert.throws(() => validateReport(report('1.0', V2_IDS)), /未定義field/);
});

test('v2 validatorはgpt-connectorと基盤CLIを含む固定12製品だけを受理する', () => {
  assert.doesNotThrow(() => validateReportV2(report('2.0', V2_IDS)));
  assert.throws(() => validateReportV2(report('2.0', V1_IDS)), /未定義field/);
});

test('v2 validatorはrecordの未定義fieldとprivacy禁止値を拒否する', () => {
  const unknown = report('2.0', V2_IDS);
  unknown.products['gpt-connector'].checks.push({ check_id: 'cdp', status: 'pass', raw: 'x' });
  assert.throws(() => validateReportV2(unknown), /未定義field/);

  const secret = report('2.0', V2_IDS);
  secret.products['gpt-connector'].checks.push({
    check_id: 'cdp', status: 'fail', severity: 'high',
    fingerprint: 'a'.repeat(64), message_template: 'Bearer secret-value',
    occurrence_count: 1, first_seen: secret.observed_at, last_seen: secret.observed_at,
  });
  assert.throws(() => validateReportV2(secret), /privacy禁止pattern/);

  for (const forbidden of [
    'state failed at /var/lib/private',
    String.raw`state failed at C:\private\state.json`,
    'contact operator@example.com',
  ]) {
    const leaked = report('2.0', V2_IDS);
    leaked.products.caveat.checks = [{
      check_id: 'privacy', status: 'fail', severity: 'warn',
      fingerprint: 'b'.repeat(64), message_template: forbidden,
      occurrence_count: 1, first_seen: leaked.observed_at, last_seen: leaked.observed_at,
    }];
    assert.throws(() => validateReportV2(leaked), /privacy禁止pattern/);
  }
});
