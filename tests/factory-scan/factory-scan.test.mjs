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
  'codex-sidecar-mcp', 'codegraph', 'markitdown', 'oracle',
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
  echo '${name} 1.2.3'
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
  echo 'oracle 1.2.3'
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
  await box.script('throughline', `
echo '{"schema":"throughline.native_factory_diagnostics.v1","version":"1.2.3","overall":{"status":"not_ready"},"databaseSchema":{"schema":"throughline.database.v8","status":"not_ready"},"raw":"/Users/kite/secret"}'`);
  await writeFile(box.config, JSON.stringify(validConfig()));

  const result = await runScanner(box);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(await readFile(box.output));
  const check = report.products.throughline.checks[0];
  assert.equal(check.status, 'fail');
  assert.equal(check.severity, 'high');
  assert.match(check.fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(report.products.throughline.compatibility_status, 'incompatible');
  assert.doesNotMatch(JSON.stringify(report), /Users|secret|raw/);
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
if [ "$1" = "--version" ]; then echo 'oracle 1.2.3'; else echo 'human status'; fi`);
  await box.script('codegraph', `
if [ "$1" = "--version" ]; then echo 'codegraph 1.2.3'; else exit 9; fi`);
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
if [ "$1" = "--version" ]; then echo 'oracle 1.2.3'; else echo '{"providers":[]}' && exit 1; fi`);
  await writeFile(box.config, JSON.stringify(validConfig()));

  const result = await runScanner(box);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(await readFile(box.output));
  assert.deepEqual(report.products.oracle.checks[0], {
    check_id: 'doctor', status: 'unverified', reason_code: 'provider_not_ready',
  });
  assert.doesNotMatch(JSON.stringify(report), /providers/);
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
