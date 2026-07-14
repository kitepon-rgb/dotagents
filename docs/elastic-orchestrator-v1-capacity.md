# Elastic Orchestrator v1 capacity dogfood

- Control ID: `elastic-v1-dogfood-20260714`
- 実証日: 2026-07-15（UTC記録は2026-07-14）
- 親裁定: Controlのrecord時刻ではなく、各入口が返した実行時刻だけで重複を判定する。

## 既存fan-out

同一ControlはCodex native 6件、codex-sidecar 3件、aiterm 3件、gpt-connector Consultation 1件を
管理した。12 Workerのうち10件はcompleted＋accepted、Grok／Composerはbrowser login要求をfailedの
まま保持し、暗黙fallbackしなかった。後続handoffではnativeとdurable sidecarの競合代替案も同一base
SHAから回収し、親がnativeだけを採用した。

## 実時間barrier

### `elastic-v1-capacity-20260715-a`

| 入口 | provider由来の実行区間（UTC） | 結果 |
| --- | --- | --- |
| native `/root/final_contract_refuter` | 16:46:58–16:47:43 | probe完了 |
| native `/root/final_integration_refuter` | 16:47:03–16:47:48 | probe完了 |
| native `/root/final_matrix_sorter` | 16:47:08–16:47:53 | probe完了 |
| gpt-connector slug `elastic-v1-capacity-20260715-a` | 16:47:30–16:47:42 | succeeded、consultation-only |
| aiterm `elastic-v1-capacity-aiterm-20260715-a` | 16:47:57–16:48:27 | probe完了。ただしnative 3本との重複なし |
| codex-sidecar explore | 16:47:26–16:47:29 | failed |

sidecar失敗は製品欠陥ではなく、親がChatGPT account非対応の`gpt-5.6`を明示した入力ミスだった。
App Serverは400を返し、sidecarは`PROTOCOL_ERROR`としてfail-closedにした。暗黙fallbackや成功化は
していない。

### `elastic-v1-capacity-20260715-b`

| 入口 | provider由来の実行区間（UTC） | 結果 |
| --- | --- | --- |
| native `/root/final_contract_refuter` | 16:49:31–16:50:21 | probe完了 |
| native `/root/final_integration_refuter` | 16:49:34–16:50:24 | probe完了 |
| native `/root/final_matrix_sorter` | 16:49:39–16:50:29 | probe完了 |
| aiterm同一session follow-up | 16:50:03–16:50:23 | probe完了、native 3本と18秒重複 |
| gpt-connector slug `elastic-v1-capacity-20260715-b` | 16:50:27–16:50:34 | succeeded、sorterと2秒重複 |
| codex-sidecar explore `gpt-5.6-terra` | 16:50:41–16:51:01 | probe完了。ただしnativeとの重複なし |

この時点でnative実効最大3本の外側からaitermとgpt consultationが開始・完了でき、sidecarも別時刻に
正規modelで完了した。sidecarを含む4入口の同時重複は、最終監査中のbarrier Cで確定する。

### `elastic-v1-capacity-20260715-c`

| 入口 | provider由来の実行区間（UTC） | 結果 |
| --- | --- | --- |
| native `/root/final_contract_refuter` | 16:54:43–16:57:31 | 独立監査完了 |
| native `/root/final_integration_refuter` | 16:54:50–17:01:40 | 独立監査完了 |
| native `/root/final_matrix_sorter` | 16:54:54–16:56:21 | 機械照合完了 |
| codex-sidecar `gpt-5.6-terra` | 16:55:04–16:55:24 | read-only probe完了 |
| aiterm Codex follow-up | 16:55:33–16:55:53 | read-only probe完了 |
| gpt-connector Consultation | 16:55:58–16:56:06 | 相談完了、Worker数には不算入 |

sidecarはnative 3本と20秒、aitermはnative 3本と20秒重複した。したがって各区間で、親の外で動く
Worker Runはnative 3＋external execution 1＝4本だった。gpt Consultationもnative 3本とは重複したが、
Worker capacityや監査票には加算しない。sidecarとaitermを同時に5本目として重ねた主張もしない。

## 判定境界

- gpt-connectorはConsultationであり、Worker数・独立監査票へ数えない。
- provider開始前のControl record、MCP caller開始、待機時間は実行区間へ数えない。
- 失敗したsidecar probeは成功証拠へ使わない。正しいmodelでの別barrierを独立記録する。
- Grok／ComposerのloginはH操作なので実行せず、当該workflowのcapacityはunknownのままにする。
- planの「外部Run」は親process外のWorker Runを指し、native subagentを含む。委譲レーンの分類としての
  external executionだけを指す場合は`external execution`と明記する。
