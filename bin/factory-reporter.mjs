#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import process from 'node:process';

const PRODUCT_IDS = ['caveat', 'throughline', 'spotter', 'codegraph', 'markitdown', 'oracle', 'aiterm-mcp', 'codex-sidecar', 'servermanager'];
const MAX_QUEUE_ITEMS = 128;
const MAX_QUEUE_BYTES = 2 * 1024 * 1024;
const MAX_QUEUE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const UUID_V7ISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const STABLE_ID = /^[a-z0-9][a-z0-9._-]*$/;
const FORBIDDEN_KEY = /(?:token|secret|credential|authorization|cookie|password|prompt|input|stdout|stderr|stack|(?:^|_)path|email|username|env)/i;
const FORBIDDEN_VALUE = /(?:\bBearer\s+\S+|\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]+|-----BEGIN [A-Z ]+-----|(?:^|[\s"'])\/(?:home|Users)\/|[A-Za-z]:\\Users\\|\b\d{1,3}(?:\.\d{1,3}){3}\b)/;
const SAFE_CONTEXT_ALLOWLIST = Object.freeze(Object.fromEntries(PRODUCT_IDS.map((id) => [id, new Set()])));
const UTF8 = new TextDecoder('utf-8', { fatal: true });

function diagnostic(message) { process.stderr.write(`[factory-reporter] ${message}\n`); }
function emit(value) { process.stdout.write(`${JSON.stringify(value)}\n`); }
function fail(code, message) { diagnostic(message); emit({ ok: false, code }); process.exitCode = 1; }

function defaultConfigPath() {
  if (platform() === 'win32') return join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'dotagents', 'factory-reporter', 'config.json');
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'dotagents', 'factory-reporter.json');
}

function defaultStatePath() {
  if (platform() === 'win32') return join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'dotagents', 'factory-reporter');
  return join(process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state'), 'dotagents', 'factory-reporter');
}

async function readConfig(configPath) {
  let bytes;
  try { bytes = await readFile(configPath); }
  catch (error) {
    if (error?.code === 'ENOENT') return { collection: { enabled: false }, reporting: { enabled: false }, source: 'missing' };
    throw new Error(`設定を読めません (${error.code || error.message})`);
  }
  let config;
  try { config = JSON.parse(UTF8.decode(bytes)); } catch { throw new Error('設定JSONが不正です'); }
  validateConfig(config);
  return { ...config, source: 'file' };
}

function validateConfig(config) {
  if (!isObject(config) || Object.keys(config).some((key) => !['schema_version', 'host', 'collection', 'reporting'].includes(key))) throw new Error('設定shapeが不正です');
  if (config.schema_version !== '1.0') throw new Error('設定schema_versionは1.0でなければなりません');
  if (!isObject(config.host)) throw new Error('hostが必要です');
  exactKeys(config.host, ['id', 'profile'], 'host'); stableId(config.host.id, 'host.id');
  if (!['server', 'mac', 'wsl', 'windows-native'].includes(config.host.profile)) throw new Error('host.profileが不正です');
  for (const section of ['collection', 'reporting']) {
    if (!isObject(config[section]) || typeof config[section].enabled !== 'boolean') throw new Error(`${section}.enabledはboolean必須です`);
  }
  if (Object.keys(config.collection).some((key) => key !== 'enabled')) throw new Error('collectionに未定義fieldがあります');
  if (Object.keys(config.reporting).some((key) => !['enabled', 'endpoint', 'credential_file'].includes(key))) throw new Error('reportingに未定義fieldがあります');
  const { endpoint, credential_file: credentialFile } = config.reporting;
  if ('endpoint' in config.reporting) { if (typeof endpoint !== 'string' || endpoint.length > 2048) throw new Error('reporting.endpointが不正です'); let url; try { url = new URL(endpoint); } catch { throw new Error('reporting.endpointが不正です'); } if (!['http:', 'https:'].includes(url.protocol)) throw new Error('reporting.endpointが不正です'); }
  if ('credential_file' in config.reporting && (typeof credentialFile !== 'string' || credentialFile.length < 1 || credentialFile.length > 4096)) throw new Error('reporting.credential_fileが不正です');
  if (config.reporting.enabled && (!('endpoint' in config.reporting) || !('credential_file' in config.reporting))) throw new Error('reporting.enabled時にendpoint/credential_fileが必要です');
}

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value, allowed, path) {
  if (!isObject(value) || Object.keys(value).some((key) => !allowed.includes(key))) throw new Error(`${path}に未定義fieldがあります`);
}
function stableId(value, path) { if (typeof value !== 'string' || value.length < 1 || value.length > 64 || !STABLE_ID.test(value)) throw new Error(`${path}が不正です`); }
function version(value, path) { if (typeof value !== 'string' || value.length < 1 || value.length > 128) throw new Error(`${path}が不正です`); }
function fingerprint(value, path) { if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) throw new Error(`${path}が不正です`); }
function messageTemplate(value, path) { if (typeof value !== 'string' || value.length < 1 || value.length > 1024) throw new Error(`${path}が不正です`); }
function positiveInteger(value, path) { if (!Number.isInteger(value) || value < 1) throw new Error(`${path}が不正です`); }
function utcAt(value, path) { if (!validUtc(value)) throw new Error(`${path}がUTC ISO8601でありません`); return Date.parse(value); }
function safeContext(value, path, productId) {
  exactKeys(value, Object.keys(value || {}), path);
  if (Object.keys(value).length > 16) throw new Error(`${path}が多すぎます`);
  for (const [key, item] of Object.entries(value)) {
    if (!SAFE_CONTEXT_ALLOWLIST[productId]?.has(key)) throw new Error(`${path}.${key}はallowlist外です`);
    const type = typeof item;
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(key) || !['string', 'number', 'boolean'].includes(type) || (type === 'string' && item.length > 256) || (type === 'number' && !Number.isFinite(item))) throw new Error(`${path}.${key}が不正です`);
  }
}

