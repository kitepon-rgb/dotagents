import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import {
  chmod, mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { after, test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '..', '..');
const REPORTER = join(ROOT, 'bin', 'factory-reporter.mjs');
const SCANNER = join(ROOT, 'bin', 'factory-scan.mjs');
const REPORT_ID = '018f0000-0000-8000-8000-0000000000aa';
const PRODUCT_IDS = [
  'caveat', 'throughline', 'spotter', 'codegraph', 'markitdown',
  'oracle', 'aiterm-mcp', 'codex-sidecar', 'servermanager',
];
const roots = [];

function report() {
  return {
    schema_version: '1.0', report_id: REPORT_ID, host_id: 'test-host', host_profile: 'mac',
    platform: { os: 'darwin', arch: 'arm64' }, report_mode: 'full',
    observed_at: '2026-07-13T00:00:00Z', created_at: '2026-07-13T00:00:01Z',
    reporter: { version: '1.0.0', dotagents_revision: '1234567' },
    products: Object.fromEntries(PRODUCT_IDS.map((id) => [id, {
      presence_status: 'missing', contract_version: '1.0', checks: [], runtime_errors: [], resolutions: [],
    }])),
  };
}

function acknowledgements() {
  return [
    { product: 'caveat', cursor: 6, command: 'caveat', args: ['runtime-errors', 'ack', '6', '--json'] },
    { product: 'throughline', cursor: 7, command: 'throughline', args: ['runtime-errors', 'ack', '7', '--json'] },
    { product: 'spotter', cursor: 8, command: 'spotter', args: ['diagnostics', 'runtime-errors', 'ack', '8'] },
    { product: 'aiterm-mcp', cursor: 9, command: 'aiterm-runtime-errors', args: ['ack', '--cursor', '9'] },
    { product: 'codex-sidecar', cursor: 10, command: 'codex-sidecar', args: ['factory-errors', '--action', 'ack', '--cursor', '10'] },
    { product: 'servermanager', cursor: 11, command: 'factory-external-event', args: ['ack', '--cursor', '11', '--json'] },
  ];
}

function metadata(overrides = {}) {
  return { schema_version: '1.0', report_id: REPORT_ID, acknowledgements: acknowledgements(), ...overrides };
}

async function sandbox() {
  const root = await mkdtemp(join(tmpdir(), 'factory-runtime-ack-'));
  roots.push(root);
  const box = {
    root,
    state: join(root, 'state'),
    bin: join(root, 'bin'),
    report: join(root, 'report.json'),
    ack: join(root, 'acks.json'),
    config: join(root, 'config.json'),
    credential: join(root, 'credential'),
    ackLog: join(root, 'ack.log'),
    failMarker: join(root, 'fail-once.marker'),
  };
  await mkdir(box.bin);
  await writeFile(box.report, JSON.stringify(report()));
  await writeFile(box.ack, JSON.stringify(metadata()));
  await writeFile(box.credential, 'unit-test-token\n', { mode: 0o600 });
  return box;
}

function stateDir(box) { return join(box.state, 'dotagents', 'factory-reporter'); }
function outboxDir(box) { return join(stateDir(box), 'outbox'); }
function reportEntry(box) { return join(outboxDir(box), `${REPORT_ID}.json`); }

async function queuedEnvelope(box) {
  const value = JSON.parse(await readFile(reportEntry(box), 'utf8'));
  return {
    value,
    reportBytes: Buffer.from(value.report_base64, 'base64'),
  };
}

async function writeConfig(box, endpoint) {
  await writeFile(box.config, JSON.stringify({
    schema_version: '1.0', host: { id: 'test-host', profile: 'mac' }, collection: { enabled: true },
    reporting: { enabled: true, endpoint, credential_file: box.credential },
  }));
}

async function installAckCommands(box, { failOnce = null } = {}) {
  for (const command of ['caveat', 'throughline', 'spotter', 'aiterm-runtime-errors', 'codex-sidecar', 'factory-external-event']) {
    const path = join(box.bin, command);
    const failure = command === failOnce
      ? `if [ ! -e "$ACK_FAIL_MARKER" ]; then : > "$ACK_FAIL_MARKER"; exit 17; fi`
      : '';
    const response = {
      caveat: `n="$3"; printf '{"schema":"caveat.runtime_errors.v1","product":"caveat","version":"1.2.3","state_schema_version":"1.0","cursor":{"high_watermark":%s,"acknowledged_through":%s,"next":0},"runtime_errors":[],"resolutions":[],"diagnostics":{"collection":"enabled","status":"ready","total_count":0,"pending_count":0,"truncated":false}}\\n' "$n" "$n"`,
      throughline: `n="$3"; printf '{"status":"acknowledged","acknowledgedThrough":%s}\\n' "$n"`,
      spotter: `n="$4"; printf '{"acknowledged":true,"acknowledged_through":%s}\\n' "$n"`,
      'aiterm-runtime-errors': `n="$3"; printf '{"ok":true,"command":"ack","snapshot":{"collection":"enabled","schema_version":"aiterm-mcp.runtime-errors.v1","cursor":%s,"acknowledged_cursor":%s,"records":[]}}\\n' "$n" "$n"`,
      'codex-sidecar': `n="$5"; printf '{"status":"ok","action":"ack","cursor":%s}\\n' "$n"`,
      'factory-external-event': `n="$3"; printf '{"ok":true,"acknowledged_through":%s}\\n' "$n"`,
    }[command];
    await writeFile(path, `#!/bin/sh
name="${'$'}{ACK_COMMAND_NAME:-${'$'}{0##*/}}"
printf '%s %s\n' "${'$'}name" "${'$'}*" >> "$ACK_LOG"
${failure}
${response}
exit 0
`);
    await chmod(path, 0o755);
    await installWindowsCommandWrapper(path);
  }
}

async function installWindowsCommandWrapper(path) {
  if (process.platform !== 'win32') return;
  const name = basename(path);
  const packageDir = join(dirname(path), 'node_modules', 'factory-test-fixtures');
  await mkdir(packageDir, { recursive: true });
  await writeFile(join(packageDir, `${name}.mjs`), `
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
const env = { ...process.env };
env.ACK_COMMAND_NAME = '${name}';
for (const key of ['ACK_LOG', 'ACK_FAIL_MARKER']) {
  env[key] = env[key]?.replace(/^([A-Za-z]):[\\\\/]/u, (_, drive) => \`/\${drive.toLowerCase()}/\`).replaceAll('\\\\', '/');
}
const result = spawnSync(join(process.env.ProgramFiles, 'Git', 'bin', 'sh.exe'), [resolve(import.meta.dirname, '..', '..', '${name}'), ...process.argv.slice(2)], { env, stdio: 'inherit' });
process.exit(result.status ?? 1);
`);
  await writeFile(`${path}.cmd`, `@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\n\r\nIF EXIST "%dp0%\\node.exe" (\r\n  SET "_prog=%dp0%\\node.exe"\r\n) ELSE (\r\n  SET "_prog=node"\r\n  SET PATHEXT=%PATHEXT:;.JS;=;%\r\n)\r\n\r\nendLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\node_modules\\factory-test-fixtures\\${name}.mjs" %*\r\n`);
}

async function script(box, name, body) {
  const path = join(box.bin, name);
  await writeFile(path, `#!/bin/sh\n${body}\n`);
  await chmod(path, 0o755);
  await installWindowsCommandWrapper(path);
}

async function installScannerCommands(box) {
  await script(box, 'caveat', `
if [ "$1" = "factory-diagnostics" ]; then
  echo '{"schema":"caveat.native_factory_diagnostics.v1","product":"caveat","version":"1.2.3","overall":{"status":"ready"},"database":{"status":"ready","reason_code":"current","schema_version":3,"supported_schema_version":3,"migration_status":"current"},"sync":{"status":"ready","reason_code":"synchronized"},"connectors":{"claude":{"status":"ready","mcp":{"status":"ready","reason_code":"configured"},"hooks":{"user_prompt_submit":{"status":"ready","reason_code":"configured"},"post_tool_use":{"status":"ready","reason_code":"configured"},"post_tool_use_failure":{"status":"ready","reason_code":"configured"},"stop":{"status":"ready","reason_code":"configured"}}},"codex":{"status":"ready","hooks":{"user_prompt_submit":{"status":"ready","reason_code":"configured"},"post_tool_use":{"status":"ready","reason_code":"configured"},"stop":{"status":"ready","reason_code":"configured"}}}}}'
elif [ "$1" = "runtime-errors" ]; then
  echo '{"schema":"caveat.runtime_errors.v1","product":"caveat","version":"1.2.3","state_schema_version":"1.0","cursor":{"high_watermark":0,"acknowledged_through":0,"next":0},"runtime_errors":[],"resolutions":[],"diagnostics":{"collection":"enabled","status":"ready","total_count":0,"pending_count":0,"truncated":false}}'
else exit 2; fi`);
  await script(box, 'codegraph', `if [ "$1" = "--version" ]; then echo 'codegraph 1.4.0'; else echo '{"initialized":false}'; fi`);
  await script(box, 'markitdown', `if [ "$1" = "--version" ]; then echo 'markitdown 0.1.0'; else echo 'converted'; fi`);
  await script(box, 'oracle', `if [ "$1" = "--version" ]; then echo 'oracle 0.16.0'; else echo '{"healthy":true}'; fi`);
  await script(box, 'throughline', `
if [ "$1" = "factory-diagnostics" ]; then
  echo '{"schema":"throughline.native_factory_diagnostics.v1","version":"1.2.3","overall":{"status":"ready"},"databaseSchema":{"schema":"8","status":"ready"}}'
elif [ "$1" = "runtime-errors" ]; then
  echo '{"schema":"throughline.runtime_errors.v1","product":"throughline","version":"1.2.3","state_schema_version":"1.0","cursor":{"high_watermark":0,"acknowledged_through":0,"next":0},"runtime_errors":[],"resolutions":[],"diagnostics":{"collection":"enabled","status":"ready","total_count":0,"pending_count":0,"truncated":false}}'
else exit 2; fi`);
  await script(box, 'spotter', `
if [ "$1" = "diagnostics" ] && [ "$2" = "factory" ]; then
  echo '{"schema_version":"1.0","product":"spotter","version":"1.2.3","overall_status":"pass","marker_schema_version":"2"}'
elif [ "$1" = "diagnostics" ] && [ "$2" = "runtime-errors" ]; then
  echo '{"schema":"spotter.runtime_errors.v1","collection":"enabled","records":[],"after_cursor":0,"next_cursor":0,"latest_sequence":0,"acknowledged_through":0,"has_more":false}'
else exit 2; fi`);
  await script(box, 'aiterm-mcp', `
cat >/dev/null
echo '{"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"version":"1.2.3"}}}'
echo '{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"{\\"diagnostic_schema\\":\\"aiterm-mcp.factory-diagnostics.v1\\",\\"version\\":\\"1.2.3\\",\\"overall\\":\\"ready\\"}"}]}}'`);
  await script(box, 'aiterm-runtime-errors', `echo '{"ok":true,"command":"snapshot","snapshot":{"collection":"enabled","schema_version":"aiterm-mcp.runtime-errors.v1","cursor":0,"acknowledged_cursor":0,"records":[]}}'`);
  await script(box, 'codex-sidecar', `
if [ "$1" = "factory-diagnostics" ]; then
  echo '{"status":"ok","factoryReadiness":{"schemaVersion":"1","overall":"ready","packageVersions":{"status":"ready","packages":{"cli":"1.2.3","core":"1.2.3","mcp":"1.2.3"}}}}'
elif [ "$1" = "factory-errors" ]; then
  echo '{"status":"ok","factoryRuntimeErrors":{"schema_version":"2","cursor":0,"acknowledged_through":0,"records":[]}}'
else exit 2; fi`);
  await script(box, 'bughub-external-probe', `echo '{"schema_version":"dotagents.bughub-external-probe.v1","product_version":"0.1.0","source_revision":"0123456789abcdef0123456789abcdef01234567","status":"ready","reason_code":"ready","checks":[{"id":"database","status":"pass","reason_code":"ready"},{"id":"schema","status":"pass","reason_code":"ready"},{"id":"pull_poll","status":"pass","reason_code":"ready"},{"id":"factory_ingest","status":"pass","reason_code":"ready"},{"id":"factory_delivery","status":"pass","reason_code":"ready"},{"id":"source_revision","status":"pass","reason_code":"revision_match"}]}'`);
  await script(box, 'factory-external-event', `echo '{"schema":"dotagents.external-events.v1","cursor":{"high_watermark":0,"acknowledged_through":0,"next":0},"events":[]}'`);
}

function runReporter(box, args) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [REPORTER, ...args], {
      env: {
        ...process.env,
        XDG_STATE_HOME: box.state,
        ...(process.platform === 'win32' ? { LOCALAPPDATA: box.state } : {}),
        PATH: `${box.bin}${delimiter}${process.env.PATH}`,
        ACK_LOG: box.ackLog,
        ACK_FAIL_MARKER: box.failMarker,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => done({
      code, stdout, stderr,
      json: stdout.trim() ? JSON.parse(stdout) : null,
    }));
  });
}

