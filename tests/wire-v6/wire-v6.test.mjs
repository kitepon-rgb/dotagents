import assert from 'node:assert/strict';
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
