---
id: claude-code-rewind-fork-conversation-rollback-primitive
title: Claude Code /rewind は fork 動作 — 同 conversation 内 rollback primitive は外部から起動不可
visibility: public
confidence: confirmed
outcome: impossible
tags:
  - claude-code
  - rewind
  - fork
  - context-trim
  - hooks
  - agent-sdk
  - session-design
  - external-api
environment:
  os: linux
  arch: x64
  node: 22.22.1
  host: Claude Code (terminal CLI + VSCode native extension)
  claude_code_version: v2026 series
  verified_on: 2026-05-08
  platform: linux/wsl2
source_project: null
source_session: 2026-05-08T12:12:59.133Z/2bd312f3b12e
created_at: 2026-05-08
updated_at: 2026-05-08
last_verified: 2026-05-08
---

## Context

Claude Code hooks plugin で、Codex 側の guarded current-thread trim (app-server の thread/rollback + thread/inject_items) と思想の対称性を保つため、Claude 側にも同 thread を破壊的に trim する CLI を実装しようとしてつまずいた。実装は走り終わったが、/rewind Continue が Fork and rewind 確認画面を出すのを実機で見て、同 thread mutation ではなく fork であることが判明。新 session id になるなら既存の baton + SessionStart 注入経路がそのまま動くため、Claude 側 trim CLI は等価機能 = dead code になり、全 revert した。

## Symptom

Claude Code 用に Codex thread/rollback + thread/inject_items 相当の「同 thread 内 context trim + curated memory 注入」を外部 CLI から実装しようとしても等価機能を作れない。/rewind conversation only は新 fork session id を生成するため、結果は /clear + 既存 baton/SessionStart 注入経路と機能的に同じ。Codex 側との「思想の対称性」を追って Claude 側に別 CLI surface (trim --execute --host claude 等) を追加しても dead code にしかならない。

## Cause

Claude Code の /rewind は picker 確認画面で 'A new forked conversation will be created after rewinding' と明示している通り、同 session id 内で末尾 N turn を破壊的に削るのではなく新 conversation を fork する設計。一方 Codex app-server には thread/rollback (同 thread の model-visible history を破壊的に短縮) + thread/inject_items (same thread に developer message を追加) という primitive があり、これらは external app-server protocol で叩ける。Claude Code には対応する external API が無い: /rewind は UI コマンド (Esc-Esc または /rewind 入力で picker overlay)、Agent SDK の rewindFiles() は file checkpoint 専用、resume_at/history_override 系は feature request 段階 (anthropics/claude-agent-sdk-python#690)、hooks の additionalContext も追加方向のみで context 削減は不可、transcript JSONL を offline 編集しても in-memory state が authoritative なため反映されない。設計上 sessions は append-only JSONL で immutable (auditability/replay/cross-host resume を保証する choice)。

## Resolution

Claude 側で同 conversation 内 rollback primitive を実装しようとしないこと。/rewind も /clear も結果は新 session id 開始 → SessionStart hook 発火になるため、既存の baton + SessionStart 注入経路で十分。Codex 側の app-server thread/rollback + thread/inject_items のような同 thread mutation は Claude に写像できないと honest に認め、Claude 側には別 CLI surface を追加しない。hooks plugin で Claude 側でも guarded current-thread trim を実装しても、ユーザーから見ると既存の引継ぎコマンドの単なる alias になるだけで dead code 化する。

## Evidence

1. /rewind picker (実機 VSCode native extension): Fork and rewind 見出し + A new forked conversation will be created after rewinding 文言を直接観測。 2. https://code.claude.com/docs/en/checkpointing — checkpoint / rewind 仕様。 3. https://code.claude.com/docs/en/commands — /rewind (/checkpoint, /undo alias) は session-level slash command でしかなく、CLI flag として外部から叩く方法なし。 4. https://github.com/anthropics/claude-agent-sdk-python/issues/690 — resume_at (message UUID で fork) feature request、未実装。 5. Claude Code v2026 Hooks reference (code.claude.com/docs/en/hooks): UserPromptSubmit / SessionStart / PreCompact 含む 20+ hook どれも model-visible context を削減する primitive を提供しない。 6. claude --help 出力: --fork-session / --resume / --continue はすべて append/branch 操作で destructive primitive 無し。--input-format stream-json IPC schema にも message rewind type 無し。 7. transcript JSONL は cached in memory once loaded で、external edit は live session に反映しない。
