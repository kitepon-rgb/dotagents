---
id: claude-resume-with-full-preamble-re-sent-every-turn-bloats-session-and-inverts-latency
title: claude --resume with full preamble re-sent every turn bloats session and inverts latency
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-cli
  - session
  - latency
  - prompt-caching
environment:
  os: Windows 11
  arch: x64
  node: 22.5+
  claude_cli: 2.0+
source_project: null
source_session: 2026-04-19T11:12:04.338Z/2592bcdbd3da
created_at: 2026-04-19
updated_at: 2026-04-19
last_verified: 2026-04-19
---

## Context

The trap is that `--resume` looks like a transport-layer optimization ("re-attach to a warm process") but it is actually a server-side transcript continuation. Treating the resumed call as if it were stateless silently destroys the performance you switched to `--resume` to get.

## Symptom

After switching a long-lived `claude -p` caller from cold-start spawns to `--resume`-based session continuation, the SECOND and later turns become SLOWER than the first turn (e.g. first=7.4s, resumed=12.5s, resumed=20.2s). The expected speedup from session reuse never appears and gets worse over time.

## Cause

`--resume` actually appends to the existing session transcript on the server side. If the caller keeps sending the full preamble (system role + JSON schema + tool catalog + few-shot examples) on every turn — as is natural for a stateless-style caller — the session transcript grows by the preamble size each turn. Each subsequent turn pays the cost of re-processing an ever-larger transcript, so latency climbs monotonically.

## Resolution

Adopt a "preamble-once" pattern: send the full preamble (role, schema, catalog, few-shot) ONLY on the first call of a session. On every subsequent `--resume` call, send only the per-turn delta (the new user input, plus any tiny stage marker). Track an `isFirstCall` flag and rebuild the preamble from scratch on session reset (e.g. after role-collapse recovery rotates the session id). Prompt caching benefits remain because the first-turn prefix is stable.

## Evidence

Confirmed by adding `mode=first|resumed, duration_ms=<N>` logging to a Spotter daemon's Haiku caller. v0.5.x always sent the full preamble and produced first=7.4s, resumed=12.5s, resumed=20.2s in real sessions. v0.6.0 split into preamble-once + per-turn delta and resumed-turn duration dropped back below first-turn duration as designed.
