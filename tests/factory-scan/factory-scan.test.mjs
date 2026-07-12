import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import {
  chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { run as runCommand } from '../../lib/factory/command.mjs';
import { validateReport } from '../../lib/factory/contract.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const CLI = join(ROOT, 'bin', 'factory-scan.mjs');
const COMMANDS = [
  'caveat', 'throughline', 'spotter', 'aiterm-mcp',
  'codex-sidecar', 'codegraph', 'markitdown', 'oracle',
];

function validConfig(overrides = {}) {
  return {
    schema_version: '1.0',
    host: { id: 'test-host', profile: process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows-native' : 'server' },
    collection: { enabled: false },
    reporting: { enabled: false },
    ...overrides,
  };
}

async function sandbox(t) {
  const root = await mkdtemp(join(tmpdir(), 'factory-scan-'));
  const bin = join(root, 'bin');
  await mkdir(bin);
  t.after(() => rm(root, { recursive: true, force: true }));
  return {
    root,
    bin,
    config: join(root, 'config.json'),
    output: join(root, 'report.json'),
    async script(name, body) {
      const path = join(bin, name);
      await writeFile(path, `#!/bin/sh\n${body}`);
      await chmod(path, 0o755);
    },
  };
}

async function installHealthyCommands(box) {
  for (const name of COMMANDS) {
    await box.script(name, `
if [ "$1" = "--version" ]; then
  case "$0" in
    */codegraph) echo 'codegraph 1.4.0' ;;
    */markitdown) echo 'markitdown 0.1.0' ;;
    */oracle) echo 'oracle 0.16.0' ;;
    *) echo '${name} 1.2.3' ;;
  esac
elif [ "$1" = "status" ]; then
  echo '{"initialized":false}'
elif [ "$1" = "doctor" ]; then
  echo '{"healthy":true}'
else
  echo 'converted'
fi`);
  }
  await box.script('throughline', `
if [ "$1" = "--version" ]; then
  echo 'throughline 1.2.3'
elif [ "$1" = "factory-diagnostics" ] && [ "$2" = "--json" ]; then
  echo '{"schema":"throughline.native_factory_diagnostics.v1","version":"1.2.3","overall":{"status":"ready"},"databaseSchema":{"schema":"throughline.database.v8","status":"ready"}}'
else
  exit 2
fi`);
  await box.script('spotter', `
if [ "$1" = "--version" ]; then
  echo 'spotter 1.2.3'
elif [ "$1" = "diagnostics" ] && [ "$2" = "factory" ]; then
  echo '{"schema_version":"1.0","product":"spotter","version":"1.2.3","overall_status":"pass","marker_schema_version":"2"}'
else
  exit 2
fi`);
  await box.script('codex-sidecar', `
if [ "$1" = "factory-diagnostics" ] && [ "$2" = "--project" ] && [ "$3" = "${box.root}" ]; then
  echo '{"status":"ok","factoryReadiness":{"schemaVersion":"1","overall":"ready","packageVersions":{"status":"ready","packages":{"cli":"1.2.3","core":"1.2.3","mcp":"1.2.3"}}}}'
else
  exit 2
fi`);
  await box.script('aiterm-mcp', `
if [ "$1" = "--version" ]; then
  echo 'aiterm-mcp 1.2.3'
else
  cat >/dev/null
  echo '{"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"version":"1.2.3"}}}'
  echo '{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"{\\"diagnostic_schema\\":\\"aiterm-mcp.factory-diagnostics.v1\\",\\"version\\":\\"1.2.3\\",\\"overall\\":\\"ready\\"}"}]}}'
fi`);
}

function runScanner(box) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [
      CLI, '--config', box.config, '--output', box.output, '--cwd', box.root,
    ], {
      env: { ...process.env, PATH: `${box.bin}:${process.env.PATH}` },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => done({ code, stdout, stderr }));
  });
}

