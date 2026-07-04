---
id: windows-powershell-5-1-silently-fails-to-parse-bom-less-utf-8-scripts-on-non-english-locales
title: Windows PowerShell 5.1 silently fails to parse BOM-less UTF-8 scripts on non-English locales
visibility: public
confidence: tentative
outcome: resolved
tags: []
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-21T12:33:31.631Z/7b7d76f7c9af
created_at: 2026-04-21
updated_at: 2026-04-21
last_verified: 2026-04-21
---

## Symptom

`powershell.exe -File script.ps1` fails with parse errors like `Unexpected token ')' in expression or statement.` pointing at a closing bracket that is obviously valid. Line numbers reported by the error are off by several lines from where the actual problem appears to be. The script runs fine when executed from an interactive PowerShell session via dot-sourcing or `& ./script.ps1`, which makes the bug look intermittent.</symptom>
<cause>Windows PowerShell 5.1 (`powershell.exe`, not `pwsh`) uses the system ANSI codepage to decode a `.ps1` file when no BOM is present. On a Japanese-locale Windows install the default is CP932 (Shift-JIS); English installs use Windows-1252. Any multi-byte UTF-8 character in the script (em-dash `—` = `E2 80 94`, Japanese text, smart quotes, etc.) gets misinterpreted as several CP932 characters, which shifts how the parser tokenizes the rest of the file. The eventual parse error usually points at a bracket or paren several lines past the actual offending byte.

This only affects `-File` invocation. Dot-sourced or `&`-invoked scripts go through a different content loader that respects some heuristics. PowerShell 7+ (`pwsh.exe`) defaults to UTF-8 and is not affected.

Detached spawns (e.g. `Start-Process -WindowStyle Hidden`, Node.js `spawn('powershell', [...], {detached: true, windowsHide: true})`) always use `-File`, so this bug is a silent killer for Windows services / supervisors written in PowerShell 5.1.</cause>
<resolution>Save `.ps1` scripts as **UTF-8 with BOM** (`EF BB BF` at file start). This is the only encoding that works identically in PowerShell 5.1 and 7+, across locales.

One-shot fix from PowerShell:
```powershell
$path = "C:\path\to\script.ps1"
$content = [System.IO.File]::ReadAllText($path, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding $true))
```

Verify:
```powershell
[System.IO.File]::ReadAllBytes($path)[0..2] | ForEach-Object { $_.ToString('X2') }
# Must print: EF BB BF
```

Editor hints:
- VS Code: status bar bottom-right, change encoding to "UTF-8 with BOM", then save.
- Git: `.gitattributes` cannot enforce BOM. Consider a pre-commit hook that checks `.ps1` files start with `EF BB BF`.
- Some text editors (including `Write-Host > file` and Node.js `fs.writeFile` with default options) write BOM-less UTF-8 by default; regenerating PowerShell scripts from these tools re-introduces the bug.

If you cannot add a BOM (e.g. shared repo, Unix tooling), the alternative is to keep the script strictly ASCII (no em-dashes, no Japanese comments, no smart quotes).</resolution>
<evidence>Reproduced 2026-04-21 on Windows 11 with Windows PowerShell 5.1 on a Japanese-locale install. Script `ssh-supervisor.ps1` had an em-dash (`—`, U+2014) in a comment on line 1. Running `powershell -NoProfile -ExecutionPolicy Bypass -File ssh-supervisor.ps1` produced:

```
At line:3 char:1
+ powershell -NoProfile -ExecutionPolicy Bypass -File "...\ssh-supervisor.ps1"
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: ...
    + FullyQualifiedErrorId : NativeCommandError
+ )
+ ~
Unexpected token ')' in expression or statement.
```

Line 34 at that location is literally `)` closing a `$sshArgs = @( ... )` array literal — syntactically valid. After prepending `EF BB BF` via `[System.IO.File]::WriteAllText(..., content, (New-Object System.Text.UTF8Encoding $true))`, the identical file parsed and ran to completion. No other changes were needed.

This bug had been latent for months: the script "worked" whenever a human ran it from a VS Code integrated terminal (which apparently routes through a different loader), and failed silently whenever a supervisor (Node.js `spawn('powershell', [...], {detached: true})` or `Start-Process -WindowStyle Hidden`) tried to spawn it detached. The silence is because a bare `powershell -File broken.ps1` prints the parse error to stderr and exits nonzero, and with `stdio: 'ignore'` / `windowsHide: true` nobody sees or logs it.</evidence>
<context>Discovered while debugging why a Node.js health monitor was respawning a PowerShell SSH tunnel supervisor every 60 seconds without the supervisor ever actually starting. The supervisor's own log file was empty, which was the clue — the script was dying before reaching its first `Add-Content` call. Adding BOM fixed it immediately.</context>
<environment>{"os": "Windows 11 Pro 10.0.26200", "shell": "Windows PowerShell 5.1", "locale": "ja-JP (CP932)", "note": "PowerShell 7+ (pwsh) defaults to UTF-8 and is not affected"}</environment>
<category>powershell</category>
<tags>["windows", "powershell", "powershell-5", "encoding", "utf-8", "bom", "cp932", "shift-jis", "locale", "parse-error"]</tags>
<confidence>reproduced</confidence>
<outcome>resolved</outcome>
</invoke>

## Cause



## Resolution



## Evidence


