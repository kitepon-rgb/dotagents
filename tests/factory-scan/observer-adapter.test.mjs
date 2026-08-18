import assert from 'node:assert/strict';
import test from 'node:test';

import { validateReportV6, validateReportV7 } from '../../lib/factory/contract.mjs';
import { observerProduct, V6_PRODUCT_IDS } from '../../lib/factory/v6.mjs';
import { V7_PRODUCT_IDS } from '../../lib/factory/v7.mjs';

const ALLOWED_COMPATIBILITY = Object.freeze(['compatible', 'incompatible', 'unsupported', 'unverified']);
const ALLOWED_CHECK_STATUS = Object.freeze(['pass', 'fail', 'unsupported', 'unverified', 'skipped']);

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

function reportFor(schemaVersion, productIds, observer) {
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
    products: Object.fromEntries(productIds.map((id) => [
      id,
      id === 'observer' ? observer : installedProduct(contractVersion),
    ])),
  };
}

test('撤去後Observerはpresence not_applicableと契約可能なunsupportedだけを出す', async () => {
  const product = await observerProduct();
  assert.equal(product.presence_status, 'not_applicable');
  assert.equal(product.compatibility_status, 'unsupported');
  assert.ok(
    ALLOWED_COMPATIBILITY.includes(product.compatibility_status),
    'compatibility_statusは契約enumだけを使う',
  );
  assert.notEqual(
    product.compatibility_status,
    'not_applicable',
    'presenceのnot_applicableをcompatibility_statusへ流用しない',
  );
  assert.deepEqual(product.checks, [{
    check_id: 'factory_core',
    status: 'unsupported',
    reason_code: 'retired_from_factory_core',
  }]);
  assert.ok(
    ALLOWED_CHECK_STATUS.includes(product.checks[0].status),
    'check statusは契約enumだけを使う',
  );
});

test('factory-scan-v7 validatorはserver hostの撤去後Observerを受理する', async () => {
  const observer = await observerProduct();
  assert.doesNotThrow(() => validateReportV6(reportFor('6.0', V6_PRODUCT_IDS, observer)));
  assert.doesNotThrow(() => validateReportV7(reportFor('7.0', V7_PRODUCT_IDS, {
    ...observer,
    contract_version: '7.0',
  })));
});

test('compatibility_status: not_applicable は factory-scan-v7 と同じ契約エラーで拒否する', async () => {
  const observer = {
    ...await observerProduct(),
    contract_version: '7.0',
    compatibility_status: 'not_applicable',
  };
  assert.throws(
    () => validateReportV7(reportFor('7.0', V7_PRODUCT_IDS, observer)),
    /products\.observer\.compatibility_statusが不正です/,
  );
});
