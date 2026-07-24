# P1受入証拠 — BugHub wire v5実装（非本番）

- 日付: 2026-07-25
- 所有repo: ServerManager
- commit: `bughub`配下10ファイル（schema新設1、src 5、test 3、契約文書1）

## 実装

| ToDo | 内容 |
|---|---|
| wv5-0110 | `bughub/schemas/factory-report-v5.schema.json`。固定13製品required、`additionalProperties: false`。**v4 schemaは`git diff --quiet`で不変を確認** |
| wv5-0120 | `V5_PRODUCT_IDS`と`validateFactoryReportV5`。privacy・semantic検証はv4と同一の`validate`実装を共有し、v5専用の緩い経路を作らない |
| wv5-0130 | `POST /api/factory/v5/reports`を`FACTORY_V5_INGEST_ENABLED=true`明示時だけ公開。既定404 |
| wv5-0140 | 期待値のv5分岐と、実在した乖離2件の修理 |
| wv5-0150 | 保存面はv2/v4と共有（`saveFactoryReportV2`に`version`引数を足し`saveFactoryReportV5`が委譲）。v4履歴を削除も移動もしない |
| wv5-0160 | `factory-view.js`の`aishell`は既にrepository登録済み。`factory-safe-context-v1.json`の`aishell` allowlistは空のまま維持 |
| wv5-0170 | test 10本追加 |
| wv5-0180 | BugHub full test 88/88 pass |

## 修理した乖離2件（反証が掘り当てたもの）

### lattice — live影響あり

`factoryExpectation()`のv2分岐が`['lattice','aishell']`を無条件`optional`へ落としていた。
wire v4のreportは`ingestFactoryReportV4` → `saveFactoryReportV2` 経由で`version='v2'`として
評価されるため、**wire v4で必須製品へ昇格させたはずのLatticeが永久にoptionalのまま**だった。

live実測（修理前）: BugHub matrixで`fox-wsl`の`lattice`は`missing`。expectation issueは0件。
**必須コア製品の欠落が4 hostのうち1台で黙って見逃されていた。**

修理後は`lattice`が`required`へ落ちる。回帰testを追加した
（「enroll済みlatticeの欠落はwire v4以降でhigh expectationになる」）。

### codex-cli windows-native — 文書間の矛盾

実装は`unsupported`、dotagents正本matrixは`required`だった。
`bughub/FACTORY_INTEGRATION.md`も`unsupported`と書いており、**2つのrepoの文書が矛盾**していた。
AGENTS.mdは「server期待matrixはdotagents正本と一致させる」と定めているため正本へ揃え、
ServerManager側の記述も訂正した。live実測でwindows-workstationの`codex-cli`は
`installed@0.144.6`であり、正本（required）が実態と合っている。

既存testはこの誤った期待を固定していたため、意図した新挙動へ更新した
（`claude-code`と`grok-build`だけ除外し、`codex-cli`の欠落はissueにする）。

## v5で追加した意味論

`required` + `not_applicable`をexpectation issueにしない。従来は`installed`でのみresolveし
`not_applicable`はhigh issueになっていた。AIShellはApple Silicon専用で、host profileの粒度が
archを区別しないため、Intel Macはmac profileのまま`not_applicable`を報告する。
製品が構造的な非対応を宣言した状態を欠落へ読み替えない。

## gate

| gate | 結果 |
|---|---|
| `node --test test/*.test.js` | **88/88 pass**（実装前78 → +10） |
| v4 schemaの不変 | `git diff --quiet bughub/schemas/factory-report-v4.schema.json` = 変更なし |
| v4受理の非回帰 | contract testとrouter testで明示的に確認（v5 flag有効時もv4 handlerが呼ばれる） |
