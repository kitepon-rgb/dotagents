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
- テスト・監査の頻度は共通憲法「テストは薄く速く」と`shared/orchestrate/contract.md`「監査の頻度」に従う（本書へ複製しない）。

## 2. 子計画台帳

| 子計画 | 親内の役割 | 2026-07-16時点 |
|---|---|---|
| [Observer完成・Elastic改善](archive/plan_observer-factory-integration.md) | Observer、両社orchestration、rate-aware配置、wire v3 | 終了。Observerは予約・RC4条件付きsupportのため未編入 |
| [BugHub工場統合](archive/plan_bughub-factory-integration.md) | 固定12製品wire v2、自己監視、4環境rollout | 完了。最終gateとremote同期を証拠化してarchive済み |
| [Codex全対応](archive/plan_codex-full-support.md) | 全端末のinstall/config/routing/hook/MCP/session E2E | 完了。工程履歴はarchive、状態正本はLattice store |
| [呼びかけHook](archive/plan_callout-hooks.md) | hook詳細契約。端末横断受入はCodex全対応へ移管 | Completed。実装task完了、履歴をarchive済み |
| [GPT-5.6再配線](archive/plan_gpt56-rewiring.md) | role routing詳細。端末横断受入はCodex全対応へ移管 | Completed。Lattice 37 task完了、履歴をarchive済み |
| [Lattice編入](archive/plan_lattice-factory-integration.md) | Lattice RC4遂行、Codegraph吸収・fork改良、MCP面新設、wire v4 | Completed。Lattice 0.8.0、Codegraph退役、4 host cutoverまで完了 |
| [AIShell編入](plan_aishell-factory-integration.md) | AIShellコア化、native diagnostics、Mac統合、wire v5 | Active。0.3.0の診断面がmain外の孤児releaseだったため、専用factory profileとして再着地させる波を進行中 |
| [メモリ昇格queue](archive/queue_memory-promotion.md) | 各repo作業時の機会駆動queue | 終了。現行コア外の旧依頼は根拠付きで閉じarchive済み |

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
| 19d | `DONE` | Aiterm公開面だけで永続Claude Observer production callerとgeneration lifecycleを実装する | Observer / O2 focused＋related＋full gate |
| 19e | `DONE` | 通常系dual-host liveの維持証拠と、process残留訂正後の受入れを閉じる | dotagents → Observer / 訂正gate |
| 19e-r15 | `DONE` | Codex app-serverの固有process group全体をboundedに終了し、group不在まで確認する | Observer / focused＋related gate |
| 19f | `DONE` | post-spawn/pre-ready failureを同じwatch identity／handleのlaunch cleanupへ接続する | Observer / 独立focused＋related gate |
| 19g | `DONE` | 修理後HEADのfull regression、独立重監査、knowledge return、Control／receiptを閉じる | Observer → dotagents / O2 Phase gate |
| 20 | `IN-PROGRESS` | 4 host統合campaignとBugHub意図的canaryを行う。H承認は2026-07-18オーナー包括裁定で充足。intentional crash／通信断だけは実施直前に目的・影響・rollbackを改めて申告してから実行する。**2026-07-18前半消化**（Control `r2-host-rollout-20260718`）: BugHub Wave 8のMac cutover（item 2）・Mac canary drill（2a）・launchd再起動後canary（1s）・FOX Windows native rollout（5）を完了し、本番`/readyz`全check ready。実被弾P1修理3件: scheduler最小PATHの3host current汚染（`8d17dcc`）、task XML UTF-16（`beab0c0`）、batch token ACL（`8c6469c`）。**2026-07-18後半**: 意図的canary 6a（33秒停止・誤通知ゼロ）・6b（Pi5直接経路確立→open→resolve E2E完走）を消化し、6bで検出したv2 external event還流欠落P1を`5f22ed4`で修理。**Mac E2E（Wave 3）**: 非対話5項目（install／config dry-run／Spotter install／verify-install全green／`gpt_connector`診断）を消化し、実host hook適用は同日オーナーGOでClaude settings＋`apply-codex-config --apply`をbackup付きで完了。対話項目はThroughline smoke（capture／handoff）と`gpt_connector` consult smoke（復旧後再実行）が成功した。routing 3 role失敗はaiterm-mcp managed `CODEX_HOME`の`agents/*.toml`継承欠落が真因と診断し、aiterm-mcp 0.18.2で修理・publish・global installまで完了。再実火は起動済みMCP serverが旧版のため新sessionで行う。hooks実火未検出も同根の可能性があり、新規hookのtrust承認（H、`codex /hooks`のUI承認）待ち。**Lattice工程表**: factory-master 110 taskのstore初回登録（`2ac6c20`）と実ガント生成を確認。**残**: 4host新規session E2E（Codex Wave 3。Mac Claude側は消化済み）、1k schema drift（Mac throughline `unverified`）、1m main-server hook導入、0b/1p/1q/1r receipt束ね、Wave 9 | dotagents / R2〜R3 H gate |
| 23 | `DONE` | Lattice工程表・ガント面（オーナー裁定 2026-07-18）。critical path projection、ブラウザGantt、source cutover、discovery、run運用面まで受入済み。[完了記録](archive/plan_lattice-factory-integration.md) | Lattice → dotagents / LG gate |
| 21 | `JOIN` | O2〜O4とR2〜R3を閉じ、wire v3へ合流 | 本書のJ1 gate |
| 22 | `DONE` | LatticeのBugHub source登録（adapter/schema/認証）を独立waveで行う。ServerManager `0bb3ef3`＋`a04c6ea`・本番deploy・canary実証・後片付けまで完了（2026-07-18包括承認） | ServerManager / 独立gate |
| 24 | `IN-PROGRESS` | AIShellを第12コア製品へ編入する。native diagnosticsと既存wire非変更の統合準備を先行し、wire v5固定集合への正式enrollmentはLattice wire v4完了後に行う | AIShell → dotagents → ServerManager / A0〜A6 gate |

