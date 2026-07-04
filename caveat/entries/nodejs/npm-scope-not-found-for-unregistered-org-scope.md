---
id: npm-scope-not-found-for-unregistered-org-scope
title: 'npm scoped package は未作成/無権限 scope だと publish が E404 Scope not found で失敗する'
visibility: public
confidence: reproduced
outcome: resolved
tags: [nodejs, npm, scoped-package, publish]
environment:
  npm: ">=10"
source_project: null
source_session: "manual/2026-05-05"
created_at: 2026-05-05
updated_at: 2026-05-05
last_verified: 2026-05-05
---

## Context

新規 npm package を `@tool-name/core` / `@tool-name/cli` のような scoped package として publish しようとする。npm login は済んでいる。

## Symptom

`npm publish --access public` が `E404 Scope not found` で失敗する。

```text
npm error 404 Not Found - PUT https://registry.npmjs.org/@codex-sidecar%2fcore - Scope not found
npm error 404 The requested resource '@codex-sidecar/core@0.2.0' could not be found or you do not have permission to access it.
```

`npm whoami` は成功しているので認証切れに見えず、package 名だけが問題に見える。

## Cause

npm の scope はただの名前空間ではなく、ユーザー scope または organization scope として存在し、publish 権限が必要。未作成の organization 風 scope に publish しようとすると `Scope not found` になる。

## Resolution

どちらかを選ぶ。

- npm 上で使える自分の user scope / org scope を使う
- 衝突していない unscoped package 名にする
- 事前に `npm view <candidate> version` と `npm view <candidate> name version repository maintainers` で既存 package を確認する

既存の unscoped 名が別作者に取られている場合は乗っ取らない。別名を選ぶ。

## Evidence

`@codex-sidecar/core` / `@codex-sidecar/cli` / `@codex-sidecar/mcp` は `Scope not found` で publish 失敗。unscoped `codex-sidecar` は既に別作者の package だったため使わず、`codex-sidecar-core` / `codex-sidecar-cli` / `codex-sidecar-mcp` に変更して publish した。
