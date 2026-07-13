import assert from 'node:assert/strict';
import test from 'node:test';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { projectGptConnectorFactory, scanV2, scanV2WithAcknowledgements, V2_PRODUCT_IDS } from '../../lib/factory/v2.mjs';
import { validateReportV2 } from '../../lib/factory/contract.mjs';

test('v2 product集合はOracleを含まず固定12製品', () => {
  assert.deepEqual(V2_PRODUCT_IDS, ['caveat', 'throughline', 'spotter', 'codegraph', 'markitdown', 'gpt-connector', 'aiterm-mcp', 'codex-sidecar', 'servermanager', 'claude-code', 'codex-cli', 'grok-build']);
});
test('gpt connector adapterはexact schemaとprivacy allowlistを強制する', () => {
  const ids = ['version', 'state_schema', 'job_schema', 'migration', 'cdp', 'official_origin', 'auth', 'runtime_bridge', 'mcp_contract'];
  const diagnostics = { schema: 'gpt-connector.factory-diagnostics.v1', package_version: '0.2.0', overall: 'not_ready', diagnostic_schema: 'gpt-connector.diagnostics.v1', state: { schema: 'x', migration: 'none' }, job: { schema: 'x', migration: 'none' }, checks: ids.map((id) => ({ id, status: id === 'cdp' ? 'not_ready' : 'ready', reason: 'cdp_unavailable' })) };
  const observedAt = '2026-07-13T00:00:00.000Z';
  const projected = projectGptConnectorFactory(diagnostics, null, false, observedAt);
  assert.equal(projected.installed_version, '0.2.0');
  assert.equal(projected.checks.find((item) => item.status === 'fail').last_seen, observedAt);
  assert.throws(() => projectGptConnectorFactory({ ...diagnostics, prompt: 'secret' }, null));
  assert.throws(() => projectGptConnectorFactory(diagnostics, { schema: 'gpt-connector.runtime-errors.v1', product: 'gpt-connector', path: '/private' }));
});

function caveatDiagnostic(syncStatus = 'ready', overallStatus = syncStatus) {
  const status = (value) => ({ status: value, reason_code: value === 'ready' ? 'ready' : 'sync_failed' });
  return { schema: 'caveat.native_factory_diagnostics.v1', product: 'caveat', version: '1.2.3', overall: { status: overallStatus }, database: { status: 'ready', reason_code: 'ready', schema_version: 3, supported_schema_version: 3, migration_status: 'current' }, sync: status(syncStatus), connectors: { claude: { status: 'ready', mcp: status('ready'), hooks: { user_prompt_submit: status('ready'), post_tool_use: status('ready'), post_tool_use_failure: status('ready'), stop: status('ready') } }, codex: { status: 'ready', hooks: { user_prompt_submit: status('ready'), post_tool_use: status('ready'), stop: status('ready') } } } };
}
function nativeFixtures() {
  const status = (value = 'ready') => ({ status: value, reason: value === 'ready' ? 'ready' : 'diagnostic_unverified' });
  return {
    throughline: { schema: 'throughline.native_factory_diagnostics.v1', version: '1.2.3', overall: { status: 'ready' }, databaseSchema: { schema: 'throughline.database.v8', status: 'ready', databaseSchemaVersion: 8, supportedDatabaseSchemaVersion: 8, reason: 'ready' }, hooks: { scope: 'codex', status: 'ready', reason: 'ready', events: { userPromptSubmit: 'ready', postToolUse: 'ready', stop: 'ready' } }, readiness: { capture: status(), restore: status(), handoff: status() }, evidence: { restoreSmoke: status('unverified') }, connectors: { claude: status(), codex: status() } },
    spotter: { schema_version: '1.0', product: 'spotter', version: '1.2.3', overall_status: 'pass', marker_schema_version: '2', throughline_context: 'disabled', catalogs: { claude: 'available', codex: 'available' }, codex_hook_readiness: 'not-installed', runtime_error_store: { schema: 'spotter.runtime_error_status.v1', collection: 'disabled', store: 'not_accessed', records: 0, open: 0, resolved: 0, unacknowledged: 0, latest_sequence: 0, acknowledged_through: 0 }, checks: [{ check_id: 'project_activation', status: 'pass' }, { check_id: 'marker_schema', status: 'pass' }, { check_id: 'throughline_context', status: 'skipped', reason_code: 'context_disabled' }, { check_id: 'claude_catalog', status: 'pass' }, { check_id: 'codex_catalog', status: 'pass' }, { check_id: 'audit_catalog_readiness', status: 'pass' }, { check_id: 'codex_hooks', status: 'skipped', reason_code: 'not_installed' }] },
    aiterm: { diagnostic_schema: 'aiterm-mcp.factory-diagnostics.v1', version: '1.2.3', overall: 'ready', mcp: { transport: 'stdio', initialize: 'ready', tool_call: 'ready' }, pty_list: { access: 'read_only', status: 'ready', session_count: 0 }, runtime_error_store: { status: 'not_applicable', collection: 'disabled', record_count: 0, unacknowledged_count: 0 }, vendor_dependencies: { codex: { status: 'not_applicable', optional: true, required_for: ['codex_agent'] }, grok: { status: 'not_applicable', optional: true, required_for: ['grok_agent', 'composer_agent'] } } },
    sidecar: { status: 'ok', factoryReadiness: { schemaVersion: '1', overall: 'ready', packageVersions: { status: 'ready', packages: { cli: '1.2.3', core: '1.2.3', mcp: '1.2.3' } }, resultSchema: { status: 'ready' }, workflows: { status: 'ready', entries: { review: { status: 'ready' }, explore: { status: 'ready' }, work: { status: 'not_applicable' }, opinion: { status: 'ready' }, 'risk-check': { status: 'ready' }, auditor: { status: 'ready' }, generate: { status: 'ready' } } }, presets: { status: 'ready', configured: 1, ready: 1, notReady: 0, notApplicable: 0 }, modelPolicy: { status: 'ready', source: 'explicit', modelConfigured: true, modelReasoningEffortConfigured: false }, readOnlyDryRun: { status: 'ready', workflow: 'review' }, runtimeErrorStore: { status: 'not_applicable', schemaVersion: '2', collection: 'disabled', store: 'absent', pending: 0 } } },
  };
}

