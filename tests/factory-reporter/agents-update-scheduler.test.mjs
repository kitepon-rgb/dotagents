import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import test from 'node:test';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SCHEDULER = join(ROOT, 'bin', 'agents-update-scheduler.mjs');

test('Windows agents-update schedulerはdry-run既定で専用task・UTF-16 XML・rollbackを示す', async () => {
  const result = spawnSync(process.execPath, [SCHEDULER, 'install', '--sid', 'S-1-5-21-100-200-300-400'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.dry_run, true);
  assert.equal(value.task_name, 'dotagents-agents-update');
  assert.match(value.artifact_content, /encoding="UTF-16"/u);
  assert.match(value.artifact_content, /<LogonType>InteractiveToken<\/LogonType>/u);
  assert.match(value.artifact_content, /<UserId>S-1-5-21-100-200-300-400<\/UserId>/u);
  assert.match(value.artifact_content, /agents-update-schedule-runner/u);
  assert.match(value.rollback, /uninstall --apply/u);
  const source = await readFile(SCHEDULER, 'utf8');
  assert.match(source, /windowsTaskExists\(TASK_NAME\)/u);
  assert.match(source, /登録後の読み戻し/u);
  assert.match(source, /writeWindowsTaskXml/u);
  assert.doesNotMatch(source, /Start-ScheduledTask/u);
});

test('SIDはinstall dry-runだけが受理し、status/uninstallはSID照会なしで動く', () => {
  const status = spawnSync(process.execPath, [SCHEDULER, 'status'], { encoding: 'utf8' });
  assert.equal(status.status, 0, status.stderr);
  const apply = spawnSync(process.execPath, [SCHEDULER, 'install', '--apply', '--sid', 'S-1-5-21-100-200-300-400'], { encoding: 'utf8' });
  assert.equal(apply.status, 1); assert.match(apply.stderr, /install --dry-run専用/u);
  const noSid = spawnSync(process.execPath, [SCHEDULER, 'install'], { encoding: 'utf8' }); assert.equal(noSid.status, 1); assert.match(noSid.stderr, /--sidが必要/u);
  const statusSid = spawnSync(process.execPath, [SCHEDULER, 'status', '--sid', 'S-1-5-21-100-200-300-400'], { encoding: 'utf8' }); assert.equal(statusSid.status, 1); assert.match(statusSid.stderr, /install --dry-run専用/u);
  const uninstall = spawnSync(process.execPath, [SCHEDULER, 'uninstall'], { encoding: 'utf8' }); assert.equal(uninstall.status, 0, uninstall.stderr);
  const uninstallSid = spawnSync(process.execPath, [SCHEDULER, 'uninstall', '--sid', 'S-1-5-21-100-200-300-400'], { encoding: 'utf8' }); assert.equal(uninstallSid.status, 1); assert.match(uninstallSid.stderr, /install --dry-run専用/u);
});

test('fixture SIDは非Windows install dry-runだけを受理する', async () => {
  const { assertFixtureSidUsage } = await import('../../lib/factory/agents-update-scheduler-contract.mjs');
  const request = { sid: 'S-1-5-21-100-200-300-400', command: 'install', dryRun: true };
  assert.doesNotThrow(() => assertFixtureSidUsage({ ...request, os: 'darwin' }));
  assert.throws(() => assertFixtureSidUsage({ ...request, os: 'win32' }), /非Windows/u);
});

test('delivery receiptは未配送・古いreceipt・token不一致を拒否し、同一batchの受理だけ通す', async () => {
  const { assertDeliveryReceipt, DELIVERY_RECEIPT_SCHEMA } = await import('../../lib/factory/delivery-receipt.mjs');
  const token = '11111111-1111-4111-8111-111111111111'; const report = { schema_version: '7.0', report_id: 'new-report' };
  const valid = { schema: DELIVERY_RECEIPT_SCHEMA, report_id: 'new-report', batch_token: token };
  assert.throws(() => assertDeliveryReceipt({ report, priorReportId: 'old-report', receipt: null, batchToken: token }));
  assert.throws(() => assertDeliveryReceipt({ report, priorReportId: 'new-report', receipt: valid, batchToken: token }));
  assert.throws(() => assertDeliveryReceipt({ report, priorReportId: 'old-report', receipt: { ...valid, batch_token: '22222222-2222-4222-8222-222222222222' }, batchToken: token }));
  assert.equal(assertDeliveryReceipt({ report, priorReportId: 'old-report', receipt: valid, batchToken: token }), true);
});

test('scheduled runnerは実行ごとのbatch tokenと今回のv7 delivery receiptを必須にする', async () => {
  const source = await readFile(join(ROOT, 'bin', 'agents-update-schedule-runner.mjs'), 'utf8');
  assert.match(source, /randomUUID\(\)/u);
  assert.match(source, /FACTORY_REPORTER_RUNNER/u);
  assert.match(source, /agents-update end/u);
  assert.match(source, /latest-report\.json/u);
  assert.match(source, /delivery-receipt\.json/u);
  assert.match(source, /assertDeliveryReceipt\(/u);
  const scheduleRunner = await readFile(join(ROOT, 'bin', 'factory-reporter-v5-schedule-runner.mjs'), 'utf8');
  assert.match(scheduleRunner, /dotagents\.factory-delivery-receipt\.v1/u);
  assert.match(scheduleRunner, /await rename\(temporary, target\)/u);
});