H待ちはready queueへ混ぜない。現役hostへの設定適用、本番BugHub、credential/login、publish、deploy、
意図的障害試験、pushは、目的・影響・rollbackを示してオーナー承認を得た後にだけ実行する。
19e通常campaignは2026-07-16に承認済み。実host適用前に、陳腐化したpreflight／runbookと
hook configの検証済みrestore入口を独立gateで修理し、green後に両hostを各一回だけ実行する。
intentional crash／通信断は別承認のため実施しない。O3／後続laneは19e完了まで先行させない。
最初のClaude live attemptはmodel応答後、Stop hookだけがcallerと異なる既定state rootを参照して
`E_PERMISSION_INVALID`となり、completed feed 0件のまま正規closeした。成功へ含めない。
Observer ADR 0127と本repo [ADR 0024](adr/0024-observer-hook-state-root-binding.md)に従い、
preflight／adapter／両caller／両hookを
同一explicit state rootへ束縛する独立修理を閉じてから19eを再開する。
state root修理後のClaude attemptではhook errorは消えたが、Aiterm controllerのPATHがglobal
Throughlineを先に解決し、DB sessionだけ増えてcandidate completed receiptが0件だった。
Observer ADR 0129と本repo [ADR 0025](adr/0025-throughline-capture-runtime-binding.md)に従い、
Claude parent controllerのPATH先頭をcampaign prefixへ固定し、capture／readを同じcandidateへ束縛する。
手動transcript投入やglobal package更新へfallbackしない。
PATH補正後もcompleted receiptは0件であり、Aitermのglobal tmux serverがserver生成時のstale環境を
新sessionへ継承していた。Observer ADR 0130と本repo
[ADR 0026](adr/0026-aiterm-campaign-runtime-isolation.md)に従い、campaign専用0700 `TMPDIR`と
candidate-first PATHを同時に渡してfresh Aiterm serverを作る。global socket／session／packageは変更しない。
最初の専用runtime名では最終tmux socketが105 bytesとなり、macOSの104-byte `sun_path`へ収まらず
session生成前に失敗した。本repo [ADR 0027](adr/0027-aiterm-runtime-socket-length-bound.md)と
Observer ADR 0131に従い、campaign root直下の短い0700 runtimeを使う。実物socketは
`<TMPDIR>/claude-tmux-sockets/claude.sock`、`r2`で94 bytesと実測され、Aiterm sessionと実Claude
`end_turn`まで成立した。旧ADRの予測名／92 bytesは本repo
[ADR 0028](adr/0028-queue19e-socket-and-stop-flush-correction.md)で訂正する。長いruntimeの失敗を
live成功へ含めない。
短いruntimeのattemptではStop hook error 0でもcandidate DB本文／receiptが0件だった。turn後の同じ
transcriptはlatest logical groupを返すため、async Stopがfinal assistant行の可視化前にone-shot
backfillしたThroughline flush raceである。Throughline commit `a46b915`でbounded barrierを実装し、
focused 14/14、subprocess 2/2、related 78/78、受入れ記録`af06e0a`を閉じた。失敗attemptは成功へ
含めず、修理済みcandidateを再梱包して19eを再開する。
修理済みcandidateの自然Stop receiptを1件確認後、実`observer parent claude run`はprovider launch前に
末尾`/`付きpackage rootをcanonicalでないとして拒否した。Observer ADR 0133とcommit
`33eb05a`でCLI runtime rootをcanonical directoryへ一意化し、focused 15/15、related 35/35、
package verify、installed module smokeを通した。失敗attemptはObserver live成功へ含めず、再pack済み
candidateから19eを再開する。
canonical root修理後の実callerは、Throughline整数`completed_at`をObserver evidenceのcanonical
`.sssZ`へ変換せずprovider launch前に拒否した。Throughline wireは既存公開契約どおり維持し、Observer
ADR 0134とcommit `d84c969`でevidence collector境界だけにstrict adapterを追加した。focused 9/9、
related 42/42、package verify、実feed installed smokeがgreen。失敗attemptは成功へ含めず、再pack済み
candidateから19eを再開する。
19c2は一回の再Hを完了し、Claude Code 2.1.210のbackground job経路に
公開reply／terminal exact result readがなくcanonical resultも拒否された事実は維持する。一方、
Aiterm所有の永続PTYへ対話型`claude_agent`を追加する公開routeを
[ADR 0033](adr/0033-observer-persistent-context-and-aiterm-claude-route.md)で採用した。
基礎実装はAiterm `dd43c40`、operation相関訂正は`3842ff2`、公開version境界は`ceb75e8`、
構造化machine callerは`28b7438`、launcher structured receiptは`f0fcf10`で完了した。相関gateは
focused 1/1、related 122/122、full 262/262、独立反証P0/P1/P2残存なし、構造化caller gateは
focused 5/5、related 126/126、launcher receipt gateはfocused 4/4、related 94/94でgreenである。
fixture成功をlive成功へ丸めないが、
[ADR 0033](adr/0033-observer-persistent-context-and-aiterm-claude-route.md)の順序どおり非Hの19dを先に実装した。
Observer `7bfafa4`、focused 20/20、related 50/50、full 393/393、Control revision 62／20 archiveを
[ADR 0038](adr/0038-observer-claude-generation-lifecycle-receipt.md)で受け入れた。実Claude初回／follow-upは
19eの一回のdual-host live H campaignへ統合する。
queue 19eはオーナーの明示承認後、campaign candidateだけで完了した。Claude r12／Codex r11は各々
親completed feed 2件、同じObserver generationのcompleted cycle 2件、初回cycle後65秒超、pending state
なし、caller cancel／host terminalを満たした。最初のconfig archiveから両provider設定をdigest、mode
0600、uid 501、gid 20一致で復元し、candidate設定が残っていないことも確認した。campaign中に再現した
所有製品欠陥はAiterm `4d3befd`、Observer `396cf05`／`ebd8ae6`／`b044690`／`9eb4a7e`、Throughline
`95a3233`へ独立修理し、修理済みfresh runだけを成功へ数えた。受入証拠は
[ADR 0039](adr/0039-observer-dual-host-live-acceptance.md)、Observer ADR 0139、Throughline ADR 0013を正とする。
intentional fault、push、publish、deploy、loginは実施していない。次はObserver P5-3のfull regression、
独立重監査、knowledge returnであり、その完了前にO3を開始しない。
ただしcampaign root削除前のopen-file検査で、終了済みCodex app-server二attemptが起動したMCP
process群16件の残留が判明した。app-server leader件数0をprocess全体の終了へ読み替えた証拠だけを
[ADR 0041](adr/0041-observer-queue19e-process-group-correction.md)で失効し、queue 19eを`CORRECTION`へ戻す。
製品側の設計DecisionはObserver `b089448`／ADR 0140を正とする。P5-1b5b-r15と、独立再現する
post-spawn/pre-ready recovery欠陥を別gate／別commitで閉じ、修理後HEADのPhase gateを完了するまで
O3／後続laneを開始しない。
Observer `1493b35`／ADR 0144、focused 16/16、related 68/68、full 412/412、P0/P1残存0、
Control revision 26 archiveを[ADR 0042](adr/0042-observer-phase-o2-cross-repo-receipt.md)で受け入れた。
queue 19e-r15／19f／19gとPhase O2は完了し、次ready TODOをO3へ進める。
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
- ~~Latticeは別セッションの所有物であり、本計画の調査・実装・正典還流の対象外とする。~~
  **2026-07-17のオーナー裁定で失効**。Latticeはdotagentsの**コア製品**とし、Lattice repo自体の
  開発・RC4遂行・正典還流を**dotagents統括の直轄**とする（AGENTS.md「自作コア製品の正規repoへ
  必要な修正を行う」恒久裁定の範囲）。別セッションへの連絡・返答パッケージは不要になった。
  詳細受入記録は[Lattice編入完了plan](archive/plan_lattice-factory-integration.md)が所有する。

