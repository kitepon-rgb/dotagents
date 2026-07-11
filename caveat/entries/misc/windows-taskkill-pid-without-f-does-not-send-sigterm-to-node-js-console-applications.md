---
id: windows-taskkill-pid-without-f-does-not-send-sigterm-to-node-js-console-applications
title: 'Windows: `taskkill /PID` (without `/F`) does not send SIGTERM to Node.js console applications'
visibility: private
confidence: tentative
outcome: resolved
tags: []
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-21T12:10:39.799Z/5b6316139aa1
created_at: 2026-04-21
updated_at: 2026-04-21
last_verified: 2026-04-21
---

## Symptom

`taskkill /PID <node.exe pid>` (no `/F` flag) is rejected with:

```
ERROR: The process with PID <n> could not be terminated.
Reason: This process can only be terminated forcefully (with /F option).
```

`process.on('SIGTERM')` / `process.on('SIGINT')` / `process.on('exit')` handlers all remain silent. No cleanup runs.</symptom>
<symptom>Reproduced 2026-04-21 on Windows 11 + Node.js v24.14.0. Identical behavior whether the Node process was launched by `cmd /c node app.js`, `fork()`, or `spawn()` — anything without a GUI message loop is affected.

Before fix (taskkill /PID): immediate rejection, PID still alive, API server still listening, children untouched.

After fix (HTTP POST /shutdown): stdout shows
```
[logbot] SIGTERM received, graceful shutdown 開始 (exit 1 予定)
[logbot] child scheduler SIGTERM 送信
[logbot] child BellBot SIGTERM 送信
[scheduler] 終了 code: null
[BellBot] 終了 code: null
[logbot] child CameraMonitor taskkill /T /F 完了
[logbot] graceful shutdown 完了、exit 1
```
port released, watcher respawn proceeds cleanly.</symptom>
<cause>Windows `taskkill /PID` without `/F` sends the `WM_CLOSE` window message, which is the GUI application shutdown request path. Console applications have no window / message loop to receive it, so the signal simply never arrives — and the OS returns the "can only be terminated forcefully" error instead of queuing anything.

`/F` exists, but `/F` is equivalent to SIGKILL: no `SIGTERM`/`SIGINT`/`exit` handlers fire, `server.close()` never runs, child processes are orphaned (unless `/T` is added), file handles can linger in TIME_WAIT/FIN_WAIT2, and ports may stay bound for several seconds causing `EADDRINUSE` on the next listen.

Net result: on Windows, there is **no built-in OS mechanism** to trigger a Node.js console app's `SIGTERM` handler from an external process. `process.kill(pid, 'SIGTERM')` from another Node process hits the same wall. `Ctrl+C` only works if you share a console (AttachConsole + GenerateConsoleCtrlEvent), which requires a child-of-your-console relationship.</cause>
<resolution>Expose an HTTP endpoint on the Node process itself that invokes your own graceful shutdown function. Bind it to loopback only (127.0.0.1 / ::1) and require no auth beyond that address check — this is the minimum practical equivalent to a SIGTERM signal on Windows.

```js
// api-server.js
if (req.method === 'POST' && parsed.pathname === '/shutdown') {
  const remote = req.socket.remoteAddress || '';
  if (remote !== '127.0.0.1' && remote !== '::1' && remote !== '::ffff:127.0.0.1') {
    res.writeHead(403); res.end(); return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
  // defer so the response body flushes before server.close()
  setImmediate(() => gracefulShutdown('SIGTERM'));
}
```

External killer (supervisor / health monitor) pattern:

1. `POST http://127.0.0.1:<port>/shutdown` with a ~3s timeout
2. Poll `process.kill(pid, 0)` every 500ms for up to 10s — if it throws ESRCH, process is gone cleanly
3. Only if still alive (or endpoint unreachable): `taskkill /F /T /PID <pid>` as last resort

The `/T` on the final `/F` is important: child processes started via `shell: true` have the actual work (python, etc.) as a grandchild of `cmd.exe`, so `taskkill /F` without `/T` leaves orphans.

Do NOT rely on `SO_REUSEADDR`-style port reuse on Windows: Node doesn't enable it by default. Instead, in the supervisor, poll `Get-NetTCPConnection -LocalPort <n> -State Listen` until empty before respawning the child.</resolution>
<context>Surfaced while building a Node.js watcher/supervisor for a Discord bot on Windows. The original design assumed a standard Unix-style two-stage kill: send SIGTERM first (graceful), escalate to SIGKILL if it hangs. On Linux this works out of the box. On Windows the first stage is silently broken for any console app — the two-stage kill effectively collapses to a single-stage `/F` SIGKILL, which was the root cause of a separate EADDRINUSE respawn loop.</context>
<evidence>Stdout log lines before/after fix (shown in symptom field). Error message is the literal Windows taskkill.exe output. Reproduced on two separate kill attempts within the same session. Confirmed that after adding the `/shutdown` endpoint, all shutdown handlers run in order and the process exits cleanly with code 1.</evidence>
<environment>{"os": "Windows 11 Pro 10.0.26200", "node": "24.14.0", "shell": "cmd / powershell"}</environment>
<category>nodejs</category>
<tags>["windows", "nodejs", "taskkill", "sigterm", "graceful-shutdown", "process-management", "wm-close", "console-app"]</tags>
<confidence>reproduced</confidence>
<outcome>resolved</outcome>
</invoke>

## Cause



## Resolution



## Evidence


