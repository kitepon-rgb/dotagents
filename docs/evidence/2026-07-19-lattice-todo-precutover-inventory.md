# Lattice TODO pre-cutover inventory

- source commit: `918d72e5e9463644a355738c6e9bc948c5fa6d2d`
- inventory schema: `dotagents.lattice_todo_inventory.v1`
- inventory digest: `4d22d25d574ba367ffe5984742f8ab3792196bc59087f3a88efc333c90f4150c`
- command: `./bin/lattice-todo-inventory.mjs --summary`
- observed: 2026-07-19 JST

## 対象

| source | 未完 | 完了 | 全件 |
|---|---:|---:|---:|
| `plan_factory-master.md` | 34 | 85 | 119 |
| `plan_bughub-factory-integration.md` | 28 | 175 | 203 |
| `plan_codex-full-support.md` | 40 | 39 | 79 |
| `plan_gpt56-rewiring.md` | 6 | 32 | 38 |
| `plan_lattice-factory-integration.md` | 21 | 61 | 82 |
| `plan_observer-factory-integration.md` | 17 | 101 | 118 |
| `queue_memory-promotion.md` | 5 | 12 | 17 |
| **合計** | **151** | **505** | **656** |

scannerはworking treeを読まず、指定commitのGit blobを読む。コードフェンス内を除外し、GFMの
bullet／数字付きlistに加え、このrepoで使う`6a. [x]`型の数字＋英字番号付きcheckboxも数える。
fixtureはdirty working treeの非混入、fence除外、親indent、unsafe path拒否、digest安定性を固定した。

## 旧baselineの訂正

旧記録の全656件は正しかったが、`plan_lattice-factory-integration.md`を未完23／完了59と
転記していた。Control base `c606acd`から本観測commitまで同ファイルのblob差分はなく、
実物は未完21／完了61である。したがって未完153／完了503という旧内訳は状態遷移ではなく
初回分類誤りであり、未完151／完了505へ訂正する。

## 除外と未達

- `docs/archive/`配下のMarkdown 28件はsource集合へ入れない。
- 明示supersededの`docs/plan_callout-hooks.md`をsource集合へ入れない。
- archive参照だけを残す`docs/plan_elastic-orchestrator.md`をsource集合へ入れない。
- 既存Lattice storeは`factory-master` 110 tasksであり、source 119件との一意対応は未達である。
- 本証拠はpre-cutover censusである。実storeを書き換える直前に同じscannerを再実行し、
  source digestと件数が一致しなければ移行を開始しない。
