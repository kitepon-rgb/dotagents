---
id: grok-cli-effort-headless-p-tui-effort-grok-4-5-low-medium-high-composer
title: 'grok CLI: --effort は headless（-p）専用で対話 TUI では無視される。モデル別 effort 対応もまちまち（grok-4.5=low/medium/high・composer=非対応）'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - grok
  - composer
  - reasoning-effort
  - headless
  - aiterm
environment:
  os: macOS
  arch: arm64
  node: 26.4.0
  grok_cli: 0.2.87
  models: grok-4.5 / grok-composer-2.5-fast
source_project: null
source_session: 2026-07-10T15:32:37.472Z/8716acc06f66
created_at: 2026-07-10
updated_at: 2026-07-10
last_verified: 2026-07-10
---

## Symptom

対話 TUI 起動の grok（aiterm 等の PTY 駆動含む）に reasoning effort を指定しても効かない。xhigh/max を渡すと無効値。

## Cause

grok CLI の --effort フラグは headless（-p）専用で、対話 TUI では警告を出して無視される（~/.grok/README.md 明記）。さらにサーバカタログ上 grok-4.5 の supported effort は low/medium/high の3段のみ（既定 high・xhigh/max 不在）、grok-composer-2.5-fast は effort 非対応。aiterm-mcp の grok_agent/composer_agent は enum に xhigh/max を含み対話 TUI 起動なので、reasoning_effort 指定は実質 no-op になり得る。

## Resolution

effort を効かせたい非対話委譲は grok -p（headless）で --effort low|medium|high を使う。対話 TUI では /model 等セッション内操作に頼る。ラッパーツールの enum は実カタログに合わせる。

## Evidence

~/.grok/README.md（--effort headless 専用の明記）・~/.grok/models_cache.json（supports_reasoning_effort と段数）・aiterm-mcp dist/core.js（enum と --effort 付与ロジック）実読。