async function enqueue(box) {
  return runReporter(box, [
    'enqueue', '--report', box.report, '--ack-metadata', box.ack, '--config', box.config,
  ]);
}

async function flush(box) {
  return runReporter(box, ['flush', '--config', box.config]);
}

async function startServer(handler) {
  const received = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received.push(Buffer.concat(chunks));
    await handler(req, res, received.length);
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return {
    received,
    endpoint: `http://127.0.0.1:${server.address().port}/api/factory/v1/reports`,
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  };
}

function accepted(res, { reportId = REPORT_ID, duplicate = false } = {}) {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ accepted: true, duplicate, report_id: reportId }));
}

async function absent(path) {
  await assert.rejects(readFile(path), { code: 'ENOENT' });
}

after(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true });
});

test('factory-scan --ack-outputはreport_id一致sidecarを生成し、report payloadへack metadataを混入させない', async () => {
  const box = await sandbox();
  await installScannerCommands(box);
  const profile = process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows-native' : 'server';
  await writeFile(box.config, JSON.stringify({
    schema_version: '1.0', host: { id: 'test-host', profile }, collection: { enabled: true }, reporting: { enabled: false },
  }));
  const result = await new Promise((done) => {
    const child = spawn(process.execPath, [
      SCANNER, '--config', box.config, '--output', box.report, '--ack-output', box.ack, '--cwd', box.root,
    ], { env: { ...process.env, PATH: `${box.bin}${delimiter}${process.env.PATH}` }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => done({ code, stderr }));
  });
  assert.equal(result.code, 0, result.stderr);
  const generatedReport = JSON.parse(await readFile(box.report, 'utf8'));
  const generatedMetadata = JSON.parse(await readFile(box.ack, 'utf8'));
  assert.equal(generatedMetadata.report_id, generatedReport.report_id);
  assert.equal(generatedMetadata.schema_version, '1.0');
  const expectedProducts = [
    'caveat', 'throughline', 'spotter', 'aiterm-mcp', 'codex-sidecar',
  ];
  if (profile === 'server') expectedProducts.push('servermanager');
  assert.deepEqual(generatedMetadata.acknowledgements.map(({ product }) => product), expectedProducts);
  assert.equal(JSON.stringify(generatedReport).includes('acknowledgement'), false);
  if (process.platform !== 'win32') assert.equal((await stat(box.ack)).mode & 0o777, 0o600);
});

test('enqueueはreportとack metadataを単一private envelopeへatomic保存し、受理前には実行しない', async (t) => {
  if (process.platform === 'win32') return t.skip('POSIX mode assertion');
  const box = await sandbox();
  const server = await startServer(() => assert.fail('enqueue must not send'));
  t.after(server.close);
  await writeConfig(box, server.endpoint);
  await installAckCommands(box);

  const result = await enqueue(box);
  assert.equal(result.code, 0, result.stderr);
  const queued = await queuedEnvelope(box);
  assert.equal(queued.value.schema_version, 'dotagents.factory-outbox.v1');
  assert.equal(queued.value.report_id, REPORT_ID);
  assert.deepEqual(JSON.parse(queued.reportBytes), report());
  assert.deepEqual(queued.value.acknowledgements, metadata());
  assert.equal((await stat(outboxDir(box))).mode & 0o777, 0o700);
  assert.equal((await stat(reportEntry(box))).mode & 0o777, 0o600);
  assert.deepEqual((await readdir(outboxDir(box))).filter((name) => name.includes('.tmp')), []);
  assert.equal(server.received.length, 0);
  await absent(box.ackLog);
});

test('BugHubが同じreport_idをacceptedした後だけ固定6コマンドをackし、全成功後にenvelopeを削除する', async (t) => {
  const box = await sandbox();
  const server = await startServer((req, res) => accepted(res));
  t.after(server.close);
  await writeConfig(box, server.endpoint);
  await installAckCommands(box);
  assert.equal((await enqueue(box)).code, 0);
  await absent(box.ackLog);

  const result = await flush(box);
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual((await readFile(box.ackLog, 'utf8')).trim().split('\n'), [
    'caveat runtime-errors ack 6 --json',
    'throughline runtime-errors ack 7 --json',
    'spotter diagnostics runtime-errors ack 8',
    'aiterm-runtime-errors ack --cursor 9',
    'codex-sidecar factory-errors --action ack --cursor 10',
    'factory-external-event ack --cursor 11 --json',
  ]);
  await absent(reportEntry(box));
  assert.equal(server.received.length, 1);
  assert.deepEqual(JSON.parse(server.received[0]), report());
  assert.doesNotMatch(server.received[0].toString('utf8'), /acknowledgements|runtime-errors.*ack/);
});

test('未受理・HTTP失敗・report_id不一致ではackを一度も実行せずenvelopeを保持する', async (t) => {
  for (const [name, handler] of [
    ['http-500', (req, res) => { res.statusCode = 500; res.end('{}'); }],
    ['wrong-report-id', (req, res) => accepted(res, { reportId: '018f0000-0000-8000-8000-0000000000bb' })],
  ]) {
    const box = await sandbox();
    const server = await startServer(handler);
    t.after(server.close);
    await writeConfig(box, server.endpoint);
    await installAckCommands(box);
    assert.equal((await enqueue(box)).code, 0, name);
    await flush(box);
    await absent(box.ackLog);
    const queued = await queuedEnvelope(box);
    assert.deepEqual(JSON.parse(queued.reportBytes), report(), name);
    assert.deepEqual(queued.value.acknowledgements, metadata(), name);
  }
});

test('ack途中失敗は非0でenvelopeを保持し、duplicate再受理後に再試行して全成功時だけ削除する', async (t) => {
  const box = await sandbox();
  let requestCount = 0;
  const server = await startServer((req, res) => accepted(res, { duplicate: requestCount++ > 0 }));
  t.after(server.close);
  await writeConfig(box, server.endpoint);
  await installAckCommands(box, { failOnce: 'caveat' });
  assert.equal((await enqueue(box)).code, 0);

  const failed = await flush(box);
  assert.equal(failed.code, 1, failed.stderr);
  assert.equal(failed.json.ok, false);
  assert.equal(failed.json.ack_failed, 1);
  assert.deepEqual(failed.json.ack_failed_products, ['caveat']);
  const queued = await queuedEnvelope(box);
  assert.deepEqual(JSON.parse(queued.reportBytes), report());
  assert.deepEqual(queued.value.acknowledgements, metadata());
  assert.deepEqual((await readFile(box.ackLog, 'utf8')).trim().split('\n'), [
    'caveat runtime-errors ack 6 --json',
  ]);

  const retried = await flush(box);
  assert.equal(retried.code, 0, retried.stderr);
  assert.equal(server.received.length, 2);
  await absent(reportEntry(box));
  assert.deepEqual((await readFile(box.ackLog, 'utf8')).trim().split('\n').slice(-6), [
    'caveat runtime-errors ack 6 --json',
    'throughline runtime-errors ack 7 --json',
    'spotter diagnostics runtime-errors ack 8',
    'aiterm-runtime-errors ack --cursor 9',
    'codex-sidecar factory-errors --action ack --cursor 10',
    'factory-external-event ack --cursor 11 --json',
  ]);
});

test('malformed metadata・report_id不一致・任意command/args injectionをenqueue前に拒否する', async (t) => {
  const mutations = [
    ['report-id', (value) => { value.report_id = '018f0000-0000-8000-8000-0000000000bb'; }],
    ['top-extra', (value) => { value.extra = true; }],
    ['item-extra', (value) => { value.acknowledgements[0].path = '/Users/private'; }],
    ['command', (value) => { value.acknowledgements[0].command = 'sh'; }],
    ['args', (value) => { value.acknowledgements[0].args = ['-c', 'touch /tmp/injected']; }],
    ['cursor-args', (value) => { value.acknowledgements[0].cursor = 99; }],
    ['duplicate-product', (value) => { value.acknowledgements.push(structuredClone(value.acknowledgements[0])); }],
  ];
  for (const [name, mutate] of mutations) {
    const box = await sandbox();
    const server = await startServer(() => assert.fail('invalid metadata must not send'));
    t.after(server.close);
    await writeConfig(box, server.endpoint);
    const invalid = metadata();
    mutate(invalid);
    await writeFile(box.ack, JSON.stringify(invalid));
    const result = await enqueue(box);
    assert.equal(result.code, 1, `${name}: ${result.stderr}`);
    await absent(reportEntry(box));
    if (await stat(outboxDir(box)).then(() => true, () => false)) {
      assert.deepEqual((await readdir(outboxDir(box))).filter((entry) => entry.includes('.tmp')), []);
    }
    assert.equal(server.received.length, 0);
  }
});
