---
id: windows-claude-mermaid-mcp-fails-with-spawn-npx-enoent-node-spawn-execfile-cannot-resolve-npx-cmd-or-start-builtin-without-shell-wrapping
title: 'Windows: claude-mermaid MCP fails with `spawn npx ENOENT` — Node `spawn`/`execFile` cannot resolve `npx.cmd` or `start` builtin without shell wrapping'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - windows
  - nodejs
  - spawn
  - execfile
  - npx
  - claude-mermaid
  - mcp
  - cmd-wrapper
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-26T11:38:30.562Z/b2bf56ba3348
created_at: 2026-04-26
updated_at: 2026-04-26
last_verified: 2026-04-26
---

## Symptom

On Windows, `claude-mermaid` MCP (npm global, registered via `claude mcp add --scope user mermaid claude-mermaid`) reports `✓ Connected` but every `mermaid_preview` call returns `Error rendering Mermaid diagram: spawn npx ENOENT`. The MCP process can also crash on first preview because the browser-launch path additionally calls `spawn("start", [url], { detached: true, stdio: "ignore" })` — `start` is a `cmd.exe` builtin (not an executable), so the spawn emits an unhandled `error` event and kills the MCP. Same root cause as the existing caveat for `claude` CLI shelling.</symptom>
<parameter name="cause">Two distinct Windows-specific failures from the same root cause (Node child_process can't launch non-executable targets without a shell):

1. `npx` is distributed as `npx.cmd` (a batch wrapper). `child_process.execFile("npx", args)` without `shell: true` does not consult PATHEXT the way `CreateProcess` does from cmd.exe, so it can't find `npx.cmd`. Affects `handlers.js` (renderDiagram → mermaid-cli invocation).

2. `start` is not an executable at all — it's a `cmd.exe` internal command. `spawn("start", [url], ...)` will always ENOENT on Windows. Affects `handlers.js` (setupLivePreview → browser open) and `serve.js` (gallery open). Compounded by missing `error` event handler on the detached spawn, so the ENOENT crashes the MCP process instead of being silently logged.

Both call sites are inside upstream package `claude-mermaid` (verified against version installed at `C:\Users\kite_\AppData\Roaming\npm\node_modules\claude-mermaid\build\`).</cause>
<parameter name="resolution">Three-site patch in the installed package (lost on `npm i -g claude-mermaid` re-update; re-apply after upgrades and ideally upstream as a PR):

**`build/handlers.js` (renderDiagram, ~line 41)**:
```js
const { stdout, stderr } = process.platform === "win32"
    ? await execFileAsync("cmd.exe", ["/c", "npx", ...args])
    : await execFileAsync("npx", args);
```

**`build/handlers.js` (setupLivePreview, ~line 64)** — also add error handler so ENOENT doesn't kill the MCP:
```js
const child = process.platform === "win32"
    ? spawn("cmd.exe", ["/c", "start", "", serverUrl], { detached: true, stdio: "ignore" })
    : spawn(openCommand, [serverUrl], { detached: true, stdio: "ignore" });
child.on("error", (err) => mcpLogger.warn(`Browser open failed`, { err: err.message }));
child.unref();
```

**`build/serve.js` (startServeMode, ~line 44)**:
```js
if (process.platform === "win32") {
    await execFileAsync("cmd.exe", ["/c", "start", "", galleryUrl]);
} else {
    await execFileAsync(getOpenCommand(), [galleryUrl]);
}
```

Note: `start "" <url>` — the empty quoted first arg is the window title; without it cmd.exe interprets the URL as the title when it contains quotes/special chars.

Avoid `shell: true` here even though it works for safe args — the broader `claude-mermaid` codebase passes user-controlled `background` colors and similar through, and `shell: true` reintroduces argument-quoting risk.

After patching, restart the MCP. If launched as a Claude Code child, killing the running `node ...claude-mermaid\build\index.js` process is enough — Claude Code respawns it on next tool call with the new code loaded.</resolution>
<parameter name="evidence">Reproduced on Windows 11 Pro 26200, Node v22+, claude-mermaid (latest from npm as of 2026-04-26) installed via `npm i -g claude-mermaid` and registered with `claude mcp add --scope user mermaid claude-mermaid`. `claude mcp list` shows `mermaid: claude-mermaid - ✓ Connected` but `mcp__mermaid__mermaid_preview` immediately returns `Error rendering Mermaid diagram: spawn npx ENOENT`. After the three-site patch above and killing PID of the running `node ...build\index.js` (Claude Code auto-respawned it), the same `mermaid_preview` call rendered a Japanese-text flowchart to PNG successfully and `mermaid_save` wrote the file to disk.

Same class of bug already cataloged in this DB as `windows-node-spawn-claude-fails-with-enoent-because-claude-is-a-cmd-wrapper` (claude CLI is also a `.cmd` wrapper). This entry adds two further incarnations: `npx.cmd` and the `start` cmd.exe builtin.</evidence>
<parameter name="context">Hit while building out a Windows operations hub for image-generation MCPs (`claude-mermaid`, `excalidraw`, `openai-image`). The failure mode is silent at the MCP-list level (server reports connected) and only surfaces at first tool invocation, so users assume a config issue and waste time re-registering or reinstalling rather than reading the spawn error.</context>
<parameter name="environment">{"os": "Windows 11 Pro 26200", "arch": "x64", "node": "22+", "package": "claude-mermaid (npm global)", "install_path": "C:\\Users\\kite_\\AppData\\Roaming\\npm\\node_modules\\claude-mermaid"}

## Cause



## Resolution



## Evidence


