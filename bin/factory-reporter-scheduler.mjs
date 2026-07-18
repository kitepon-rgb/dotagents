#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { chmod, lstat, mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir, platform as hostPlatform } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { readConfig } from '../lib/factory/contract.mjs';

const LABEL = 'com.kite.factory-reporter';
const TASK_NAME = 'dotagents-factory-reporter';
const CRON_MARKER = '# dotagents-factory-reporter';
const UNSAFE_PATH = /[\0\r\n]/;
const NO_CRONTAB = /no crontab(?: for)?/i;
const ABSENT_LAUNCHD = /could not find service|no such process|not found/i;

function emit(value) { process.stdout.write(`${JSON.stringify(value)}\n`); }
function fail(message) { process.stderr.write(`[factory-reporter-scheduler] ${message}\n`); emit({ ok: false, code: 'FACTORY_REPORTER_SCHEDULER_ERROR' }); process.exitCode = 1; }
function safePath(value, name) { if (typeof value !== 'string' || !value || UNSAFE_PATH.test(value)) throw new Error(`${name}に改行またはNULを含められません`); return value; }
function posixQuote(value) { return `'${safePath(value, 'command path').replaceAll("'", "'\"'\"'")}'`; }
function cronQuote(value) { return posixQuote(value).replaceAll('%', '\\%'); }
function xml(value) { return safePath(value, 'XML path').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;'); }
function windowsQuote(value) { return `&quot;${xml(value)}&quot;`; }
function commandError(result, action) { return new Error(`${action}に失敗しました: ${result.error?.message || result.stderr || result.stdout || `status ${result.status}`}`); }

function locations(target, wireMajor) {
  const home = safePath(process.env.HOME || process.env.USERPROFILE || homedir(), 'HOME');
  const local = safePath(process.env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'LOCALAPPDATA');
  const stateName = wireMajor === 'v1' ? 'factory-reporter' : 'factory-reporter-v2';
  if (target === 'win32') return { home, config: join(local, 'dotagents', 'factory-reporter', 'config.json'), state: join(local, 'dotagents', stateName), control: join(local, 'dotagents', 'factory-reporter-scheduler'), legacyStates: [join(local, 'dotagents', 'factory-reporter'), join(local, 'dotagents', 'factory-reporter-v2')] };
  const stateRoot = process.env.XDG_STATE_HOME ? join(safePath(process.env.XDG_STATE_HOME, 'XDG_STATE_HOME'), 'dotagents') : join(home, '.local', 'state', 'dotagents');
  return { home, config: process.env.XDG_CONFIG_HOME ? join(safePath(process.env.XDG_CONFIG_HOME, 'XDG_CONFIG_HOME'), 'dotagents', 'factory-reporter.json') : join(home, '.config', 'dotagents', 'factory-reporter.json'), state: join(stateRoot, stateName), control: join(stateRoot, 'factory-reporter-scheduler'), legacyStates: [join(stateRoot, 'factory-reporter'), join(stateRoot, 'factory-reporter-v2')] };
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!['install', 'uninstall'].includes(command)) throw new Error('使い方: factory-reporter-scheduler install|uninstall [--dry-run|--apply] [--wire-major v1|v2] [--config <file>] [--platform darwin|linux|win32]');
  const options = {};
  for (let index = 0; index < rest.length; index++) {
    const key = rest[index];
    if (key === '--dry-run' || key === '--apply') { const mode = key.slice(2); if (options.mode) throw new Error('--dry-runと--applyは併用または重複できません'); options.mode = mode; continue; }
    if (!['--config', '--platform', '--wire-major'].includes(key) || !rest[index + 1] || options[key]) throw new Error('引数が不正です');
    options[key] = rest[++index];
  }
  const target = options['--platform'] || hostPlatform();
  if (!['darwin', 'linux', 'win32'].includes(target)) throw new Error('--platformはdarwin、linux、win32のいずれかです');
  const wireMajor = options['--wire-major'] || 'v2';
  if (!['v1', 'v2'].includes(wireMajor)) throw new Error('--wire-majorはv1またはv2です');
  if (options.mode === 'apply' && target !== hostPlatform()) throw new Error('--applyは実行中OSと異なる--platformを指定できません');
  return { command, target, config: options['--config'] && safePath(options['--config'], '--config'), wireMajor, dryRun: options.mode !== 'apply' };
}

