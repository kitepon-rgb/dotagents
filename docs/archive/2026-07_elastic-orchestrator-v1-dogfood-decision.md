# Elastic Orchestrator v1 dogfood discovery decision

- Control ID: `elastic-v1-dogfood-20260714`
- Decision owner: parent-belle
- Decision date: 2026-07-14
- Immutable input: `docs/2026-07_elastic-orchestrator-v1-dogfood-discovery.md`
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

## Throughline handoffと競合代替案の親裁定（2026-07-15）

- handoff前のControl revisionは`97`、base SHAは両Runとも
  `9badf115d4219a5a2b56ebdb796098415ba97f5d`だった。
- 新しいCodex taskで最初に`resume-check`を実行し、
  `run-acceptance-sidecar`と`run-acceptance-native`を`running`、opaque handleと
  未回収reportを保持したまま復元した。同じRunを再dispatchしていない。
- sidecarはidempotency key `elasticv1-acceptance-sidecar-01`を使い、
  `codex_work_result`で`running`を観測後、同じkeyの`codex_work_recover`で生存確認し、
  最後に`codex_work_result`からterminal `completed`を回収した。provider run IDは
  `058feb269825755fa3223d993dffbfab1c33a2e5df5de886dd7d010cc0da2a93`、adapter result
  digestは`d62e74752bbaabd581677edb5b23b230758d47eaab85ecda62f3d8902d963bd9`である。
- native standing agent `/root/phase2_adapter_lane`は新taskのlive agent treeには存在しなかったが、
  owner-owned Codex rolloutの`task_complete`と最終assistant reportを回収した。native result digestは
  `222962339d2a1d3e5722365c4e22793afd776729e5e50cd5ec55bc2375f0b2cc`である。
- 両案とも指定1ファイルだけを変更し、29行の一対一matrix、Markdown lint、diff checkがgreenだった。
  native案はさらに参照path 13件の実在を検証した。

親はnative案を採用し、sidecar案を不採用とする。native案は日本語の正本と既存Phase gateの
実証済み証拠を保持しつつ、live同時実行、Throughline再開、最終gate、knowledge return、archiveを
未検証としてgreenにしていない。sidecar案も安全側だが、同じControlで既に完了した12 Run、
Dedup、親acceptまで一律に未検証へ戻しており、最終台帳の出発点として証拠密度が低い。
この比較は自動mergeや多数決ではなく、親のdiff・受入条件・検証結果による一案採用である。

ThroughlineはControl stateの保存先やbaton代替として使っていない。git common dir内のControlを
正本とし、Throughlineは新taskへControl IDとcaller-known handleを渡すhandoff経路としてのみ実証した。
