---
id: codex-hooks-require-pascalcase-config-keys-and-transcript-backed-exit-codes
title: Codex hooks require PascalCase config keys and transcript-backed exit codes
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - codex
  - hooks
  - caveat
  - codex-sidecar
environment:
  os: linux
  arch: x64
  node: 22.22.1
  codex_hooks: stable true
  observed_date: 2026-05-05
source_project: null
source_session: 2026-05-05T00:00:00.000Z/12daaa70af44
created_at: 2026-05-05
updated_at: 2026-05-06
last_verified: 2026-05-06
---

## Context

Caveat was extended from Claude-only hooks to Codex primary hooks without changing the Claude contract. The primary Codex path calls Caveat CLI directly; codex-sidecar remains a bounded second-opinion or isolated-work route.

## Symptom

When wiring Caveat into Codex native hooks, relying only on app-server schema names like userPromptSubmit, assuming PATH contains the needed binaries, or expecting PostToolUse stdin to include an exit_code can make the hook silently miss work or fail to classify tool errors.

## Cause

Codex hook support exists locally as codex_hooks stable true, but the public docs surface is thin. In captured runs, hooks.json used PascalCase event keys (UserPromptSubmit, PostToolUse, Stop), runtime payload hook_event_name was also PascalCase, UserPromptSubmit context used hookSpecificOutput.additionalContext, Stop block output used decision=block/reason, and Bash PostToolUse failures omitted numeric exit code from hook stdin.

The session transcript eventually contains function_call_output with `Process exited with code N`, but operational smoke on 2026-05-06 showed that the PostToolUse hook may run before that transcript line is visible. A detached worker spawned from the Codex hook also did not reliably leave pending reminders in real Codex runs, even though the same worker path worked when invoked manually.

## Resolution

Install with caveat codex-hook install so hooks.json gets absolute nodePath + cliScriptPath commands and config.toml enables [features].codex_hooks = true. Use session_id, not turn_id or cwd, as the pending-reminder key. For PostToolUse, prefer structured error fields when present; otherwise, for shell-like tools, run a bounded foreground lookup using tool_input plus tool_response and enqueue only when it matches existing Caveat symptoms. Drain Codex pending reminders only through UserPromptSubmit with hookSpecificOutput.additionalContext, not Claude system-reminder text and not Stop.

## Evidence

Captured on 2026-05-05 with Codex reporting codex_hooks stable true. Sanitized fixtures were added under apps/cli/tests/fixtures/codex-hooks/. Real diagnostics after install reported availability=available and installation=installed for UserPromptSubmit/PostToolUse/Stop.

Operational smoke on 2026-05-06: a Codex Bash command that printed the matching symptom text and exited 12 caused PostToolUse to create `/home/kite/.caveat/pending/<session>/...txt`; resuming the same Codex session returned `PENDING_VISIBLE` and the pending queue drained.
