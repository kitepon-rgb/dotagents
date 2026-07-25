# fm-0667 characterization: Lattice公開面だけで親子実行連鎖を辿れるか

- 実測日: 2026-07-25
- 実測version: Lattice CLI **0.12.20**（global install・`lattice --version`で確認）
- 手法: 隔離した一時repo（`git init`済み・`.lattice/runs/` gitignore済み）で公開CLIとversioned schemaだけを使う。
  Latticeの内部DB・管理directory・内部moduleは読まない（ADR 0113 Decision 1）。
  dotagents本体の`.lattice/todo`は読み取りのみで、実測の書込みは一時repoへ隔離した。
- 判定: **公開面だけでは連鎖を辿れなかった**（実装前Decision gateの項目1は「証明できない」）。
  項目3としてLattice 0.12.21・0.12.22を追加し、環を閉じた（本書末尾）。

## 実測した4段と結果

| 段 | 公開面で実際に得られたもの | 欠落 |
|---|---|---|
| ① TODO identity | `todo_status_result.v4`のtask entryは`plan_key`／`task_id`／`label`の3keyのみ。`todo_mutation_result.v1`は遷移時に`project_id`／`plan_key`／`plan_version`／`task_id`／`sequence`／`event_digest`を返す | status projectionにper-task digestが無い。scope・writes・実行帰属を持たない |
| ② `compile_binding` | 公開authoring schema **v1／v2／v3すべてで`{"type":"null"}`**。実authoring transaction 9 plan・**2035 task entry全件がnull**。どの公開投影にも現れない | **設定されていてもhostから読めない＝TODO正本とruntimeを結ぶ環が公開面に出ていない**（書込経路そのものはrevisionに在ることを後述の実測で確認した） |
| ③ runtime request／plan | 配布npm packageは`plan_create_input` v1〜v3と`bridge-setup.md`だけを同梱。`run_request.v1`のschemaは非配布。runtime面に`--schema`取得口が無い。`INVALID_RUN_REQUEST`は`detail`を持たない | hostが`run_request`を組めない＝runtime面をhost中立に起動できない |
| ④ executor receipt | ADR 0044 Decision 2上は`todo_id`／`packet_digest`／`receipt_digest`／`observed_diff`を持つ | schema非配布。`todo_id`はrequest由来のhost自称値で`project_id`／`plan_key`／`plan_version`修飾が無い |

## 反証fixture — Latticeは受入証拠の対応を検証しない

一時repoで`probe`計画を作成し、task `t-001`を`start`したのち、
**`todo_id`が`WRONG-NOT-t-001`のreceiptを指す**evidence descriptorで`todo done`を実行した。

```text
receipt.json  {"schema":"lattice.executor_receipt.v1","receipt_id":"r-1",
               "todo_id":"WRONG-NOT-t-001","packet_digest":"0000"}
ev.json       {"evidence_id":"probe-receipt-binding","repo_id":"self","path":"receipt.json",
               "git_blob_oid":"f29a8de17eea39d96a5876e351bac81b5388df93",
               "content_digest":"1c7fe589f0339c8d…","media_type":"application/json",
               "anchor_digest":null}
```

結果は`status: "done"`で**受理**（`event_digest` `1d1b4760…`）。
evidenceはblobをcontent digestでbindするだけで、receiptがそのtaskの実行結果かをLatticeは検証しない。
**TODO↔receiptの相関はhostの自己申告であり、公開面が保証する事実ではない。**

## 副次発見

- `lattice.run_list.v1`はproject識別を持たない。一時repoとdotagentsで`result_digest`が
  `ee213726dea9584c732d0fc287328ac280907b37e7848d8be918767ec51c6c5a`とbyte一致した（両者とも空集合）。
  run namespaceの投影はprojectへ帰属しない。
- 旧前提「`lattice run list --json`は現repoで`INVALID_RUN_STORE`を返す」は**0.12.20で解消済み**（空リストを返す）。
- typed errorの`detail`はTODO面（`INPUT_INVALID`／`REVISION_INVALID`／`INVALID_EVIDENCE`）にはあり、
  runtime面（`INVALID_RUN_REQUEST`）には無い。**同一製品内でdiagnosabilityが非対称。**
- canonical digest規則のうち`plan_digest`（`desired_plan`から`plan_digest`を除いたcanonical JSONのSHA-256）は
  公開材料から再現できたが、`topology_digest`は候補5通りすべて不一致で再現できなかった。
  revision transactionは**schemaもdigest規則も非公開**であり、host中立な公開書込口として成立しない。

## Decision gate判定

