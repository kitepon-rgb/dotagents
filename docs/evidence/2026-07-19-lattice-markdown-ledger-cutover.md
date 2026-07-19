# Lattice Markdown台帳切断 evidence

- 実施日: 2026-07-19 JST
- Lattice候補版: `@quolu/lattice@0.6.5`
- 対象: Lattice登録済み8 plans / 708 source inventory entries

## cutover結果

既にarchive済みだった`lattice-todo-reconciliation`の52件を維持し、残る7 plan・656件を
7つのbounded transactionでToDo単位に移転した。全708 source inventory refは
`docs/archive/`を指し、live 7文書のGFM checkboxは0件である。live文書には思想、背景、判断、
非目標、受入条件を残し、工程状態・依存・証拠の正本をLattice storeへ一本化した。

| plan | operations | revision digest |
|---|---:|---|
| bughub-factory-integration | 203 | `d5c5e57393657f7adb2cae68d23d3ba8c3920dc2da7ab5c54bd877e423965792` |
| codex-full-support | 79 | `e13750595e899970a418155e8b0f7c4121e4f1c8eaba6acca6e4db6a431e2b06` |
| factory-master | 119 | `2ad74df868333a53a8919c1f36e87e0213e0b3dd81afdc195946241accb3b863` |
| gpt56-rewiring | 38 | `9de93632895970fccc52dc9b4cf302a4e79b233bde699620af2e0234dc0b331e` |
| lattice-factory-integration | 82 | `b09aaa8aac7608227333a8be6231673c95dac335465b1930e9dfcfc586769284` |
| memory-promotion-queue | 17 | `b51fbb2041e6107ae53088107363f0c56c6dcbf92a0d07da2ea3507b611d2795` |
| observer-factory-integration | 118 | `08a64804c2221378a5116e46f13c193f133149f586d4d8ea65a3a3b0183559fa` |

## 再導入防止

`shared/constitution.md`はLattice接続projectの責務境界を「工程はLattice、散文はMarkdown」と定め、
archiveからの暗黙再同期を禁止する。`bin/lattice-todo-inventory.mjs --verify-cutover`は対象live文書を
worktreeから読み、code fence外のGFM checkboxを検出すると非0終了する。`make ci`へこのgateとfixtureを
組み込んだ。

## 検証

- Lattice 0.6.5 source CLI `todo verify`: 8 members、全件reconciled、`snapshot_stale=false`
- `todo status`: passed
- `todo gantt`: passed、renderer v7、archive line fragmentのnarrativeを検証
- live source verifier: 7 files / 0 checkbox
- Markdown lint: 0 errors
- `make ci`: passed
- `git diff --check`: passed

global 0.6.4はrevision v2 storeを`STORE_INCONSISTENT`で拒否した。これは公開前の想定どおりの
fail-closedであり、0.6.5 publish/global install後にregistry版smokeを行う。

最初の適用はHTML comment置換が親list構造を崩したため、migration対象pathだけをreverse diffで戻した。
退避は`/tmp/dotagents-cutover-rollback-20260719-1355`に保持し、Lattice側へlist marker保持契約とtestを追加後、
7 transactionを再適用した。

## 公開後gate

- NPM publish: `@quolu/lattice@0.6.5`（tag `latest`、public access）
- registry shasum: `9ab336c84e057dd4acd79767d9449764d516aa99`
- registry integrity:
  `sha512-bDwAxbalry1A5VRB4rCCTecdjCKhWZSKgsUUbZGd+V1c9ETsWaHA8Ww8UXjs1LO0Kse4UtjBpB1ag+syFlvl7A==`
- candidateとregistryのversion、shasum、integrity: 完全一致
- global install: `@quolu/lattice@0.6.5`、`lattice --version` = `0.6.5`
- registry版`todo verify`: 8 members、全reconciled、`snapshot_stale=false`
  - result digest: `2b6e4914b62b031620f14b945dba21c30669f9e67fafc347d305f91c8d5af584`
- registry版`todo status`: passed
  - result digest: `32044bf233a9fd845dd8d67b6a20144dce5a6c63b9c651e56a6563495ccae695`
- registry版`todo gantt`: renderer v7、archive fragment読取を含めpassed
  - result digest: `dc1196d2d5488b6306e2b96eb095de35ba6a60f8690e327a0a289a8a6e73f070`
- live source verifier: 7 files / 0 checkbox
- `verify-install --profile official`: passed

公開後gateはgreenである。
