# 開発工場 統合マスター計画

**状態:** Active  
**作成日:** 2026-07-15  
**対象:** dotagents と工場コア製品、全現役host

この文書は、開発工場に残る複数の生計画を一つの実行順へ束ねる、唯一の親TODOである。
個別計画は設計、受入条件、実測記録を保持する子TODOとして残すが、単独では着手順や
並行可否を決めない。次に何をするか、どこで合流するかは本書だけで決める。

## 1. 正本の分担

| 階層 | 正本 | 責務 |
|---|---|---|
| 趣旨・不変原則 | [PLAN.md](../PLAN.md) | 工場の目的、原則、文書作法 |
| 実行順・現在地 | 本書 | `NOW`、並行レーン、依存、合流、全体完了 |
| 製品・機能の受入条件 | 下記の子計画 | 詳細TODO、fixture、host台帳、rollback |
| 実装契約 | 各製品repoのactive plan / ADR | 製品所有のschema、API、検証 |

運用規則:

- 親と子に同じ作業を二重記載しない。本書はPhase gate、子計画はその内訳を持つ。
- 子計画のチェックが残っていても、本書の順序を飛び越えて独立着手しない。
- 子計画を完遂したら、受入証拠を本書へ記録して子計画を`docs/archive/`へ退避する。
- 各製品repoの計画は、dotagentsへ複製せずリンクとcross-repo receiptで束縛する。
- 実装中はfocused test、TODO完了候補でrelated gateを一回、full regressionはPhase完了時に
  一回だけ行う。同じHEADとworkspace digestのbaselineをworkerごとに再走しない。

## 2. 子計画台帳

| 子計画 | 親内の役割 | 2026-07-15時点 |
|---|---|---|
| [Observer完成・Elastic改善](plan_observer-factory-integration.md) | Observer、両社orchestration、rate-aware配置、wire v3 | Active、未完42件 |
| [BugHub工場統合](plan_bughub-factory-integration.md) | 固定12製品wire v2、自己監視、4環境rollout | Active、未完34件 |
| [Codex全対応](plan_codex-full-support.md) | 全端末のinstall/config/routing/hook/MCP/session E2E | Active、未完40件 |
| [呼びかけHook](plan_callout-hooks.md) | hook詳細契約。残る実端末展開はCodex全対応へ合流 | Active、未完3件 |
| [GPT-5.6再配線](plan_gpt56-rewiring.md) | role routing詳細。残る他端末展開はCodex全対応へ合流 | Active、未完6件 |
| [メモリ昇格queue](queue_memory-promotion.md) | 各repo作業時の機会駆動queue | Active、主レーンを遮らない |

CalloutとGPT-5.6の他端末チェックは、Codex全対応Wave 3の同じhost receiptを参照して閉じる。
hostごとにinstall、config、routing、hook、MCP、Throughline、factory reporterを一回のrolloutで
検証し、計画ごとに同じ端末作業を反復しない。

## 3. 全体依存と並行レーン

```text
Lane O: Observer製品
  O1 Throughline completed-turn feed
    → O2 Observer共通core + Claude/Codex adapter
    → O3 Elastic provider対称化
    → O4 rate-aware scheduler

Lane R: 既存工場rollout
  R1 wire v2の製品・adapter残欠陥
    → R2 host単位のCodex/Hook/MCP/factory統合rollout
    → R3 wire v2 canary・rollback・finalization

                         O4 ─┐
                             ├→ J1 wire v3へObserverを編入 → 全体監査・archive
              R3/v2 receipt ─┘
```

Lane OとLane Rはrepoと検証gateが交差しない範囲で並行できる。同じdotagentsファイル、
同じhost設定、本番BugHubを触る作業は同時に走らせず、親がwriterを一本化する。

## 4. 実行TODO

### Phase M0 — TODO統合

