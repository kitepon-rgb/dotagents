---
id: windows-node-spawn-claude-fails-with-enoent-because-claude-is-a-cmd-wrapper
title: 'Windows: Node `spawn(''claude'', ...)` fails with ENOENT because `claude` is a .cmd wrapper'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - windows
  - nodejs
  - spawn
  - claude-cli
  - cmd-wrapper
environment:
  os: Windows 11
  arch: x64
  node: 22.5+
  claude_cli: 2.0+
source_project: null
source_session: 2026-04-19T16:12:00.770Z/235029d7f278
created_at: 2026-04-19
updated_at: 2026-04-19
last_verified: 2026-04-19
---

## Context

Hit while building a tool-catalog auto-refresh that shells out to `claude mcp list` and `claude -p`. The same code worked fine on macOS during dev, so the Windows-only failure surprised us. This is a general gotcha for any Node program that shells out to the claude CLI on Windows.

## Symptom

On Windows, calling `child_process.spawn('claude', args)` or `execFile('claude', args)` from Node fails immediately with `Error: spawn claude ENOENT`, even though `claude --version` works in the same shell and `claude.cmd` exists on PATH. The process never starts.

## Cause

On Windows, `claude` is distributed as a `.cmd` batch wrapper (not a native .exe). Node's `spawn` without `shell: true` resolves binaries by looking for exact-name executables on PATHEXT order, but it does not locate batch files the same way CreateProcess does from a shell. The spawned process object can't launch a .cmd without a shell interpreter.

## Resolution

On `process.platform === 'win32'`, wrap the invocation as `spawn('cmd.exe', ['/c', 'claude', ...args])` (or pass `shell: true`, though that has quoting pitfalls). On macOS/Linux, `spawn('claude', args)` works directly. Branch the spawn logic on platform — do not globally enable `shell: true`, which re-introduces argument-quoting risks.

## Evidence

Spotter v0.7.0 shipped `spawn('claude', ...)` and on Windows the `spotter db refresh` subcommand died with `spawn claude ENOENT` before any Claude call could occur. macOS users of the same build had no issue. v0.8.0 introduced a Windows branch in `execClaude` / `buildStdioSpawn` that routes through `cmd.exe /c` and the ENOENT disappeared.
