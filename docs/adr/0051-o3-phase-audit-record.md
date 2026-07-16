# ADR 0051: O3 Phase監査記録（クロスprovider検証と採用指摘の修理）

- Status: Accepted
- Date: 2026-07-17
- Parent canon: `docs/plan_factory-master.md`
- Control: `observer-factory-20260715` Task `o3-phase-audit-fix-wave`
- 監査構造: Find（Codex `codex_review`、`gpt-5.6-sol`×high、O3差分`4a3c9a7^..4721dfd`）
  → 指摘ごとの独立反証（Claude refuter、実ファイル・git履歴・実store全数照合）→ 統括裁定

## 件数遷移

Codex検出6件（P1×3・P2×3）→ refuter反証で存続6件（うちP1判定2件をP2へ降格、1件をvalue false）
→ 統括裁定: **採用5件（うち1件は部分採用）・棄却1件**。修理は`a77b889`。

## 採用と修理

1. **consultation観測のrecord相関束縛**（Codex P1→裁定P2）: `observeConsultation`が
   `observation.source`をrecordの`connector`と照合せず、bridgeがprojectionのhandleを捨てていた。
   v25時代からの既存穴だが多provider化で爆発半径が拡大。source一致必須＋optional
   `consultation_handle`のrecord完全一致検証（非格納）＋bridge出力へのhandle passthroughで修理。
2. **claude-native consult completedの無条件受理**（Codex P1→裁定P2）: ADR 0045 §7裁定違反では
   なくlive H gate前のhardeningと裁定。completedに`result_receipt`（stream-json `type:result`受信の
   受領証）を必須化し、process exitで成功を作れない形をadapter層で強制。
3. **control-migrate receiptの浅検証**（P2→裁定P3相当だが安価）: subject=当該Control・
   evidence空・state∈{v25,v26}相異・連鎖・最終next=現schema_versionの意味検証を追加。
   鍵なしdigest chainの限界（store書込者は全collection捏造可能）は残余として認識する。
4. **effort不整合によるdispatch不能planned record**（部分採用）: v26のconnector別effort束縛
   （claude-native `low..max`／codex-sidecar `low..xhigh`）を追加。gpt-connectorは実v25 recordの
   migrate互換のためopaque維持。**根本のplanned脱出経路欠如は本waveで実装せず**（下記queue）。
5. **read-only opinionのwrite痕跡受理**: 非空`changedFiles`・`worktreePath`・`worktreePreserved`を
   fail closed化（空`changedFiles`は許容）。

## 棄却

- **claude-native worker handleのUUID厳格化がv25互換を破る**（Codex P1）: 機械的事実は真
  （非UUID受理の窓が約2日存在）だが、実store全数（本機26 Control manifest）でclaude-native
  worker run 0件、live dispatch未実施（H gate待ち）、execution-verified未満のためexternal writer
  経路も閉、かつUUID厳格化はADR 0044受入対象として親監査済み。被害者ゼロの理論値であり
  fail-closed強化を巻き戻さない。

## Maintenance queueへ記録した既存欠陥（本waveの非目標）

- **consultationにplanned→terminalの脱出経路が無い**（v25からの既存契約）: 取消済みTaskの
  planned consultationはdispatch恒久拒否＋finalize条件で**Controlがfinalize不能**になる。
  worker laneのplanned→cancelled（dispatch_attempt_evidence必須）と同型の遷移追加は
  truth table・shared文書・fixtureへ波及する設計裁定が必要であり、Phase 6前のmaintenance waveで
  不変ADRを伴って閉じる。現時点で実storeに該当状態のControlは存在しない（P0/P1非該当）。

## Gate（実測・Phase gate前半）

- orchestration full regression（`tests/orchestrate/*.test.mjs`全suite）: 修理前**133/133**、
  修理後**136/136**（fail 0・skip 0、各一回）。
- `make lint-js` green、`git diff --check` clean。
- 残るO3完了条件: **live H gate**（実model dispatch: claude-native consult/worker smoke、
  `--tools ""`実測、`codex_opinion` live）。オーナー承認待ちとして分離し、承認までO3完了を
  宣言しない。
