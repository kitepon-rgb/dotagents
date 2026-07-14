# Elastic Orchestrator v1 受入matrix

- 更新日: 2026-07-15
- Control ID: `elastic-v1-dogfood-20260714`
- 判定規則: positive evidenceだけでなくnegative／boundary testと親verdictを29条件へ一対一に持つ。
- 除外: `audit-gauntlet`由来結果は使わず、gpt-connectorはConsultationに限る。

`green`は契約、negative test、実dogfoodの三者で当該criterionが反証に耐えたことを表す。
`pending-final`は最終監査またはControl finalization自身を待つ循環境界であり、finalize前にgreenへ変えない。

| # | Criterion | Positive evidence | Negative / boundary | Control / Run | 親verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | 工場全体へ固定3枠を置かずExecutor別capacityを使う。 | Registry/placement契約、[capacity dogfood](elastic-orchestrator-v1-capacity.md)。 | unknown capacityを0／無制限へ丸めないtest。 | native 3枠＋external barrier A/B。 | green |
| 2 | 全Executorのcapacityを根拠付き`known` / `unknown`で扱う。 | Registry observationとtri-state test。 | stale／unknown／capacity不足をreviewまたはreject。 | 同一Controlのnative／sidecar／aiterm／gpt観測。 | green |
| 3 | native、sidecar、aiterm、gpt Consultationを同一Controlで管理する。 | adapter round-tripと[discovery](elastic-orchestrator-v1-dogfood-discovery.md)。 | gptをWorkerへ置くと拒否。 | 15 Worker＋1 Consultation。 | green |
| 4 | 3件超のTask／Runと最小dependency gateを扱う。 | Task snapshot、cycle／ready test。 | cycle、未finalize依存を拒否。 | 15 Task、15 Workerをhandoff後も回収。 | green |
| 5 | 3件超の外部Runを同時管理しnative枠を全体上限にしない。 | [capacity dogfood](elastic-orchestrator-v1-capacity.md)。 | Control時刻だけを重複証拠にせずprovider時刻を要求。 | barrier Cでsidecarを含む4入口重複を最終確認。 | pending-final |
| 6 | workflow capability、capacity、role/effect policyを検査する。 | capability validationとrole policy tests。 | 不足capability／forbidden effectをreject。 | 全実Runにworkflow evidenceを記録。 | green |
| 7 | read-only Runを複数Executorへelastic fan-outする。 | [discovery](elastic-orchestrator-v1-dogfood-discovery.md)の12 Run。 | read-only taskへのwriter配置を拒否。 | native 6、sidecar 3、aiterm 3。 | green |
| 8 | Executor横断でwrite scope／worktree競合を検出する。 | global conflict、linked-worktree tests。 | overlap writerとworkspace driftを拒否。 | acceptance代替案を別worktreeへ隔離。 | green |
| 9 | 独立worktree代替案を区別し自動mergeしない。 | [handoff Decision](elastic-orchestrator-v1-dogfood-decision.md)。 | sidecar案をreject、native案だけaccept。 | `run-acceptance-sidecar` / `run-acceptance-native`。 | green |
| 10 | provider／model／prompt／context／lineage／approachを記録する。 | manifest validationとlineage tests。 | family／input digest改竄を拒否。 | 15 Runの異なるlineage。 | green |
| 11 | 別processだけで独立監査扱いにしない。 | family governance、Dedup／refutation。 | 同一機序Findingを重複票にしない。 | `run-dedup-refutation`＋親Decision。 | green |
| 12 | blocked経路を新根拠なしに再投入しない。 | approach family block/reopen tests。 | reopen evidenceなしを拒否。 | F3／F5を棄却し再投入しない。 | green |
| 13 | Control／Run budgetを持ちunknown usageを丸めない。 | Budget Envelope tests。 | over-reservationとunknownの成功化を拒否。 | 各Runにwall/cost reservation。 | green |
| 14 | family投入上限とretry上限を管理する。 | deterministic placement、retry tests。 | 上限超過とsame-family retryを拒否。 | discovery familyを明示。 | green |
| 15 | Finding／Decision／finalizationは親docsが意味を持つ。 | shared contract、artifact／phase tests、親Decision。 | 子によるsemantic finalizationを拒否。 | discovery→refutation→親裁定。 | green |
| 16 | 子のLedger更新を禁じlock／revision競合を拒否する。 | atomic manifest、lock recovery tests。 | stale revision、live／malformed lockを拒否。 | 子はreportのみ、Control mutationは親。 | green |
| 17 | 外部失敗を暗黙fallbackでgreenにしない。 | adapter failure matrix。 | Grok／Composer login-required、unsupported sidecar modelをfailedのまま保持。 | failed 2 Run＋barrier A sidecar。 | green |
| 18 | Executor completedと親accepted／rejectedを分離する。 | strict report import、accept/reject tests。 | reportなしcompleted、result digest不一致を拒否。 | 10 accepted、2 failed、代替1 accept／1 reject。 | green |
| 19 | session横断でRun／handle／receipt／budget／gateを復元する。 | resume-check回帰と[handoff Decision](elastic-orchestrator-v1-dogfood-decision.md)。 | runningを再dispatchせず同じhandleで回収。 | revision 97→102、sidecar key／native rollout。 | green |
| 20 | H承認なしにH Runをadmitしない。 | H approval snapshot tests。 | purpose／impact／rollback／digest不足を拒否。 | Grok／Composer loginを実行せずfailed保持。 | green |
| 21 | high-risk finalizationに親指定の独立監査を要求する。 | phase/finalization tests。 | audit evidence欠損を拒否。 | 最終監査文書と親Decisionを待つ。 | pending-final |
| 22 | working treeへruntime stateを置かない。 | common-dir state、atomic manifest tests。 | symlink／unsafe pathを拒否。 | Controlは`.git/dotagents/orchestrate/`、製品stateは各所有先。 | green |
| 23 | main／linked worktreeで共通保存先とglobal gateを維持する。 | linked worktree tests。 |別git common dirと競合writerを拒否。 | native／sidecar別worktreeを同じControlで裁定。 | green |
| 24 | 新runtime dependencyを追加しない。 | `package.json`無変更、Node標準module実装。 | dependency diff監査。 | v1全commit。 | green |
| 25 | install、verify、routing、hooks、skills、`make ci`がgreen。 | [regression evidence](elastic-orchestrator-v1-regression.md)。 | negative fixtureは期待どおりFAIL後にgate全体green。 | `make ci` 107/107、最終再実行待ち。 | pending-final |
| 26 | 新Executorをcore大改造なしにversioned contractとして追加する。 | synthetic contract／catalog tests。 | unknown interface／operationをtyped reject。 | production registryとsynthetic fixture。 | green |
| 27 | 中規模実装＋監査でoperator-driven縦切りを通す。 | `f7835f5` finalization修復、`d8bea93` handoff／retention修復。 | active child、架空evidence、digest driftのnegative tests。 | 最終独立監査と親Criticを待つ。 | pending-final |
| 28 | 結果を正典、RAG、Caveat、testsへ還流する。 | [knowledge return](elastic-orchestrator-v1-knowledge-return.md)、既存indexed RAG、Caveat own entry。 | dotagentsへCaveat stateを複製せず、ユーザーdirty INDEXを非接触。 | Caveat検索と107 tests。 | green |
| 29 | Control finalization後にplanをarchiveする。 | finalize/archive retention tests。 | finalization前archive、digest不一致を拒否。 | 全Task／phase／Control閉鎖と実移動を待つ。 | pending-final |

## 最終化条件

`pending-final` 5件は、barrier C、重い独立監査1回、最終`make ci`、全Task／phase gate／Control
finalization、plan archiveの実績を記録した後にだけgreenへ更新する。Controlのrecord上限256に対し
revision 102時点のreceiptは103件で、15 Task finalization、phase gate 10件、control finalize／archiveを
加えても129件で閉鎖余力がある。
