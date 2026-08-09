# t-publish peertable npm publish（0.3.5→0.3.6） — 完了証跡

## 何をしたか

- peertable repo（`kitepon-rgb/peertable`）: `package.json`の`version`と`room/client.mjs`の
  `MCP_VERSION`を`0.3.5`→`0.3.6`へ同時bump（commit `afed50c`、push済み）。
- `npm publish`を実行。`prepublishOnly`が`verify:release-commit`（既定ブランチ祖先＋clean tree
  確認）と`PEERTABLE_URL= node room/client.mjs diagnostics`（決定45契約の5 check）を自動実行し、
  両方passしてから公開された。
- `git tag v0.3.6`をpush。

## どう確認したか

- 実行前確認をroom `peertable-onboarding`へ投稿し（[65]）、H承認[45]①・
  `docs/evidence/2026-08-10-peertable-wire-v7-H-approval.md`のOperation digest
  （`e3901b8942c5babac0dad8570a73bfe2c534e6d8979cce6f3ae4c61aecad0ea4`）と実行内容の一致を
  確認してから実行した。
- `npm publish`の実行ログで`prepublishOnly`のgate出力を実測: `release commit afed50c308f9 is
  landed on origin/main.`（既定ブランチ祖先gate pass）、`peertable 0.3.6 — ready`
  （version_consistency/bin_integrity/node_runtime/skill_bundle全pass、
  room_reachability=not_applicable＝PEERTABLE_URL未設定時の平常状態）。
- `npm view peertable version`→`0.3.6`（registry実物確認）。
- tarball contentsのnpm notice出力で27 fileが期待どおり含まれていることを確認
  （`skill/`同梱・`room/client.mjs`/`room/server.mjs`含む。不可侵原則どおり`skill/`は
  peertable repo所有のまま、dotagents側への複製はしていない）。

## rollback

不要（gate通過・registry反映・tag push全て成功）。万一rollbackが要る場合は、npmは
unpublishせず`0.3.6`をdeprecateし、global installを`0.3.5`へ戻す（decision45契約自体は
`0.3.5`で既に実装済みのためrollbackしても診断契約は失われない）。

記録者: tsumugi
