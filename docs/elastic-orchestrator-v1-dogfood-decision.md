# Elastic Orchestrator v1 dogfood discovery decision

- Control ID: `elastic-v1-dogfood-20260714`
- Decision owner: parent-belle
- Decision date: 2026-07-14
- Immutable input: `docs/elastic-orchestrator-v1-dogfood-discovery.md`
- Independent refutation: `run-dedup-refutation`
- Consultation: `consultation-gpt-blindspots`（助言専用。Worker数・独立監査票には算入しない）

## 親裁定

| Cluster | 裁定 | 根拠と処置 |
|---|---|---|
| F1 finalization integrity | 採用 | active child／未裁定Runを残すTask finalization、Task receipt未拘束、acceptance前Campaign release、架空のmatrix／audit／knowledge参照、Control receipt未拘束をそれぞれ再現回帰で閉じる。 |
| F2 aiterm terminal evidence | 採用 | caller supplied `completed`をreport/evidenceなしに投影できる。strict Worker Reportまたはprovider由来terminal evidenceを必須化する。 |
| F3 registry / resume coupling | 棄却 | RegistryはControl admission契約、adapter catalogは製品固有projectionで責務が異なる。opaque handleの再照会は所有Executorが担い、共通recovery lifecycleはv1非目標である。 |
| F4 hook session input | 部分採用 | advisory hook本体は固定長SHA-256 keyと安全なcacheを使うため棄却。4本のcallout hookは生の`session_id`をpathへ連結するため、独立の工場コア欠陥として修復する。 |
| F5 expected incomplete work | 棄却 | Phase 7未完了は現在地であり欠陥ではない。factory reporter credentialとWindows PATHは今回のTask範囲外である。 |

F1は一括名称で管理するが、五つの受入不変条件を統合して成功扱いしない。F3/F5は同じFindingを
別表現で再投入しない。F4のcallout hook修復はOrchestrator本体へ混ぜず、独立gate・独立commitで閉じる。

## Consultationから採用した確認項目

- 受入matrixは各条件へControl／Run ID、negative/boundary test、親verdictを対応させる。
- provider実時間の重複を証明し、Control上のrecord overlapだけを同時実行証拠にしない。
- 同期sidecarをresume可能なhandleの証拠に使わず、回収不能な同期workflowと明示的に区別する。
- finalization前にreceipt閉鎖余力を計算する。
- plan archive後もControlのobjective／document refが解決するよう、archive pathと互換参照を確定してからfinalizeする。

## 未検証範囲

- Grok／Composerはbrowser loginを要求したためexecution-verifiedへ昇格していない。
- writer競合案、provider実時間の同時実行、Throughline再開、中規模縦切り、最終監査は後続dogfoodで検証する。
- この文書は発見の親裁定であり、採用欠陥の修復greenやPhase 7完了を意味しない。
