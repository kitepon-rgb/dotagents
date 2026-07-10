---
id: codex-cli-codex-agents-override-md-agents-md-1
title: 'Codex CLI: ~/.codex/AGENTS.override.md が非空だと AGENTS.md を無言でシャドー（グローバル指示は積層不可・最初の非空1ファイルのみ）'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - codex
  - AGENTS.md
  - override
  - global-instructions
environment:
  os: macOS
  arch: arm64
  node: 26.4.0
  codex_cli: 0.143.0-0.144.1
source_project: null
source_session: 2026-07-10T15:32:19.719Z/d2e02aa8feb4
created_at: 2026-07-10
updated_at: 2026-07-10
last_verified: 2026-07-10
---

## Symptom

~/.codex/AGENTS.md にグローバル指示を配布したのに Codex が全く従わない。エラーも警告も出ない。

## Cause

グローバル指示の候補は [AGENTS.override.md, AGENTS.md] の2つ固定で、最初の非空1ファイルだけが読まれる（連結・積層なし。codex-home/src/instructions/mod.rs）。非空の AGENTS.override.md が存在すると AGENTS.md は完全に無視される。ただし空（trim 後空）の override はフォールスルーする。symlink は stat 追従で読まれる。プロジェクト側（リポルート→cwd）は連結される——グローバル層だけ1ファイル制。

## Resolution

配布検証スクリプトに「AGENTS.override.md が存在かつ非空なら FAIL」チェックを入れる（[ -s ] 判定）。緊急の端末ローカル上書きスロットとしては温存できる。

## Evidence

openai/codex rust-v0.143.0 の instructions/mod.rs 実読で確認。
