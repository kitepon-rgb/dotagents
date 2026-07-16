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
| [Observer完成・Elastic改善](plan_observer-factory-integration.md) | Observer、両社orchestration、rate-aware配置、wire v3 | Active。O1完了、O2 queue 19dが次の非H ready |
| [BugHub工場統合](plan_bughub-factory-integration.md) | 固定12製品wire v2、自己監視、4環境rollout | Active。R1 local closure完了、実hostはR2、意図的canaryはR3で進める |
| [Codex全対応](plan_codex-full-support.md) | 全端末のinstall/config/routing/hook/MCP/session E2E | Active。実端末作業はR2へ集約する |
| [呼びかけHook](plan_callout-hooks.md) | hook詳細契約。残る実端末展開はCodex全対応へ合流 | Active。独立着手せずR2の同一host receiptで閉じる |
| [GPT-5.6再配線](plan_gpt56-rewiring.md) | role routing詳細。残る他端末展開はCodex全対応へ合流 | Active。独立着手せずR2の同一host receiptで閉じる |
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

### 現在の実行queue（2026-07-16再開点）

上から順にdispatchする。子計画内の未完チェック数は優先度に使わず、本queueとPhase依存だけで
次の作業を決める。完了・blocked・H待ちが変わった時だけ本節を更新する。

| 順位 | 状態 | 作業 | 所有repo / gate |
|---|---|---|---|
| 1 | `DONE` | Claude/Codex各fixtureの65秒超Observer live wait | Throughline / focused live fixture |
| 2 | `DONE` | hook・capture・auditor-context・token monitorの関連回帰と文書同期 | Throughline / related gate |
| 3 | `DONE` | O1 full regression、独立監査、Control finalization、Observerへのreceipt還流 | Throughline → dotagents / Phase gate |
| 4 | `DONE` | ADR 0044のCodex terminal observation APIとhost-neutral provider binding step machine | Observer / focused gate |
| 5 | `DONE` | Claude／Codex provider result journal coreとSupervisor cleanup handoff | Observer / focused gate |
| 6 | `DONE` | cycle所有権を外部Supervisorへ一意化し、Codex cycle-per-turn request/result coreを訂正する | Observer / focused＋related gate |
| 7 | `DONE` | Supervisor一step coreをverified Throughline／Codex session所有process・CLI loopへ接続する | Observer / focused＋related gate |
| 8 | `MERGED→19e` | Codex live app-serverとClaude公開非対話delivery／Stop captureをqueue 19eへ統合 | Observer / live H gate |
| 9 | `DONE` | wire v2の製品所有repo残欠陥とH不要のfixture／adapterを閉じる | 各製品repo / R1独立gate |
| 10 | `DONE` | planned rollover、parent rebind、generation faultの非H transactionを閉じる | Observer / O2 focused＋related gate |
| 11 | `DONE` | P2-5のAI tool surface空・project不変・Supervisor Mailbox write fixtureを閉じる | Observer / O2 focused＋related gate |
| 12 | `DONE` | P4-3 semantic gateとdedupe／cooldownをMailbox publish前へ接続する | Observer / O2 focused＋related gate |
| 13 | `DONE` | P5-1a host-neutral core E2Eと非H fault matrixを閉じる | Observer / O2 focused＋related gate |
| 14 | `DONE` | public watch lifecycle／CLI／status／stop UXを両provider共通化する | Observer / O2 focused＋related gate |
| 15 | `DONE` | Observer MCP compatibility／diagnosticsの存廃と公開契約を裁定する | Observer / O2 focused＋related gate |
| 16 | `DONE` | P5-2a clean環境installer／verify／rollback契約を閉じる | Observer → dotagents / 独立gate |
| 17 | `DONE` | P5-2b empty fast path性能／retention cleanup契約を閉じる | Observer / O2 focused＋related gate |
| 18 | `DONE` | P5-1b／P3-4c dual-host live H campaignの非H preflightを閉じる | Observer / O2 focused＋related gate |
| 19a | `DONE` | Codex production parent caller coreとinitial generation bootstrapを閉じる | Observer / O2 focused＋related gate |
| 19b | `DONE` | Codex parent entry／dotagents配布をisolated HOMEで閉じる | Observer → dotagents / 独立gate |
| 19c0 | `DONE` | Claude characterization専用の隔離capture／receipt／prepare／verify／cleanup harnessを閉じる | Observer / O2 focused＋related gate |
| 19c | `SUPERSEDED` | 旧background job経路の公開reply／exact result不在とcanonical result拒否を記録する | Observer / O2 historical contract |
| 19c1 | `DONE` | hook未発火とpayload／result不正を分けるraw-free diagnostic receiptを閉じる | Observer / O2 focused＋related gate |
| 19c2 | `DONE` | diagnostic receiptで一つのClaude jobを再characterizeする | Observer / O2 H gate |
| 19c3 | `DONE` | Aitermへ永続PTYの対話型`claude_agent`とoperation相関付き公開completion／recovery契約を追加する | Aiterm / 独立focused＋related＋full gate |
| 19d | `READY` | Aiterm公開面だけで永続Claude Observer production callerを実装する | Observer / O2 focused＋related gate |
| 19e | `H-WAIT` | Aiterm実Claude smokeを含むObserver dual-host live campaignを一回実施する | Observer / O2 H gate |
| 20 | `H-WAIT` | 4 host統合campaignとBugHub意図的canaryを行う | dotagents / R2〜R3 H gate |
| 21 | `JOIN` | O2〜O4とR2〜R3を閉じ、wire v3へ合流 | 本書のJ1 gate |

