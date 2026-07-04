---
id: claude-code-hook-matcher-tool-name-tool-response-is-error
title: Claude Code hook の matcher は tool_name にしか適用されない — tool_response.is_error で事前に絞ることは不可能
visibility: public
confidence: confirmed
outcome: impossible
tags:
  - claude-code
  - hook
  - settings
  - schema
environment:
  os: win32
  arch: x64
  node: 24.14.0
  claude-code: any
source_project: null
source_session: 2026-04-22T03:39:12.933Z/dcdab912e30e
created_at: 2026-04-22
updated_at: 2026-04-22
last_verified: 2026-04-22
---

## Symptom

settings.json の PostToolUse エントリで `matcher: "Bash|Edit"` のように tool 名は絞れるが、「tool_response.is_error が true のときだけ起動したい」といった出力条件では絞れない。hook 内で毎回 is_error をチェックするコードを書くしかなく、成功した tool call もすべて hook 起動コスト(Node 起動 + bundle load)を払う。

## Cause

Claude Code の hook matcher 仕様は `matcher: "<regex>"` が tool_name に対する正規表現として評価される単層フィルタ。tool_response / tool_input / timing 等の条件では hook 発火を制御できない。設定レベルではなく、起動した hook プロセス内部で自前 gate する必要がある。

## Resolution

hook スクリプト冒頭で payload を parse し、目的の条件(例: `tool_response?.is_error === true`)に合わなければ速やかに exit 0 する。重い処理(FTS/DB/HTTP 等)はその後に配置。さらに Node 起動コスト自体を削減できないため、Claude Code の中で hook を増やすたびに全 tool call のレイテンシが線形に伸びる点を設計時から織り込む。

## Evidence

Caveat v0.10 実装時に確認。Claude Code settings.json の hooks schema は `matcher` フィールドのみ受け付け、content-based filter は無い。関連: `claude-code-hook-error-false-label` 等の既存 hook 関連罠。
