---
id: haiku-4-5-has-no-latency-control-dial-no-effort-no-adaptive-thinking-no-cli-flag-for-extended-thinking
title: Haiku 4.5 has no latency-control dial (no effort, no adaptive thinking, no CLI flag for extended thinking)
visibility: public
confidence: reproduced
outcome: impossible
tags:
  - haiku
  - latency
  - timeout
  - claude-cli
  - no-workaround
environment:
  os: Windows 11
  arch: x64
  node: 24.14.0
  claude_cli: 2.0+
  model: claude-haiku-4-5
source_project: null
source_session: 2026-04-19T16:11:47.436Z/8c2a3b6fb737
created_at: 2026-04-19
updated_at: 2026-04-19
last_verified: 2026-04-19
---

## Context

Hit while trying to make a per-turn audit daemon responsive enough that users don't notice it. The audit runs Haiku on every UserPromptSubmit and Stop hook; at 30s timeout the tail caught real requests and failed them. Upstream fix (faster Haiku) is unavailable, so the engineering effort shifts entirely to timeout tuning and session reuse.

## Symptom

When `claude -p --model claude-haiku-4-5` responses take 20-30s and you want to trade quality for latency, there is no knob to pull. Passing `--effort low`, `--thinking off`, or similar flags either errors or is silently ignored. The only available remedy is to widen the caller's timeout.

## Cause

Per Anthropic docs, Haiku 4.5 does not support the `effort` parameter and does not support adaptive thinking. It does support extended thinking, but the `claude` CLI exposes no flag to disable or cap it. The model has no first-class mechanism to prefer speed over quality.

## Resolution

Stop trying to speed up Haiku 4.5 itself. Instead: (1) widen caller-side timeouts to 45s+ (bumping 30s→45s cleared a recurring `E_HAIKU_TIMEOUT`), (2) keep IPC-layer timeouts consistent with the model-layer timeout (a hook-IPC=15s while Haiku=30s means the hook gives up before Haiku can respond), (3) reduce prompt size and reuse sessions (`--resume`) so only the first call pays full cold-start.

## Evidence

Observed `E_HAIKU_TIMEOUT: haiku did not respond within 30000ms` in a live audit-daemon session. One turn measured duration_ms=20900 (70% of the 30s budget). After raising to 45s, same prompts completed at duration_ms=24640 (55% of 45s) with headroom. Anthropic public docs confirm Haiku 4.5 does not accept the effort parameter and has no adaptive thinking; the claude CLI has no flag to disable extended thinking for Haiku.