H待ちはready queueへ混ぜない。現役hostへの設定適用、本番BugHub、credential/login、publish、deploy、
意図的障害試験、pushは、目的・影響・rollbackを示してオーナー承認を得た後にだけ実行する。
現在の非H ready queueは19dである。19c2は一回の再Hを完了し、Claude Code 2.1.210のbackground job経路に
公開reply／terminal exact result readがなくcanonical resultも拒否された事実は維持する。一方、
Aiterm所有の永続PTYへ対話型`claude_agent`を追加する公開routeを
[ADR 0033](adr/0033-observer-persistent-context-and-aiterm-claude-route.md)で採用した。
基礎実装はAiterm `dd43c40`、operation相関訂正は`3842ff2`、focused 1/1、related 122/122、
full 262/262、独立反証P0/P1/P2残存なしで完了した。fixture成功をlive成功へ丸めないが、
[ADR 0033](adr/0033-observer-persistent-context-and-aiterm-claude-route.md)の順序どおり非Hの19dを先に実装し、
実Claude初回／follow-upは19eの一回のdual-host live H campaignへ統合する。19d未完のまま
19e／O3／後続laneは先行させない。
preflight後に判明したCodex parent callerと配布の非H欠落は
[ADR 0025](adr/0025-observer-codex-parent-caller-core-receipt.md)と
[ADR 0026](adr/0026-observer-codex-parent-entry-distribution-receipt.md)で受け入れた。
さらに19cを実行可能にするprovider result capture harnessが未実装だったため、
[ADR 0027](adr/0027-observer-claude-characterization-readiness-correction.md)で非H queue 19c0を先行させた。
queue 19c0はObserver `f40b672`、dotagents `78c358b`と
[ADR 0028](adr/0028-observer-claude-characterization-harness-receipt.md)で受け入れた。
queue 19cのlive Hは一つのjob／model requestで実施したが、Stop capture欠損、公開replyと
terminal exact result readの不在により[ADR 0029](adr/0029-observer-claude-live-characterization-blocked.md)で
`BLOCKED`とした。19dの部分実装やprivate fallbackは行わず、19cの公開契約が成立するまで19eと
O3を先行させない。さらにcapture欠損がhook未発火とhook内parse拒否を区別できない診断欠陥を
[ADR 0030](adr/0030-observer-claude-characterization-diagnostic-queue.md)で19c1非Hと19c2再Hへ分離した。
19c1はObserver `f239a07`、focused 9/9、related 29/29、`npm run check` greenと
[ADR 0031](adr/0031-observer-claude-diagnostic-receipt-acceptance.md)で受け入れた。
19c2は一つのbackground job／Haiku requestで再characterizeし、hook invocation、job／session、
Stop payload、terminal、cleanupをconfirmedへ切り分けた。canonical resultは
`E_CLAUDE_CHARACTERIZATION_RESULT_INVALID`、公開reply／terminal exact resultはunsupportedであり、
[ADR 0032](adr/0032-observer-claude-live-recharacterization-blocked.md)で19c／19dのblocked継続を受け入れた。
その後、Throughline L2をObserver自身の継続理解の代替にせず、Supervisorを非AI transport制御へ限定する
思想を訂正した。旧background job blockerを保持したまま、Aitermの対話型`claude_agent`を19c3へ追加し、
[ADR 0033](adr/0033-observer-persistent-context-and-aiterm-claude-route.md)で19dの新しい依存先を固定した。
queue 8は19eへ統合済みである。