test('公開CLIだけで固定9製品のreportを生成し、shared contractを通す', async (t) => {
  const box = await sandbox(t);
  await installHealthyCommands(box);
  await box.script('oracle', `
if [ "$1" = "--version" ]; then
  echo 'oracle 0.16.0'
elif [ "$1" = "doctor" ] && [ "$2" = "--providers" ] && [ "$3" = "--json" ]; then
  echo '{"healthy":true}'
else
  exit 2
fi`);
  await writeFile(box.config, JSON.stringify(validConfig()));

  const result = await runScanner(box);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(await readFile(box.output));
  assert.doesNotThrow(() => validateReport(report));
  assert.equal(Object.keys(report.products).length, 9);
  assert.equal(report.products.codegraph.checks[0].reason_code, 'not_indexed');
  assert.equal(report.products.markitdown.checks[0].status, 'pass');
  assert.equal(report.products.oracle.checks[0].status, 'pass');
  assert.equal(report.products.throughline.checks[0].status, 'pass');
  assert.equal(report.products.throughline.migration_status, 'current');
  assert.equal(report.products.spotter.checks[0].status, 'pass');
  assert.equal(report.products.spotter.state_schema_version, '2');
  assert.equal(report.products['aiterm-mcp'].checks[0].status, 'pass');
  assert.equal(report.products['codex-sidecar'].installed_version, '1.2.3');
  assert.equal(report.products['codex-sidecar'].checks[0].status, 'pass');
  assert.equal(report.products['codex-sidecar'].compatibility_status, 'compatible');
  assert.equal(report.products.servermanager.presence_status, 'not_applicable');
  assert.equal(
    report.reporter.dotagents_revision,
    execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  );
  assert.equal((await stat(box.output)).mode & 0o777, 0o600);
});

test('native diagnosticsの既知not_readyを固定fingerprintのfailへ写像し、生値を出さない', async (t) => {
  const box = await sandbox(t);
  await installHealthyCommands(box);
  await box.script('codex-sidecar', `
echo '{"status":"failed","factoryReadiness":{"schemaVersion":"1","overall":"not_ready","packageVersions":{"status":"ready","packages":{"cli":"1.2.3","core":"1.2.3","mcp":"1.2.3"}},"raw":"/Users/kite/secret","preset":"private-preset"}}'
exit 1`);
  await writeFile(box.config, JSON.stringify(validConfig()));

  const result = await runScanner(box);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(await readFile(box.output));
  const check = report.products['codex-sidecar'].checks[0];
  assert.equal(check.status, 'fail');
  assert.equal(check.severity, 'high');
  assert.equal(check.fingerprint, '3a8158a0c08f294e83f725fb53ab71755c1be5e13567a2cb0dfb229aa2a8a034');
  assert.equal(report.products['codex-sidecar'].compatibility_status, 'incompatible');
  assert.equal(report.products['codex-sidecar'].installed_version, '1.2.3');
  assert.doesNotMatch(JSON.stringify(report), /Users|secret|raw|private-preset/);
});

test('codex-sidecarのschema不正とunverifiedはgreenへ丸めずunverifiedにする', async (t) => {
  const box = await sandbox(t);
  await installHealthyCommands(box);
  await box.script('codex-sidecar', `
echo '{"status":"ok","factoryReadiness":{"schemaVersion":"2","overall":"ready","packageVersions":{"packages":{"cli":"1.2.3","core":"1.2.3","mcp":"1.2.3"}}}}'`);
  await writeFile(box.config, JSON.stringify(validConfig()));

  const result = await runScanner(box);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(await readFile(box.output));
  assert.equal(report.products['codex-sidecar'].presence_status, 'unverified');
  assert.deepEqual(report.products['codex-sidecar'].checks, [{
    check_id: 'native_diagnostics', status: 'unverified', reason_code: 'native_schema_invalid',
  }]);
  assert.equal(report.products['codex-sidecar'].compatibility_status, undefined);
});

test('codex-sidecar package version不整合はfixed fail/incompatibleへ写像する', async (t) => {
  const box = await sandbox(t);
  await installHealthyCommands(box);
  await box.script('codex-sidecar', `
echo '{"status":"failed","factoryReadiness":{"schemaVersion":"1","overall":"not_ready","packageVersions":{"status":"not_ready","packages":{"cli":"1.2.3","core":"1.2.4","mcp":"1.2.3"}}}}'
exit 1`);
  await writeFile(box.config, JSON.stringify(validConfig()));

  const result = await runScanner(box);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(await readFile(box.output));
  assert.equal(report.products['codex-sidecar'].presence_status, 'unverified');
  assert.equal(report.products['codex-sidecar'].compatibility_status, 'incompatible');
  assert.equal(report.products['codex-sidecar'].checks[0].status, 'fail');
  assert.equal(report.products['codex-sidecar'].installed_version, undefined);
});

