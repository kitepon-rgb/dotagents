---
id: claude-code-stop-hook-input-has-no-final-response-field-must-read-transcript-path-jsonl
title: Claude Code Stop hook input has no `final_response` field — must read transcript_path JSONL
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-code
  - hooks
  - stop-hook
  - transcript
environment:
  os: Windows 11
  arch: x64
  node: 22.5+
  claude_code: 2.0+
source_project: null
source_session: 2026-04-19T11:12:17.602Z/4345d15845a4
created_at: 2026-04-19
updated_at: 2026-04-19
last_verified: 2026-04-19
---

## Context

The trap is that `final_response` is a plausible field name to guess and the hook input does not error on unknown reads — you just get `undefined` and a silently broken pipeline. Documentation does not surface that transcript reading is the only path.

## Symptom

A Stop hook that reads `input.final_response` to get the assistant's last message always sees `undefined`. Any downstream logic (auditing, post-processing, forwarding to another model) silently receives empty text and never sees what the user actually saw.

## Cause

The Stop hook payload does not contain a `final_response` (or equivalent) field with the assistant's last visible text. The only authoritative source is `input.transcript_path`, which points to the session JSONL. The last assistant message — and only its visible text blocks (excluding `thinking` and `tool_use` blocks) — must be extracted from there.

## Resolution

In the Stop hook, read the file at `input.transcript_path`, parse it line-by-line as JSONL, walk backwards to find the last entry whose role is `assistant`, then concatenate only the `text`-type content blocks (skip `thinking` and `tool_use` blocks). That string is the message the user actually saw.

## Evidence

Spotter v0.4.4 had a Stop hook reading `input.final_response`; the downstream Haiku auditor was being fed an empty string on every turn and effectively no-op'd. Replacing the access with a `getLastAssistantText(transcript_path)` helper that reads the JSONL and filters to text blocks restored the expected behavior. Same fix shape was independently used in the Throughline project.