function platformMatches(profile, target) { return (target === 'darwin' && profile === 'mac') || (target === 'linux' && ['server', 'wsl'].includes(profile)) || (target === 'win32' && profile === 'windows-native'); }
export function stableNodePath(target, executable = process.execPath, exists = existsSync) {
  const node = safePath(executable, 'node path');
  if (target !== 'darwin') return node;
  const match = node.match(/^(\/opt\/homebrew|\/usr\/local)\/Cellar\/node\/[^/]+\/bin\/node$/u);
  if (!match) return node;
  const stable = `${match[1]}/bin/node`;
  if (!exists(stable)) throw new Error(`Homebrew stable Node入口がありません: ${stable}`);
  return stable;
}
function artifact(target, config, location, wireMajor) {
  const node = stableNodePath(target); const runner = join(location.home, '.local', 'bin', wireMajor === 'v1' ? 'factory-reporter-schedule-runner' : 'factory-reporter-v2-schedule-runner'); const log = join(location.state, 'scheduler.log');
  [runner, log, config, location.state].forEach((value) => safePath(value, 'scheduler path'));
  if (target === 'darwin') {
    const file = join(location.home, 'Library', 'LaunchAgents', `${LABEL}.plist`);
    const content = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>${xml(LABEL)}</string><key>ProgramArguments</key><array><string>${xml(node)}</string><string>${xml(runner)}</string><string>--config</string><string>${xml(config)}</string></array><key>StartCalendarInterval</key><dict><key>Minute</key><integer>17</integer></dict><key>StandardOutPath</key><string>${xml(log)}</string><key>StandardErrorPath</key><string>${xml(log)}</string></dict></plist>\n`;
    const domain = `gui/${process.getuid?.() ?? '<uid>'}`; return { file, content, commands: [['launchctl', 'bootstrap', domain, file]], uninstall: [['launchctl', 'bootout', `${domain}/${LABEL}`]], acl: [] };
  }
  if (target === 'linux') {
    const file = join(location.control, 'scheduler', 'factory-reporter.cron');
    const content = `17 * * * * ${cronQuote(node)} ${cronQuote(runner)} --config ${cronQuote(config)} >> ${cronQuote(log)} 2>&1 ${CRON_MARKER}\n`;
    return { file, content, commands: [['crontab', '<managed-crontab-with-entry>']], uninstall: [['crontab', '<managed-crontab-without-entry>']], acl: [] };
  }
  const file = join(location.control, 'scheduler', `${TASK_NAME}.xml`);
  const argumentsText = `${windowsQuote(runner)} --config ${windowsQuote(config)}`;
  const content = `<?xml version="1.0" encoding="UTF-16"?><Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><Triggers><CalendarTrigger><StartBoundary>2026-01-01T00:17:00</StartBoundary><Repetition><Interval>PT1H</Interval><Duration>P1D</Duration><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger></Triggers><Principals><Principal id="Author"><RunLevel>LeastPrivilege</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><StartWhenAvailable>true</StartWhenAvailable></Settings><Actions Context="Author"><Exec><Command>${xml(node)}</Command><Arguments>${argumentsText}</Arguments><WorkingDirectory>${xml(location.home)}</WorkingDirectory></Exec></Actions></Task>`;
  const script = String.raw`$ErrorActionPreference = 'Stop'
$p = $env:DOTAGENTS_FACTORY_ACL_TARGET
if ([string]::IsNullOrWhiteSpace($p) -or -not (Test-Path -LiteralPath $p -PathType Container)) { throw 'ACL target is invalid' }
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$inherit = [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit
$acl = Get-Acl -LiteralPath $p
$acl.SetAccessRuleProtection($true, $false)
foreach ($existing in @($acl.Access)) { [void]$acl.RemoveAccessRuleAll($existing) }
$rule = [Security.AccessControl.FileSystemAccessRule]::new($sid, [Security.AccessControl.FileSystemRights]::FullControl, $inherit, [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow)
[void]$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $p -AclObject $acl`;
  return { file, content, commands: [['schtasks.exe', '/Create', '/TN', TASK_NAME, '/XML', file, '/F']], uninstall: [['schtasks.exe', '/Delete', '/TN', TASK_NAME, '/F']], acl: [['powershell.exe', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script]] };
}

async function ensurePrivateState(target, state, acl) {
  try { const info = await lstat(state); if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('state pathはsymlinkでないdirectoryでなければなりません'); } catch (error) { if (error.code !== 'ENOENT') throw error; await mkdir(state, { recursive: true, mode: 0o700 }); const info = await lstat(state); if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('state pathはsymlinkでないdirectoryでなければなりません'); }
  if (target !== 'win32') { await chmod(state, 0o700); return; }
  const [bin, ...args] = acl[0]; const result = spawnSync(bin, args, { encoding: 'utf8', env: { ...process.env, DOTAGENTS_FACTORY_ACL_TARGET: state }, timeout: 5_000 });
  if (result.error?.code === 'ETIMEDOUT') throw new Error('Windows owner-only ACL設定に失敗しました (acl_timeout)');
  if (result.error) throw new Error('Windows owner-only ACL設定に失敗しました (acl_process_failed)');
  if (result.status !== 0) throw new Error('Windows owner-only ACL設定に失敗しました (acl_apply_failed)');
}

function readCrontab() { const result = spawnSync('crontab', ['-l'], { encoding: 'utf8' }); if (result.status === 0) return result.stdout; if (result.status === 1 && NO_CRONTAB.test(`${result.stderr}\n${result.stdout}`)) return ''; throw commandError(result, 'crontab読取'); }
export function nextCron(current, content, removeOnly) { const managed = content.trimEnd(); const ownedSuffix = ` ${CRON_MARKER}`; const lines = current.split('\n'); while (lines.at(-1) === '') lines.pop(); const kept = lines.filter((line) => !line.trimEnd().endsWith(ownedSuffix)); if (!removeOnly) kept.push(managed); return kept.length === 0 ? '' : `${kept.join('\n')}\n`; }
function replaceCron(content, removeOnly) { const current = readCrontab(); const result = spawnSync('crontab', ['-'], { input: nextCron(current, content, removeOnly), encoding: 'utf8' }); if (result.status !== 0) throw commandError(result, 'crontab更新'); }
function isAbsent(result, pattern) { return result.status !== 0 && pattern.test(`${result.stderr}\n${result.stdout}`); }

// schtasksのconsole出力はOS localeのcodepage（日本語Windowsはcp932）で、UTF-8 decodeすると
// mojibake化して不在文言regexが一致しない。存在判定はlocaleテキストに依存しない
// PowerShell Get-ScheduledTaskのexit codeだけで行う。
function windowsTaskExists() {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', `if (Get-ScheduledTask -TaskName '${TASK_NAME}' -ErrorAction SilentlyContinue) { exit 0 } else { exit 3 }`], { encoding: 'utf8', timeout: 15_000 });
  if (result.status === 0) return true;
  if (result.status === 3) return false;
  throw commandError(result, 'Windows Task Scheduler照会');
}

async function apply(command, target, spec, location) {
  if (command === 'install') {
    await ensurePrivateState(target, location.state, spec.acl); await ensurePrivateState(target, location.control, spec.acl); await mkdir(dirname(spec.file), { recursive: true, mode: 0o700 }); await writeFile(spec.file, target === 'win32' ? Buffer.from(`\ufeff${spec.content}`, 'utf16le') : spec.content, { mode: 0o600 });
    if (target === 'linux') { replaceCron(spec.content, false); await removeLegacyArtifacts(target, location); return; }
    if (target === 'darwin') { const probe = spawnSync('launchctl', ['print', spec.uninstall[0][2]], { encoding: 'utf8' }); if (probe.status === 0) { const stopped = spawnSync('launchctl', spec.uninstall[0].slice(1), { encoding: 'utf8' }); if (stopped.status !== 0) throw commandError(stopped, 'launchd既存scheduler停止'); } else if (!isAbsent(probe, ABSENT_LAUNCHD)) throw commandError(probe, 'launchd scheduler照会'); }
    const [bin, ...args] = spec.commands[0]; const result = spawnSync(bin, args, { encoding: 'utf8' }); if (result.status !== 0) throw commandError(result, `${bin}登録`); await removeLegacyArtifacts(target, location); return;
  }
  if (target === 'linux') replaceCron(spec.content, true);
  else if (target === 'darwin') { const probe = spawnSync('launchctl', ['print', spec.uninstall[0][2]], { encoding: 'utf8' }); if (probe.status === 0) { const result = spawnSync('launchctl', spec.uninstall[0].slice(1), { encoding: 'utf8' }); if (result.status !== 0) throw commandError(result, 'launchd解除'); } else if (!isAbsent(probe, ABSENT_LAUNCHD)) throw commandError(probe, 'launchd scheduler照会'); }
  else if (windowsTaskExists()) { const [bin, ...args] = spec.uninstall[0]; const result = spawnSync(bin, args, { encoding: 'utf8' }); if (result.status !== 0) throw commandError(result, 'Windows Task Scheduler解除'); }
  await rm(spec.file, { force: true }); await removeLegacyArtifacts(target, location);
}

export async function removeLegacyArtifacts(target, location) {
  if (target === 'darwin') return;
  const filename = target === 'linux' ? 'factory-reporter.cron' : `${TASK_NAME}.xml`;
  await Promise.all(location.legacyStates.map((state) => rm(join(state, 'scheduler', filename), { force: true })));
}

async function main() {
  const request = parseArgs(process.argv.slice(2)); const location = locations(request.target, request.wireMajor); const configPath = request.config || location.config;
  if (request.command === 'install') { const config = await readConfig(configPath); if (config.source !== 'file') throw new Error('設定ファイルなしではschedulerを登録しません'); if (!platformMatches(config.host.profile, request.target)) throw new Error(`host.profile=${config.host.profile}は${request.target} schedulerに登録できません`); assertReportingEndpoint(config, request.wireMajor); }
  const spec = artifact(request.target, configPath, location, request.wireMajor); if (!request.dryRun) await apply(request.command, request.target, spec, location);
  emit({ ok: true, command: request.command, dry_run: request.dryRun, platform: request.target, wire_major: request.wireMajor, config: configPath, state: location.state, artifact: spec.file, artifact_content: request.command === 'install' ? spec.content : undefined, commands: request.command === 'install' ? spec.commands : spec.uninstall, acl_commands: spec.acl, reporting_enabled_changed: false, collection_enabled_changed: false });
}
function assertReportingEndpoint(config, wireMajor) {
  if (!config.reporting.enabled) return;
  const expected = `/api/factory/${wireMajor}/reports`;
  let endpoint;
  try { endpoint = new URL(config.reporting.endpoint); } catch { throw new Error('reporting.endpointがURLではありません'); }
  if (endpoint.pathname !== expected) throw new Error(`reporting.endpointは${expected}でなければなりません`);
}
if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) {
  main().catch((error) => fail(error?.message || '失敗'));
}
