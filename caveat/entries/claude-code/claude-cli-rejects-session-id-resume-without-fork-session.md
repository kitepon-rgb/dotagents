---
id: claude-cli-rejects-session-id-resume-without-fork-session
title: claude CLI rejects --session-id + --resume without --fork-session
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-cli
  - session
  - spawn-args
environment:
  os: Windows 11
  arch: x64
  node: 22.5+
  claude_cli: 2.0+
source_project: null
source_session: 2026-04-19T11:11:52.963Z/698f2a1a0f99
created_at: 2026-04-19
updated_at: 2026-04-19
last_verified: 2026-04-19
---

## Context

Hit while building a daemon that calls `claude -p` repeatedly for the same logical conversation. The natural shape — "always pass the id I chose, and resume if it already exists" — is rejected by the CLI.

## Symptom

Spawning `claude -p --session-id <uuid> --resume <uuid>` exits with an error refusing both flags. The two flags cannot coexist on a single invocation unless `--fork-session` is also provided.

## Cause

claude CLI treats `--session-id` (assign a new session id) and `--resume` (attach to an existing session) as mutually exclusive. They can only be combined when `--fork-session` is present, which forks into a NEW session id while seeding it from the resumed one. Without `--fork-session`, you must pick exactly one of the two.

## Resolution

Use a two-phase invocation pattern: on the FIRST call pass only `--session-id <uuid>` (creates the session under your chosen id). On every subsequent call for the same logical session pass only `--resume <uuid>` (no `--session-id`). Track an `isFirstCall` flag in your caller to switch between the two arg sets.

## Evidence

Reproduced when building a long-lived agent that re-attaches to a single Haiku session across many hook events. An early build passed both flags on every spawn and every spawn failed; splitting the args by isFirstCall (pass `--session-id` only on the first call, `--resume` thereafter) made the same workload succeed.
