---
id: claude-spotter-1-2-2-windows-mermaid-openai-image-mcp
title: claude-spotter < 1.2.2 が Windows で mermaid / openai-image MCP の自動収集に失敗する
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - claude-spotter
  - mcp
  - windows
  - spawn
  - cmd-wrapper
  - env-inheritance
  - tool-db
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-27T01:52:42.618Z/36f66930a3f3
created_at: 2026-04-27
updated_at: 2026-04-27
last_verified: 2026-04-27
---

## Symptom

Windows + claude-spotter 1.2.1 以下で `spotter db rebuild` / `spotter db refresh` を実行しても、`.spotter/tool-db.json` に `mcp__mermaid__mermaid_preview` / `mcp__mermaid__mermaid_save` / `mcp__openai-image__generate_image` / `mcp__openai-image__edit_image` が入らない。これらの MCP サーバ自体は Claude Code から `✓ Connected` で正常動作している。

## Cause

Spotter が MCP サーバを子プロセスとして起動し直してツール一覧を取りに行く実装で、Windows 環境向けに 2 つ別々の不具合があった:

1. **mermaid 側**: `claude-mermaid` は npm のグローバルインストールで Windows では `.cmd` ラッパーとして配置される (`%APPDATA%\npm\claude-mermaid.cmd`)。Spotter 側が Node.js の `child_process.spawn` を `shell: false` のまま使っていたため、`.cmd` を直接起動できず `ENOENT` で即死。

2. **openai-image 側**: Spotter が MCP プロセスを起動するとき、Claude Code 設定 (`~/.claude.json`) の `mcpServers.openai-image.env.OPENAI_API_KEY` を子プロセスに引き継いでいなかった。openai-image MCP は起動直後に API key を要求するため、env なしで起動 → 即終了 → ツール一覧の収集に失敗。

どちらも MCP サーバ自体のバグではなく、Spotter 側の MCP 起動コードの欠落。</cause>
<parameter name="resolution">`npm i -g claude-spotter@1.2.2` 以上にアップグレードする。1.2.2 で以下が修正された:
- Windows での `.cmd` / `.bat` ラッパー起動に対応（`shell: true` または `cmd.exe /c` 経由）
- MCP 起動時に Claude Code 設定の `mcpServers.<name>.env` を子プロセスに引き継ぐ

検証手順:
1. `spotter --version` が `1.2.2` 以上
2. `spotter db rebuild` 実行
3. `.spotter/tool-db.json` に上記 4 ツールが含まれることを確認

ダウングレードすると再発する。回避策として `tool-db.json` に手書きでエントリを追加することも可能だが、`spotter db rebuild` で全消去されるので運用負荷が高い。</resolution>
<parameter name="environment">{"os": "Windows", "claude-spotter": "< 1.2.2 (1.2.1 以下で再現)", "node": "Windows 用 npm グローバル", "claude-code": "MCP 設定済み"}

## Resolution



## Evidence

claude-spotter 1.2.1 で `spotter db rebuild` 実行時、`.spotter/tool-db.json` に上記 4 ツールが入らない事象を 2026-04 に直接確認。1.2.2 にアップグレード後 `spotter db rebuild` を再実行したところ、4 ツールが自動収集されることを確認。</evidence>
</invoke>
