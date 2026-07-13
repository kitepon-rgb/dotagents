import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { projectServerManagerProbe, serverManagerNative } from '../../lib/factory/scan.mjs';
import { validateReport } from '../../lib/factory/contract.mjs';

const OBSERVED = '2026-07-13T00:00:00.000Z';
const IDS = ['database', 'schema', 'pull_poll', 'factory_ingest', 'factory_delivery', 'source_revision'];
const REVISION = '0123456789abcdef0123456789abcdef01234567';

function diagnostic(status = 'ready') {
  return {
    schema_version: 'dotagents.bughub-external-probe.v1',
    product_version: '0.1.0',
    source_revision: REVISION,
    status,
    reason_code: status === 'ready' ? 'ready' : 'readiness_failed',
    checks: IDS.map((id) => ({ id, status: 'pass', reason_code: id === 'source_revision' ? 'revision_match' : 'ready' })),
  };
}

test('external readyをinstalled/compatibleな固定6 checkへ写像する', () => {
  const product = projectServerManagerProbe({ ok: true }, diagnostic(), OBSERVED);
  assert.equal(product.presence_status, 'installed');
  assert.equal(product.installed_version, '0.1.0');
  assert.equal(product.source_revision, REVISION);
  assert.equal(product.compatibility_status, 'compatible');
  assert.deepEqual(product.checks.map(({ check_id: id, status }) => [id, status]), IDS.map((id) => [`readiness_${id}`, 'pass']));
  assert.equal(product.resolutions.length, 126);
  assert.ok(product.resolutions.every(({ resolved_at: at, reason_code: reason }) => at === OBSERVED && reason === 'readiness_recovered'));
});

test('external not_readyをcomponent別の固定fingerprintへ写像し、生値を出さない', () => {
  const value = diagnostic('not_ready');
  value.checks[0] = { id: 'database', status: 'fail', reason_code: 'query_failed' };
  const product = projectServerManagerProbe({ ok: false, stderr: '/home/kite/secret' }, value, OBSERVED);
  assert.equal(product.presence_status, 'installed');
  assert.equal(product.compatibility_status, 'incompatible');
  assert.deepEqual(product.checks[0], {
    check_id: 'readiness_database', status: 'fail', severity: 'fatal',
    fingerprint: createHash('sha256').update('servermanager:database:query_failed').digest('hex'),
    message_template: 'BugHub database readiness check failed', occurrence_count: 1,
    first_seen: OBSERVED, last_seen: OBSERVED, reason_code: 'query_failed',
  });
  assert.equal(product.resolutions.length, 125);
  assert.equal(product.resolutions.some(({ fingerprint }) => fingerprint === product.checks[0].fingerprint), false);
  assert.equal(JSON.stringify(product).includes('secret'), false);
});

test('unreachable・exit矛盾・field追加・check順序改ざんをunverifiedへ落とす', () => {
  const unreachable = projectServerManagerProbe({ ok: false }, {
    schema_version: 'dotagents.bughub-external-probe.v1', product_version: null,
    status: 'unverified', reason_code: 'unreachable', source_revision: null, checks: [],
  }, OBSERVED);
  assert.deepEqual(unreachable.checks, [{ check_id: 'external_readiness', status: 'unverified', reason_code: 'unreachable' }]);
  assert.deepEqual(unreachable.resolutions, []);

  for (const [result, mutate] of [
    [{ ok: false }, (value) => value],
    [{ ok: true }, (value) => { value.extra = true; return value; }],
    [{ ok: true }, (value) => { [value.checks[0], value.checks[1]] = [value.checks[1], value.checks[0]]; return value; }],
  ]) {
    const value = mutate(diagnostic());
    assert.equal(projectServerManagerProbe(result, value, OBSERVED).checks[0].reason_code, 'external_probe_invalid');
  }
});

test('revision理由をstrictに検証し、source_revision checkの失敗は既存規則でfingerprint化する', () => {
  const value = diagnostic('not_ready');
  value.checks[value.checks.length - 1] = { id: 'source_revision', status: 'fail', reason_code: 'revision_mismatch' };
  const product = projectServerManagerProbe({ ok: false }, value, OBSERVED);
  assert.equal(product.source_revision, REVISION);
  assert.deepEqual(product.checks.at(-1), {
    check_id: 'readiness_source_revision', status: 'fail', severity: 'high',
    fingerprint: createHash('sha256').update('servermanager:source_revision:revision_mismatch').digest('hex'),
    message_template: 'BugHub source_revision readiness check failed', occurrence_count: 1,
    first_seen: OBSERVED, last_seen: OBSERVED, reason_code: 'revision_mismatch',
  });
  assert.equal(product.resolutions.length, 125);
  for (const reason of ['revision_missing', 'revision_invalid']) {
    const candidate = diagnostic('not_ready');
    candidate.source_revision = null;
    candidate.checks[candidate.checks.length - 1] = { id: 'source_revision', status: 'fail', reason_code: reason };
    assert.equal(projectServerManagerProbe({ ok: false }, candidate, OBSERVED).checks.at(-1).reason_code, reason);
  }
});

test('外側runner timeoutはprobe内部5秒より長くしてunreachable出力を待つ', async () => {
  let invocation;
  const product = await serverManagerNative({ cwd: '/tmp' }, OBSERVED, async (command, args, options) => {
    invocation = { command, args, options };
    return {
      ok: false,
      stdout: JSON.stringify({
        schema_version: 'dotagents.bughub-external-probe.v1', product_version: null,
        status: 'unverified', reason_code: 'unreachable', source_revision: null, checks: [],
      }),
    };
  });
  assert.equal(invocation.command, 'bughub-external-probe');
  assert.deepEqual(invocation.args, ['--json']);
  assert.equal(invocation.options.timeoutMs, 7_000);
  assert.equal(product.checks[0].reason_code, 'unreachable');
});

test('healthy projectionを含むserver profile完全reportが共通contractを通る', () => {
  const servermanager = projectServerManagerProbe({ ok: true }, diagnostic(), OBSERVED);
  const empty = () => ({
    presence_status: 'not_applicable', contract_version: '1.0', checks: [], runtime_errors: [], resolutions: [],
  });
  const ids = ['caveat', 'throughline', 'spotter', 'codegraph', 'markitdown', 'oracle', 'aiterm-mcp', 'codex-sidecar'];
  const report = {
    schema_version: '1.0', report_id: '018f0000-0000-8000-8000-0000000000cc',
    host_id: 'main-server', host_profile: 'server', platform: { os: 'linux', arch: 'x64' }, report_mode: 'full',
    observed_at: OBSERVED, created_at: OBSERVED,
    reporter: { version: '1.0.0', dotagents_revision: '1234567' },
    products: { ...Object.fromEntries(ids.map((id) => [id, empty()])), servermanager },
  };
  assert.doesNotThrow(() => validateReport(report));
});
