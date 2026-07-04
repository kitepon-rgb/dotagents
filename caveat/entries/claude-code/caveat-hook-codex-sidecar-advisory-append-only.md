---
id: caveat-hook-codex-sidecar-advisory-append-only
title: 'Caveat hook に codex-sidecar 助言を足す時は、既存リマインダーを置換せず末尾追記にする'
visibility: public
confidence: confirmed
outcome: resolved
tags: [caveat, claude-code, hooks, codex-sidecar, mcp]
environment:
  runtime: claude-code
  sidecar: codex-sidecar
source_project: Caveat
source_session: "manual/2026-05-05"
created_at: 2026-05-05
updated_at: 2026-05-05
last_verified: 2026-05-05
---

## Context

Caveat の `PostToolUse` worker や `Stop` hook で、従来 Claude に出していた Caveat リマインダーに加えて `codex-sidecar` の second opinion を使いたい。

## Symptom

Codex が使えるようになったからといって、Hook が Codex の判断に寄りすぎると Caveat の思想が変わる。

- 既存の `[caveat]` リマインダーが Codex の文章に置き換わる
- `Stop` hook の発火判定そのものを Codex に委ねる
- Caveat が「いつ何を記録/更新すべきか」を自分で拡張し始める
- 従来の Caveat 利用者が期待する Claude-facing behavior が変わる

## Cause

Caveat の役割は「関連罠を適切なタイミングで浮上させ、Claude が記録/更新を判断できる材料を渡す」こと。`codex-sidecar` は独立した second opinion として価値があるが、Caveat の発火思想や既存リマインダーの契約を置換するものではない。

## Resolution

append-only にする。

- `toolErrorReminderText(hits)` / `stopReminderText(signals, related)` を先頭に維持
- Codex が成功した時だけ末尾に `[caveat:codex-sidecar] Codex advisory:` を追記
- 失敗時は hidden fallback せず `[caveat:codex-sidecar] advisory unavailable: ...` を明示
- `CAVEAT_HOOK_CODEX_SIDECAR=off|auto|require` で制御する
- default `auto` は project root に `.codex-sidecar.yml` がある時だけ試す

この形なら従来の Caveat としての振る舞いは阻害せず、Codex が使える環境だけ助言品質を上げられる。

## Evidence

Caveat v0.13.0 で `PostToolUse` worker と `Stop` hook にこの方式を実装。smoke test で `post-tool-use-worker codex=yes` と `stop-hook codex=yes` を確認。Claude のグローバル設定は npm global の `codex-sidecar` / `codex-sidecar-mcp` を使う形に更新した。
