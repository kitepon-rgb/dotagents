---
id: claude-code-mcp-tool-description-session-hot-reload
title: Claude Code の MCP tool description は session 起動時に固定、hot reload されない
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - mcp
  - claude-code
  - hot-reload
  - session-lifecycle
  - tool-description
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-19T03:55:03.059Z/c8b62e65c2c0
created_at: 2026-04-19
updated_at: 2026-04-19
last_verified: 2026-04-19
---

## Symptom

MCP サーバ側の package を `npm i -g` で更新しても、走行中の Claude Code セッションでは旧 description / schema のまま `tools/list` が返る。新セッションを開くまで AI から見える tool の説明文や required フィールドが古いまま。

## Cause

Claude Code は MCP server プロセスを session start 時に 1 回 spawn して長期保持する設計。package 更新やファイル変更の hot reload は行わない。session 内で `tools/list` を再実行しても、起動済みプロセスから返る古い定義を見るだけ。

## Resolution

Claude Code を quit して新規 session を開く（`/clear` ではプロセス再 spawn しないので不可）。MCP サーバ開発者は description / schema 変更を検証するたびに session を完全に切り替える必要がある。

## Evidence

v0.6.2 で `caveat_record` の visibility を required に追加した直後、同セッション内ではスキーマが更新されず（旧 v0.6.1 プロセス継続）、新セッション起動後に required 反映を確認した。
