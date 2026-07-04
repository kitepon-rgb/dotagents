---
id: codex-cli-hooks-posttooluse-payload-omits-tool-outcome-no-exit-code-status-failed-apply-patch-fires-no-posttooluse-at-all
title: 'Codex CLI hooks: PostToolUse payload omits tool outcome (no exit code/status); failed apply_patch fires no PostToolUse at all'
visibility: public
confidence: reproduced
outcome: impossible
tags:
  - codex
  - codex-cli
  - hooks
  - PostToolUse
  - PreToolUse
  - exit-code
  - apply_patch
  - update_plan
  - hook-trust
environment:
  os: macOS 15 (Darwin 25.5.0)
  arch: arm64
  node: 26.0.0
  tool: codex-cli
  version: 0.136.0
  model: gpt-5.5
source_project: null
source_session: 2026-06-05T03:51:15.763Z/e522ac68e774
created_at: 2026-06-05
updated_at: 2026-06-05
last_verified: 2026-06-05
---

## Context

Building an app that maps coding-agent hook events to game state and needed to detect tool failure cross-provider (Claude vs Codex). Claude cleanly separates outcome by EVENT NAME (PostToolUse = success, PostToolUseFailure = failure). Codex has no PostToolUseFailure event and no outcome in the payload, so the same detection cannot be ported. Reproducing requires being able to observe Codex hooks at all, which has its own gotchas: (1) Codex hooks need PERSISTED trust — `codex exec` will NOT fire untrusted command hooks even with `--dangerously-bypass-hook-trust`; only trusted hooks fire in exec. Interactive `codex` prompts "Do you trust this directory?" then "Hooks need review → Trust all", after which hooks fire. (2) async hooks are unsupported ("skipping async hook ... async hooks are not supported yet") — hook entries must be async:false. (3) feature flag `[features].codex_hooks` is deprecated in favor of `[features].hooks` / `--enable hooks`.

## Symptom

You want to detect whether a tool call succeeded or failed from Codex CLI hook payloads. PostToolUse fires, but its `tool_response` is just the tool's output text — there is no `exit_code` and no `status` field. A failing Bash command and a succeeding one produce structurally identical payloads: `echo HELLO_OK` (exit 0) → tool_response `"HELLO_OK\n"`, and `sh -c 'echo BYE; exit 7'` (exit 7) → tool_response `"BYE\n"`. A silent non-zero exit is therefore indistinguishable from success. Separately, a FAILED `apply_patch` (context mismatch) fires only PreToolUse — no PostToolUse at all (success fires PostToolUse with a string `"Exit code: 0\n...Success. Updated the following files:\nM <file>\n"`).

## Cause

Codex CLI (v0.136.0) hook payloads expose only `tool_name`, `tool_input`, `tool_response`, and session metadata (session_id, turn_id, transcript_path, cwd, model, permission_mode, tool_use_id). `tool_response` is the tool's raw output text, NOT a structured result — it contains no exit code and no success/error flag for Bash. There is no PostToolUseFailure event (unlike Claude Code), so outcome is never carried by event name either. The official docs note 'For Bash, PostToolUse also runs after commands that exit with a non-zero status' — this is true that the event FIRES, but it misleads: the exit code is not included in the payload. For apply_patch, Codex only emits PostToolUse on success (with an 'Exit code: 0...Success' string); a failed apply_patch is treated as not-completed and emits no PostToolUse. Net: tool outcome is simply not surfaced to the hook layer.

## Resolution

Determining tool success/failure from Codex hook payloads is not possible from the payload alone. Workarounds: (a) accept that Codex tool failures are invisible to hooks and treat all completed tool calls as success; (b) parse the rollout transcript at payload.transcript_path (heavy/fragile). NOTE the reliable positive finding: the plan/todo tool `update_plan` DOES fire both PreToolUse and PostToolUse, and its tool_input carries the full 3-state plan: `{ "plan": [ { "step": "...", "status": "pending|in_progress|completed" } ] }` — so todo/plan state IS observable via hooks even though raw tool outcomes are not.

## Evidence

Captured raw PostToolUse payloads via a project-local .codex/hooks.json command hook dumping stdin, interactive codex 0.136.0, gpt-5.5: Bash `echo HELLO_OK` → tool_response (string) "HELLO_OK\n", no exit_code/status keys; Bash `sh -c 'echo BYE; exit 7'` → tool_response (string) "BYE\n"; Bash `ls /nonexistent` → tool_response (string) "ls: /nonexistent...: No such file or directory\n"; apply_patch success → tool_response "Exit code: 0\nWall time: 0.1 seconds\nOutput:\nSuccess. Updated the following files:\nM target.txt\n"; apply_patch failure (bad context) → PreToolUse fired, PostToolUse did NOT fire. The exec `--json` event stream (a separate channel from hooks) collapses richer info too.
