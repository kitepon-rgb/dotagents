---
id: spotter-v1-2-0-db-global-merge-v1-1-x
title: Spotter v1.2.0 で共通 DB はツール選定コンテキストに載らない（global merge は v1.1.x の旧仕様）
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - spotter
  - mcp
  - claude-code
  - bellbot
  - openclaw
  - tool-db
environment:
  os: Windows 11 Pro
  arch: x64
  node: 24.14.0
  spotter: 1.2.0
  claude_cli: 2.0+
source_project: null
source_session: 2026-04-26T04:23:46.561Z/b87a34c6252a
created_at: 2026-04-26
updated_at: 2026-04-26
last_verified: 2026-04-26
---

## Context

BellBot (`bell-bot.js`、cwd: `~/.bellbot-claude-cwd/`) は LogBot から fork 起動される常駐 Claude Sonnet セッションで、`mcp-config.json` ではなく cwd 配下の project scope `.mcp.json` 経由で `openclaw-tools` (HTTP) と `local-tools` (stdio) を読み込む。初回 tool 呼び出し時に Spotter daemon が共通 DB (`~/.spotter/tool-db.json`) にエントリを書く。OpenClaw メインプロジェクト (`c:/Users/kite_/Documents/Program/OpenClaw/`) は別 cwd だが共通 DB は単一なので、v1.1.x では BellBot が書いたエントリが OpenClaw メインの Spotter 推奨に漏れていた。

## Symptom

Spotter v1.1.x まで daemon が `~/.spotter/tool-db.json` (共通 DB) と `<project>/.spotter/tool-db.json` (プロジェクト DB) を `{ ...global, ...local }` でマージして Haiku のツール選定コンテキストに渡していたため、BellBot CLI 常駐セッション (`~/.bellbot-claude-cwd/`) から共通 DB に書き込まれた `mcp__openclaw-tools__bell_memory_query` 等のエントリが OpenClaw メインセッション (`c:/Users/kite_/Documents/Program/OpenClaw/`) の推奨候補に漏れる、と分析していた。v1.2.0 へのアップグレード後も共通 DB の汚染エントリ（134 件、4/20 21:42 のまま）は物理的に残っているが、OpenClaw メインの推奨には bell_* が出てこなくなった。古い分析メモを引きずったまま「共通 DB を空にすべき」と提案して Quo に「共通DBはSpotterのコンテキストに乗らないようになっています」と押し戻された。

## Cause

Spotter v1.2.0 で daemon の選定コンテキスト構築ロジックが変更され、**共通 DB はツール選定に使われなくなった**。プロジェクト DB のみが Haiku の推奨候補に使われる設計になり、共通 DB は横断キャッシュとしてのみ残る。v1.1.x までは `readMerged` 相当が `{ ...global, ...local }` を返していたが、v1.2.0 で local 単独読みに切り替えられた（前セッションで仮説として挙げていた修正案 2 がそのまま実装された形）。</cause>
<parameter name="evidence">OpenClaw 環境で実測 (2026-04-26):
- `spotter --version` → `spotter 1.2.0`（前は 1.1.4）
- `~/.spotter/tool-db.json` (4/20 21:42 のまま、サイズ 72499) には `mcp__openclaw-tools__bell_compile_topic` / `bell_ingest_source` / `bell_memory_query` 等 openclaw-tools エントリが 134 件残存
- `c:/Users/kite_/Documents/Program/OpenClaw/.spotter/tool-db.json` (4/26 13:06 更新、サイズ 56593) には `bell` を含むキー 0 件
- ベル用 cwd `~/.bellbot-claude-cwd/.spotter/tool-db.json` には `mcp__openclaw-tools__bell_*` がちゃんと居る（正常）
- OpenClaw メインセッションの Spotter 推奨に bell_* は出てこない（Quo の体感確認済み）

## Resolution

v1.2.0 以降、Spotter の推奨に意図しないツールが出てきた時は **プロジェクト DB (`<project>/.spotter/tool-db.json`) を疑う**。共通 DB を空にする/削除する提案はしない（推奨には載らないので無意味、横断キャッシュを壊すだけ）。

ドキュメント更新済み (2026-04-26):
- `c:/Users/kite_/Documents/Program/OpenClaw/CLAUDE.md` の BellBot コンテキスト剥がし節: Spotter local tool-db のツール数を「94 完全一致」→ 実態 119、`claude mcp list` の「2 MCP のみ」→ enterprise MCP 流入も明記、Spotter バージョン要件「v1.1.4」→「v1.2.0 で共通 DB 非搭載化」に更新
- `claude-context/bellbot.md` の MCP 供給経路節と Spotter バージョン要件節も同様に修正
- `~/.claude/projects/c--Users-kite--Documents-Program-OpenClaw/memory/reference_spotter_db_isolation.md` を新規作成し、旧仮説（global merge で漏れる）が陳腐化したことを明示
- `memory/project_bellbot_enterprise_mcp_leak.md` の「残タスク」節を「ドキュメント更新済み」と「Spotter v1.2.0 関連」節に置換
- `memory/MEMORY.md` のインデックスに新規 reference を追加

## Evidence


