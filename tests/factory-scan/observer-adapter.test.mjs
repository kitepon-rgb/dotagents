import assert from 'node:assert/strict';
import test from 'node:test';

import { validateReportV6, validateReportV7 } from '../../lib/factory/contract.mjs';
import { V6_PRODUCT_IDS } from '../../lib/factory/v6.mjs';
import { V7_PRODUCT_IDS } from '../../lib/factory/v7.mjs';

function installedProduct(contractVersion) {
  return {
    presence_status: 'installed',
    installed_version: '0.1.0',
    contract_version: contractVersion,
    checks: [],
    runtime_errors: [],
    resolutions: [],
  };
}

function leftoverObserver(contractVersion) {
  return {
    presence_status: 'not_applicable',
    compatibility_status: 'unsupported',
    contract_version: contractVersion,
    checks: [{ check_id: 'factory_core', status: 'unsupported', reason_code: 'retired_from_factory_core' }],
    runtime_errors: [],
    resolutions: [],
  };
}

function reportFor(schemaVersion, productIds) {
  const contractVersion = schemaVersion === '7.0' ? '7.0' : '6.0';
  const reporterVersion = schemaVersion === '7.0' ? '7.0.0' : '6.0.0';
  const reportId = schemaVersion === '7.0'
    ? '019f57f0-6bb7-7bc1-b94a-18f648f2d902'
    : '019f57f0-6bb7-7bc1-b94a-18f648f2d901';
  return {
    schema_version: schemaVersion,
    report_id: reportId,
    host_id: 'main-server',
    host_profile: 'server',
    platform: { os: 'linux', arch: 'x64' },
    report_mode: 'full',
    observed_at: '2026-08-18T00:00:00.000Z',
    created_at: '2026-08-18T00:00:00.000Z',
    reporter: { version: reporterVersion, dotagents_revision: 'abc1234' },
    products: Object.fromEntries(productIds.map((id) => [id, installedProduct(contractVersion)])),
  };
}

test('v6/v7必須集合はobserverキーを持たない', () => {
  assert.equal(V6_PRODUCT_IDS.includes('observer'), false);
  assert.equal(V7_PRODUCT_IDS.includes('observer'), false);
  assert.equal(new Set(V6_PRODUCT_IDS).size, 13);
  assert.equal(new Set(V7_PRODUCT_IDS).size, 14);
});

test('factory-scan-v7 validatorはserver hostのobserver不在reportを受理する', () => {
  const v6 = reportFor('6.0', V6_PRODUCT_IDS);
  const v7 = reportFor('7.0', V7_PRODUCT_IDS);
  assert.equal('observer' in v6.products, false);
  assert.equal('observer' in v7.products, false);
  assert.doesNotThrow(() => validateReportV6(v6));
  assert.doesNotThrow(() => validateReportV7(v7));
});

test('products.observerが残るとvalidateReportV7は余剰キーとして拒否する', () => {
  const report = reportFor('7.0', V7_PRODUCT_IDS);
  report.products.observer = leftoverObserver('7.0');
  assert.throws(() => validateReportV7(report), /productsに未定義fieldがあります/);
});
