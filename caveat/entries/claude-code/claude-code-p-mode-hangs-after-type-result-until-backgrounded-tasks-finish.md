---
id: claude-code-p-mode-hangs-after-type-result-until-backgrounded-tasks-finish
title: Claude Code -p mode hangs after type:result until backgrounded tasks finish
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-code
  - cli
  - stream-json
  - background-task
  - '-p-mode'
  - process-exit
  - timeout
environment:
  os: win32
  arch: x64
  node: 24.14.0
  tool: Claude Code CLI
  invocation: '-p --output-format stream-json'
  platform: cross-platform (hang) / Windows kill-propagation separate issue
source_project: null
source_session: 2026-04-21T23:53:54.028Z/2ebabacd5dff
created_at: 2026-04-21
updated_at: 2026-04-21
last_verified: 2026-04-21
---

## Context

Running Claude Code headless as a monitoring/automation driver: `claude -p --output-format stream-json --verbose` invoked from Node.js via a cross-user PowerShell launcher on Windows (sm-parent isolation), with the Node.js side measuring completion via `child.on('close', ...)`. The hang also occurs on Linux/macOS — Claude Code's background-task wait is not platform-specific, the cross-user kill-propagation issue is Windows-only and separate.

## Symptom

Claude Code CLI launched with `-p --output-format stream-json` emits the final `{"type":"result"}` message and logically completes its turn, but the OS process does NOT exit. A caller that measures completion via `child.on('close', ...)` (or a process-exit timeout) will see the process linger for minutes to hours after the real work is done, causing false "timed out" failures. Killing the parent launcher may also fail to propagate to the Claude Code child on Windows cross-user spawns, leaving orphan processes for additional seconds after the kill.

## Cause

In `-p` (non-interactive) mode, Claude Code's internal Bash tool auto-promotes long-running shell commands to background tasks (visible as `{"type":"system","subtype":"task_updated","patch":{"is_backgrounded":true}}` in stream-json). When the assistant's turn ends and `type:result` is emitted, Claude Code does NOT exit the process while any backgrounded task is still running — it waits for all of them to finish (and will even start a new assistant turn if a task completion notification arrives). If the backgrounded command never self-terminates (e.g. a hung SSH, `podman events` without `--stream=false`, `journalctl -f`, `tail -f`), the Claude Code process stays alive for the entire lifetime of that task. Process exit is therefore NOT a reliable signal of assistant completion in `-p` mode.

## Resolution

Use the stream-json `type:result` message as the completion signal, not process exit. Concretely, in the spawning code: capture every JSON line from stdout, set a `finalResult` flag when `type === 'result'` arrives, and on timeout check that flag — if it's set, resolve the spawn as success regardless of whether the OS process has exited. If not set, only then reject with a genuine timeout. Secondarily, avoid streaming commands without self-termination flags inside prompts Claude might execute (e.g. `podman events --stream=false`, `journalctl --since X --until Y` without `-f`, or wrap with `timeout N ...`).

## Evidence

Reproduced 2026-04-22: a daily patrol completed at 04:10:13 JST (first `type:result`, `stop_reason=end_turn`, `num_turns=44`, `is_error=false`, duration_ms=613733), but the `podman events --since X --until Y` command Claude had backgrounded (`task_id=bdcdxs9of`, `is_backgrounded:true`) did not finish until 05:00:10 JST — 51 minutes later. The Node.js wrapper's 60-minute process-exit timeout fired at 05:00:00 and sent a false "process timed out" escalation, even though the assistant turn had succeeded 50 minutes earlier. Stream-json transcript and task lifecycle messages in the captured `.out` file confirm both the early result and the waiting-on-background-task behavior.
