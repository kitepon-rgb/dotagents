# cf-0029 最終反証・CI・公開受入

- 実施日: 2026-07-21
- 対象: `codex-full-support/cf-0029`
- 結論: 最終反証で見つけたdotagents所有の1件を修正し、ローカルCI・GitHub CI・公開同期をgreenで閉じた。

## 反証結果

- 初回公開CI run `29789003295`は、archive済み計画をlive工程検査が読み続ける欠陥を検出した
- `bin/lattice-todo-inventory.mjs`のlive入力からarchive済み計画を除外し、Markdownへの暗黙fallbackは追加していない
- focused inventory test、cutover検査、全`make ci`: green
- cutover検査: `source_count=4`、`checkbox_count=0`
- 修正後GitHub CI run `29789517512`: success
- code-bearing受入SHA: `b1293e29bbc0f1b941daa1ae5f381b035b53763b`
- Mac・main-server・FOX WSL2・FOX Windows native: 同SHA、official install/verify green
- Codex全対応計画: `docs/archive/plan_codex-full-support.md`へ退避済み
- live文書参照: Lattice storeを工程状態の正本として更新済み

## 境界

- Lattice製品repoは変更していない
- Lattice 0.9.0のcarried-done reopen不具合はdotagents `cf-0285`にblockedで保持した
- 廃止済み`codex-rc`は利用していない
- ユーザー所有の未追跡`docs/evidence/fixtures/`は未読・未変更・未stage
- 本task後に残る通常作業は最終報告`cf-0164`だけであり、製品修正は残していない
