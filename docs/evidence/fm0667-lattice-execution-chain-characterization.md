# fm-0667 characterization: Lattice公開面だけで親子実行連鎖を辿れるか

- 実測日: 2026-07-25
- 実測version: Lattice CLI **0.12.20**（global install・`lattice --version`で確認）
- 手法: 隔離した一時repo（`git init`済み・`.lattice/runs/` gitignore済み）で公開CLIとversioned schemaだけを使う。
  Latticeの内部DB・管理directory・内部moduleは読まない（ADR 0113 Decision 1）。
  dotagents本体の`.lattice/todo`は読み取りのみで、実測の書込みは一時repoへ隔離した。
- 判定: **公開面だけでは連鎖を辿れない**（実装前Decision gateの項目1は「証明できない」）。

## 実測した4段と結果

| 段 | 公開面で実際に得られたもの | 欠落 |
|---|---|---|
| ① TODO identity | `todo_status_result.v4`のtask entryは`plan_key`／`task_id`／`label`の3keyのみ。`todo_mutation_result.v1`は遷移時に`project_id`／`plan_key`／`plan_version`／`task_id`／`sequence`／`event_digest`を返す | status projectionにper-task digestが無い。scope・writes・実行帰属を持たない |
| ② `compile_binding` | 公開authoring schema **v1／v2／v3すべてで`{"type":"null"}`**。実authoring transaction 9 plan・**2035 task entry全件がnull** | **公開書込口が存在しない＝TODO正本とruntimeを結ぶ環そのものが不在** |
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
   Lattice公開receiptだけで検証する経路は存在しない。切断点は②の`compile_binding`と③のschema非配布である。
2. 項目2（既存Control Worker Run／strict Reportへの最小投影）は採れない。
3. **項目3が発動する。** Lattice側へhost中立の公開projection／transactionを最小追加し、単体releaseする。
4. 新しいcompound execution recordは提案しない。以下はいずれも既存schemaへの最小追加であり、
   項目4の再提案条件には該当しない。

## 最小追加の候補（項目3の対象）

1. `compile_binding`へ公開書込口を与え、`{project_id, plan_key, plan_version, task_id}`と
   runtime `todo_id`をbindできるようにする（schema versionを上げる。v1へのin-place拡張はADR 0044で禁止）。
2. runtime面のschemaを配布物へ同梱する（`run_request.v1`・`executor_packet.v1`・`executor_receipt.v1`・
   `runtime_plan.v1`）。現状はGitHub repoのADR Markdownにしか存在せず、製品の配布物に含まれない。
3. `INVALID_RUN_REQUEST`に`detail`を付け、TODO面と同じdiagnosabilityへ揃える。
4. receiptへTODO正本identityを持たせるか、evidence受理時に対応を検証する。
   （反証fixtureが示すとおり、現状はどちらも無い。）