再開時の所有境界:

- Throughlineのcompleted chain、DB projection、JSON read/wait/cancel/timeoutは実commitとfocused gateで
  完了済み。残りはqueue 1〜3であり、同じ実装を作り直さない。
- Observer repoの`docs/plan_observer.md`とADR 0044の既存dirtyは前セッションの未完成果として保全し、
  O1完了前には編集しない。
- Latticeは別セッションの所有物であり、本計画の調査・実装・正典還流の対象外とする。

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

- [x] R1 full gateで再現したMarkdown空行lint 3件を、内容を変えず最小修正してfocused lintを通す。
- [x] Decision証拠を可変plan/TODOからwave専用の不変ADRへ分離する規約を、リポ正典へ固定する。
- [x] active RunのDelegation Packetを再dispatchなしで回収できるread-only公開入口を追加する。
- [x] active fixed Worker中の非交差fast-forward commitを安全に検証し、Report回収不能を解消する。
- [x] `boundedArray`が空の必須配列を「arrayでない」と誤診する問題を修正し、必要最小件数を名指しする。
  - 空配列と非配列を分離し、`observation.dispatch_evidence must contain at least 1 entries`へ修正した。
    正規のrunning観測は空fieldを送らず省略する。focused gate 1/1 green、fullはPhase末へ繰り延べる。
- [x] Control finalizationが可変planをDecision証拠として受理する欠陥を修正する。
  - Observer O1の正規`task-finalize-record`で`docs/plan_observer.md`が受理され、リポ正典の
    「accept/reject/finalizationは不変ADR」を破れることを再現した。
  - Taskの`finalization_ref`とControlの`parent_decision.ref`を`docs/adr/*.md`へ限定し、可変planを
    fail closedにする。既存の同一path・同一blob履歴保持契約は維持する。
  - `852c704`で修正。focused finalization gate 10/10 green。関連gateは92/93 greenで、唯一の失敗は
    下記の既存期待漏れと特定したため、変更済み92件を反復せず失敗scopeだけ再検証した。
- [x] 未作成fallback Decisionのエラー期待を`IO_FAILURE`契約へ揃える。
  - `4ac37f3`で未作成Task文書をgit障害へ誤分類しない契約に直した際、fallback文書の既存testだけ
    `GIT_FAILURE`期待が残り、Control Record関連gate 92/93で再現した。
  - 期待値だけを現契約へ揃え、focused gate 1/1 green。full regressionはPhase末へ集約する。
- [x] Worker Report importが許容clock skewを超える未来の証拠時刻を受理する欠陥を修正する。
  - Observer Supervisor統合Runで、実時刻`2026-07-15T14:41Z`に対して`15:15Z`の
    `evidence[].observed_at`と`validation_results[].evidence.observed_at`をControl revision 55が
    受理することを再現した。受入前に検出したため、当該Runはrejectして正しい証拠でretryする。
  - 異host間のclock skewは5分まで許容し、それを超える未来時刻は`EVIDENCE_FROM_FUTURE`で
    fail closedにする。過去の証拠は長時間Runやoffline回収の正当な履歴として維持する。
  - top-level／validation証拠のfocused gate 1/1、Control Record関連gate 93/93、`make lint-js`が
    green。最初の関連gateは完走後のexit code回収に失敗したため未検証扱いとし、同じgateを
    session回収可能な入口で一度再実行した。full regressionはPhase末へ集約する。