Lattice編入のオーナー裁定（2026-07-17）:

- Lattice RC3完了報告を一次資料検証（CI 290 green独立再現、manifest digest再計算一致、
  改竄検出テスト実走）と反証3本の吸収後に受理した。RC4 staged計画（Stage 0 read-only／
  Stage 1 disposable clone／Stage 2 正規着地）を実行計画として継承する。
- **CodegraphをLatticeへ完全吸収・置換する**。前提としてLattice MCP面を新設し、session内
  code intelligenceを継承する。Codegraph本体はMIT第三者だが、**公開面・情報量の不足が実測で
  再現した場合はfork＋改良を行い**（notice維持）、Lattice内部の自作sensorとする。call graph外
  結合（shell・markdown・設定）の索引化がwitness手書きコスト（RC3最重量・RC4の反証条件）を
  根本から下げる本命であり、運用回避で埋めない。fork判断はStage 0の実測を根拠にする。
- **wire v3は既裁定の固定13製品のまま凍結（A案）**。Lattice編入＋Codegraph退役はRC4 support後の
  wire v4独立waveで行い、v3へ後付けしない。退役手順はOracle前例（shadow同等性→host別cutover→
  `retire`/`restore`入口→履歴保持のnot_applicable遷移）に倣う。
- RC4 Stage 0の題材は、凍結不要の運用合意（read-only実測のみ・dotagents側の消化は止めない・
  判定のstale化はそれ自体を実測記録とする）のもとactiveレーンのTODOから出す。
- Stage 1は、隔離HOMEでのexecutor実行と、executor packetでの`install.sh`・`spotter install`・
  `apply-codex-config`・`mcp add`系の実行禁止を必須条件とする（cloneが搬送するオンボーディング
  正典にhost変更手順が含まれ、clone内`install.sh`実行はhost symlinkをtmpdirへ向ける）。
- RC4中のdotagents実欠陥はBugHub経路とし、queue 22（Lattice source登録）を即着手する。
  登録完了までの暫定は常設割込ゲート＋maintenance queue経由。
- `codex/rules/default.rules`のLattice向けallow 1行はRC3 planのarchive移動でstale確定し、
  オーナー承認でdiscard済み（「非commit保全」裁定を更新・終結）。

## 4. 実行TODO

Phase節は**レーン別に区切り、各レーン内は上から実行順**に並べる。レーン間は並行であり、
着手順の正本は§3「現在の実行queue」だけとする。順不同の受入束をこの節に作らない。

### Phase M0 — TODO統合

- Latticeへ移管済み: fm-0245 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L6
- Latticeへ移管済み: fm-0246 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L7
- Latticeへ移管済み: fm-0247 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L8

### 常設割込ゲート — 正規運用で再現した工場欠陥

コア製品、ServerManager/BugHub、dotagentsのorchestration・installer・hook・adapterなどを
正規入口で実利用中に再現した欠陥または運用不能な摩擦は、発見時点で本筋を保持して所有repoの
`docs/`正本TODOへ登録する。独立gate・独立commitで根治してから、必ず保持位置へ戻る。
第三者製品、H操作、権限外の変更は修理済みにせず、TODO登録後に承認・所有者対応を待つ。

- Latticeへ移管済み: fm-0256 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L9
- Latticeへ移管済み: fm-0257 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L10
- Latticeへ移管済み: fm-0258 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L11
- Latticeへ移管済み: fm-0259 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L12
- Latticeへ移管済み: fm-0260 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L13
  - 空配列と非配列を分離し、`observation.dispatch_evidence must contain at least 1 entries`へ修正した。
    正規のrunning観測は空fieldを送らず省略する。focused gate 1/1 green、fullはPhase末へ繰り延べる。
- Latticeへ移管済み: fm-0263 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L14
- Latticeへ移管済み: fm-0264 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L15
  `STATE_PATH_UNSAFE: state directory owner or mode is unsafe`で不能な欠陥を、外部state配置で修理する。
  - FOX WSL2実機で再現・実測（chmod 0700成功→読み戻し0777、mount強制uid=1000は所有の証明にならない、
    dev:inoはWSL再起動跨ぎで安定）。`fable`×high設計反証1回を吸収（fresh-dir probe採用、marker廃止＝
    key決定的導出、binding照合をlock書込み前へ、残骸の明示エラー化、dev安定性実測を受入ゲート化）。
    0700/0600判定は弱めず、mode-fidelity probeでcapable/incapableを判別し、incapableだけ
    `XDG_STATE_HOME`配下のbinding付き外部stateへ置く。ext4/APFSは挙動不変（既存112 test無修正green）。
    fixture 9本追加、正典は`shared/orchestrate/control-record.md`「state配置とmode-fidelity probe」節。