test('v2 scannerは公開CLIとnative diagnosticsだけで固定12製品をfull snapshotへ投影する', { concurrency: false }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'factory-v2-')); const bin = join(root, 'bin'); await mkdir(bin); t.after(() => rm(root, { recursive: true, force: true }));
  const previousHome = process.env.HOME; process.env.HOME = root; t.after(() => { process.env.HOME = previousHome; });
  await mkdir(join(root, '.claude'), { recursive: true }); await mkdir(join(root, '.codex'), { recursive: true });
  const claudeHook = (command, timeout) => ({ type: 'command', command, timeout });
  const claudeHooks = { hooks: { PreToolUse: [{ matcher: 'Agent|Task|Workflow|mcp__codex-sidecar__codex_.*|mcp__aiterm__(codex|grok|composer)_agent', hooks: [claudeHook('~/.local/bin/delegation-gate-hook', 5)] }], SessionStart: [{ hooks: [claudeHook('~/.local/bin/todo-gate-hook session-start', 10)] }], Stop: [{ hooks: [claudeHook('~/.local/bin/todo-gate-hook stop', 10)] }], UserPromptSubmit: [{ hooks: [claudeHook('~/.local/bin/onset-gate-hook', 5)] }], PostToolUse: [{ matcher: 'ExitPlanMode', hooks: [claudeHook('~/.local/bin/plan-gate-hook', 5)] }] } }; await writeFile(join(root, '.claude', 'settings.json'), JSON.stringify(claudeHooks));
  await writeFile(join(root, '.codex', 'config.toml'), '[features]\nhooks = true\n[features.multi_agent_v2]\nhide_spawn_agent_metadata = false\ntool_namespace = "agents"\n');
  const codexHook = (subcommand, timeoutSec) => ({ type: 'command', command: `${join(root, '.local', 'bin', 'codex-callout-hook')} ${subcommand}`, timeoutSec, async: false, statusMessage: null }); const codexHooks = { hooks: { SessionStart: [{ hooks: [codexHook('session-start', 10)] }], PreToolUse: [{ hooks: [codexHook('pre-tool-use', 5)] }], UserPromptSubmit: [{ hooks: [codexHook('user-prompt-submit', 5)] }], Stop: [{ hooks: [codexHook('stop', 10)] }] } }; await writeFile(join(root, '.codex', 'hooks.json'), JSON.stringify(codexHooks));
  const script = async (name, body) => { const target = join(bin, name); await writeFile(target, `#!/bin/sh\n${body}`); await chmod(target, 0o755); };
  await script('caveat', `echo '${JSON.stringify(caveatDiagnostic())}'`);
  const fixtures = nativeFixtures();
  await script('throughline', `echo '${JSON.stringify(fixtures.throughline)}'`);
  await script('spotter', `echo '${JSON.stringify(fixtures.spotter)}'`);
  await script('codex-sidecar', `echo '${JSON.stringify(fixtures.sidecar)}'`);
  await script('gpt-connector', `if [ "$1" = factory-diagnostics ]; then echo '{"schema":"gpt-connector.factory-diagnostics.v1","package_version":"0.2.0","overall":"ready","diagnostic_schema":"gpt-connector.diagnostics.v1","state":{"schema":"1","migration":"current"},"job":{"schema":"1","migration":"current"},"checks":[{"id":"version","status":"ready","reason":"ready"},{"id":"state_schema","status":"ready","reason":"ready"},{"id":"job_schema","status":"ready","reason":"ready"},{"id":"migration","status":"ready","reason":"ready"},{"id":"cdp","status":"ready","reason":"ready"},{"id":"official_origin","status":"ready","reason":"ready"},{"id":"auth","status":"ready","reason":"ready"},{"id":"runtime_bridge","status":"ready","reason":"ready"},{"id":"mcp_contract","status":"ready","reason":"ready"}]}' ; elif [ "$1" = runtime-errors ]; then stamp=$(node -e 'process.stdout.write(new Date().toISOString())'); echo '{"schema":"gpt-connector.runtime-errors.v1","product":"gpt-connector","version":"0.2.0","state_schema_version":"1.0","cursor":{"high_watermark":1,"acknowledged_through":0,"next":1},"runtime_errors":[{"error_code":"CHAT_FAILED","component":"chat","status":"open","severity":"high","fingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","message_template":"GPT Connector chat failed","occurrence_count":1,"first_seen":"'"$stamp"'","last_seen":"'"$stamp"'","state_schema_version":"1.0"}],"resolutions":[],"diagnostics":{"collection":"enabled","status":"ready","total_count":1,"pending_count":1,"truncated":false}}'; fi`);
  await script('codegraph', `if [ "$1" = --version ]; then echo 'codegraph 1.4.0'; else echo '{"initialized":true}'; fi`);
  await script('markitdown', `if [ "$1" = --version ]; then echo 'markitdown 0.1.0'; else echo converted; fi`);
  await script('aiterm-mcp', `cat >/dev/null; echo '${JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: JSON.stringify(fixtures.aiterm) }] } })}'`);
  await script('claude', "echo '2.1.0'"); await script('codex', "echo '0.144.3'");
  await script('npm', `if [ "$2" = @anthropic-ai/claude-code ]; then echo '"2.1.0"'; else echo '"0.144.3"'; fi`);
  await script('grok', "echo '{\"currentVersion\":\"0.2.99\",\"latestVersion\":\"0.2.99\",\"updateAvailable\":false,\"installer\":\"native\",\"channel\":\"stable\",\"autoUpdate\":null,\"error\":null}'");
  const previous = process.env.PATH; process.env.PATH = `${bin}:${previous}`; t.after(() => { process.env.PATH = previous; });
  const ledgerPath = join(root, 'toolchain-ledger.json'); const record = (version) => ({ before_version: version, latest_version: version, operation_status: 'skipped', after_version: version, post_gate_status: 'success', reason_code: 'already_current', observed_at: '2026-07-13T14:00:00.000Z' });
  await writeFile(ledgerPath, JSON.stringify({ schema_version: 'dotagents.toolchain-update.v1', products: { 'claude-code': record('2.1.0'), 'codex-cli': record('0.144.3'), 'grok-build': record('0.2.99') } }), { mode: 0o600 });
  const { report, acknowledgements } = await scanV2WithAcknowledgements({ host: { id: 'test-host', profile: process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows-native' : 'wsl' }, cwd: root, arch: 'x64', platform: process.platform, collectionEnabled: true, toolchainLedgerPath: ledgerPath });
  assert.doesNotThrow(() => validateReportV2(report));
  assert.deepEqual(Object.keys(report.products), V2_PRODUCT_IDS);
  assert.equal(report.products['claude-code'].installed_version, '2.1.0'); assert.equal(report.products['claude-code'].latest_version, '2.1.0');
  assert.equal(report.products['codex-cli'].installed_version, '0.144.3'); assert.equal(report.products['codex-cli'].latest_version, '0.144.3');
  assert.equal(report.products['grok-build'].checks[0].check_id, 'stable_update'); assert.equal(report.products['grok-build'].update_status, 'current');
  assert.equal(report.products['gpt-connector'].compatibility_status, 'compatible'); assert.equal(report.products.servermanager.presence_status, 'not_applicable');
  assert.equal(report.products.caveat.compatibility_status, 'compatible');
  assert.equal(report.products['codex-sidecar'].installed_version, '1.2.3');
  assert.equal(report.products['claude-code'].compatibility_status, 'compatible'); assert.equal(report.products['codex-cli'].compatibility_status, 'compatible');
  assert.equal(report.products['claude-code'].checks.at(-1).status, 'pass');
  assert.deepEqual(acknowledgements, { schema_version: '2.0', report_id: report.report_id, acknowledgements: [{ product: 'gpt-connector', cursor: 1, command: 'gpt-connector', args: ['runtime-errors', 'ack', '1', '--json'] }] });
  const malformedClaude = structuredClone(claudeHooks); malformedClaude.hooks.PreToolUse[0] = { matcher: 'never-match', hooks: [{ type: 'shell', command: 'prefix delegation-gate-hook suffix' }] }; await writeFile(join(root, '.claude', 'settings.json'), JSON.stringify(malformedClaude));
  const malformedCodex = structuredClone(codexHooks); malformedCodex.hooks.PreToolUse[0].matcher = 'never-match'; await writeFile(join(root, '.codex', 'hooks.json'), JSON.stringify(malformedCodex));
  const malformed = await scanV2({ host: { id: 'test-host', profile: process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows-native' : 'wsl' }, cwd: root, arch: 'x64', platform: process.platform, toolchainLedgerPath: ledgerPath });
  assert.equal(malformed.products['claude-code'].compatibility_status, 'incompatible'); assert.equal(malformed.products['codex-cli'].compatibility_status, 'incompatible');
  await writeFile(join(root, '.claude', 'settings.json'), JSON.stringify(claudeHooks));
  const duplicateCodex = structuredClone(codexHooks); duplicateCodex.hooks.PreToolUse.push({ matcher: 'never-match', hooks: [codexHook('pre-tool-use', 5)] }); await writeFile(join(root, '.codex', 'hooks.json'), JSON.stringify(duplicateCodex));
  await writeFile(join(root, '.codex', 'config.toml'), 'hooks = true\n[features]\nhooks = false\n[foo]\nhooks = true\n[features.multi_agent_v2]\nhide_spawn_agent_metadata = false\ntool_namespace = "agents"\n');
  const misplaced = await scanV2({ host: { id: 'test-host', profile: process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows-native' : 'wsl' }, cwd: root, arch: 'x64', platform: process.platform, toolchainLedgerPath: ledgerPath });
  assert.equal(misplaced.products['claude-code'].compatibility_status, 'compatible'); assert.equal(misplaced.products['codex-cli'].compatibility_status, 'incompatible');
  await rm(join(root, '.claude', 'settings.json')); await writeFile(join(root, '.codex', 'config.toml'), 'hooks = true\n');
  const drift = await scanV2({ host: { id: 'test-host', profile: process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows-native' : 'wsl' }, cwd: root, arch: 'x64', platform: process.platform, toolchainLedgerPath: ledgerPath });
  assert.equal(drift.products['claude-code'].compatibility_status, 'incompatible'); assert.equal(drift.products['codex-cli'].compatibility_status, 'incompatible');
  assert.ok(drift.products['claude-code'].checks.some((item) => item.check_id === 'required_hooks' && item.status === 'fail')); assert.ok(drift.products['codex-cli'].checks.some((item) => item.check_id === 'native_routing' && item.status === 'fail'));
});

test('Caveat native diagnosticsのnested不整合をcompatibleへ偽装しない', { concurrency: false }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'factory-v2-caveat-')); const bin = join(root, 'bin'); await mkdir(bin); t.after(() => rm(root, { recursive: true, force: true }));
  const target = join(bin, 'caveat'); await writeFile(target, `#!/bin/sh\necho '${JSON.stringify(caveatDiagnostic('not_ready', 'ready'))}'\n`); await chmod(target, 0o755);
  for (const name of ['throughline', 'spotter', 'codex-sidecar', 'gpt-connector', 'codegraph', 'markitdown', 'aiterm-mcp', 'claude', 'codex', 'npm', 'grok']) { const file = join(bin, name); await writeFile(file, '#!/bin/sh\nexit 1\n'); await chmod(file, 0o755); }
  const previous = process.env.PATH; process.env.PATH = `${bin}:${previous}`; t.after(() => { process.env.PATH = previous; });
  const report = await scanV2({ host: { id: 'test-host', profile: process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows-native' : 'wsl' }, cwd: root, arch: 'x64', platform: process.platform });
  assert.deepEqual(report.products.caveat.checks, [{ check_id: 'native_diagnostics', status: 'unverified', reason_code: 'native_diagnostics_schema' }]);
  assert.notEqual(report.products.caveat.compatibility_status, 'compatible');
});

test('Grokのalphaや文字列推測、CLI registry失敗をpassへ丸めない', { concurrency: false }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'factory-v2-grok-')); const bin = join(root, 'bin'); await mkdir(bin); t.after(() => rm(root, { recursive: true, force: true }));
  const script = async (name, body) => { const target = join(bin, name); await writeFile(target, `#!/bin/sh\n${body}`); await chmod(target, 0o755); };
  for (const command of ['caveat', 'throughline', 'spotter', 'codex-sidecar', 'gpt-connector', 'codegraph', 'markitdown', 'aiterm-mcp', 'claude', 'codex']) await script(command, 'exit 1');
  await script('npm', 'exit 1'); await script('grok', "echo '{\"currentVersion\":\"0.2.0\",\"latestVersion\":\"0.2.1\",\"updateAvailable\":true,\"installer\":\"native\",\"channel\":\"alpha\",\"autoUpdate\":true,\"error\":null}'");
  const previous = process.env.PATH; process.env.PATH = `${bin}:${previous}`; t.after(() => { process.env.PATH = previous; });
  const report = await scanV2({ host: { id: 'test-host', profile: process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows-native' : 'wsl' }, cwd: root, arch: 'x64', platform: process.platform, toolchainLedgerPath: join(root, 'missing-toolchain-ledger.json') });
  assert.doesNotThrow(() => validateReportV2(report));
  assert.deepEqual(report.products['grok-build'].checks[0], { check_id: 'stable_update', status: 'unverified', reason_code: 'grok_update_schema' });
  assert.deepEqual(report.products['grok-build'].checks[1], { check_id: 'last_update', status: 'unverified', reason_code: 'toolchain_ledger_unavailable' });
  assert.equal(report.products['claude-code'].checks[1].status, 'unverified');
});

test('Grokの旧snake_case JSONはstableでも契約違反として拒否する', { concurrency: false }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'factory-v2-grok-snake-')); const bin = join(root, 'bin'); await mkdir(bin); t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(bin, 'grok'), "#!/bin/sh\necho '{\"channel\":\"stable\",\"current_version\":\"0.2.0\",\"latest_version\":\"0.2.0\",\"update_available\":false}'\n"); await chmod(join(bin, 'grok'), 0o755);
  const previous = process.env.PATH; process.env.PATH = `${bin}:${previous}`; t.after(() => { process.env.PATH = previous; });
  const report = await scanV2({ host: { id: 'test-host', profile: process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows-native' : 'wsl' }, cwd: root, arch: 'x64', platform: process.platform });
  assert.equal(report.products['grok-build'].checks[0].status, 'unverified');
});

test('collection有効時のgpt runtime snapshot失敗をdisabledへ丸めない', { concurrency: false }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'factory-v2-gpt-runtime-')); const bin = join(root, 'bin'); await mkdir(bin); t.after(() => rm(root, { recursive: true, force: true }));
  const ids = ['version', 'state_schema', 'job_schema', 'migration', 'cdp', 'official_origin', 'auth', 'runtime_bridge', 'mcp_contract'];
  const diagnostic = { schema: 'gpt-connector.factory-diagnostics.v1', package_version: '0.2.0', overall: 'ready', diagnostic_schema: 'gpt-connector.diagnostics.v1', state: { schema: '1.0', migration: 'current' }, job: { schema: '1.0', migration: 'current' }, checks: ids.map((id) => ({ id, status: 'ready', reason: 'ready' })) };
  const target = join(bin, 'gpt-connector'); await writeFile(target, `#!/bin/sh\nif [ "$1" = factory-diagnostics ]; then echo '${JSON.stringify(diagnostic)}'; else exit 1; fi\n`); await chmod(target, 0o755);
  const previous = process.env.PATH; process.env.PATH = `${bin}:${previous}`; t.after(() => { process.env.PATH = previous; });
  const report = await scanV2({ host: { id: 'test-host', profile: process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows-native' : 'wsl' }, cwd: root, arch: 'x64', platform: process.platform, collectionEnabled: true });
  assert.ok(report.products['gpt-connector'].checks.some((item) => item.check_id === 'runtime_errors' && item.status === 'unverified' && item.reason_code === 'runtime_snapshot_unavailable'));
});
