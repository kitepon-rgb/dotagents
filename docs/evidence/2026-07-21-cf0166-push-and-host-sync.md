# cf-0166 push・origin同期・4 host収束

- 実施日: 2026-07-21
- 対象: `codex-full-support/cf-0166`
- 結論: dotagents `main`をpushし、origin/main・現役4 hostを同一HEADへ収束、GitHub CIをgreenにした。

## pushとCI

- 初回push HEAD: `f73cfd1cff2901cc3380701bcfb6cb0597fc21f8`
- 初回CI: run `29789003295`、failure
  - 原因: archive済み`docs/plan_codex-full-support.md`がlive工程検査の固定入力に残っていた
  - dotagents所有の`bin/lattice-todo-inventory.mjs`からarchive済み入力を除外
  - focused test、cutover検査、`make ci`: green（`source_count=4`、`checkbox_count=0`）
- 修正後HEAD: `b1293e29bbc0f1b941daa1ae5f381b035b53763b`
- 修正後CI: run `29789517512`、success
- local HEADとorigin/main: 一致

## 端末別同期

| host | HEAD | install / verify | worktree |
|---|---|---|---|
| Mac | `b1293e29` | `verify-install --profile official` green | ユーザー所有fixturesのみ未追跡 |
| main-server | `b1293e29` | official install・verify green | clean |
| FOX WSL2 | `b1293e29` | official install・verify green | clean |
| FOX Windows native | `b1293e29` | Git Bash official install・verify green | clean |

Windowsの先行配布済み`lib/lattice-hook.py`は、pull前にorigin/mainと内容一致を確認した。
対象ファイルだけを一時stashしてfast-forwardし、pulled HEADとstash内容の一致を再確認後、
その一時stashだけをdropした。既存stashや他ファイルは変更していない。

Lattice製品repoは変更していない。廃止済み`codex-rc`は利用していない。
ユーザー所有の`docs/evidence/fixtures/`は未読・未変更・未stageである。