### Phase O1 — Throughline completed-turn feed（COMPLETE）

- [x] Claude receiptとCodex `task_complete`から、rollback検知可能なhost-neutral completed chainを完成する。
  - Throughline `def92f4`、`022c0b8`、`7b07425`と同repo計画のfocused gateを実diffで確認した。
- [x] DB projection、`projection_pending`、pagination、JSON-only read/wait、cancel、timeoutを完成する。
  - Throughline `e3380fa`、`60c4036`、`1165efd`と65.1秒のClaude live wait証拠を確認した。
- [x] 65秒超live waitとClaude/Codex E2Eを通し、Phase full gateを一回だけ実行する。
  - 両host live waitはObserver commit `dc31c08`のfixtureで2/2成功、実行時間68.442秒。
    Throughline関連gate 130/130、full 661件中660成功・Windows限定1 skip。
  - 独立監査のP1/P2は成功へ丸めずrejectし、Throughline `02a809f`／`88fafaf`で独立修正、
    focused 28/28を通した。
- [x] Throughline側Controlをfinalizeし、成果commitとADR digestをObserver計画へ還流する。
  - Phase受入はThroughline ADR 0010、lane補正はADR 0011。監査修正Control revision 15、
    元closure Control revision 78でfinalizeし、Throughline計画commit `ebfc152`へ固定した。

