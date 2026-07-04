---
id: claude-code-posttooluse-tool-response-tool-string-object-array-content-block-parse
title: Claude Code PostToolUse の tool_response 形式は tool 種別ごとに string / object / Array<content-block> と変わる — 統一 parse 必須
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-code
  - hook
  - schema
  - post-tool-use
  - type-safety
environment:
  os: win32
  arch: x64
  node: 24.14.0
  claude-code: any
source_project: null
source_session: 2026-04-22T03:39:28.000Z/f1a5ba4b8b0e
created_at: 2026-04-22
updated_at: 2026-04-22
last_verified: 2026-04-22
---

## Symptom

PostToolUse hook で `payload.tool_response.is_error` や `payload.tool_response.content` を単純に読むと、tool によって壊れる。Bash は `{is_error, content: string}` を返すが、MCP tool は content が `[{type:"text", text:"..."}]` の配列、内部 tool は tool_response 自体が string の場合もある。型を一つ想定してコードを書くと、一部 tool のエラーだけ検出できなかったり、content 抽出が空になる。

## Cause

Claude Code の hook payload は SDK 内部の ToolResult を直接渡す。ToolResult は Anthropic Messages API の仕様に準拠し、content が string / Array<Block> どちらも取れる。加えて Claude Code 固有の is_error フラグはオブジェクトラッパの場合のみ存在、string 返しの tool では top-level に載る変種もある。

## Resolution

tool_response を読むときは type guard で分岐する: (1) `typeof response === 'string'` なら生テキスト扱い、(2) Array なら各要素の `item.text`(あれば)を concat、(3) Object なら `response.content` / `response.output` / `response.stdout+stderr` を順に見る。is_error の判定も `response.is_error === true || payload.is_error === true` と両レイヤ見る。

## Evidence

Caveat v0.10 の `apps/cli/src/commands/hookCmd.ts` の `extractToolResponseText` と `isToolError` 関数を参照。実機 Claude Code 0.4.x 系で Bash / Edit / MCP tool すべてで動作することを確認。