function inspectPrivacy(value, path = '$') {
  if (Array.isArray(value)) return value.forEach((item, index) => inspectPrivacy(item, `${path}[${index}]`));
  if (!isObject(value)) {
    if (typeof value === 'string' && FORBIDDEN_VALUE.test(value)) throw new Error(`privacy禁止pattern (${path})`);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) throw new Error(`privacy禁止key (${path}.${key})`);
    inspectPrivacy(child, `${path}.${key}`);
  }
}

function validateReport(report) {
  exactKeys(report, ['schema_version', 'report_id', 'host_id', 'host_profile', 'platform', 'report_mode', 'observed_at', 'created_at', 'reporter', 'products'], 'report');
  const required = ['schema_version', 'report_id', 'host_id', 'host_profile', 'platform', 'report_mode', 'observed_at', 'created_at', 'reporter', 'products'];
  for (const key of required) if (!(key in report)) throw new Error(`report.${key}が必要です`);
  if (report.schema_version !== '1.0' || report.report_mode !== 'full') throw new Error('未対応のreport schema/modeです');
  if (typeof report.report_id !== 'string' || !UUID_V7ISH.test(report.report_id)) throw new Error('report_idが不正です');
  stableId(report.host_id, 'host_id');
  if (!['server', 'mac', 'wsl', 'windows-native'].includes(report.host_profile)) throw new Error('host_profileが不正です');
  exactKeys(report.platform, ['os', 'arch'], 'platform');
  if (!['darwin', 'linux', 'windows'].includes(report.platform.os) || !['x64', 'arm64', 'arm', 'ia32'].includes(report.platform.arch)) throw new Error('platformが不正です');
  if ({ mac: 'darwin', server: 'linux', wsl: 'linux', 'windows-native': 'windows' }[report.host_profile] !== report.platform.os) throw new Error('host_profileとplatform.osが不整合です');
  const observedAt = utcAt(report.observed_at, 'observed_at'); const createdAt = utcAt(report.created_at, 'created_at');
  if (observedAt > createdAt) throw new Error('observed_atはcreated_at以前でなければなりません');
  exactKeys(report.reporter, ['version', 'dotagents_revision'], 'reporter'); version(report.reporter.version, 'reporter.version');
  if (typeof report.reporter.dotagents_revision !== 'string' || !/^[0-9a-f]{7,64}$/.test(report.reporter.dotagents_revision)) throw new Error('reporter.dotagents_revisionが不正です');
  exactKeys(report.products, PRODUCT_IDS, 'products'); if (!PRODUCT_IDS.every((id) => isObject(report.products[id]))) throw new Error('productsは固定9製品をすべて含む必要があります');
  for (const [id, product] of Object.entries(report.products)) {
    validateProduct(product, `products.${id}`, observedAt, id);
  }
  inspectPrivacy(report);
}

