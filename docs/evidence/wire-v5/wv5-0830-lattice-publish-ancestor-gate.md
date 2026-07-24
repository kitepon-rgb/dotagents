# wv5-0830 受入証拠 — Latticeへpublish祖先gate導入

- 日付: 2026-07-25
- 所有repo: Lattice
- commit: `b8a492a`

## 適用した裁定

共通憲法「publish・本番deployの対象commitは所有repoの既定ブランチの祖先だけ」と、
AGENTS.md「gate未実装の製品は、次にそのrepoでrelease作業を行うwaveで同時に導入する」。
本waveでLatticeをreleaseするため、ここでgateを導入する。reference実装はAIShell
`scripts/verify-release-commit.mjs`。

## 実装

`scripts/verify-release-commit.mjs` を追加し、`prepublishOnly` へ配線した。
`origin/HEAD` から既定ブランチを解決し、`git merge-base --is-ancestor` で祖先性を、
`git status --porcelain` でworking tree cleanを検証する。

## 実測（gateが実際に止めた）

未pushのHEADで実行した時:

```
publish対象 ca2e281e472e が origin/main の祖先ではありません。
先に既定ブランチへ着地させてpushしてから publish してください。
```

push後に再実行:

```
release commit b8a492af57bc is landed on origin/main.
```

gateは規範を再現し、着地前のpublishを機械的に止めることを実証した。

## 残り

Caveat／Throughline／Spotter／codex-sidecar／gpt-connector／aiterm-mcpは既存裁定どおり、
次にそのrepoでrelease作業を行うwaveで同時導入する。