- Latticeへ移管済み: fm-0272 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L16
  参照したControlが編集1回で恒久blockedになる欠陥を修理する（caveat
  `control-record-file-evidence-1-blocked-decision`が正。4 Control全部がblocked実測済み。
  契約クリティカルにつき着手前に`fable`×high反証1回）。
  - 2026-07-17消化: [ADR 0060](adr/0060-file-evidence-resume-history-retention.md)で契約変更として受入。
    file型もresume限定で履歴救済、missing由来救済は`evidence-retained-history-missing`のreview信号、
    finalization/archive側は不変Decision（2026-07-15）どおり厳格維持＝非対称は意図。fixture 3本追加、
    126/126 green。実機でobserver-factoryの`docs/02_models.md`救済とelastic-v1のarchive退避2文書の
    review降格を確認。残blockは未commit観測等の本物の証拠喪失のみ（黙らせない）。
    **archive退避とevidence解決の正典衝突（finalization側）は未裁定のまま予約を維持**。
  - Observer O1の正規`task-finalize-record`で`docs/plan_observer.md`が受理され、リポ正典の
    「accept/reject/finalizationは不変ADR」を破れることを再現した。
  - Taskの`finalization_ref`とControlの`parent_decision.ref`を`docs/adr/*.md`へ限定し、可変planを
    fail closedにする。既存の同一path・同一blob履歴保持契約は維持する。
  - `852c704`で修正。focused finalization gate 10/10 green。関連gateは92/93 greenで、唯一の失敗は
    下記の既存期待漏れと特定したため、変更済み92件を反復せず失敗scopeだけ再検証した。
- Latticeへ移管済み: fm-0288 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L17
  - `4ac37f3`で未作成Task文書をgit障害へ誤分類しない契約に直した際、fallback文書の既存testだけ
    `GIT_FAILURE`期待が残り、Control Record関連gate 92/93で再現した。
  - 期待値だけを現契約へ揃え、focused gate 1/1 green。full regressionはPhase末へ集約する。
- Latticeへ移管済み: fm-0292 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L18
  - Observer Supervisor統合Runで、実時刻`2026-07-15T14:41Z`に対して`15:15Z`の
    `evidence[].observed_at`と`validation_results[].evidence.observed_at`をControl revision 55が
    受理することを再現した。受入前に検出したため、当該Runはrejectして正しい証拠でretryする。
  - 異host間のclock skewは5分まで許容し、それを超える未来時刻は`EVIDENCE_FROM_FUTURE`で
    fail closedにする。過去の証拠は長時間Runやoffline回収の正当な履歴として維持する。
  - top-level／validation証拠のfocused gate 1/1、Control Record関連gate 93/93、`make lint-js`が
    green。最初の関連gateは完走後のexit code回収に失敗したため未検証扱いとし、同じgateを
    session回収可能な入口で一度再実行した。full regressionはPhase末へ集約する。
- Latticeへ移管済み: fm-0301 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L19
  `reject`不能・Task finalization不能になるControl回収欠陥を修正する。
  - Observer P5-1b4b Controlで、report import前の誤った`observe-worker=completed`後にworkspaceをcommitすると、
    Runを採用しない`reject`も`WORKSPACE_DRIFT`で閉じられず、未裁定RunがTaskを永久に塞ぐことを再現した。
  - `accept`はcurrent fingerprint完全一致を維持する。`reject`は保存済みresult digestと親の棄却証拠だけで
    不変Decisionを記録し、workspaceを採用・復元・書き換えないfocused契約を追加する。
  - focused 1/1、accept／reject／Task finalization関連3/3、`make lint-js` green。受入証拠は
    [ADR 0034](adr/0034-control-reject-after-workspace-drift.md)。full regressionは工場Phase gateへ集約する。
- Latticeへ移管済み: fm-0309 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L20
  予約candidate digestが自己矛盾してControlが更新不能になる欠陥を修正する。
  - Observer P5-1b4dの正規`placement-reserve`→`worker-admit`→native dispatchで再現した。実workerは
    一度だけ起動済みだが、`observe-worker=dispatched`が`placement reservation candidate digest is invalid`で
    revision 38から進まず、Reportを正規回収できない。
  - 予約時点の`null` handleとdispatch時に初めて得る相関handleを別事実として扱い、既存v25 Controlを
    継続読取する。`null`からの一回限りのbindはdispatch receiptへhandle digestを固定し、別handleへの
    差替えとreceipt改竄はfail closedにする。予約時からhandleがある既存経路のdigest契約は維持する。
  - focused fixtureで予約→admit→dispatch→statusを完走し、保存handleまたは相関receiptの改竄拒否を確認する。
    focused 1/1、Control Record関連95/95、`make lint-js`がgreen。実Observer Controlもrevision 39で
    dispatch相関、revision 40でstrict Report importまで回復した。受入証拠は
    [ADR 0037](adr/0037-control-late-dispatch-handle-correlation.md)。full regressionは工場Phase gateへ集約する。

### Lane O — Observer製品（O1→O2→O3→O4。O1〜O3完了、O4はWave D dogfoodのみ残）

### Phase O1 — Throughline completed-turn feed（COMPLETE）

- Latticeへ移管済み: fm-0326 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L21
  - Throughline `def92f4`、`022c0b8`、`7b07425`と同repo計画のfocused gateを実diffで確認した。
- Latticeへ移管済み: fm-0328 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L22
  - Throughline `e3380fa`、`60c4036`、`1165efd`と65.1秒のClaude live wait証拠を確認した。
- Latticeへ移管済み: fm-0330 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L23
  - 両host live waitはObserver commit `dc31c08`のfixtureで2/2成功、実行時間68.442秒。
    Throughline関連gate 130/130、full 661件中660成功・Windows限定1 skip。
  - 独立監査のP1/P2は成功へ丸めずrejectし、Throughline `02a809f`／`88fafaf`で独立修正、
    focused 28/28を通した。
- Latticeへ移管済み: fm-0335 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L24
  - Phase受入はThroughline ADR 0010、lane補正はADR 0011。監査修正Control revision 15、
    元closure Control revision 78でfinalizeし、Throughline計画commit `ebfc152`へ固定した。

