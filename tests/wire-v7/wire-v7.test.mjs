import assert from 'node:assert/strict';
import {
  chmod, mkdir, mkdtemp, rm, writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';

import { validateReportV6, validateReportV7 } from '../../lib/factory/contract.mjs';
import { V6_PRODUCT_IDS } from '../../lib/factory/v6.mjs';
import { peertableProduct, projectPeertableFactory, V7_PRODUCT_IDS } from '../../lib/factory/v7.mjs';

const EXPECTED = [...V6_PRODUCT_IDS, 'peertable'];

test('v7はv6順序を保持してpeertableを15番目へ追加する', () => {
  assert.deepEqual(V7_PRODUCT_IDS, EXPECTED);
  assert.equal(new Set(V7_PRODUCT_IDS).size, 15);
});

const product = (contractVersion = '7.0') => ({
  presence_status: 'installed',
  installed_version: '0.1.0',
  contract_version: contractVersion,
  checks: [],
  runtime_errors: [],
  resolutions: [],
});

function reportV7() {
  return {
    schema_version: '7.0',
    report_id: '019f57f0-6bb7-7bc1-b94a-18f648f2d902',
    host_id: 'mac-kite',
    host_profile: 'mac',
    platform: { os: 'darwin', arch: 'arm64' },
    report_mode: 'full',
    observed_at: '2026-08-10T00:00:00.000Z',
    created_at: '2026-08-10T00:00:00.000Z',
    reporter: { version: '7.0.0', dotagents_revision: 'abc1234' },
    products: Object.fromEntries(EXPECTED.map((id) => [id, product()])),
  };
}

test('v7 validatorは固定15製品だけを受理し、v6を変更しない', () => {
  const report = reportV7();
  assert.doesNotThrow(() => validateReportV7(report));
  assert.throws(
    () => validateReportV7({ ...report, products: Object.fromEntries(V6_PRODUCT_IDS.map((id) => [id, product()])) }),
    /固定15製品/,
  );

  const v6 = {
    ...report,
    schema_version: '6.0',
    reporter: { ...report.reporter, version: '6.0.0' },
    products: Object.fromEntries(V6_PRODUCT_IDS.map((id) => [id, product('6.0')])),
  };
  assert.doesNotThrow(() => validateReportV6(v6));

  const v6WithPeertable = {
    ...v6,
    products: { ...v6.products, peertable: product('6.0') },
  };
  assert.throws(() => validateReportV6(v6WithPeertable), /未定義field/u, 'v6はpeertableキーを拒否し続ける');
});

test('peertable safe_contextは空allowlistのため拒否する', () => {
  const report = reportV7();
  report.products.peertable.checks = [{
    check_id: 'version_consistency',
    status: 'unverified',
    reason_code: 'version_consistency_unverified',
    safe_context: { installed_path: '/Users/kite/Developer/peertable' },
  }];
  assert.throws(() => validateReportV7(report), /safe_context/);
});

// 決定45（peertable repo docs/plan.md）の実測shape。2026-08-10、peertable 0.3.5で
// `PEERTABLE_URL= peertable-client diagnostics --json`を実行して得たJSONそのもの。
function readyFixture() {
  return {
    schema: 'peertable.native_factory_diagnostics.v1',
    product: { name: 'peertable', version: '0.3.5' },
    checks: {
      version_consistency: 'pass',
      bin_integrity: 'pass',
      node_runtime: 'pass',
      skill_bundle: 'pass',
      room_reachability: 'not_applicable',
    },
    overall: 'ready',
  };
}

test('projectPeertableFactoryはready fixtureをcompatible/pass checksへ投影する', () => {
  const projected = projectPeertableFactory(readyFixture(), true, '2026-08-10T00:00:00.000Z');
  assert.equal(projected.installed_version, '0.3.5');
  assert.equal(projected.compatibility_status, 'compatible');
  assert.equal(projected.checks.length, 5);
  assert.ok(projected.checks.every((item) => item.status === 'pass' || item.check_id === 'room_reachability'));
  const room = projected.checks.find((item) => item.check_id === 'room_reachability');
  assert.equal(room.status, 'skipped');
  assert.equal(room.reason_code, 'room_reachability_not_applicable');
});

test('projectPeertableFactoryはnot_ready fixtureを固定fingerprintのfailへ投影する', () => {
  const fixture = readyFixture();
  fixture.checks.version_consistency = 'fail';
  fixture.overall = 'not_ready';
  const now = '2026-08-10T00:00:00.000Z';
  const projected = projectPeertableFactory(fixture, false, now);
  assert.equal(projected.compatibility_status, 'incompatible');
  const failed = projected.checks.find((item) => item.check_id === 'version_consistency');
  assert.equal(failed.status, 'fail');
  assert.equal(failed.severity, 'high');
  assert.match(failed.fingerprint, /^[0-9a-f]{64}$/u);
  assert.equal(failed.first_seen, now);
  assert.equal(failed.last_seen, now);
  // 同じcheck_id・reason_codeなら再走しても同じfingerprintになる（固定fingerprint）。
  const again = projectPeertableFactory(fixture, false, now);
  assert.equal(again.checks.find((item) => item.check_id === 'version_consistency').fingerprint, failed.fingerprint);
});

test('projectPeertableFactoryはoverallとexit codeの不一致をfail closedで拒否する', () => {
  assert.throws(() => projectPeertableFactory(readyFixture(), false, '2026-08-10T00:00:00.000Z'), /peertable_exit_mismatch/);
});

test('projectPeertableFactoryは未知fieldとunknown check statusを拒否する', () => {
  assert.throws(() => projectPeertableFactory({ ...readyFixture(), extra: 1 }, true), /peertable_diagnostics_schema/);
  const badStatus = readyFixture();
  badStatus.checks.version_consistency = 'ok';
  assert.throws(() => projectPeertableFactory(badStatus, true), /peertable_diagnostics_schema/);
});

async function sandbox(t) {
  const root = await mkdtemp(join(tmpdir(), 'wire-v7-peertable-'));
  const bin = join(root, 'bin');
  await mkdir(bin);
  t.after(() => rm(root, { recursive: true, force: true }));
  return {
    root,
    bin,
    async script(name, body) {
      const path = join(bin, name);
      await writeFile(path, `#!/bin/sh\n${body}`);
      await chmod(path, 0o755);
    },
  };
}

test('peertableProductはCLIをdiagnostics --jsonで呼び、PEERTABLE_URLを常に空へ倒す', async (t) => {
  const box = await sandbox(t);
  await box.script('peertable-client', `
if [ "$1" = "diagnostics" ] && [ "$2" = "--json" ]; then
  if [ -n "$PEERTABLE_URL" ]; then
    echo '{"schema":"peertable.native_factory_diagnostics.v1","product":{"name":"peertable","version":"0.3.5"},"checks":{"version_consistency":"pass","bin_integrity":"pass","node_runtime":"pass","skill_bundle":"pass","room_reachability":"pass"},"overall":"ready"}'
  else
    echo '${JSON.stringify(readyFixture())}'
  fi
else
  exit 2
fi`);
  const previous = process.env.PATH;
  const previousUrl = process.env.PEERTABLE_URL;
  process.env.PATH = `${box.bin}:${previous}`;
  process.env.PEERTABLE_URL = 'http://192.168.1.2:18860';
  t.after(() => { process.env.PATH = previous; process.env.PEERTABLE_URL = previousUrl; });

  const result = await peertableProduct({ cwd: box.root, now: '2026-08-10T00:00:00.000Z' });
  assert.equal(result.presence_status, 'installed');
  assert.equal(result.compatibility_status, 'compatible');
  assert.equal(result.installed_version, '0.3.5');
  const room = result.checks.find((item) => item.check_id === 'room_reachability');
  assert.equal(room.status, 'skipped', 'PEERTABLE_URLが親環境にあってもadapterは空へ倒す');
});

test('peertableProductはCLI不在をmissing、schema不正をunverifiedへ落とす', async (t) => {
  const box = await sandbox(t);
  const previous = process.env.PATH;
  process.env.PATH = box.bin;
  t.after(() => { process.env.PATH = previous; });

  const missing = await peertableProduct({ cwd: box.root, now: '2026-08-10T00:00:00.000Z' });
  assert.equal(missing.presence_status, 'missing');
  assert.equal(missing.compatibility_status, 'unverified');

  await box.script('peertable-client', "echo 'not json'");
  const invalid = await peertableProduct({ cwd: box.root, now: '2026-08-10T00:00:00.000Z' });
  assert.equal(invalid.presence_status, 'unverified');
  assert.equal(invalid.checks[0].reason_code, 'native_schema_invalid');
});
