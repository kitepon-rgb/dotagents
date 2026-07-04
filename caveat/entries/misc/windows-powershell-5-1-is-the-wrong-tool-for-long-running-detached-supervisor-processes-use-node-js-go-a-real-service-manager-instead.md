---
id: windows-powershell-5-1-is-the-wrong-tool-for-long-running-detached-supervisor-processes-use-node-js-go-a-real-service-manager-instead
title: Windows PowerShell 5.1 is the wrong tool for long-running detached supervisor processes — use Node.js / Go / a real service manager instead
visibility: public
confidence: tentative
outcome: resolved
tags: []
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-21T13:04:43.046Z/0d82a3f8f761
created_at: 2026-04-21
updated_at: 2026-04-21
last_verified: 2026-04-21
---

## Symptom

A PowerShell 5.1 script intended as a long-running supervisor (e.g. reconnect loop for SSH reverse tunnel, watchdog for a child process, auto-restart wrapper) behaves reliably when tested interactively but fails in production in several compounding ways when launched detached from a parent service (`Start-Process -WindowStyle Hidden`, Node.js `spawn('powershell', [...], {detached: true, stdio: 'ignore', windowsHide: true})`, a Windows service, a scheduled task, etc.):

1. Script "runs" for a fraction of a second, process disappears before its own logger writes anything.
2. After one workaround, it runs through the first iteration but dies on the second.
3. After another workaround, it lives longer but silently gets marked as "alive" by external health checks even though the thing it is supposed to supervise (child ssh, tunnel, etc.) is not running.
4. Total debugging time: days. Each layer looks like a different problem.</symptom>
<cause>Windows PowerShell 5.1 combines several latent traps that only trigger under detached / non-interactive / locale-mismatched spawn conditions. They are individually documented but collectively devastating for the supervisor use case:

1. **BOM-less UTF-8 + non-English locale parse failure**: `powershell -File script.ps1` decodes the script using the system ANSI codepage (CP932 on Japanese Windows, Windows-1252 on English, etc.) when no BOM is present. Any multi-byte UTF-8 character in a comment (em-dash, Japanese text, smart quotes) shifts the parser and produces confusing errors pointing at a bracket several lines away. Interactive dot-sourcing goes through a different loader and hides the bug.
2. **`Write-Host` throws when the host UI is not a real console**: Under detached spawn `$Host.UI` is a non-interactive implementation that throws on write attempts. Combined with the common idiom `$ErrorActionPreference = 'Stop'` at the top of the script, the first `Write-Host` is fatal.
3. **`Start-Process -NoNewWindow -Wait` inside a detached parent is fragile**: The pattern that works when you interactively run the supervisor and spawn a long-running child (ssh, etc.) does not survive multiple iterations in a reconnect loop. The child's stdout pipe, the Start-Process `-Wait` semantics, and the parent's lack of console interact in ways that are hard to reproduce in isolation and can cause the parent to die on the second or third iteration with no logged error.
4. **External "alive" checks that include the supervisor process itself create a race**: If a health monitor decides "tunnel is alive" by checking for `powershell.exe` running the supervisor script, and the supervisor re-spawns every few seconds and dies immediately, there is always an instant where the check succeeds — and the monitor never spawns the actual child (ssh, tunnel, etc.). The supervisor looks dead in one `Get-Process` snapshot and alive in the next.

Each individual trap has a fix (see resolutions). But the effort of debugging all four is much higher than just not using PowerShell 5.1 for this class of problem.</cause>
<resolution>**Preferred: don't build long-running supervisors in Windows PowerShell 5.1.** Use one of:

- **Node.js `child_process.spawn(target, args, {detached: true, stdio: 'ignore', windowsHide: true})`** — what I ended up with. Spawns the child directly without a PowerShell shim. Works with `ssh.exe`, any native binary, or another Node process. Combine with a simple polling loop in the parent (e.g. `setInterval(checkAlive, 60_000)`) to respawn on death. This is what finally made the SSH reverse tunnel supervisor stable after days of PowerShell debugging.
- **Go** or any AOT-compiled language with a proper runtime — fewer encoding / host-context surprises.
- **Windows Service Manager (`sc.exe create`) or Task Scheduler with "run whether user is logged on or not"** — lets the OS handle restart policy instead of hand-rolling it.
- **PowerShell 7+ (`pwsh.exe`)** — UTF-8 by default, different host behavior in some cases. Better than 5.1 but still not great for this pattern.

