---
id: npm-bin-leading-dot-can-be-stripped-on-publish
title: 'npm publish は bin path の ./dist/... を invalid として削除することがある'
visibility: public
confidence: reproduced
outcome: resolved
tags: [nodejs, npm, bin, publish, cli]
environment:
  npm: ">=10"
source_project: null
source_session: "manual/2026-05-05"
created_at: 2026-05-05
updated_at: 2026-05-05
last_verified: 2026-05-05
---

## Context

npm package に CLI / MCP server の executable を含める。`package.json` の `bin` に `"./dist/server.js"` のような leading `./` 付き path を書いた。

## Symptom

`npm publish` は成功するが、publish 時に warning が出る。

```text
npm warn publish npm auto-corrected some errors in your package.json when publishing.
npm warn publish "bin[codex-sidecar-mcp]" script name dist/server.js was invalid and removed
```

global install 後に期待した command が PATH に出ない、または `npm view <package> bin` に bin が無い。

## Cause

npm publish の package.json auto-correction が `bin` の path を検証し、leading `./` を含む形を invalid として削除するケースがある。publish は成功扱いなので、bin が消えたことに気づきにくい。

## Resolution

`bin` path は leading `./` を付けず、package root からの相対 path を書く。

```json
{
  "bin": {
    "codex-sidecar-mcp": "dist/server.js"
  }
}
```

公開前後に確認する。

```bash
npm pack --dry-run
npm view <package> bin
which <command>
```

既に bin が削除された version を publish した場合は patch version で `bin` を直して再 publish する。

## Evidence

`codex-sidecar-mcp@0.2.0` は `"bin": { "codex-sidecar-mcp": "./dist/server.js" }` で publish したところ、npm が bin を削除した。`0.2.1` で `"dist/server.js"` に修正して再 publish し、`which codex-sidecar-mcp` が `/home/kite/.npm-global/bin/codex-sidecar-mcp` を返した。
