---
id: powershell-write-host-throws-in-detached-console-less-spawns-with-erroractionpreference-stop-becomes-a-silent-killer
title: PowerShell `Write-Host` throws in detached/console-less spawns (with `$ErrorActionPreference = 'Stop'` becomes a silent killer)
visibility: public
confidence: tentative
outcome: resolved
tags: []
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-21T12:34:08.754Z/c3cbdfc002e3
created_at: 2026-04-21
updated_at: 2026-04-21
last_verified: 2026-04-21
---

## Symptom

A PowerShell script that runs fine in a terminal dies immediately when spawned detached (via `Start-Process -WindowStyle Hidden`, Node.js `spawn('powershell', [...], {detached: true, stdio: 'ignore', windowsHide: true})`, or a Windows service). No error is visible. The script's own log file is empty — execution never reaches the first file-write call. The process appears in `Get-CimInstance Win32_Process` for a fraction of a second, then vanishes.</symptom>
<cause>`Write-Host` writes to the host UI stream (`$Host.UI.WriteLine`). When PowerShell is started without a console (detached + `windowsHide: true` on Windows, or a service context), `$Host.UI` is backed by a non-interactive implementation that **throws** on write attempts instead of silently no-op'ing.

On its own this would just emit a runtime error. The killer combination is:

```powershell
$ErrorActionPreference = 'Stop'
# ... later ...
Write-Host "supervisor starting"  # throws, becomes terminating error, script exits
```

The `Stop` preference promotes the non-terminating `Write-Host` failure to a terminating error. The script dies **before** it reaches any file-logging call, so there is no on-disk evidence of the crash. External observers see a supervisor that "never started" even though `Start-Process` reported success.

This is easy to miss because the same script runs perfectly when invoked from an interactive PowerShell window (where `$Host.UI` is real). The bug only manifests under detached/service spawn, which is exactly the path a supervisor or watchdog uses.</cause>
<resolution>Wrap every `Write-Host` in a try/catch, or remove `Write-Host` entirely from scripts that are intended to run detached:

```powershell
function Write-Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    try { Write-Host $line } catch { }  # no-op when host stream is unavailable
    Add-Content -Path $logFile -Value $line
}
```

This preserves console visibility when someone runs the script interactively, while making detached spawn safe.

Do NOT try to suppress by lowering `$ErrorActionPreference` globally — you lose fail-fast behavior for everything else. Keep `$ErrorActionPreference = 'Stop'` and localize the tolerance to the `Write-Host` call.

Alternative: `Write-Information` or `Write-Verbose` (which respect stream redirection) are safer for scripts that mix interactive and non-interactive use, but they require `-InformationAction Continue` / `$VerbosePreference = 'Continue'` to actually print in a console — so they flip the visibility default the wrong way for operator-facing tools. The try/catch approach is the simplest drop-in.

Verify your fix: spawn the script the way your supervisor does (`Node spawn('powershell', [...], {detached: true, stdio: 'ignore', windowsHide: true})`), wait a few seconds, then check:
1. Process still listed in `Get-CimInstance Win32_Process`
2. Log file has fresh entries
3. `ps` snapshots taken 5s apart show the same PID (no respawn loop)</resolution>
<evidence>Reproduced 2026-04-21 on Windows 11 with Windows PowerShell 5.1. The SSH tunnel supervisor `ssh-supervisor.ps1` had:

```powershell
$ErrorActionPreference = 'Stop'
# ...
function Write-Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    Write-Host $line                        # <-- killer
    Add-Content -Path $logFile -Value $line
}
# ...
Write-Log "[ssh-supervisor] start (args: ...)"   # first log call
```

Symptoms before fix:
- Interactive run: script logs, spawns ssh, reconnect loop works — flawless.
- Supervisor (health monitor) respawn via Node `spawn('powershell', [...], {detached: true, stdio: 'ignore', windowsHide: true})`: process visible in `ps` for ~1 second, then gone. `ssh-supervisor.log` was empty. `ssh.exe` never spawned. Supervisor was respawned every 60 seconds by the health monitor, each attempt dying the same way.

After wrapping `Write-Host` in `try { } catch { }`:
- Detached spawn surviving through multiple iterations.
- `ssh-supervisor.log` populated with `[ssh-supervisor] start (...)`, `ssh exited code=N`, reconnect backoff messages.
- ssh.exe persists, remote port forwards established.

No other changes were needed — the `Add-Content` call that immediately follows `Write-Host` works fine in detached contexts.

Related latent bug on Japanese-locale Windows: the same file was BOM-less UTF-8, which broke `powershell -File` parsing before execution could even reach the `Write-Host` problem. After adding BOM, the parse succeeded and the `Write-Host` crash became the new failure mode. Two-layer silent killer.</evidence>
<context>This bug surfaced while building a supervisor pattern on Windows for a long-running SSH reverse tunnel. The supervisor itself was supposed to be detached from the main application so that crashes of the main app wouldn't take down the tunnel. That design goal is exactly what exposes the `Write-Host` problem — any PowerShell supervisor intended to outlive its launcher must run detached.</context>
<environment>{"os": "Windows 11 Pro 10.0.26200", "shell": "Windows PowerShell 5.1", "note": "PowerShell 7+ (pwsh) has different host stream behavior but the pattern (Write-Host in a `Stop` preference script) is still fragile. Use try/catch defensively."}</environment>
<category>powershell</category>
<tags>["windows", "powershell", "powershell-5", "write-host", "detached-process", "windowsHide", "service", "supervisor", "host-stream", "erroractionpreference"]</tags>
<confidence>reproduced</confidence>
<outcome>resolved</outcome>
</invoke>

## Cause



## Resolution



## Evidence