**If you must use Windows PowerShell 5.1** (no external deps allowed, etc.), do all of the following defensively:

1. Save the script as UTF-8 **with BOM** (`EF BB BF`). Verify with `[System.IO.File]::ReadAllBytes($path)[0..2]`.
2. Keep `$ErrorActionPreference = 'Stop'` for everything except `Write-Host`, which must be wrapped: `try { Write-Host $line } catch { }`. Consider dropping `Write-Host` entirely in favor of `Add-Content` to a log file.
3. Use `Add-Content` (or `[System.IO.File]::AppendAllText`) for all output from the start — do not rely on being able to see anything on stdout/stderr in a detached context.
4. For spawning children, prefer `Start-Process -NoNewWindow` **without** `-Wait`, and track the returned `-PassThru` object with `Wait-Process` in a way that tolerates pipe closure. Better: accept that child supervision is hard and delegate it to the parent (e.g. let Node.js spawn the grandchild directly and skip the PowerShell layer).
5. Do not include the supervisor process itself in external "alive" checks. Check for the actual workload (the child ssh, the listening port, a heartbeat file touched by the child) — never the supervisor, because the race between "supervisor respawning" and "supervisor actually running" is silent and indistinguishable.

Measure success not by `Get-Process` snapshots (which lie during respawn loops) but by:
- The supervisor's log file has fresh entries that span more than one reconnect cycle
- The child process has a `CreationDate` more than a minute old
- The actual workload (port listening, service responding) is observable externally</resolution>
<evidence>Reproduced over ~8 hours of debugging on 2026-04-21 on Windows 11 + PowerShell 5.1 (Japanese locale, CP932). The SSH reverse tunnel supervisor `scripts/ssh-supervisor.ps1` (~70 lines, straightforward reconnect loop) failed in sequence:

- Day 0: `powershell -File supervisor.ps1` fails with `Unexpected token ')'` on line 34 (a valid array-close bracket). Fixed by adding UTF-8 BOM.
- Still day 0: after BOM, supervisor starts but detached spawn dies in <1 second with empty log. Fixed by wrapping `Write-Host` in try/catch.
- Still day 0: after try/catch, supervisor runs through first ssh cycle, logs `start`, `ssh exited code=-1 after 22s`, `reconnect in 5s` — then the log stops and the process dies during the sleep or on the second iteration. Never tracked down the exact cause (some interaction of `Start-Process -NoNewWindow -Wait`, pipe closure on the previous ssh, and detached host context).
- Meanwhile an external health check was "seeing" the supervisor process in `Get-CimInstance Win32_Process` during its death throes and marking the tunnel alive — so the real supervisor (Node.js health monitor) never spawned a replacement ssh.

Final fix: deleted the PowerShell supervisor layer entirely. Node.js health monitor now calls `spawn('ssh', SSH_TUNNEL_ARGS, {detached: true, stdio: 'ignore', windowsHide: true})` directly and polls `ssh.exe` liveness every 60 seconds. This has been stable since the moment it was deployed. No PowerShell intermediary = no traps.

The individual sub-bugs are documented in separate caveats (UTF-8 BOM parse failure, `Write-Host` detached throw). This caveat is the meta-lesson: when two or more of those traps apply simultaneously, the right call is usually to change technology, not to keep patching.</evidence>
<context>The supervisor was part of a Discord bot supervisor/watcher system for a personal AI assistant. The SSH reverse tunnel is required so that a remote MCP (Model Context Protocol) container can reach local HTTP services. The supervisor was originally written in PowerShell because "it's the Windows-native choice" and "autossh is not available on Windows". Both reasons turned out to be wrong: PowerShell 5.1 is not a good tool for this pattern, and Node.js (which was already in the stack for everything else) can spawn ssh.exe directly with no intermediary needed.</context>
<environment>{"os": "Windows 11 Pro 10.0.26200", "shell": "Windows PowerShell 5.1", "locale": "ja-JP (CP932)", "alternative_stack": "Node.js v24.14.0"}</environment>
<category>powershell</category>
<tags>["windows", "powershell", "powershell-5", "supervisor", "watchdog", "detached-process", "reconnect-loop", "ssh-tunnel", "design-decision", "technology-choice", "antipattern"]</tags>
<confidence>reproduced</confidence>
<outcome>resolved</outcome>
</invoke>

## Cause



## Resolution



## Evidence