詳細: [Observer計画 Phase 1](plan_observer-factory-integration.md#phase-1-throughline両host-completed-turn-feed) ／
Throughline `docs/14_observer_completed_turn_feed_plan.md`

### Phase R1 — wire v2残欠陥（O1以降と並行可）

- [x] registry公開版とdotagents adapterのschema drift、Throughline diagnostics、Windows ACL／npm shim、
  Codex Sidecar実配布版の残件を製品所有repoで閉じる。
  - [x] 基盤toolchain 3製品のregistry／Grok exact update契約を`fc3bf3f`で実装し、
    [ADR 0012](adr/0012-toolchain-update-version-acceptance.md)で受け入れた。
  - [x] Throughline diagnostics producer修正v0.6.3を
    [ADR 0013](adr/0013-throughline-diagnostics-product-receipt.md)で受け入れた。host導入はR2へ残す。
  - [x] Windows factory ACLのローカル3入口を`39fba73`で統一済みと確認し、
    [ADR 0014](adr/0014-windows-factory-acl-local-receipt.md)で受け入れた。FOX実機receiptはR2へ残す。
  - [x] Windows npm shimのPATHEXT／現行2スペースshapeを`5f781a8`／`5479a73`で修正済みと確認し、
    [ADR 0015](adr/0015-windows-npm-shim-local-receipt.md)で受け入れた。FOX実機receiptはR2へ残す。
  - [x] Spotter Windows Codex実行経路の製品修正v1.4.25を
    [ADR 0016](adr/0016-spotter-windows-codex-product-receipt.md)で受け入れた。4 host実配布receiptはR2へ残す。
  - [x] Codex Sidecar Windows MCP shim修正v0.3.7を
    [ADR 0017](adr/0017-codex-sidecar-windows-mcp-product-receipt.md)で受け入れた。FOX実配布receiptはR2へ残す。
  - [x] dotagentsのSidecar `auditor` presetとfactory v2 scannerのpreset名／dry-run exact検証を
    `a35e987`、focused 10/10、[ADR 0020](adr/0020-sidecar-auditor-adapter-receipt.md)で受け入れた。
- [x] BugHub自己監視のoutbox再送fixtureとPi5外部通知bridgeのH不要source契約を、意図的障害試験の
  前まで完成する。Pi5本体のversioned source／fixture receipt欠落は
  [ADR 0019](adr/0019-r1-local-closure-refutation.md)のP1としてR1へ戻した。
  - [x] ServerManager所有のbridge／60秒ticker／`run(deps)` fixtureをimmutable commit/pathとfocused
    12＋4件で[ADR 0021](adr/0021-servermanager-pi5-bughub-bridge-receipt.md)へ受け入れた。意図的障害と
    実Discord／BugHub配送はR3のH gateへ残す。
- [x] R1 full gateと一回の独立反証へのcorrectionを
  [ADR 0022](adr/0022-r1-local-closure.md)で受け入れた。

詳細: [BugHub計画 Wave 6〜8](plan_bughub-factory-integration.md#wave-8--4環境canary-rollouthf)

### Phase O2 — Observer製品完成

- [ ] host-neutral SupervisorとClaude/Codex host adapterを完成する。
  - [x] planned rollover、parent rebind、generation faultを別transaction／receiptとして
    host-neutral core、両provider binding、Supervisor restart gateへ接続した。
    Observer `2bfc09c`／`426f8b9`／`3a737ad`／`107d2ca`／`22cf33a`、
    corrective `fe4f743`、ADR 0070〜0082で受け入れた。実host terminal／faultはH gateへ残す。
  - [x] P2-5の旧Observer MCP write条件をADR 0060後のSupervisor所有境界へ補正し、
    exact-empty AI tool surface、Codex read-only envelope、project fingerprint不変、
    Observer state root配下のMailbox publishをObserver `74c8228`／`2168199`／`4110de3`、
    ADR 0083〜0084で受け入れた。live project write拒否とClaude `--safe-mode`互換はH gateへ残す。
  - [x] materiality、evidence、novelty、actionability、timingとdedupe／cooldownを
    Mailbox publish前のhost-neutral semantic gateへ実装し、通常進行を既定沈黙にする。
    Observer `539b2f2`／`0c502ec`／`8c0a54d`／`c007e06`／`c450a65`／`bd2a777`／
    `a67ce92`／`152afd5`、ADR 0087〜0091で、60分cooldown、severity escalation、record-first
    decision、Mailbox exact replay、strict behavioral evalを受け入れた。focused 17/17、関連62/62、
    `npm run check`がgreen。実providerの採否とdogfoodはP4-4のH gateへ残す。
  - [x] Codexのread-only generation terminal観測とhost-neutral一command一step bindingを実装する。
    Observer `b06a847`／`02329ad`、関連gate 46/46、ADR 0046、Control revision 29で受け入れた。
  - [ ] model request送信結果不明をhost lifecycleと別journalで回収する。
    - [x] host-neutral model operation journal coreと回収不能window補正をObserver
      `4c3cc03`／`8afebca`、ADR 0049／0053で受け入れた。
    - [x] model operation専用Mailbox exact replayをObserver `0e7a005`、ADR 0052で受け入れた。
    - [x] Supervisorをissue／recover／apply／finalizeの四境界へ統合する。
      Observer `c226cc9`、focused 15/15、関連gate 47/47、ADR 0054、Control revision 62で受け入れた。
    - [ ] Claude／Codexのexact operation result readをprovider固有journalへ実装し、送信結果不明を
      別operationへの再送やhost lifecycleの成功で隠さない。
      - [x] provider journal coreをObserver `4443ff9`、両host focused 10/10、ADR 0056で受け入れた。
        Control `observer-provider-result-read-20260715`はrevision 28でfinalize／archive済み。
      - [x] generic completed後のprovider cleanupをSupervisorへ接続し、cleanup成功後だけapplyする順序を
        Observer `3600876`、focused 26/26、ADR 0057で固定した。
      - [ ] 同じlogical generationへcycle入力を一度だけ配送するrequest contractを先に固定する。
        provider acceptedは「既に動いているhost lifecycle」ではなく、このrequest固有handleを証明する。
        - [x] **SUPERSEDED:** host-neutral canonical cycle requestとCodexの`thread/read baseline -> turn/steer -> exact ACK` fixtureを
          Observer `1bb7b07`、focused 22/22、Supervisor関連16/16、ADR 0059で受け入れた。
          provider journal欠損補正は維持するが、AI wait loopとSupervisorの二重所有、Stop idle問題のため
          `turn/steer`／Stop continuation部分をADR 0060でsupersedeした。
        - [x] 外部Supervisor単一所有とCodexの
          `thread/read context -> cycle turn/start -> exact ACK -> accepted journal`へ訂正した。
          Observer `3f35dbb`、focused 38/38、Supervisor関連16/16、static gate、ADR 0061、計画commit
          `1d442c8`で受け入れた。Claude accepted recoveryの永久poll skipも同じ単位で修正した。
        - [ ] 外部Supervisor production callerを一target一process／一cycle一stepで接続し、timeoutではAIを
          起動せず、record-first operationからprovider request／result／apply／cursor commitを駆動する。
          - [x] `applyCycle`／`finalizeAppliedCycle`をdurable cycle input／operation時刻へ束縛し、advisoryの
            Mailbox exact replayとapplied後cleanupへ接続した。Observer `fc51157`、focused 4/4、関連40/40、
            ADR 0062／0063、計画commit `7a638cd`で受け入れた。
          - [x] 一target一process lock、evidence input、Codex provider callback、`runSupervisorCycle`、sanitized receiptを
            束ねる一cycle一step callerを実装した。Observer `0ca7abe`、focused 4/4、関連44/44、ADR 0064／0065、
            計画commit `5169db1`で受け入れた。
          - [x] verified Throughline clientとpre-initialized Codex app-server sessionを所有する外部process／CLIへ
            一step coreを配線し、timeout／cancel／fault／explicit stop loopを固定した。Observer `77cbae4`／
            `4e29398`／`6d03b71`／`96ccad7`、corrective `dda8567`／`f7efa09`、最終関連70/70、
            static gate、ADR 0066〜0069、計画commit `e2adbca`で受け入れた。
            cross-repo receiptは[ADR 0010](adr/0010-observer-supervisor-process-receipt.md)を正とする。
        - [ ] Claude background jobへの公開非対話reply ACKをlive H gateで実証する。Claude Code 2.1.210の
          `agents` shell surfaceにはsendが無いため、`claude -p --resume`やprivate protocolを推測fallbackにしない。
      - [ ] Codexはcycleごとのthread／session／turn／cwdとexact result、Claudeは隔離`--settings` Stop hookと
        job `sessionId`／payload `session_id`を束縛し、core callbackへ接続する。
      - [ ] production caller fixtureの後、実model request、hook trust、session相関をlive H gateで一度だけ実証する。
- [ ] ユーザーの明示指示を受けた親だけが同provider Observerを起動し、一target一watchを確保する。
  二重起動、後勝ちtakeover、暗黙起動、自動再起動はfail closedにする。
  - [x] 非Hの公開`observer watch`／`watch start|status|stop` handlerを実装し、親context、
    provider adapter availability、previous watch CAS、sanitized result、terminal receipt stopを固定した。
    Observer `a4195a3`／`f904922`、ADR 0095〜0096、focused 13/13、関連37/37、static greenを受け入れた。
  - [ ] dotagents／installerから現在親の実host actionを注入し、live spawn／stopをP5-1b H gateで受け入れる。
- [ ] 親identity、同provider配置、同一UX、明示停止、Mailbox配送、crash recovery、installer/rollbackを完成する。
  - [x] Observer MCPをread-only compatibility／diagnosticsとして維持し、決定的な
    `observer-mcp --diagnostics`、package bin、stdio／version互換、production AI surface無効を固定した。
    Observer `1d85039`／`951cdeb`、ADR 0097〜0098、focused 5/5、関連24/24、static greenを受け入れた。
  - [x] P5-2aとしてversioned製品manifest、sanitized verify、隔離install／reinstall／rollbackを閉じた。
    Observer `630c5ff`／`b45c07a`／`d03495d`、dotagents `894799b`、ADR 0099〜0100、
    Observer focused 12/12・関連32/32、dotagents multi-repo／hook／clean-home gateを受け入れた。
    実HOME apply、hook trust、live host、credential、publish／pushは未実施のH／後続gateへ残した。
  - [x] P5-2bとして空Mailbox fast pathと通常waitの性能分布／閾値、completed receipt cleanupの
    保護集合、失敗時の再実行決定性を隔離fixtureで閉じた。
    Observer `1d045df`／`8b49493`／`876fe5c`、ADR 0101〜0102、focused 10/10、関連39/39、
    hook p95 32.165 ms、空Mailbox p95 23.936 ms、wait overhead p95 35.982 msを受け入れた。
    full regressionと独立重監査はPhase O2 gateへ残した。
  - [x] P5-1b／P3-4cのdual-host live H campaign前に、binary／version／公開host surface／
    product manifest／hook候補／canonical cwdを非変更で検証するversioned preflightとrunbookを閉じる。
    Observer `50b4e86`／`bbe407d`／`80b06f0`、ADR 0103〜0104、focused 13/13、related 40/40、
    actual read-only preflight `h_required`を[ADR 0023](adr/0023-observer-live-preflight-receipt.md)で受け入れた。
  - [x] Codex production parent caller、current parent／initial generation bootstrap、同一app-server
    transportのSupervisor所有を非H fixtureで閉じる。Observer `133cf37`／`286a6db`／`8f5fb90`、
    focused 9/9、related 77/77、`npm run check` greenを
    [ADR 0025](adr/0025-observer-codex-parent-caller-core-receipt.md)で受け入れた。
  - [x] 現在Codex親からexact contextを注入するparent entryをdotagentsへ配布し、isolated HOMEで閉じる。
    Observer `659924c`／`0690ee0`／`41a031d`、dotagents `21bc352`、focused 12/12、related
    25/25、isolated install／verify／rollback、`npm run check`／`make lint` greenを
    [ADR 0026](adr/0026-observer-codex-parent-entry-distribution-receipt.md)で受け入れた。
  - [ ] Claudeの公開対話delivery／exact result readをAitermで完成し、その公開面だけで
    production callerを実装した後にdual-host live campaignへ進む。
    live Hと診断receipt後の再Hは各一回実施済みである。再Hでhook invocation、job／session、Stop
    payloadはconfirmedとなったが、canonical result拒否とreply／terminal exact result非公開により
    19c／19dをblockedとした
    （[ADR 0032](adr/0032-observer-claude-live-recharacterization-blocked.md)）。
    実装順の訂正は[ADR 0024](adr/0024-observer-parent-caller-queue-correction.md)を正とする。
    - [x] Aiterm queue 19c3で`claude_agent`の永続session、初回／follow-up、Stop完了、operation相関付き
      exact result、timeout後回収、interrupt／closeを非H独立gateで閉じた。`claude -p`反復は代替にしない。
      Aiterm `dd43c40`／`3842ff2`、focused 1/1、related 122/122、full 262/262、独立反証後green
      （[ADR 0033](adr/0033-observer-persistent-context-and-aiterm-claude-route.md)）。
    - [ ] queue 19dでAiterm公開面だけをClaude production callerへ接続する。
    - [ ] queue 19eで実Claude初回／follow-up各1 turn、Stop、exact result、timeoutなしの通常回収、
      session closeをdual-host campaignと同じ一回のH gateで確認する。model request、認証状態、
      実session生成を伴うため明示承認後に行う。
- [ ] 伴走者としての既定沈黙、一サイクル一件、dedupe/cooldownをE2Eで固定する。
  - [x] P5-1aとしてCodex completed cycleからsemantic decision、Mailbox、parent Stopまでを実coreで貫通し、
    silence／suppression／replay／誤配送／claim failureとClaude `provider_unavailable`を非H fixtureで固定する。
    Observer `ddd768a`／`e203190`／`f6b296b`／`0f5fd78`、ADR 0092〜0094で、focused 6/6、
    関連178/178、`npm run check` greenを受け入れた。
  - [ ] Claude／Codexのproduction request、session相関、hook trust、実host faultはP5-1bのH gateで受け入れる。
- [ ] Observer側ControlとPhase監査を閉じる。

詳細: [Observer計画 Phase 2](plan_observer-factory-integration.md#phase-2-observer完成) ／
Observer `docs/plan_observer.md`

### Phase R2 — host単位の統合rollout

- [ ] Mac、main-server、FOX WSL2、FOX Windows nativeの各hostで、一回のcampaignとして
  install/config/routing/hook/MCP/Throughline/factory reporterを検証する。
- [ ] 4 hostのSidecar `auditor` diagnosticsと、R1でlocal受入したThroughline／Windows ACL／npm shim／
  Spotter／Sidecarの実配布receiptを同じhost campaignで閉じる。
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
