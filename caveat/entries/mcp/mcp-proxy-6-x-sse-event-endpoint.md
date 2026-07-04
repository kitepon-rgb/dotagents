---
id: mcp-proxy-6-x-sse-event-endpoint
title: 'mcp-proxy 6.x の SSE モードはリバースプロキシのサブパス越しで動かない (event: endpoint が絶対パスで返る)'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - mcp
  - mcp-proxy
  - sse
  - reverse-proxy
  - streamable-http
  - claude-code
environment:
  os: linux
  arch: x64
  node: 22.22.1
source_project: null
source_session: 2026-05-03T14:09:15.799Z/eb3ca6b3f88d
created_at: 2026-05-03
updated_at: 2026-05-03
last_verified: 2026-05-03
---

## Symptom

mcp-proxy で stdio MCP を SSE 化したコンテナを `https://host/mcp/<name>/sse` のようなサブパスで公開しようとすると、初回 GET は通るが直後の POST が host root の `/messages?sessionId=...` に飛んで 404 になる。Claude Code 側のログには `SSE error: Non-200 status code (404)` のみ出る。リバースプロキシ自体は正しく `/mcp/<name>/sse` を upstream の `/sse` に転送しており、SSE GET の応答ストリームは確立する。問題はその直後。</symptom>
<parameter name="cause">mcp-proxy 6.x の SSE 実装は確立した SSE 接続に対して `event: endpoint\ndata: /messages?sessionId=...` を送る (絶対パス、prefix なし)。Claude Code (および MCP SDK 一般) はこの endpoint URL を SSE URL に対する `new URL(endpoint, sseUrl)` で resolve するため、絶対パスは host root に正規化され、`/mcp/<name>` プレフィックスが消える。結果として client は `https://host/messages?sessionId=...` に POST し、リバースプロキシのマウントを経由せず 404 を受け取る。mcp-proxy 側に prefix を意識させるオプション (`--public-url` 等) は 6.4.6 時点で存在しない。</cause>
<parameter name="resolution">SSE transport を諦めて Streamable HTTP (`/mcp` 単一エンドポイント) に切り替える。mcp-proxy 6.x はデフォルトで `/sse` (SSE) と `/mcp` (Streamable HTTP) の両方を expose しているので、サーバー側コンテナはそのままで OK。リバプロ転送先を `/mcp` に向け、クライアント `~/.claude.json` の `type` を `"sse"` から `"http"` に、URL から `/sse` 接尾辞を削除すれば動く。Streamable HTTP は単一 URL で完結するため relative endpoint URL 問題が発生しない。</resolution>
<parameter name="evidence">claude-cli 側の MCP ログ (`~/.cache/claude-cli-nodejs/<project>/mcp-logs-<name>/*.jsonl`) に `SSE Connection failed after 21ms: SSE error: Non-200 status code (404)`、続く同 URL への直接 curl でも (Bearer 付きで) 404、`mcp-proxy` 6.4.6 のソース `dist/stdio-*.mjs` 内 `startHTTPServer` で `requestUrl.pathname === streamEndpoint` の厳密一致判定 (`event: endpoint` 出力箇所も同モジュール) を確認。</evidence>
<parameter name="environment">{"mcp-proxy":"6.4.6","claude-code":"2.1.126","caddy":"reverse_proxy default","upstream-mcp":"stdio MCP wrapped"}

## Cause



## Resolution



## Evidence


