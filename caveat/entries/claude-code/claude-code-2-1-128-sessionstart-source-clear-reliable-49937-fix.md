---
id: claude-code-2-1-128-sessionstart-source-clear-reliable-49937-fix
title: 'Claude Code 2.1.128 で SessionStart source=''clear'' が reliable に — 過去 #49937 fix 済み'
visibility: public
confidence: tentative
outcome: resolved
tags:
  - claude-code
  - hooks
  - session-start
  - source
  - clear
  - vscode-extension
  - auto-handoff
environment:
  os: linux
  arch: x64
  node: 22.22.1
  host: Claude Code (VSCode native extension + terminal CLI)
  verified_version: 2.1.128
  verified_on: 2026-05-08
  platform: linux/wsl2
source_project: null
source_session: 2026-05-08T13:41:17.304Z/fbd2af9ddd1c
created_at: 2026-05-08
updated_at: 2026-05-08
last_verified: 2026-05-08
---

## Context

Claude Code hooks plugin の設計検討中、auto-handoff (/clear で自動引継ぎ) の実装可否判断のため source='clear' の reliability を検証。過去 (2026-04 時点) は VSCode 拡張 2.1.112 で startup に潰れるバグがあった。実機検証で 2.1.128 では fix 済みと確認、auto path を default ON にできた。

## Symptom

Claude Code の hooks plugin で /clear 後の SessionStart を識別する場合、過去 (2026-04 時点 VSCode 拡張 2.1.112 など) は payload の source field が startup に潰れて clear 識別ができなかった (anthropics/claude-code#49937)。これがいつ fix されたか、および現行で reliable に source='clear' を取れるかが未確定だと、auto-handoff 設計や source 値判定ロジックの実装方針が決められない。

## Cause

Claude Code v2.1.105 で VSCode extension 側の `/clear not clearing conversation context fix` が入り、v2.1.126 で Windows の SessionStart hook env files が apply されるよう修正された。これらが段階的に fix を進め、v2.1.128 (Linux/WSL2 / VSCode native extension で実機検証) では SessionStart hook payload に source='clear' が安定して乗ることを確認できた。</cause>
<parameter name="resolution">Claude Code 2.1.128 (またはそれ以降) を使う環境では `source='clear'` を auto-handoff trigger として使って良い。実機検証手順: VSCode で新 chat → 1 msg 送信 → `/clear` → 1 msg 送信 → SessionStart hook の log で source 値を確認。`/clear` 後 source='clear' を auto-handoff trigger にする auto path を default ON にできる。古い Claude Code バージョン (< 2.1.105) では auto path が発火しないので明示的な引継ぎ経路が要る。

## Resolution



## Evidence

1. 実機ログ (Linux/WSL2, Claude Code 2.1.128): SessionStart hook log に 2026-05-08 12:26:08.481Z source="startup" (新 chat) と 12:26:52.257Z source="clear" (/clear 後) の両方が記録された。 2. Claude Code 公式 hooks docs (https://code.claude.com/docs/en/hooks) の SessionStart payload source field に startup / resume / clear / compact が列挙されている。 3. Claude Code changelog v2.1.105: "Fixed `/clear` not clearing conversation context (VSCode)"。 4. Claude Code changelog v2.1.126: "CLAUDE_ENV_FILE and SessionStart hook environment files now apply (Windows)" — 以前は no-op だった。 5. anthropics/claude-code#49937 (2026-04 時点未解決だった): 上記 fix で実質的に解決済み。</evidence>
<parameter name="confidence">confirmed