function validateProduct(product, path, observedAt, productId) {
  const keys = ['presence_status', 'installed_version', 'latest_version', 'source_revision', 'contract_version', 'state_schema_version', 'migration_status', 'update_status', 'compatibility_status', 'checks', 'runtime_errors', 'resolutions'];
  exactKeys(product, keys, path);
  if (!['installed', 'missing', 'not_applicable', 'unverified'].includes(product.presence_status)) throw new Error(`${path}.presence_statusが不正です`);
  if (!('contract_version' in product)) throw new Error(`${path}.contract_versionが必要です`);
  for (const key of ['contract_version', 'installed_version', 'latest_version', 'state_schema_version']) if (key in product) version(product[key], `${path}.${key}`);
  if (product.presence_status === 'installed' && !('installed_version' in product)) throw new Error(`${path}.installed_versionが必要です`);
  if ('source_revision' in product && (typeof product.source_revision !== 'string' || !/^[0-9a-f]{7,64}$/.test(product.source_revision))) throw new Error(`${path}.source_revisionが不正です`);
  if ('migration_status' in product && !['not_applicable', 'current', 'pending', 'failed', 'unverified'].includes(product.migration_status)) throw new Error(`${path}.migration_statusが不正です`);
  if ('update_status' in product && !['current', 'outdated', 'failed', 'unsupported', 'unverified'].includes(product.update_status)) throw new Error(`${path}.update_statusが不正です`);
  if ('compatibility_status' in product && !['compatible', 'incompatible', 'unsupported', 'unverified'].includes(product.compatibility_status)) throw new Error(`${path}.compatibility_statusが不正です`);
  for (const key of ['checks', 'runtime_errors', 'resolutions']) if (!Array.isArray(product[key])) throw new Error(`${path}.${key}がarrayでありません`);
  if (product.checks.length > 128 || product.runtime_errors.length > 256 || product.resolutions.length > 256) throw new Error(`${path}の配列が多すぎます`);
  const seen = new Set(); const open = new Set(); const resolved = new Set();
  for (const [index, item] of product.checks.entries()) { const fp = validateCheck(item, `${path}.checks[${index}]`, observedAt, productId); if (fp) { if (seen.has(fp)) throw new Error(`${path}のfingerprintが重複しています`); seen.add(fp); open.add(fp); } }
  for (const [index, item] of product.runtime_errors.entries()) { const { fp, status } = validateRuntimeError(item, `${path}.runtime_errors[${index}]`, observedAt, productId); if (seen.has(fp)) throw new Error(`${path}のfingerprintが重複しています`); seen.add(fp); (status === 'open' ? open : resolved).add(fp); }
  for (const [index, item] of product.resolutions.entries()) { const fp = validateResolution(item, `${path}.resolutions[${index}]`, observedAt); if (seen.has(fp)) throw new Error(`${path}のfingerprintが重複しています`); seen.add(fp); resolved.add(fp); }
  for (const fp of open) if (resolved.has(fp)) throw new Error(`${path}でopen/resolved fingerprintが衝突しています`);
}
function validateCheck(item, path, observedAt, productId) {
  exactKeys(item, ['check_id', 'status', 'severity', 'fingerprint', 'message_template', 'occurrence_count', 'first_seen', 'last_seen', 'reason_code', 'safe_context'], path);
  stableId(item.check_id, `${path}.check_id`); if (!['pass', 'fail', 'unsupported', 'unverified', 'skipped'].includes(item.status)) throw new Error(`${path}.statusが不正です`);
  if ('safe_context' in item) safeContext(item.safe_context, `${path}.safe_context`, productId);
  if (item.status === 'fail') { for (const key of ['severity', 'fingerprint', 'message_template', 'occurrence_count', 'first_seen', 'last_seen']) if (!(key in item)) throw new Error(`${path}.${key}が必要です`); if (!['fatal', 'high', 'warn', 'info'].includes(item.severity)) throw new Error(`${path}.severityが不正です`); fingerprint(item.fingerprint, `${path}.fingerprint`); messageTemplate(item.message_template, `${path}.message_template`); positiveInteger(item.occurrence_count, `${path}.occurrence_count`); const first = utcAt(item.first_seen, `${path}.first_seen`); const last = utcAt(item.last_seen, `${path}.last_seen`); if (first > last || last > observedAt) throw new Error(`${path}のtimestamp順序が不正です`); return item.fingerprint; }
  for (const key of ['severity', 'fingerprint', 'message_template', 'occurrence_count', 'first_seen', 'last_seen']) if (key in item) throw new Error(`${path}.${key}はfail以外に不正です`);
  if (item.status === 'skipped' && !('reason_code' in item)) throw new Error(`${path}.reason_codeが必要です`); if ('reason_code' in item) stableId(item.reason_code, `${path}.reason_code`); return null;
}
function validateRuntimeError(item, path, observedAt, productId) {
  exactKeys(item, ['error_code', 'component', 'status', 'severity', 'fingerprint', 'message_template', 'occurrence_count', 'first_seen', 'last_seen', 'state_schema_version', 'safe_context'], path);
  if (typeof item.error_code !== 'string' || item.error_code.length < 3 || item.error_code.length > 96 || !/^[A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+)*$/.test(item.error_code)) throw new Error(`${path}.error_codeが不正です`); stableId(item.component, `${path}.component`); if (!['open', 'resolved'].includes(item.status) || !['fatal', 'high', 'warn', 'info'].includes(item.severity)) throw new Error(`${path}のstatus/severityが不正です`); fingerprint(item.fingerprint, `${path}.fingerprint`); messageTemplate(item.message_template, `${path}.message_template`); positiveInteger(item.occurrence_count, `${path}.occurrence_count`); const first = utcAt(item.first_seen, `${path}.first_seen`); const last = utcAt(item.last_seen, `${path}.last_seen`); if (first > last || last > observedAt) throw new Error(`${path}のtimestamp順序が不正です`); if ('state_schema_version' in item) version(item.state_schema_version, `${path}.state_schema_version`); if ('safe_context' in item) safeContext(item.safe_context, `${path}.safe_context`, productId); return { fp: item.fingerprint, status: item.status };
}
function validateResolution(item, path, observedAt) { exactKeys(item, ['fingerprint', 'resolved_at', 'reason_code'], path); fingerprint(item.fingerprint, `${path}.fingerprint`); if (utcAt(item.resolved_at, `${path}.resolved_at`) > observedAt) throw new Error(`${path}.resolved_atがobserved_atより未来です`); stableId(item.reason_code, `${path}.reason_code`); return item.fingerprint; }

