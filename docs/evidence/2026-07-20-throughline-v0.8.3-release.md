# Throughline v0.8.3 release acceptance

- 対象: Codex Desktop handoff deep-link と SQLite 初期化競合修正
- オーナー受入: 2026-07-20 に「スルーラインは対応終わり」と明示
- source repo: `kitepon-rgb/Throughline`
- source HEAD: `1bdd876`（`origin/main` と同期、worktree clean）
- feature commit: `9c62d79`（Codex Desktopでハンドオフ先を開く）
- contention fix: `e2ea3f4`（並行hookのDB初期化競合を待機する）
- release tag commit: `8e8db4d`（`v0.8.3`）
- release evidence commit: `1bdd876`
- CI: GitHub Actions run `29704886111`、9/9 green（Throughline正本記録）
- npm: `throughline@0.8.3` が `latest`
- npm shasum: `cf4f71fa4cba2158bb1224d38b7f55cc459ab9e5`
- global install: `/opt/homebrew/bin/throughline`
- public smoke: `throughline --version` が `0.8.3`

## 判定

Codex Desktop handoff deep-link とDB初期化競合修正は、同じv0.8.3 release waveで
source、CI、npm公開版、global install、公開後version smokeまで閉じている。
オーナーの実Desktop受入完了報告と合わせ、dotagents工程表の両項目を完了とする。
