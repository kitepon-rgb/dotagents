import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

export function windowsOwnerOnlyAclScript() {
  return String.raw`$ErrorActionPreference = 'Stop'
$p = $env:DOTAGENTS_FACTORY_ACL_TARGET
if ([string]::IsNullOrWhiteSpace($p) -or -not (Test-Path -LiteralPath $p)) { throw 'ACL target is invalid' }
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$item = Get-Item -LiteralPath $p
$inherit = if ($item.PSIsContainer) { [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit } else { [Security.AccessControl.InheritanceFlags]::None }
$acl = $item.GetAccessControl('Access')
$acl.SetAccessRuleProtection($true, $false)
foreach ($existing in @($acl.Access)) { [void]$acl.RemoveAccessRuleAll($existing) }
$rule = [Security.AccessControl.FileSystemAccessRule]::new($sid, [Security.AccessControl.FileSystemRights]::FullControl, $inherit, [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow)
[void]$acl.AddAccessRule($rule)
$item.SetAccessControl($acl)`;
}

export function windowsTaskExists(taskName, spawn = spawnSync) {
  const command = `if (Get-ScheduledTask -TaskName '${taskName}' -ErrorAction SilentlyContinue) { exit 0 } else { exit 3 }`;
  const result = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { encoding: 'utf8', timeout: 15_000 });
  if (result.status === 0) return true;
  if (result.status === 3) return false;
  throw new Error(`Windows Task Scheduler照会に失敗しました: ${result.error?.message || result.stderr || result.stdout || `status ${result.status}`}`);
}

export async function writeWindowsTaskXml(file, content) {
  await writeFile(file, Buffer.from(`\ufeff${content}`, 'utf16le'), { mode: 0o600 });
}