test('codex-sidecar native unverifiedはinstalledや生出力をreportへ転記しない', async (t) => {
  const box = await sandbox(t);
  await installHealthyCommands(box);
  await box.script('codex-sidecar', `
echo '{"status":"failed","factoryReadiness":{"schemaVersion":"1","overall":"unverified","prompt":"Bearer private-token","projectRoot":"/Users/kite/private"}}'
exit 1`);
  await writeFile(box.config, JSON.stringify(validConfig()));

  const result = await runScanner(box);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(await readFile(box.output));
  assert.equal(report.products['codex-sidecar'].presence_status, 'unverified');
  assert.equal(report.products['codex-sidecar'].installed_version, undefined);
  assert.equal(report.products['codex-sidecar'].compatibility_status, 'unverified');
  assert.deepEqual(report.products['codex-sidecar'].checks, [{
    check_id: 'native_diagnostics', status: 'unverified',
  }]);
  assert.doesNotMatch(JSON.stringify(report), /Bearer|private-token|\/Users|projectRoot|prompt/);
});

test('codex-sidecarのtop/overallとexit statusの矛盾はunverifiedにする', async (t) => {
  for (const [name, body] of [
    ['top_overall', 'echo \'{"status":"ok","factoryReadiness":{"schemaVersion":"1","overall":"not_ready","packageVersions":{"status":"not_ready","packages":{"cli":"1.2.3","core":"1.2.4","mcp":"1.2.3"}}}}\''],
    ['exit_status', 'echo \'{"status":"failed","factoryReadiness":{"schemaVersion":"1","overall":"not_ready","packageVersions":{"status":"not_ready","packages":{"cli":"1.2.3","core":"1.2.4","mcp":"1.2.3"}}}}\''],
  ]) {
    const box = await sandbox(t);
    await installHealthyCommands(box);
    await box.script('codex-sidecar', body);
    await writeFile(box.config, JSON.stringify(validConfig()));
    const result = await runScanner(box);
    assert.equal(result.code, 0, `${name}: ${result.stderr}`);
    const report = JSON.parse(await readFile(box.output));
    assert.deepEqual(report.products['codex-sidecar'].checks, [{
      check_id: 'native_diagnostics', status: 'unverified', reason_code: 'native_schema_invalid',
    }]);
  }
});

test('不正host idと未知config fieldを同じ共有契約で拒否する', async (t) => {
  const box = await sandbox(t);
  await installHealthyCommands(box);
  const invalid = validConfig({ host: { id: '/Users/kite/secret', profile: validConfig().host.profile } });
  invalid.unknown = true;
  await writeFile(box.config, JSON.stringify(invalid));

  const result = await runScanner(box);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /設定shapeが不正/);
  await assert.rejects(readFile(box.output), { code: 'ENOENT' });
});

test('host profileと実platformの不一致をreport生成前に拒否する', async (t) => {
  const box = await sandbox(t);
  await installHealthyCommands(box);
  const mismatch = process.platform === 'darwin' ? 'server' : 'mac';
  await writeFile(box.config, JSON.stringify(validConfig({ host: { id: 'test-host', profile: mismatch } })));

  const result = await runScanner(box);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /実行platformが不一致/);
});

test('悪意あるversion出力・Oracle人間向け出力・Codegraph失敗をgreenへ丸めない', async (t) => {
  const box = await sandbox(t);
  await installHealthyCommands(box);
  await box.script('caveat', "echo 'Bearer top-secret /Users/kite/private'");
  await box.script('oracle', `
if [ "$1" = "--version" ]; then echo 'oracle 0.16.0'; else echo 'human status'; fi`);
  await box.script('codegraph', `
if [ "$1" = "--version" ]; then echo 'codegraph 1.4.0'; else exit 9; fi`);
  await writeFile(box.config, JSON.stringify(validConfig()));

  const result = await runScanner(box);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(await readFile(box.output));
  assert.equal(report.products.caveat.presence_status, 'unverified');
  assert.equal(report.products.codegraph.checks[0].status, 'unverified');
  assert.equal(report.products.codegraph.checks[0].reason_code, undefined);
  assert.equal(report.products.oracle.checks[0].status, 'unverified');
  assert.doesNotMatch(JSON.stringify(report), /top-secret|\/Users\/kite|human status/);
});

test('Oracleの機械可読なprovider未準備はpassにせず理由付きunverifiedにする', async (t) => {
  const box = await sandbox(t);
  await installHealthyCommands(box);
  await box.script('oracle', `
if [ "$1" = "--version" ]; then echo 'oracle 0.16.0'; else echo '{"providers":[]}' && exit 1; fi`);
  await writeFile(box.config, JSON.stringify(validConfig()));

  const result = await runScanner(box);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(await readFile(box.output));
  assert.deepEqual(report.products.oracle.checks[0], {
    check_id: 'doctor', status: 'unverified', reason_code: 'provider_not_ready',
  });
  assert.doesNotMatch(JSON.stringify(report), /providers/);
});

