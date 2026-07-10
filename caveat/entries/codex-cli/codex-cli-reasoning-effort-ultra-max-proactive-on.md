---
id: codex-cli-reasoning-effort-ultra-max-proactive-on
title: 'Codex CLI: reasoning effort "ultra" は max 推論＋proactive マルチエージェント自動委譲 ON（単なる最高段ではない）'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - codex
  - reasoning-effort
  - ultra
  - multi-agent
  - quota
environment:
  os: macOS
  arch: arm64
  node: 26.4.0
  codex_cli: 0.143.0-0.144.1
  models: gpt-5.6-sol/terra/luna
source_project: null
source_session: 2026-07-10T15:32:14.004Z/020905403b8d
created_at: 2026-07-10
updated_at: 2026-07-10
last_verified: 2026-07-10
---

## Symptom

config.toml や /model で model_reasoning_effort=ultra を選ぶと、会話しているだけなのにサブエージェントが自動 spawn されクォータ消費が急増する。「一番賢い設定にしただけ」のつもりが最上位モデルの子が量産される。

## Cause

ultra は wire 上 max にマップされ（core/src/client.rs: ReasoningEffortConfig::Ultra => Max）、同時に MultiAgentMode::Proactive を有効化する（core/src/session/multi_agents.rs: Ultra => Proactive）。つまり ultra = max 推論＋自動委譲 ON という複合モード。委譲モードを制御する独立の config キーは存在せず effort から導出される（ultra 以外は explicit-request-only）。v0.144.0 で同時8スレッド超に使用量急増警告が追加された。

## Resolution

親（会話）セッションでは ultra を既定にしない。effort を low/medium 等に戻せば自動委譲は explicit-request-only に落ちる。注意: TUI の /model 選択は config.toml へ永続書き込みされるため、一度 ultra を選ぶと明示的に戻すまでピンされ続ける。

## Evidence

openai/codex rust-v0.143.0 ソース実読（client.rs の ultra_reasoning_uses_max_for_requests テスト・multi_agents.rs L52-55）。実端末で gpt-5.5/high→xhigh→gpt-5.6-sol/ultra と config.toml が書き換わった痕跡を確認。