- [x] 生計画を棚卸しし、実行順の正本を本書へ一本化する。
- [x] `PLAN.md`の個別残件を本書へ移管し、憲章と実行TODOを分離する。
- [x] 子計画を削除せず、詳細受入台帳として本書へ従属させる。

### 常設割込ゲート — 正規運用で再現した工場欠陥

コア製品、ServerManager/BugHub、dotagentsのorchestration・installer・hook・adapterなどを
正規入口で実利用中に再現した欠陥または運用不能な摩擦は、発見時点で本筋を保持して所有repoの
`docs/`正本TODOへ登録する。独立gate・独立commitで根治してから、必ず保持位置へ戻る。
第三者製品、H操作、権限外の変更は修理済みにせず、TODO登録後に承認・所有者対応を待つ。

- [x] Decision証拠を可変plan/TODOからwave専用の不変ADRへ分離する規約を、リポ正典へ固定する。
- [x] active RunのDelegation Packetを再dispatchなしで回収できるread-only公開入口を追加する。
- [x] active fixed Worker中の非交差fast-forward commitを安全に検証し、Report回収不能を解消する。

### Phase O1 — Throughline completed-turn feed（NOW）

- [ ] Claude receiptとCodex `task_complete`から、rollback検知可能なhost-neutral completed chainを完成する。
- [ ] DB projection、`projection_pending`、pagination、JSON-only read/wait、cancel、timeoutを完成する。
- [ ] 65秒超live waitとClaude/Codex E2Eを通し、Phase full gateを一回だけ実行する。
- [ ] Throughline側Controlをfinalizeし、成果commitとADR digestをObserver計画へ還流する。

