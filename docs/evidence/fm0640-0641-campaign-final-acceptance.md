# fm-0640 / fm-0641 戦役横断の最終受入

- 実測日: 2026-07-25
- 工程正本: Lattice `factory-master` `rev-5878b6b9d54eabb5f3309427`
- 判定: **両方とも満たされている。**

## fm-0640「本書のPhase O1〜O4、R1〜R3、J1がすべてgreenである」

`factory-master`はLatticeのphase契約を持たない（`lattice todo phase status --plan factory-master`は
`PHASE_UNAVAILABLE` / `plan_has_no_phase_contract`）。本ToDoが指すPhaseは計画文書の
lane定義であるため、plan artifactのlaneとsnapshotのstatusを突き合わせて判定した。

| lane | done | 未完 |
|---|---|---|
| O1 | 4 | 0 |
| O2 | 42 | 0 |
| O3 | 7 | 0 |
| O4 | 8 | 0 |
| R1 | 11 | 0 |
| R2 | 5 | 0 |
| R3 | 3 | 0 |
| J1 | 4 | 0 |

対象8 lane・計84 taskすべてdone。未完は`completion` laneの`fm-0640`／`fm-0641`自身だけである。

### 併せて直した文書の陳腐化

計画文書の地の文が工程正本と食い違っていた。工程状態の正本はLattice storeであり
Markdownではないため（共通聖典「計画文書の作法」）、文書側を実態へ揃えた。

- `Lane O — Observer製品（O1→O2→O3→O4。O1〜O3完了、O4はWave D dogfoodのみ残）`
  → `（O1→O2→O3→O4。**全Phase完了**）`
- `Lane R — 既存工場rollout（R1→R2→R3。R1完了、R2進行中＝現在地、R3の一部はqueue 20が束ねて先行消化）`
  → `（R1→R2→R3。**全Phase完了**）`

## fm-0641「子計画の未完TODOがゼロで、完了した子計画がarchiveへ退避されている」

### 未完TODOゼロ

`lattice status --json`が返すactive plan revisionのsnapshotで数えた。
古いrevisionのsnapshotを読むと別の数字が出るため、active revisionだけを対象にしている。

| plan | 計 | 未完 |
|---|---|---|
| aishell-factory-integration | 48 | 0 |
| bughub-factory-integration | 203 | 0 |
| codex-full-support | 83 | 0 |
| factory-master | 141 | 2（`fm-0640`／`fm-0641`自身） |
| gpt56-rewiring | 37 | 0 |
| lattice-factory-integration | 82 | 0 |
| lattice-todo-reconciliation | 52 | 0 |
| memory-promotion-queue | 17 | 0 |
| observer-factory-integration | 118 | 0 |

計781 task中779がdone。子計画の未完TODOはゼロである。

### archive退避

`docs/`に残る`plan_*.md`は4件だが、いずれも**旧path互換のstubまたは正本移管済み**であり、
実文書は`docs/archive/`にある（archive済みplan文書は10件）。

- `plan_callout-hooks.md`: 「完了・archive済み」stub。後続受入はLattice `codex-full-support`へ移管
- `plan_elastic-orchestrator.md`: 正本は`archive/2026-07_elastic-orchestrator.md`。
  Control `elastic-v1-dogfood-20260714`のimmutable `objective_ref`互換のため旧pathを残す
- `plan_gpt56-rewiring.md`: 「完了・archive済み」stub。旧migrationのsource ref互換のため残す
- `plan_factory-master.md`: 本戦役の親計画。子計画ではない

3件のstubはいずれも本文で「進行中TODOや第二の工程正本として扱わない」と明記している。
退避は完了している。

## 併せて直した工場欠陥 — 工程advisoryの誤検知

`bin/todo-gate-hook.sh`が毎セッション「全消化済みで archive 未退避」として
上記4件を名指ししていた。**これは誤報告である。**

原因は「未チェックboxが0」を「全消化済み」と同一視していたこと。checkboxを1つも持たない
文書（archive stubと、工程正本をLatticeへ移した計画）まで「消化済みなのに退避されていない」と
主張していた。共通聖典に従いcheckboxはLattice storeへ移してあるため、checkbox計数を
完了判定に使う前提そのものが陳腐化していた。

checkboxを持ち、かつ全て済んでいる文書だけを「全消化済み」と言うよう修理した。
checkboxが1つも無い文書については消化状態を主張しない。

修理後の実測では、4件すべてが「何も主張しない」となり誤検知が消えた。

## 検証

- dotagents `make ci`: 5+63+83+246+9 = 406 tests、失敗0
- `tests/hooks/smoke.sh`: ALL PASS
