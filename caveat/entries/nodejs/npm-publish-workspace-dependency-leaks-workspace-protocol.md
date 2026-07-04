---
id: npm-publish-workspace-dependency-leaks-workspace-protocol
title: 'npm publish で workspace:* 依存を残すと、利用者の npm install が EUNSUPPORTEDPROTOCOL で失敗する'
visibility: public
confidence: reproduced
outcome: resolved
tags: [nodejs, npm, pnpm, workspace, publish]
environment:
  npm: ">=10"
  pnpm: ">=10"
source_project: null
source_session: "manual/2026-05-05"
created_at: 2026-05-05
updated_at: 2026-05-05
last_verified: 2026-05-05
---

## Context

pnpm workspace の内部 package を npm registry に公開する。公開対象 package の `dependencies` に `"workspace:*"` が残っている状態で `npm publish` を直接実行した。

## Symptom

publish 自体は成功するが、利用者側または global install 側で失敗する。

```text
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:*
```

`npm view <package> dependencies` で見ると、公開済み package に `"workspace:*"` がそのまま入っている。

## Cause

`npm publish` は pnpm workspace protocol を registry 用の semver range に変換しない。`workspace:*` は pnpm workspace 内でだけ解決できる指定で、npm registry から install する利用者には解決不能。

## Resolution

公開 package の `dependencies` は registry で解決できる semver range にする。

```json
{
  "dependencies": {
    "codex-sidecar-core": "^0.2.0"
  }
}
```

公開前に必ず確認する。

```bash
npm pack --dry-run
npm view <package> dependencies
```

既に壊れた version を publish した場合は、その version を使わず patch version で修正して publish する。npm の公開済み tarball は上書きしない。

## Evidence

`codex-sidecar-cli@0.2.0` と `codex-sidecar-mcp@0.2.1` を `npm publish` した後、`npm install -g caveat-cli@0.13.0 codex-sidecar-cli@0.2.0 codex-sidecar-mcp@0.2.1` が `Unsupported URL Type "workspace:"` で失敗。`npm view codex-sidecar-cli dependencies` も `{ 'codex-sidecar-core': 'workspace:*' }` を返した。

`codex-sidecar-cli@0.2.1` と `codex-sidecar-mcp@0.2.2` で dependency を `^0.2.0` に修正して再 publish し、global install が通った。