test('第三者adapterは対応範囲外またはversion不明で診断を実行しない', async (t) => {
  const products = [
    { id: 'codegraph', checkId: 'index', supported: '1.4.0+build.7', known: '1.4.1', drift: '1.5.0', prerelease: '1.4.0-rc.1' },
    { id: 'markitdown', checkId: 'local_fixture', supported: '0.1.0+build.7', known: 'markitdown 0.1.5', drift: '0.2.0', prerelease: '0.1.0-rc.1' },
    { id: 'oracle', checkId: 'doctor', supported: '0.16.0+build.7', known: '0.16.0', drift: '0.17.0', prerelease: '0.16.0-rc.1' },
  ];
  for (const product of products) {
    for (const [name, stdout, expected] of [
      ['supported_boundary', `${product.id} ${product.supported}`, { presence: 'installed', status: 'pass' }],
      ['known_stdout', product.known, { presence: 'installed', status: 'pass' }],
      ['prefixed_v', `${product.id} v${product.supported}`, { presence: 'installed', status: 'pass' }],
      ['next_minor', `${product.id} ${product.drift}`, { presence: 'installed', status: 'unsupported', reason: 'upstream_version_unsupported' }],
      ['prerelease', `${product.id} ${product.prerelease}`, { presence: 'installed', status: 'unsupported', reason: 'upstream_version_unsupported' }],
      ['unknown', 'version format drift', { presence: 'unverified', status: 'unverified', reason: 'version_unverified' }],
      ['multiple_versions', `dependency ${product.supported} actual ${product.drift}`, { presence: 'unverified', status: 'unverified', reason: 'version_unverified' }],
      ['warning', `warning ${product.supported}`, { presence: 'unverified', status: 'unverified', reason: 'version_unverified' }],
    ]) {
      const box = await sandbox(t);
      await installHealthyCommands(box);
      const calls = join(box.root, `${product.id}-${name}.calls`);
      await box.script(product.id, `
if [ "$1" = "--version" ]; then
  echo '${stdout}'
else
  echo diagnostic >> '${calls}'
  ${product.id === 'codegraph' ? "echo '{\"initialized\":true}'" : product.id === 'oracle' ? "echo '{\"healthy\":true}'" : "echo 'converted'"}
fi`);
      await writeFile(box.config, JSON.stringify(validConfig()));

      const result = await runScanner(box);
      assert.equal(result.code, 0, `${product.id}/${name}: ${result.stderr}`);
      const report = JSON.parse(await readFile(box.output));
      const observed = report.products[product.id];
      assert.equal(observed.presence_status, expected.presence, `${product.id}/${name}`);
      assert.deepEqual(observed.checks, [{
        check_id: product.checkId, status: expected.status,
        ...(expected.reason ? { reason_code: expected.reason } : {}),
      }], `${product.id}/${name}`);
      if (expected.status === 'pass') {
        assert.equal((await readFile(calls, 'utf8')).trim(), 'diagnostic');
      } else {
        await assert.rejects(readFile(calls), { code: 'ENOENT' });
      }
    }
  }
});

test('command出力上限とtimeoutは固定reasonで失敗し、生出力を返さない', async (t) => {
  const box = await sandbox(t);
  await box.script('noisy', 'while :; do echo x; done');
  await box.script('slow', 'while :; do :; done');
  const env = { ...process.env, PATH: `${box.bin}:${process.env.PATH}` };

  const noisy = await runCommand('noisy', [], { env, maxOutputBytes: 128, timeoutMs: 1000 });
  assert.deepEqual({ reason: noisy.reason, stdout: noisy.stdout, stderr: noisy.stderr }, {
    reason: 'output_limit', stdout: '', stderr: '',
  });
  const slow = await runCommand('slow', [], { env, timeoutMs: 50 });
  assert.deepEqual({ reason: slow.reason, stdout: slow.stdout, stderr: slow.stderr }, {
    reason: 'timeout', stdout: '', stderr: '',
  });
});

test('rename失敗時に一時reportを残さない', async (t) => {
  const box = await sandbox(t);
  await installHealthyCommands(box);
  await writeFile(box.config, JSON.stringify(validConfig()));
  await mkdir(box.output);

  const result = await runScanner(box);
  assert.notEqual(result.code, 0);
  const names = await readdir(box.root);
  assert.equal(names.some((name) => name.startsWith('report.json.') && name.endsWith('.tmp')), false);
});
