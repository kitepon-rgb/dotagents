---
id: vscode-native-claude-code-extension-process-ppid-points-to-a-short-lived-wrapper-breaking-parent-watch-loops
title: 'VSCode native Claude Code extension: `process.ppid` points to a short-lived wrapper, breaking parent-watch loops'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - vscode
  - claude-code
  - process-ppid
  - daemon
  - parent-watch
  - heartbeat
environment:
  os: Windows 11
  arch: x64
  node: 22.5+
  ide: VSCode + Claude Code native extension
  claude_cli: 2.0+
source_project: null
source_session: 2026-04-19T16:12:17.772Z/18a5b9333fd5
created_at: 2026-04-19
updated_at: 2026-04-19
last_verified: 2026-04-19
---

## Context

Hit while building a long-lived per-session daemon that must clean itself up when Claude Code exits (SessionEnd hook doesn't fire on crash/kill/IDE reload). The initial design assumed `process.ppid` at spawn time was the IDE/CLI host; that assumption is true in terminal Claude Code but false in the VSCode extension because of how the extension forks hook subprocesses.

## Symptom

A child daemon uses `process.kill(parentPid, 0)` on an interval to detect if Claude Code is gone. Passed `--parent-pid process.ppid` at spawn time, the daemon self-terminates with `ESRCH` within ~5 seconds of startup — even though the user's Claude Code session is still active and the extension is still running.

## Cause

Inside the VSCode native Claude Code extension, `process.ppid` does not resolve to the long-lived extension host or IDE process. It resolves to a short-lived wrapper/launcher that forks the hook subprocess and then exits. A child that snapshots `process.ppid` at spawn and watches it will see the wrapper die almost immediately and mistake that for "Claude Code exited." CLI terminal Claude Code does not have this problem; the symptom is VSCode-native only.

## Resolution

Do not rely on `process.ppid`-based parent liveness for daemons spawned from VSCode-native Claude Code hooks. Use an app-level heartbeat instead: arm a self-shutdown timer (e.g., 30 minutes) on daemon start, and reset it every time the daemon receives a hook envelope. No OS/platform branching required, and it degrades cleanly on any IDE or CLI host. Pair with an auto-resurrect path on the hook side (detect `E_UNREACHABLE` and respawn) so a false self-shutdown costs only one extra spawn latency on the next user input.

## Evidence

Spotter v0.6.2 shipped `--parent-pid` watch (5s ping interval). Worked in terminal Claude Code. In VSCode native extension, 8 of 9 daemons observed across sessions self-terminated within seconds of spawn with ESRCH in their logs, leaving users unprotected. v0.12.0 replaced the watch with a heartbeat-reset scheme (`setTimeout(selfShutdown, 30min)` re-armed per envelope) and added UserPromptSubmit auto-resurrect; false self-shutdowns stopped.
