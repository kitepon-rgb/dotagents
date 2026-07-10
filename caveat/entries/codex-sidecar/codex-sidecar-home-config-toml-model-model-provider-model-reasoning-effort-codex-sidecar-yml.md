---
id: codex-sidecar-home-config-toml-model-model-provider-model-reasoning-effort-codex-sidecar-yml
title: 'codex-sidecar: 隔離 home は端末 config.toml の model/model_provider/model_reasoning_effort 行を正確に継承する（.codex-sidecar.yml 無しではそもそも動かない）'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - codex-sidecar
  - mcp
  - isolated-home
  - model-inheritance
  - config
environment:
  os: macOS
  arch: arm64
  node: 26.4.0
  codex_sidecar: 0.3.0-0.3.1
  codex_cli: 0.144.1
source_project: null
source_session: 2026-07-10T15:32:49.387Z/5b07013ae8fc
created_at: 2026-07-10
updated_at: 2026-07-10
last_verified: 2026-07-10
---

## Symptom

codex-sidecar MCP（codex_work/codex_explore 等）に model を渡さず委譲すると、隔離 home のはずなのに端末 ~/.codex/config.toml のモデル×エフォート設定（例: 最上位×ultra ピン）でそのまま走り、想定外のクォータ消費・自動委譲が起きる。また対象リポに .codex-sidecar.yml が無いと CONFIG_NOT_FOUND で全ツールが動かない。

## Cause

createIsolatedCodexHome は auth.json 等をコピーした上で、端末 config.toml から model / model_provider / model_reasoning_effort の行だけを抜き出して隔離 home の config.toml に書き込む（codex-sidecar-core app-server-client.ts の minimalCodexConfig）。「隔離＝端末設定を継承しない」という直感と真逆に、一番影響の大きい2〜3キーだけ正確に継承する。sidecar 自身の modelReasoningEffort enum は low/medium/high/xhigh だが、継承経由なら ultra もそのまま通る。加えて .codex-sidecar.yml は対象プロジェクトのルートから必ずロードされ、無いと CONFIG_NOT_FOUND。隔離 home に AGENTS.md はコピーされない（グローバル指示は子に届かない）。

## Resolution

委譲時は model と modelReasoningEffort を毎回明示するか、対象リポの .codex-sidecar.yml に defaults（例: model: gpt-5.6-terra / model_reasoning_effort: medium）を置いて構造的バックストップにする。子への行動規範は委譲プロンプト（委譲契約）で渡す。

## Evidence

/opt/homebrew/lib/node_modules/codex-sidecar-core の app-server-client.ts L467-503（minimalCodexConfig）・codex-sidecar-mcp src/index.ts L171（CONFIG_NOT_FOUND）実読。