詳細: [Observer計画 Phase 1](archive/plan_observer-factory-integration.md#phase-1-throughline両host-completed-turn-feed) ／
Throughline `docs/14_observer_completed_turn_feed_plan.md`

### Phase O2 — Observer製品完成

- Latticeへ移管済み: fm-0344 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L25
  - Latticeへ移管済み: fm-0345 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L26
    host-neutral core、両provider binding、Supervisor restart gateへ接続した。
    Observer `2bfc09c`／`426f8b9`／`3a737ad`／`107d2ca`／`22cf33a`、
    corrective `fe4f743`、ADR 0070〜0082で受け入れた。実host terminal／faultはH gateへ残す。
  - Latticeへ移管済み: fm-0349 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L27
    exact-empty AI tool surface、Codex read-only envelope、project fingerprint不変、
    Observer state root配下のMailbox publishをObserver `74c8228`／`2168199`／`4110de3`、
    ADR 0083〜0084で受け入れた。live project write拒否とClaude `--safe-mode`互換はH gateへ残す。
  - Latticeへ移管済み: fm-0353 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L28
    Mailbox publish前のhost-neutral semantic gateへ実装し、通常進行を既定沈黙にする。
    Observer `539b2f2`／`0c502ec`／`8c0a54d`／`c007e06`／`c450a65`／`bd2a777`／
    `a67ce92`／`152afd5`、ADR 0087〜0091で、60分cooldown、severity escalation、record-first
    decision、Mailbox exact replay、strict behavioral evalを受け入れた。focused 17/17、関連62/62、
    `npm run check`がgreen。実providerの採否とdogfoodはP4-4のH gateへ残す。
  - Latticeへ移管済み: fm-0359 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L29
    Observer `b06a847`／`02329ad`、関連gate 46/46、ADR 0046、Control revision 29で受け入れた。
  - Latticeへ移管済み: fm-0361 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L30
    - Latticeへ移管済み: fm-0362 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L31
      `4c3cc03`／`8afebca`、ADR 0049／0053で受け入れた。
    - Latticeへ移管済み: fm-0364 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L32
    - Latticeへ移管済み: fm-0365 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L33
      Observer `c226cc9`、focused 15/15、関連gate 47/47、ADR 0054、Control revision 62で受け入れた。
    - Latticeへ移管済み: fm-0367 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L34
      別operationへの再送やhost lifecycleの成功で隠さない。
      - Latticeへ移管済み: fm-0369 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L35
        Control `observer-provider-result-read-20260715`はrevision 28でfinalize／archive済み。
      - Latticeへ移管済み: fm-0371 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L36
        Observer `3600876`、focused 26/26、ADR 0057で固定した。
      - Latticeへ移管済み: fm-0373 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L37
        provider acceptedは「既に動いているhost lifecycle」ではなく、このrequest固有handleを証明する。
        - Latticeへ移管済み: excluded → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L38
          Observer `1bb7b07`、focused 22/22、Supervisor関連16/16、ADR 0059で受け入れた。
          provider journal欠損補正は維持するが、AI wait loopとSupervisorの二重所有、Stop idle問題のため
          `turn/steer`／Stop continuation部分をADR 0060でsupersedeした。
        - Latticeへ移管済み: fm-0379 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L39
          `thread/read context -> cycle turn/start -> exact ACK -> accepted journal`へ訂正した。
          Observer `3f35dbb`、focused 38/38、Supervisor関連16/16、static gate、ADR 0061、計画commit
          `1d442c8`で受け入れた。Claude accepted recoveryの永久poll skipも同じ単位で修正した。
        - Latticeへ移管済み: fm-0383 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L40
          起動せず、record-first operationからprovider request／result／apply／cursor commitを駆動する。
          - Latticeへ移管済み: fm-0385 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L41
            Mailbox exact replayとapplied後cleanupへ接続した。Observer `fc51157`、focused 4/4、関連40/40、
            ADR 0062／0063、計画commit `7a638cd`で受け入れた。
          - Latticeへ移管済み: fm-0388 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L42
            束ねる一cycle一step callerを実装した。Observer `0ca7abe`、focused 4/4、関連44/44、ADR 0064／0065、
            計画commit `5169db1`で受け入れた。
          - Latticeへ移管済み: fm-0391 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L43
            一step coreを配線し、timeout／cancel／fault／explicit stop loopを固定した。Observer `77cbae4`／
            `4e29398`／`6d03b71`／`96ccad7`、corrective `dda8567`／`f7efa09`、最終関連70/70、
            static gate、ADR 0066〜0069、計画commit `e2adbca`で受け入れた。
            cross-repo receiptは[ADR 0010](adr/0010-observer-supervisor-process-receipt.md)を正とする。
        - Latticeへ移管済み: excluded → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L44
          `agents` shell surfaceにはsendが無いため、`claude -p --resume`やprivate protocolを推測fallbackにしない。
      - Latticeへ移管済み: fm-0398 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L45
        job `sessionId`／payload `session_id`を束縛し、core callbackへ接続する。
      - Latticeへ移管済み: fm-0400 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L46
- Latticeへ移管済み: fm-0401 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L47
  二重起動、後勝ちtakeover、暗黙起動、自動再起動はfail closedにする。
  - Latticeへ移管済み: fm-0403 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L48
    provider adapter availability、previous watch CAS、sanitized result、terminal receipt stopを固定した。
    Observer `a4195a3`／`f904922`、ADR 0095〜0096、focused 13/13、関連37/37、static greenを受け入れた。
  - Latticeへ移管済み: fm-0406 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L49
- Latticeへ移管済み: fm-0407 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L50
  - Latticeへ移管済み: fm-0408 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L51
    `observer-mcp --diagnostics`、package bin、stdio／version互換、production AI surface無効を固定した。
    Observer `1d85039`／`951cdeb`、ADR 0097〜0098、focused 5/5、関連24/24、static greenを受け入れた。
  - Latticeへ移管済み: fm-0411 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L52
    Observer `630c5ff`／`b45c07a`／`d03495d`、dotagents `894799b`、ADR 0099〜0100、
    Observer focused 12/12・関連32/32、dotagents multi-repo／hook／clean-home gateを受け入れた。
    実HOME apply、hook trust、live host、credential、publish／pushは未実施のH／後続gateへ残した。
  - Latticeへ移管済み: fm-0415 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L53
    保護集合、失敗時の再実行決定性を隔離fixtureで閉じた。
    Observer `1d045df`／`8b49493`／`876fe5c`、ADR 0101〜0102、focused 10/10、関連39/39、
    hook p95 32.165 ms、空Mailbox p95 23.936 ms、wait overhead p95 35.982 msを受け入れた。
    full regressionと独立重監査はPhase O2 gateへ残した。
  - Latticeへ移管済み: fm-0420 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L54
    product manifest／hook候補／canonical cwdを非変更で検証するversioned preflightとrunbookを閉じる。
    Observer `50b4e86`／`bbe407d`／`80b06f0`、ADR 0103〜0104、focused 13/13、related 40/40、
    actual read-only preflight `h_required`を[ADR 0023](adr/0023-observer-live-preflight-receipt.md)で受け入れた。
  - Latticeへ移管済み: fm-0424 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L55
    transportのSupervisor所有を非H fixtureで閉じる。Observer `133cf37`／`286a6db`／`8f5fb90`、
    focused 9/9、related 77/77、`npm run check` greenを
    [ADR 0025](adr/0025-observer-codex-parent-caller-core-receipt.md)で受け入れた。
  - Latticeへ移管済み: fm-0428 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L56
    Observer `659924c`／`0690ee0`／`41a031d`、dotagents `21bc352`、focused 12/12、related
    25/25、isolated install／verify／rollback、`npm run check`／`make lint` greenを
    [ADR 0026](adr/0026-observer-codex-parent-entry-distribution-receipt.md)で受け入れた。
  - Latticeへ移管済み: fm-0432 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L57
    production callerを実装した後にdual-host live campaignへ進む。
    live Hと診断receipt後の再Hは各一回実施済みである。再Hでhook invocation、job／session、Stop
    payloadはconfirmedとなったが、canonical result拒否とreply／terminal exact result非公開により
    19c／19dをblockedとした
    （[ADR 0032](adr/0032-observer-claude-live-recharacterization-blocked.md)）。
    実装順の訂正は[ADR 0024](adr/0024-observer-parent-caller-queue-correction.md)を正とする。
    - Latticeへ移管済み: fm-0439 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L58
      exact result、timeout後回収、interrupt／closeを非H独立gateで閉じた。`claude -p`反復は代替にしない。
      Aiterm `dd43c40`／`3842ff2`／`ceb75e8`／`28b7438`／`f0fcf10`。相関gateはfocused 1/1、related 122/122、
      full 262/262、独立反証後green。構造化caller gateはfocused 5/5、related 126/126、
      launcher receipt gateはfocused 4/4、related 94/94
      （[ADR 0033](adr/0033-observer-persistent-context-and-aiterm-claude-route.md)）。
    - Latticeへ移管済み: fm-0445 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L59
      - Latticeへ移管済み: fm-0446 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L60
        structured statusをgeneric Claude provider operationへ変換した。Observer `3116955`、focused 8/8、
        related 58/58、`npm run check` green。
      - Latticeへ移管済み: fm-0449 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L61
        recover-only、watch activation、initial generationを接続した。Observer `8de4830`、focused 27/27、
        related 35/35、`npm run check` green。受入は[ADR 0035](adr/0035-observer-claude-session-launch-receipt.md)。
      - Latticeへ移管済み: fm-0452 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L62
        接続し、通常completed cycle間で同じ`claude.session`を再利用する。通常終了は`pty_close`後にMCP processを
        閉じ、未対応rollover／parent rebindをfail loudにした。Observer `d8dfb92`、focused 27/27、related 91/91、
        `npm run check` green。受入は[ADR 0036](adr/0036-observer-claude-production-caller-core.md)。
      - Latticeへ移管済み: fm-0456 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L63
        Observer `7bfafa4`、focused 20/20、related 50/50、full 393/393。独立重監査のP1実装欠陥2件を
        補正し、P5-1b4 Control revision 62と最終監査Control revision 20をarchiveして19dを閉じた
        （[ADR 0038](adr/0038-observer-claude-generation-lifecycle-receipt.md)）。
    - Latticeへ移管済み: fm-0460 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L64
      session closeをdual-host campaignと同じ一回のH gateで確認する。model request、認証状態、
      実session生成を伴うため明示承認後に行う。Claude r12／Codex r11の受入証拠は
      [ADR 0039](adr/0039-observer-dual-host-live-acceptance.md)。
- Latticeへ移管済み: fm-0464 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L65
  - Latticeへ移管済み: fm-0465 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L66
    silence／suppression／replay／誤配送／claim failureとClaude `provider_unavailable`を非H fixtureで固定する。
    Observer `ddd768a`／`e203190`／`f6b296b`／`0f5fd78`、ADR 0092〜0094で、focused 6/6、
    関連178/178、`npm run check` greenを受け入れた。
  - Latticeへ移管済み: fm-0469 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L67
    intentional crash／通信断は通常campaignの完了条件へ混ぜず、別の明示承認を要する。
- Latticeへ移管済み: fm-0471 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L68
  - Observer `1493b35`／ADR 0144、Control revision 26 archive、dotagents ADR 0042で
    cross-repo receiptを固定した。intentional faultと追加の実model live Hは実施していない。

詳細: [Observer計画 Phase 2](archive/plan_observer-factory-integration.md#phase-2-observer完成) ／
Observer `docs/plan_observer.md`

### Phase O3 — Elastic provider対称化

- Latticeへ移管済み: excluded → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L69
- Latticeへ移管済み: fm-0481 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L70
  timeout回収、failure mappingを実装する。
  - Worker laneは`claude-native@v1`（[ADR 0044](adr/0044-o3-claude-native-adapter-acceptance.md)）、
    consultation laneは`claude-native@consult-v1`／`codex-sidecar@consult-v1`＋Control schema v26の
    typed handle（`50d79d5`、[ADR 0049](adr/0049-o3-consultation-v26-implementation-acceptance.md)）。
    いずれもprojection純関数で、実model live dispatchはlive H gateへ残置。
- Latticeへ移管済み: fm-0487 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L71
  - Consultation切替の非偽装をv26実fixtureで固定（`209e2df`、
    [ADR 0050](adr/0050-o3-placement-policy-and-switch-fixtures-acceptance.md)）。Worker側fallback宣言
    （v20/v21のfallback参照・receipt束縛）は既存契約が正のまま。
- Latticeへ移管済み: fm-0491 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L72
  Consultationの型付きhandle／schema変更waveへ分離する。
  - [ADR 0043](adr/0043-o3-claude-provider-adapter-boundary.md)で、同一UUID resume、timeout unknown、
    `--continue`／`--fallback-model`／OAuth経路の`--bare`禁止、`claude-internal` projection-onlyを固定した。
  - orchestration関連baselineは115/115、fail 0、skip 0。実model request、login、credential、networkは
    実行していない。
- Latticeへ移管済み: fm-0497 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L73
  - dotagents `4a3c9a7`／`1573fce`、focused 5/5、related 117/117（fail 0、skip 0）、`make lint-js` green。
    shared契約・02_models.md・rag失効注記を同時整合し、
    [ADR 0044](adr/0044-o3-claude-native-adapter-acceptance.md)で受け入れた。live dispatchは未実施。
- Latticeへ移管済み: fm-0501 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L74
  migration／rollback、O4のv26予約とのversion順を新しい不変ADRで裁定してから実装する。
  - 裁定は[ADR 0045](adr/0045-o3-consultation-multiprovider-schema.md)で完了（O3=v26／O4=v27、
    refuter 2票通過）。
  - 実装（v26 reader/writer、typed handle、明示`control-migrate`、brief/resume-check v7、
    consult-v1 adapter拡張、failure supportのlane別keying）は`50d79d5`で完了。ADR 0045 Gateの
    全focused fixtureをtestで固定し、related gate **127/127・fail 0・skip 0**、`make lint-js` green。
    受入は[ADR 0049](adr/0049-o3-consultation-v26-implementation-acceptance.md)。実model request／
    login／credential／network dispatchと`--tools ""` live実測は未実施（live H gateへ残置）。
- Latticeへ移管済み: fm-0510 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L75
  CDC PDF/PNGは正典還流済み中間物、`claude -p` allowはO3の権限規則として、それぞれ別scopeで閉じる。
  - WSL relay RAGは`0170f00`、mcp-observer INDEX行追補は`cd2ea3a`、`claude -p` allowは`cffb342`で
    独立収容した。`tmp/pdfs/cdc_prompt*`は一次PDFの出典URL・取得方法付き全文が
    `rag/orchestration/raw/openai-cdc-multiagent-prompt.md`に保存済みで機能的消費者ゼロを確認し、
    保全不要と裁定して削除した。`codex/rules/default.rules`のLattice向けallow 1行は別セッション
    所有物として非commitのまま保全する。

- Latticeへ移管済み: fm-0518 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L76
  実model dispatch smokeと`--tools ""` live実測。Phase gate前半（full 136/136＋クロスprovider監査、
  採用5・棄却1修理済み）は[ADR 0051](adr/0051-o3-phase-audit-record.md)で完了済み。
  - オーナー承認（2026-07-17 chat）のもと4 smoke全green: `--tools ""`＋`-p`成立、同一UUID resume
    文脈継承、worker Read-only実使用・workspace無変更、`codex_opinion` live応答の自前projection
    完全往復。受入は[ADR 0052](adr/0052-o3-live-h-gate-acceptance.md)。**Phase O3のGate充足**。
    execution-verified昇格は別手続きとして未主張（external writer禁止は不変）。

詳細: [Observer計画 Phase 3](archive/plan_observer-factory-integration.md#phase-3-elasticのprovider対称化)

### Phase O4 — rate-aware scheduler

- Latticeへ移管済み: fm-0530 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L77
  （selector decision束縛＋consultation cancelled state＝ADR 0053の本修正）・実装wave分割。
  - [ADR 0054](adr/0054-o4-rate-aware-scheduler-design.md)で裁定（refuter 2票、採用17・棄却2）。
- Latticeへ移管済み: fm-0533 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L78
  - Wave Q/S（`83236c4`・[ADR 0055](adr/0055-o4-wave-qs-acceptance.md)）、Wave V（`75f33fc`・
    [ADR 0056](adr/0056-o4-wave-v-acceptance.md)）、Wave A（quota-adapter＋pool lock配線・
    [ADR 0057](adr/0057-o4-wave-a-acceptance.md)）で完了。live H実測で両provider verified:
    OpenAI=[ADR 0058](adr/0058-o4-live-quota-observation-acceptance.md)、Anthropic=statusline入口
    [ADR 0059](adr/0059-o4-statusline-quota-entry-acceptance.md)（stream eventのutilization不在は
    実態固定・前方互換path保持）。**O4残はWave D週次dogfood（実需開始時）のみ**。
- Latticeへ移管済み: fm-0540 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L79
  - 取得不能はWave Aの`projectQuotaObservationFailure`（必ずtyped error）、他はWave Q/S fixtureで固定。
- Latticeへ移管済み: fm-0542 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L80
  - 束縛はWave V（v27 subject digest自動束縛）で完了。**残: Wave D週次dogfood＝実需開始時**。
  - 2026-07-19オーナー裁定: あってもよいが、管理されない追加実装にはせずToDoとして追跡する。
    v28設計調書は当日scratchpad `fm0542-design.md` を正とし、次の4 waveで進める。
    - Latticeへ移管済み: fm-0546 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L81
    - Latticeへ移管済み: fm-0547 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L82
    - Latticeへ移管済み: fm-0548 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L83
    - Latticeへ移管済み: fm-0549 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L84

詳細: [Observer計画 Phase 4](archive/plan_observer-factory-integration.md#phase-4-rate-aware-elastic-scheduler)

### Lane R — 既存工場rollout（R1→R2→R3。R1完了、R2進行中＝現在地、R3の一部はqueue 20が束ねて先行消化）

### Phase R1 — wire v2残欠陥（O1以降と並行可）

- Latticeへ移管済み: fm-0551 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L85
  Codex Sidecar実配布版の残件を製品所有repoで閉じる。
  - Latticeへ移管済み: fm-0553 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L86
    [ADR 0012](adr/0012-toolchain-update-version-acceptance.md)で受け入れた。
  - Latticeへ移管済み: fm-0555 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L87
    [ADR 0013](adr/0013-throughline-diagnostics-product-receipt.md)で受け入れた。host導入はR2へ残す。
  - Latticeへ移管済み: fm-0557 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L88
    [ADR 0014](adr/0014-windows-factory-acl-local-receipt.md)で受け入れた。FOX実機receiptはR2へ残す。
  - Latticeへ移管済み: fm-0559 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L89
    [ADR 0015](adr/0015-windows-npm-shim-local-receipt.md)で受け入れた。FOX実機receiptはR2へ残す。
  - Latticeへ移管済み: fm-0561 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L90
    [ADR 0016](adr/0016-spotter-windows-codex-product-receipt.md)で受け入れた。4 host実配布receiptはR2へ残す。
  - Latticeへ移管済み: fm-0563 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L91
    [ADR 0017](adr/0017-codex-sidecar-windows-mcp-product-receipt.md)で受け入れた。FOX実配布receiptはR2へ残す。
  - Latticeへ移管済み: fm-0565 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L92
    `a35e987`、focused 10/10、[ADR 0020](adr/0020-sidecar-auditor-adapter-receipt.md)で受け入れた。
- Latticeへ移管済み: fm-0567 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L93
  前まで完成する。Pi5本体のversioned source／fixture receipt欠落は
  [ADR 0019](adr/0019-r1-local-closure-refutation.md)のP1としてR1へ戻した。
  - Latticeへ移管済み: fm-0570 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L94
    12＋4件で[ADR 0021](adr/0021-servermanager-pi5-bughub-bridge-receipt.md)へ受け入れた。意図的障害と
    実Discord／BugHub配送はR3のH gateへ残す。
- Latticeへ移管済み: fm-0573 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L95
  [ADR 0022](adr/0022-r1-local-closure.md)で受け入れた。

詳細: [BugHub計画 Wave 6〜8](archive/plan_bughub-factory-integration.md#wave-8--4環境canary-rollouthf)

### Phase R2 — host単位の統合rollout

- Latticeへ移管済み: fm-0580 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L96
  install/config/routing/hook/MCP/Throughline/factory reporterを検証する。
- Latticeへ移管済み: fm-0582 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L97
  Spotter／Sidecarの実配布receiptを同じhost campaignで閉じる。
- Latticeへ移管済み: fm-0584 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L98
- Latticeへ移管済み: fm-0585 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L99
- Latticeへ移管済み: fm-0586 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L100

詳細: [Codex全対応 Wave 3](archive/plan_codex-full-support.md#wave-3--現役端末-rollout-と既存プラン閉鎖) ／
[BugHub計画 Wave 8](archive/plan_bughub-factory-integration.md#wave-8--4環境canary-rollouthf)

### Phase R3 — wire v2 finalization

- Latticeへ移管済み: fm-0593 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L101
- Latticeへ移管済み: fm-0594 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L102
- Latticeへ移管済み: fm-0595 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L103

詳細: [BugHub計画 Wave 9](archive/plan_bughub-factory-integration.md#wave-9--定常運用と完了) ／
[Codex全対応 Wave 4](archive/plan_codex-full-support.md#wave-4--最終監査と完了)

### 合流 — J1（Lane O完了×Lane R完了の後）

### Phase J1 — Observer wire v3編入

- Latticeへ移管済み: fm-0604 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L104
- Latticeへ移管済み: fm-0605 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L105
  migration、rollbackを実装する。
- Latticeへ移管済み: fm-0607 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L106
- Latticeへ移管済み: fm-0608 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L107

詳細: [Observer計画 Phase 5〜6](archive/plan_observer-factory-integration.md#phase-5-工場wire-v3とbughub編入)

## 5. 主キャンペーン後の保守queue

以下は主レーンを遮らない。対象repoを触る機会、またはH条件が整った時に消化する。

- Latticeへ移管済み: fm-0616 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L108
  state directoryが`0777`となり、`init`が`STATE_PATH_UNSAFE`でfail closedすることをLiveTR監査で再現した。
  `metadata`を有効化してもLinux modeはWindows ACLを制限しないため、`0700`だけで安全扱いしない。
  Windows-backed repoを明示unsupportedにするpreflight/runbook、またはowner-onlyを実証できる安全な
  state配置・project bindingを設計し、WSL fixtureで通常repoとdirty workspaceのControl初期化を固定する。
  - 2026-07-17消化（常設割込ゲートの同件と同一受入）: `825918e`＋`788c84a`で外部state配置を実装。
    mode-fidelity probe／key決定的導出／binding照合lock前強制／namespace層owner検査。fixture 11本、
    `make ci` green、FOX実機のDrvFS repoでinit/status/resume-check `ready` を実火確認・検証後cleanup済み。
    正典は`shared/orchestrate/control-record.md`「state配置とmode-fidelity probe」節。
- Latticeへ移管済み: fm-0625 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L109
  先に上書きすると`artifact-status-record`が旧digest不一致でfail closedし、旧版byte列を回収しない限り
  supersede不能になることを再現した。更新前supersedeを強制する入口、版付きartifact ref、または旧blobを
  Control所有領域へ保存する方式を比較し、上書き後も履歴を捏造せず回収できるfixtureを固定する。
  - 2026-07-19オーナー裁定「任せる」: 推奨案を採用する。content-digestを含む版付きpathでartifactを
    保存し、current参照は原子的な世代交代で切り替える。実装契約と棄却案は
    [ADR 0083](adr/0083-artifact-generation-v28.md)を正とし、v28の単一composite receiptで固定した。
  - Latticeへ移管済み: fm-0637 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L110
    固定する。
- Latticeへ移管済み: fm-0639 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L111
- Latticeへ移管済み: fm-0629 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L112
  - 2026-07-19実施: `codex-link-p2p`、`CursorHub`、`SmartClaude`、`QuoLabo`を削除済み。
    `OpenCClaw`はGitHub側で`Bell`へ改名済みのため対象外とし、localの旧cloneは撤去、
    `~/Backups/OpenCClaw-final-20260719.tar.gz`へtar退避済み。
- Latticeへ移管済み: fm-0630 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L113
- Latticeへ移管済み: fm-0631 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L114
- Latticeへ移管済み: fm-0632 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L115
- Latticeへ移管済み: fm-0633 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L116
- Latticeへ移管済み: fm-0634 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L117
- Latticeへ移管済み: fm-0635 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L118
- Latticeへ移管済み: fm-0636 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L119
- Latticeへ移管済み: fm-0645 → docs/archive/lattice-source-ledger/factory-master-maintenance-cutover-20260720.md#L6

## 6. 全体完了条件

- Latticeへ移管済み: fm-0640 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L120
- Latticeへ移管済み: fm-0641 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L121
- Latticeへ移管済み: fm-0642 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L122
- Latticeへ移管済み: fm-0643 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L123
- Latticeへ移管済み: fm-0644 → docs/archive/lattice-source-ledger/factory-master-cutover-20260719.md#L124