計画[Composable Orchestration 完成計画](../plan_composable-orchestration.md)「実装前Decision gate」に対して:

1. **証明できない。** 子ごとのTask identity・scope・result digest・partial failure・run／packet帰属を
   Lattice公開receiptだけで検証する経路は存在しない。切断点は②の`compile_binding`が公開投影に現れないことと、
   ③のschema非配布である。
2. 項目2（既存Control Worker Run／strict Reportへの最小投影）は採れない。
3. **項目3が発動する。** Lattice側へhost中立の公開projection／transactionを最小追加し、単体releaseする。
4. 新しいcompound execution recordは提案しない。以下はいずれも既存schemaへの最小追加であり、
   項目4の再提案条件には該当しない。

## 項目3として実際に追加したもの

characterizeの途中で、`compile_binding`は**公開書込口が無い**のではなく**公開読み取り面が無い**ことが
判明した。`lattice.todo_plan.v5`のstore側validatorは
`{boundary_manifest_digest, compiled_plan_digest, topology_digest, base_sha}`という非null値を既に受理し、
実測でもこの形を含むplanが`buildTodoPlan`／`validateTodoPlan`を通過した。null固定は
`plan create`（authoring時点でcompile結果が存在しないため）だけの制約で、revision transactionが更新経路である。
そのため追加はschema versionを上げずに済み、受理される正当な入力の集合も変えていない。

### Lattice 0.12.21 — runtime契約を配布物へ載せ、拒否理由を返す（[ADR 0123](https://github.com/kitepon-rgb/Lattice/blob/main/docs/adr/0123-runtime-contract-distribution-and-diagnosability.md)）

- `run_request.v1`・`executor_packet.v1`・`executor_receipt.v1`のJSON Schemaを配布物へ同梱した。
- `plan compile --schema --json`／`run start --schema --json`でrequest契約を返す（公開面の数は増やさない）。
- 判定正本を`explainRunRequest`ひとつにし、`INVALID_RUN_REQUEST`の`detail`へ`{reason, path}`を返す。
  `validateRunRequest`はそこへ委譲するため、boolean判定と診断が乖離しない。
- `sensor_query_set`・`executor_capability`・`sensor_provenance`をfront-endが実際に要求するshapeまで
  検査し、schema段で受理してから後段の`CONTRACT_VIOLATION`で落ちる契約分裂を解消した。
- ADR 0044 Decision 2の表は`codegraph_query_set`と`task_ref`／`scope`付きtodos entryを載せており
  実装と食い違っていたため訂正し、配布schemaを正本とした。

### Lattice 0.12.22 — TODO工程とruntime実行を結ぶ公開投影（[ADR 0124](https://github.com/kitepon-rgb/Lattice/blob/main/docs/adr/0124-todo-binding-projection.md)）

- `lattice todo bindings [--plan <key>] [--json]`を追加し、`compile_binding`付きTaskを
  TODO正本のidentity（`project_id`／`plan_key`／`plan_version`／`task_id`）つきで投影する
  （`lattice.todo_binding_projection.v1`・自己digest規則の`result_digest`付き）。
- `lattice.todo_status_result.v4`は変更していない。加算の別面としたため、v4を受理する
  dotagents側hookはそのまま動く。
- 不明planと不正read modelは空集合へ丸めずfail closedにする。

### 閉じた環

```text
TODO task (project_id / plan_key / plan_version / task_id)
  → todo bindings 投影の compile_binding
  → compiled_plan_digest で lattice.runtime_plan.v1
  → plan_ref・todo_id で lattice.executor_packet.v1
  → packet_digest 帰属で lattice.executor_receipt.v1
```

全段が公開CLIとversioned schemaだけで辿れる。hostの側の対応表を信用する必要がなくなった。

### 公開後smoke（0.12.22・global install済み）

- `lattice plan compile --schema --json` → `lattice.run_request.v1`（required 10件）
- `lattice todo bindings --plan factory-master --json` → `lattice.todo_binding_projection.v1`
- 新規repoで、公開binaryから取得したschemaだけを読んでrun requestを組み、schema層を一度で通過して
  `guidance`付きの意味論的判定（`BOUNDARY_UNKNOWN`）へ到達した。

### 追加しなかったもの

- `executor_receipt.v1`へのTODO store identity追加（ADR 0044 Decision 7.4の帰属規律を変えないため）。
- evidence受理時のreceipt内容検証（evidenceはblobをcontent digestでbindする面であり、
  receiptの意味解釈をそこへ持ち込まない。binding検証はbinding投影の側で行う）。
- 新しいcompound execution record（Decision gate項目4の再提案条件に該当しない）。
