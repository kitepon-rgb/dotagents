---
id: codex-cli-dangerously-bypass-hook-trust-directory-trust-project-local-hook-trust
title: 'Codex CLI: --dangerously-bypass-hook-trust は directory trust を越えない（project-local hook は trust 承認後に発火）'
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - codex-cli
  - hooks
  - directory-trust
  - aiterm-mcp
  - security
environment:
  os: macOS
  arch: arm64
  node: 26.4.0
  tool: codex CLI
  version: 0.144.1
  via: aiterm-mcp codex_agent
source_project: null
source_session: 2026-07-11T04:45:06.747Z/44ca12840b3a
created_at: 2026-07-11
updated_at: 2026-07-11
last_verified: 2026-07-11
---

## Symptom

未信頼 cwd に project-local .codex/hooks.json を置いて対話 TUI の Codex を起動すると、hook が黙って走るのを心配するが、実際は「Do you trust the contents of this directory?」プロンプトで停止する。--dangerously-bypass-hook-trust を付けても、この directory trust プロンプトは出続ける。aiterm 経由（codex_agent agent_done）では ready-gate がこのプロンプトを自動承認せず、initial_prompt=not_sent / session 保全で止まる。

## Cause

Codex CLI には2つの独立した trust ゲートがある: (1) hook trust review（特定 hook を信頼するか）、(2) directory trust（cwd の project-local config/hooks/exec policy を load するか）。--dangerously-bypass-hook-trust は (1) だけをバイパスし (2) はバイパスしない。プロンプト文言自身が「Trusting the directory allows project-local config, hooks, and exec policies to load」と明示している。directory trust を人手で承認した後は project-local hooks.json が発火する（managed CODEX_HOME の Stop hook と併走。ただし aiterm agent_done の turn_done 帰属は壊れない）。

## Resolution

未信頼 cwd の project hook が黙って走ることはない（directory trust プロンプトが関門で、aiterm の ready-gate は自動承認しない＝安全側で prompt 未送信）。ただし trust を承認した後は cwd 側 hook が動く。運用上は「信頼しない cwd では directory trust を承認しない」のが利用側の責務。agent_done の完了検出は余分な hook が併走しても無傷。

## Evidence

2026-07-11 実測（Codex v0.144.1・macOS）: マーカー touch を仕込んだ project-local .codex/hooks.json を持つ未信頼 tmp dir を cwd に codex_agent(agent_done, model=gpt-5.6-luna) 起動 → TUI が directory trust プロンプトで停止・aiterm は samples=60 で ready=false を返し prompt 未送信。trust を「1. Yes, continue」で承認しターン完走後、マーカーファイルが書かれた（project hook 発火を確認）。rag/sources/completion-detection/codex-cli-stop-hook.md:132,188,192 の Phase 0 メモ（hook trust と directory trust は別・codex exec では project-local hook 不発）を対話 TUI で追実証。
