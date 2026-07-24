# fm-0664 完了証拠: 固定Recipe host共通契約（2026-07-24）

契約はADR 0115、実装コミットは`ef70744`（設計裁定は`2e8dd69`）。親直轄F
（公開契約文書の正本化のため。fm-0663と同じ裁定基準）。

## 受入検証の結果

| 検証 | 結果 |
|---|---|
| 二型の意味の唯一の正本が`shared/orchestrate/recipes.md`に置かれ、両host面が参照 | PASS（相互参照はconformance testで機械検査） |
| discovery調査が名指しした未定義項目（入力schema・Critic出力・Dedup判定規則・全体gate・timeout/partial・第2ラウンド上限・最大並列度）の全closure | PASS |
| 二軸終端分類と集約gate。`partial_failure`非丸め・`empty`非failure | PASS（正本＋両投影へ反映） |
| retry/loop非所有（第2ラウンドは高々1回の静的展開、`max_second_rounds: 1`をschemaで固定） | PASS |
| Lattice未選択時の同一repo複数writer決定的直列化（closed入力のrepo identity/effectで判定） | PASS |
| Control-free terminal result一次出力＋Control選択時だけのReport投影。「重い型は統括レーン限定」文言をADR 0061の技法儀式分離へ整合 | PASS |
| 雛形JS literalとshared canonical JSONの機械的一致gate（drift防止CI） | PASS（`recipes-conformance.test.mjs` 4本green） |
| 三面同一commit＝単一rollback単位 | PASS（`ef70744`） |
| gates | `make lint` green／`make test-orchestrate` 195 pass 0 fail／`./install.sh`再実行で配布symlink追従確認 |

## Control相関

- Control: `composable-orchestration-v1`（fm-0664のControl Taskは記録前にF write=parent制約が確定し、
  親直轄で実装したため、finalizationはfm-0663と同型の証跡として本evidenceを用いる）