function validUtc(value) { return typeof value === 'string' && value.endsWith('Z') && Number.isFinite(Date.parse(value)); }
function assertConfigIdentity(config, report) { if (config.host && (config.host.id !== report.host_id || config.host.profile !== report.host_profile)) throw new Error('report host identityとconfig.hostが一致しません'); }

async function readAndValidateReport(reportPath) {
  const bytes = await readFile(reportPath);
  let report;
  try { report = JSON.parse(UTF8.decode(bytes)); } catch { throw new Error('report JSONが不正です'); }
  validateReport(report);
  return { bytes, report };
}

function locations(stateDir) { return { stateDir, outbox: join(stateDir, 'outbox'), dead: join(stateDir, 'dead-letter'), lock: join(stateDir, 'flush.lock') }; }
async function ensureState(loc) { await Promise.all([mkdir(loc.outbox, { recursive: true }), mkdir(loc.dead, { recursive: true })]); }
async function queueEntries(loc) {
  await ensureState(loc);
  const names = (await readdir(loc.outbox)).filter((name) => name.endsWith('.json')).sort();
  const result = [];
  for (const name of names) {
    const file = join(loc.outbox, name);
    try { const info = await stat(file); result.push({ name, file, size: info.size, mtimeMs: info.mtimeMs }); } catch { /* concurrent removal */ }
  }
  return result;
}
async function moveDead(loc, entry, reason) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}-${reason}`;
  await rename(entry.file, join(loc.dead, `${entry.name}.${suffix}`));
}
async function expireQueue(loc) {
  for (const entry of await queueEntries(loc)) if (Date.now() - entry.mtimeMs > MAX_QUEUE_AGE_MS) await moveDead(loc, entry, 'expired');
}
async function queueStats(loc) { const entries = await queueEntries(loc); return { count: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.size, 0) }; }
async function enqueue(loc, bytes, reportId) {
  await ensureState(loc); await expireQueue(loc);
  const name = `${reportId}.json`;
  const target = join(loc.outbox, name);
  try {
    const existing = await readFile(target);
    if (Buffer.compare(existing, bytes) === 0) return { name, duplicate: true };
    throw new Error('report_id collision: 既存outbox本文と一致しません（既存は保持）');
  } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  const stats = await queueStats(loc);
  if (stats.count >= MAX_QUEUE_ITEMS || stats.bytes + bytes.length > MAX_QUEUE_BYTES) throw new Error('outbox上限超過: 既存queueを保持したまま新規reportを拒否しました');
  const tmp = join(loc.outbox, `.${name}.${randomUUID()}.tmp`);
  await writeFile(tmp, bytes, { flag: 'wx', mode: 0o600 });
  await rename(tmp, target);
  return { name, duplicate: false };
}

async function withLock(loc, fn) {
  try { await mkdir(loc.lock); }
  catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    let stale = false;
    try {
      const pid = Number((await readFile(join(loc.lock, 'pid'), 'utf8')).trim());
      if (Number.isInteger(pid) && pid > 0) {
        try { process.kill(pid, 0); } catch (probeError) { stale = probeError?.code === 'ESRCH'; }
      }
    } catch { /* pid未記録の競合lockは現行処理として扱う */ }
    if (!stale) throw new Error('送信処理はすでに実行中です');
    await rm(loc.lock, { recursive: true, force: true });
    await mkdir(loc.lock);
  }
  await writeFile(join(loc.lock, 'pid'), String(process.pid), { mode: 0o600 });
  try { return await fn(); } finally { await rm(loc.lock, { recursive: true, force: true }); }
}

async function credential(config) {
  let token;
  try { token = (await readFile(config.reporting.credential_file, 'utf8')).trim(); } catch (error) { throw new Error(`credential fileを読めません (${error.code || error.message})`); }
  if (!token) throw new Error('credential fileが空です');
  return token;
}

async function postOne(config, token, entry) {
  const bytes = await readFile(entry.file);
  let report;
  try { report = JSON.parse(UTF8.decode(bytes)); validateReport(report); } catch { return { action: 'dead', reason: 'malformed' }; }
  if (!config.host || report.host_id !== config.host.id || report.host_profile !== config.host.profile) return { action: 'dead', reason: 'host-mismatch' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(config.reporting.endpoint, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-factory-sent-at': new Date().toISOString() }, body: bytes, signal: controller.signal });
    let body = null;
    try { body = await response.json(); } catch { /* invalid response is retained */ }
    if (response.ok && body?.accepted === true && body.report_id === report.report_id) return { action: 'delete' };
    if ([409, 413, 422].includes(response.status)) return { action: 'dead', reason: `http-${response.status}` };
    return { action: 'keep', reason: `http-${response.status}` };
  } catch (error) {
    return { action: 'keep', reason: error?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally { clearTimeout(timeout); }
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!['preview', 'enqueue', 'flush'].includes(command)) throw new Error('使い方: factory-reporter.mjs preview|enqueue|flush [--report <file>] [--config <file>]');
  const options = {};
  for (let i = 0; i < rest.length; i++) {
    if (!['--report', '--config'].includes(rest[i]) || !rest[i + 1] || options[rest[i]]) throw new Error('引数が不正です');
    options[rest[i].slice(2)] = rest[++i];
  }
  if ((command === 'preview' || command === 'enqueue') && !options.report) throw new Error('--reportが必要です');
  if (command === 'flush' && options.report) throw new Error('flushは--reportを受け取りません');
  return { command, options };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const config = await readConfig(options.config || defaultConfigPath());
  const loc = locations(defaultStatePath());
  if (command === 'preview') {
    const { bytes, report } = await readAndValidateReport(options.report);
    assertConfigIdentity(config, report);
    emit({ ok: true, command, reporting_enabled: config.reporting.enabled, report_id: report.report_id, body_bytes: bytes.length, report });
    return;
  }
  if (command === 'enqueue') {
    const { bytes, report } = await readAndValidateReport(options.report);
    if (!config.reporting.enabled) { emit({ ok: true, command, reporting_enabled: false, enqueued: false, report_id: report.report_id, ...(await queueStats(loc)) }); return; }
    assertConfigIdentity(config, report);
    const result = await enqueue(loc, bytes, report.report_id);
    emit({ ok: true, command, reporting_enabled: true, enqueued: !result.duplicate, report_id: report.report_id, ...(await queueStats(loc)) });
    return;
  }
  if (!config.reporting.enabled) { emit({ ok: true, command, reporting_enabled: false, sent: 0, retained: (await queueStats(loc)).count, dead_lettered: 0 }); return; }
  const token = await credential(config);
  const outcome = await withLock(loc, async () => {
    await expireQueue(loc);
    let sent = 0; let retained = 0; let deadLettered = 0;
    for (const entry of await queueEntries(loc)) {
      const result = await postOne(config, token, entry);
      if (result.action === 'delete') { await rm(entry.file, { force: true }); sent++; }
      else if (result.action === 'dead') { await moveDead(loc, entry, result.reason); deadLettered++; }
      else retained++;
    }
    return { sent, retained, dead_lettered: deadLettered };
  });
  emit({ ok: true, command, reporting_enabled: true, ...outcome, ...(await queueStats(loc)) });
}

main().catch((error) => fail('FACTORY_REPORTER_ERROR', error?.message || '失敗'));
