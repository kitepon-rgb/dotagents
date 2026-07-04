---
id: claude-code-failed-tools-emit-posttoolusefailure-error-field-not-posttooluse-tool-response
title: Claude Code failed tools can emit PostToolUseFailure with an error field, not PostToolUse tool_response
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-code
  - hooks
  - caveat
environment:
  os: linux
  claude_code: 2.1.128
  observed_date: 2026-05-06
source_project: null
source_session: 2026-05-06T00:00:00.000Z/22222222
created_at: 2026-05-06
updated_at: 2026-05-06
last_verified: 2026-05-06
---

## Context

Caveat expected Claude Code tool errors to arrive through the existing `PostToolUse` hook payload, with `tool_response.is_error` and extractable `tool_response` text. Directly invoking `caveat hook post-tool-use` with a synthetic payload worked, so the bug was only visible in a real Claude CLI session.

## Symptom

A failing Claude Code Bash tool runs, but a Caveat `PostToolUse` hook registered only under `hooks.PostToolUse` never enqueues the tool-error pending reminder. Stream JSON shows `PostToolUseFailure:Bash` hook events instead of a plain `PostToolUse:Bash` event for the failed tool. The failure payload contains top-level `error: "Exit code N\n..."` and does not need a `tool_response` object.

## Cause

Current Claude Code can route failed tool invocations through the separate `PostToolUseFailure` hook event. If an integration registers only `PostToolUse`, or if its parser only checks `tool_response.is_error`, failed tools are silently missed in real operation even though manual hook smoke tests pass.

## Resolution

Register the same post-tool handler under both `PostToolUse` and `PostToolUseFailure`. Keep `PostToolUse` for compatibility and success/non-error payloads. In the handler, classify `hook_event_name === "PostToolUseFailure"` or a non-empty top-level `error` string as a tool error, and use that `error` text as the search text when `tool_response` is absent. Preserve existing env-prefixed commands when adding the failure hook, so per-project hook policy such as `CAVEAT_HOOK_CODEX_SIDECAR=auto` is not dropped.

## Evidence

Reproduced with `claude -p --output-format stream-json --include-hook-events --verbose` on 2026-05-06. Before the fix, the failed Bash tool produced only another hook's `PostToolUseFailure:Bash` JSON echo and no Caveat pending file. After registering Caveat under `PostToolUseFailure` and parsing the top-level `error` field, the failed Bash command spawned Caveat's worker, and the next hook tick surfaced `[caveat] 直前のエラーに一致する可能性のある既知の罠...`; the pending queue for that session drained to zero.