詳細: [Observer計画 Phase 1](plan_observer-factory-integration.md#phase-1-throughline両host-completed-turn-feed) ／
Throughline `docs/14_observer_completed_turn_feed_plan.md`

### Phase R1 — wire v2残欠陥（O1以降と並行可）

- [ ] registry公開版とdotagents adapterのschema drift、Throughline diagnostics、Windows ACL／npm shim、
  Codex Sidecar実配布版の残件を製品所有repoで閉じる。
- [ ] Spotter Windows経路と4 hostのsidecar/auditor diagnosticsを実配布物でgreenにする。
- [ ] BugHub自己監視のoutbox再送とPi5外部通知bridgeを、意図的障害試験の前まで完成する。

詳細: [BugHub計画 Wave 6〜8](plan_bughub-factory-integration.md#wave-8--4環境canary-rollouthf)

### Phase O2 — Observer製品完成

- [ ] host-neutral SupervisorとClaude/Codex host adapterを完成する。
- [ ] 親identity、同provider配置、同一UX、Mailbox配送、crash recovery、installer/rollbackを完成する。
- [ ] 伴走者としての既定沈黙、一サイクル一件、dedupe/cooldownをE2Eで固定する。
- [ ] Observer側ControlとPhase監査を閉じる。

詳細: [Observer計画 Phase 2](plan_observer-factory-integration.md#phase-2-observer完成) ／
Observer `docs/plan_observer.md`

### Phase R2 — host単位の統合rollout

- [ ] Mac、main-server、FOX WSL2、FOX Windows nativeの各hostで、一回のcampaignとして
  install/config/routing/hook/MCP/Throughline/factory reporterを検証する。
- [ ] Callout HookとGPT-5.6再配線の他端末残件を、Codex全対応Wave 3の同じreceiptで閉じる。
- [ ] 新規Claude/Codex sessionで`gpt_connector`、3 role routing、session handoff、Spotter project hookを実火する。
- [ ] host固有のH操作、未対応、optional、blockedを混同せず端末台帳へ記録する。

詳細: [Codex全対応 Wave 3](plan_codex-full-support.md#wave-3--現役端末-rollout-と既存プラン閉鎖) ／
[BugHub計画 Wave 8](plan_bughub-factory-integration.md#wave-8--4環境canary-rollouthf)

### Phase O3 — Elastic provider対称化

- [ ] Observer同社、相談役異社、一般Worker適応配置をshared orchestration契約へ固定する。
- [ ] Codex→Claude execution/consultationとClaude→Codex consultationのhandle、observe、resume、
  timeout回収、failure mappingを実装する。
- [ ] provider障害時の切替を別Runとして記録し、fallback元の成功へ偽装しない。

詳細: [Observer計画 Phase 3](plan_observer-factory-integration.md#phase-3-elasticのprovider対称化)

### Phase O4 — rate-aware scheduler

- [ ] provider-owned quota snapshot、window正規化、`pace_ratio`、hysteresis、pool lock、reservationを実装する。
- [ ] stale、取得不能、矛盾、reset境界、残量ゼロをfail loudにし、架空値や暗黙fallbackを使わない。
- [ ] Control schemaとreceiptへselector decisionを束縛し、週次dogfoodで両社の消費ペースを評価する。

詳細: [Observer計画 Phase 4](plan_observer-factory-integration.md#phase-4-rate-aware-elastic-scheduler)

### Phase R3 — wire v2 finalization

- [ ] Mac/Windows scheduler、Oracle rollback drill、BugHub canary、outbox復旧、全host E2Eを完遂する。
- [ ] Callout、GPT-5.6再配線、Codex全対応の子計画を同じhost証拠で閉じてarchiveする。
- [ ] wire v2固定12製品のfull gate、独立反証、finalization receiptを一回ずつ通す。

詳細: [BugHub計画 Wave 9](plan_bughub-factory-integration.md#wave-9--定常運用と完了) ／
[Codex全対応 Wave 4](plan_codex-full-support.md#wave-4--最終監査と完了)

### Phase J1 — Observer wire v3編入

- [ ] O2〜O4のObserver/Elastic受入と、R3のwire v2 finalization receiptをjoinする。
- [ ] 固定13製品wire v3、Observer diagnostics/runtime error、host matrix、BugHub schema、installer、
  migration、rollbackを実装する。
- [ ] Observer受入後にだけPLAN/AGENTS/READMEのコア一覧を9製品から10製品へ更新する。
- [ ] 全repoの独立gate、全host E2E、Phase監査、knowledge returnを完遂し、子計画と本書をarchiveする。

詳細: [Observer計画 Phase 5〜6](plan_observer-factory-integration.md#phase-5-工場wire-v3とbughub編入)

## 5. 主キャンペーン後の保守queue

以下は主レーンを遮らない。対象repoを触る機会、またはH条件が整った時に消化する。

- [ ] GitHub側のみのrepo 20件超の終活裁定を行う。削除・archiveはオーナー承認後だけ行う。
- [ ] [P4メモリ昇格queue](queue_memory-promotion.md)を各repoの次回作業時に消化する。
- [ ] npm Publishing accessの2FA／token禁止締めをオーナー画面で行う（H）。
- [ ] Novel(forklore)統合済みbranchをlock解除・承認後に削除する。
- [ ] permission allowlistを主要repoへ横展開する（H確認後）。
- [ ] このMacの端末メモリからrepo正典への昇格実施を確認する。
- [ ] Throughline `.agents/`とWebAICoding `.playwright-mcp/`を各repoの`.gitignore`へ追加する。
- [ ] SmartClaude-UpdateToolsを`agents-update`へ統合するかFOX Windowsで裁定する。

## 6. 全体完了条件

- [ ] 本書のPhase O1〜O4、R1〜R3、J1がすべてgreenである。
- [ ] 子計画の未完TODOがゼロで、完了した子計画がarchiveへ退避されている。
- [ ] 全現役hostの証拠が一回のhost campaignへ集約され、重複full regressionがない。
- [ ] H操作の目的、影響、rollback、承認記録が各receiptに残っている。
- [ ] repoごとの独立commit/rollbackを保ち、明示承認されたpush後にremoteと同期している。
