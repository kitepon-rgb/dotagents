# wv5-0840 受入証拠 — Lattice 0.12.9 release（H）

- 日付: 2026-07-25
- 所有repo: Lattice
- release commit: `2d75289`（`origin/main`の祖先）

## 同一waveで閉じた範囲

gate → version bump → publish → global install → 公開後smoke → 公開証跡記録。

## gate

| gate | 結果 |
|---|---|
| `node --test test/todo-phase-revision-v3.test.mjs` | 30/30 pass |
| `npm test`（product tests） | exit 0 |
| `npm run ci`（test + sensor test + check + project-identity） | exit 0 |
| `npm run verify:release-commit` | `release commit 2d752894e13f is landed on origin/main.` |

## gateが実際に捕まえた欠陥

1. **未着地commitからのpublish**: 最初の実行で `publish対象 ca2e281e472e が origin/main の
   祖先ではありません` として停止。push後に通過した。
2. **dirty working tree**: `npm version patch` が `package-lock.json` も更新していたのに
   `package.json` だけをpathspec commitしていた。gateの `git status --porcelain` 検査が
   `M package-lock.json` を検出して `npm publish` を止めた。gateが無ければ、どのcommitにも
   対応しないpayloadを公開していた。

## publish

- `npm publish --access public` は1回目に registry `E409 Conflict` で失敗した。
  registryを直接確認して未公開であることを確かめてから再実行し、`+ @quolu/lattice@0.12.9`。
- 直後の `npm view` は `0.12.8` を返したが、これはCDN／metadata cacheの伝播ラグだった。
  registry APIを直接polling して `latest = 0.12.9`、`0.12.9 present = True` を確認した。
  **失敗と断定せず再確認する**という共通憲法の指針どおりに処理した。

## global install と公開後smoke

- `npm install -g @quolu/lattice@0.12.9 --prefer-online`（`@latest` はnpm CLIのmetadata cacheが
  古く `notarget` になったため、versionを明示し `--prefer-online` を付けた）
- `lattice --version` = `0.12.9`
- 公開版package `src/todo-store.mjs` に両修理が同梱されていることを確認:
  `mappedPhaseId` 3件、`active_revision_digest: revision.revision_digest` 2件
- 公開版CLIで実storeを読む: `lattice status --json` → cli 0.12.9 / 9 plans、
  `lattice todo phase status --plan aishell-factory-integration` → 9 Phaseの状態を正しく返す
