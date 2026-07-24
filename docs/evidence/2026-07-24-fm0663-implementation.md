# fm-0663 完了証拠: typed lane admission実装（2026-07-24）

契約はADR 0114、実装コミットは`b40be36`（設計裁定は`2e8dd69`）。親直轄F（Control policyの
`F write task must use parent`により委譲不可を確認して直接実装）。

## 受入検証の結果

| 検証 | 結果 |
|---|---|
| declaration／評価結果／保存projectionの3 schema分離、評価が`normal`/`orchestrated`双方を表現 | PASS（`lane-admission.test.mjs`） |
| lane決定関数が4 booleanのexact recordだけを受け取り、16通り全列挙test green | PASS |
| manifestに自由文なし・`declared_by`＝init actor強制・`declared_at`＝declaration相関 | PASS（tamper検査5系） |
| v25〜v28はkey不在が正規形、v29だけ必須のversion-aware exact shape | PASS |
| v28↔v29の明示分岐、non-null v29→v28は`ROLLBACK_UNSUPPORTED` | PASS |
| capability predicate単調化（artifact generation等値3箇所を置換） | PASS。v28世代fixtureのv29移行後にartifact世代交代とconsultation cancelの能力維持を実測。selector decisionは`explicitConsultationCancelSchema`と同一関数のため個別fixtureは作らず同関数のv29検証で代表 |
| 公開契約v2（CLI contract_version・契約文書・repo内init caller全66箇所・CLI fixture同一wave更新） | PASS。v1入力は`CONTRACT_VERSION_MISMATCH`で明示拒否 |
| `lane-admission-evaluate`がHOME/XDG_CACHE_HOME/XDG_STATE_HOME/TMPDIR隔離下でfilesystem無変化 | PASS（実行前後snapshot比較） |
| 既存v28 Controlの読取継続 | PASS（本repoの23件全数を`status --brief`で実測） |
| gates | `make lint` green／`make test-orchestrate` 191 pass 0 fail／`make test-install` OK |

## 途中で発見・即時修理した既存欠陥

`tests/install/clean-home.sh`の`printf | grep -Fq`がpipefail＋SIGPIPEでマッチ成功でも誤FAILし、
`make ci`全体を塞いでいた（clean HEADで再現＝本実装と無関係の既存欠陥、P1として即時修理）。
herestring化で解消し、罠DB（`bash-pipefail-printf-grep-q-0-sigpipe`・public）へ記録した。

## Control相関

- Control: `composable-orchestration-v1` / Task `wave1-typed-lane-admission`（F・write・behavior-change）
- task finalization: `docs/adr/0114-typed-lane-admission-contract.md`（revision 16）
