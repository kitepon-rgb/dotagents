---
id: claude-code-1-session-mcp-oauth-flow-state-2-no-oauth-flow-is-in-progress
title: 'Claude Code MCP OAuth: 同一サーバーへの並行 flow 起動で state が上書きされる (他の session 制約は未検証)'
visibility: public
confidence: tentative
outcome: resolved
tags:
  - claude-code
  - mcp
  - oauth
  - state-collision
environment:
  os: linux
  arch: x64
  node: 22.22.1
source_project: null
source_session: 2026-05-03T14:10:00.479Z/46cb66dadf45
created_at: 2026-05-03
updated_at: 2026-05-03
last_verified: 2026-05-03
---

## Symptom

## Symptom

HTTP/SSE MCP サーバーの OAuth 認可フローを進めるとき、`mcp__<name>__complete_authentication` に有効な callback URL を渡しても `No OAuth flow is in progress for <name>` で失敗する。サーバー側は authorize を記録しており code は valid。

**再現条件 (確認済)**: 同一 MCP サーバーに対して、短時間内に複数の flow 起動経路が走った場合 — 例: VSCode 拡張版の MCP servers パネルをユーザーが click (= flow A 起動) しつつ、Claude Code 側でも `mcp__<name>__authenticate` ツールを呼んだ (= flow B 起動) ケース。flow B の callback を complete_authentication に渡してもそれが“進行中フローなし”扱いになる。

## Cause

## Cause

Claude Code の MCP OAuth flow state は **MCP サーバー名でキー付けされた単一スロット** で管理されているように見え、同一サーバーへの 2 回目の flow 起動が前の code_verifier / state を上書きしてしまう。古い callback URL はどの保持されている state とも一致せず「進行中フローなし」と返される。

## Resolution

## Resolution

- **1 つの MCP サーバーの認可は GUI クリック OR `authenticate` ツール、どちらか一方だけで進める**。両方同時に起動しない。これが唯一の確定した回避策。
- `No OAuth flow is in progress` を踏んだら、もう一度 `authenticate` を呼んで新しい URL を発行し、その flow だけを完走させる (古い callback URL は捨てる)。

## Evidence

## Evidence

2026-05-03 image-hub.kitepon.dynv6.net 構築で、mermaid 認可中に MCP servers パネル click と `authenticate` ツール呼び出しが重なったタイミングで `No OAuth flow is in progress` を 3 回連続再現。`authenticate` を 1 経路だけに統一した場合、その flow は完走した。

**未検証**: 「同一 session で `authenticate`→`complete_authentication` を異なる MCP サーバーに対して順次走らせた場合に衡突するかどうか」。同 session の実験で 3 サーバーの token 発行は達成したが、excalidraw / openai-image は VSCode 拡張版の localhost callback 受信者が自動で flow を完了させた経路で、`complete_authentication` ツールは使っていないため、そのパスでの cross-server 衡突の有無は不明。

**未確認**: 1 session 1 flow 制約 (サーバー名キーではなく session 全体で 1 スロット) か、サーバー名ごとスロットかは未確定。
