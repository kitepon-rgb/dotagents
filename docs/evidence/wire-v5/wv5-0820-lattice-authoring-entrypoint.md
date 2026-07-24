# wv5-0820 受入証拠 — 新規plan authoring入口の記述修正

- 日付: 2026-07-25
- 所有repo: Lattice
- commit: `fdca43a`

## 欠陥

`docs/todo-extraction-v1.md` が「新規planのauthoringには `lattice plan create` を使用する」と
書いていたが、`plan create` は `initializeAuthoredTodoStore` を呼ぶstore初期化専用であり、
既に `.lattice/todo` があるprojectでは `STORE_WRITE_CONFLICT: store_already_exists` を返す。

既存storeへplanを足す実際の入口は `lattice todo migrate --input <extraction JSON>`
（`appendImportedPlan`）だけである。本waveでwire v5 planを作る際に実際に踏んだ。

## 修正

空storeの初回authoring＝`plan create`、既存storeへの追加＝`todo migrate`、Phase付与は
その後の `revise-phase`、と分けて明記した。入力JSONがrepo内でなければならないことも追記した。

## 実測

- 実行して確認: dotagentsで `lattice plan create --input` → `STORE_WRITE_CONFLICT`
- `lattice todo migrate --input docs/migration/aishell-wire-v5.json` → 40 task登録成功
