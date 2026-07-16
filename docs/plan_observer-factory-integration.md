# Observer完成・工場編入・Elastic配置改善計画

**Status:** Active

**作成日:** 2026-07-15

**対象repo:** dotagents / Observer / Throughline / ServerManager

> 実行順と全体状態の親正本は[開発工場 統合マスター計画](plan_factory-master.md)。本書はObserver／Elastic／wire v3の詳細受入TODOを所有するが、単独では着手順を決めない。

**関連計画:**

- Observer repo: `docs/plan_observer.md`
- Throughline repo: `docs/14_observer_completed_turn_feed_plan.md`
- [BugHub工場統合計画](plan_bughub-factory-integration.md)
- [Elastic Orchestrator v1完了記録](archive/2026-07_elastic-orchestrator.md)

この文書は、ObserverをClaude／Codex両hostで完成させ、工場コア候補から正式な第10コア製品へ編入し、同時にElastic orchestrationのprovider配置を改善する正本計画兼TODOである。既存の工場wire v2固定12製品と未完了rolloutを壊さず、Observer追加はwire v3の独立waveとして行う。

## 1. オーナー裁定

### 1.1 三つの役割を混同しない

| 役割 | provider配置 | 目的 |
|---|---|---|
| Observer | 親と同じ会社・同じhost family | 同じアプリでのUX、近い思考様式による長期伴走 |
| 親の相談役 | 原則として親と異なる会社 | provider固有の盲点を補う独立した意見 |
| 一般Worker | role適格性を満たす候補から残レート余裕で選ぶ | 品質を落とさず両社枠を一週間で使い切る |

- Codex親のObserverはCodex、Claude親のObserverはClaudeを使う。
- Codex親の相談役はClaude主モデル（Opus／Fable相当）、Claude親の相談役はCodex旗艦を第一候補とする。具体モデル名は`docs/02_models.md`だけで解決する。
- Observerは継続的な反証役ではない。既定は沈黙であり、materiality、evidence、novelty、actionability、timingを満たす助言だけを一観測サイクル最大一件届ける。
- Phase監査／refuterはObserverと別役割であり、節目だけ独立反証を行う。
- 一般Workerのrate-aware配置はObserver、相談役、F作業へ適用しない。ただし各レーンの消費はquota観測へ反映する。

### 1.2 rate-aware配置

一般Workerの候補providerごとに、少なくとも次を正規化する。

```text
pace_ratio = remaining_quota_ratio / remaining_window_time_ratio
```

- `1.0`は理想消費ペース、`1.0`超は使い残し方向、`1.0`未満は使い過ぎ方向を示す。
- reset時刻が異なるproviderを、現在の残量だけで比較しない。
- 5時間枠、週次枠、model固有枠等が重なる場合、対象modelで最も逼迫した有効windowを拘束条件にする。
- provider間でtoken数や絶対上限を直接比較せず、各provider内の残量比と残時間比を正規化する。
- rateはrole適格性、必要能力、F/A/H、独立性を上書きしない。適格候補間のplacement判断にだけ使う。
- quotaが取得不能、stale、矛盾、低確度なら自動均衡を止め、理由を明示する。CodexやClaudeへ黙ってfallbackしない。

## 2. 依存順

```text
Wave 0: 正本・baseline・実測契約
  ├─ Wave 1A: 既存BugHub wire v2残件を現行12製品のまま並行継続
  ├─ Wave 1B: Throughline両host completed-turn feed
  └─ Wave 1C: ElasticのClaude execution / consultation入口とquota観測調査
             ↓
Wave 2: Observer共通core + Codex／Claude host adapter完成
             ↓
Wave 3: rate-aware Elastic Schedulerを一般Worker配置へ接続
             ↓
         Wave 1Aのv2 finalization receiptとjoin
             ↓
Wave 4: 工場wire v3（固定13製品）+ BugHub + installer / diagnostics
             ↓
Wave 5: dogfood receipt集約・Phase監査・release / rollout
```

Wave 1A〜1Cは書込範囲とgateを分離して並行可能とする。wire v2へObserverを後付けせず、Observer core／schedulerと並行して残件を閉じ、wire v3開始直前にv2 finalization receiptだけをjoinする。

## 3. 着手分類

- **F（親直轄）:** completed-turn cursor、host判定、Mailbox transaction、read-only境界、hook注入、provider配置ポリシー、quota snapshot、wire v3、BugHub product matrix。
- **A（委譲）:** 仕様固定後のschema／CLI／fixture／test／installer／CI／adapter実装。routing smokeとExecutor受入契約を通して配置する。
- **H（実行時承認）:** credential／login、ライブhook・常駐設定、本番BugHub image rebuild／deploy、registry publish、remote作成、push、実account quotaを消費する意図的試験、障害canary。

### 3.1 非目標

- Controlからの完全自動dispatch、owner approvalの自動代行、provider account stateの複製は行わない。
- quotaを推測値、UI scrape、cookie転記で補わない。provider-owned入口が無ければrate-aware部分をblockedとしてowner裁定へ戻す。
- ObserverをWorker、Consultation、常時refuterのいずれにも変質させない。
- wire v2へObserverやrate-aware fieldを後付けしない。v2は固定12製品の既存契約のまま閉じる。
- xAIはv1 rate-aware selectorの対象外とする。明示配置レーンは維持し、第三のquota pool対応は別計画で追加する。

### 3.2 複数repoのControl境界

- Controlはgit common dir単位なので、dotagents／Observer／Throughline／ServerManagerごとに独立Controlを持つ。単一Controlへ別repoのworkspaceやTask依存を偽装しない。
- cross-repo依存は本計画にrepo、artifact digest、Decision、受入時刻を持つreceiptとして記録し、各repo ControlのTask finalizationを親が照合する。
- Phase 1以降のA作業は最初から対象repoのControl経由で運用する。Phase 6はdogfood開始ではなく、蓄積したreceiptの集約・監査・finalizeとする。

## 4. TODO

### Phase 0: 正本・baseline・入口実測

- [x] ObserverをCodex限定からClaude／Codex両hostへ広げるオーナー裁定を本計画へ固定する。
- [x] Observer／相談役／一般Worker／Phase監査の配置目的を分離する。
- [x] rate-aware配置の目的を「各providerのresetまでに理想ペースで枠を使う」と定義する。
- [x] dotagents、Observer、Throughline、ServerManagerのbaselineと既存dirty所有を再確認し、変更waveごとのpathspecを固定する。
  - dotagents: Observer関連は`PLAN.md`、`docs/02_models.md`、`docs/plan_bughub-factory-integration.md`、本計画。WSL relay RAGと`tmp/pdfs`は別作業として分離する。
  - Observer: 全24ファイルが初回commit前だった。秘密候補とstage後whitespaceを検査・修正し、16 testとsyntaxをgreenにしてbaseline commit `7b699c8`へ固定した。remoteは未設定。
  - Throughline: Observer計画と索引だけがdirtyだった。既存full testは615 pass／0 fail／1 skip。2026-07-15のオーナーGOでsource holdを解除し、この同一baselineをPhase 1で再利用して実装を開始した。
  - ServerManager: BugHub restart loop復旧commit `08d47ca`／`776a7c1`を独立push・deploy済み。本計画のwire v3までは追加変更しない。
- [x] 4 repoそれぞれにactive planを参照する独立Controlを初期化し、cross-repo receiptの保存形式を本計画へ固定する。
  - dotagents: `observer-factory-20260715` → `docs/plan_observer-factory-integration.md`
  - Observer: `observer-independent-foundation-20260714` → `docs/plan_observer.md`
  - Throughline: `observer-feed-20260715` → `docs/14_observer_completed_turn_feed_plan.md`
  - ServerManager: `factory-wire-v2-20260715` → `bughub/docs/FACTORY_V2_ROLLOUT_PLAN.md`
  - cross-repo receiptは本計画に`repo`、`control_id`、`task_id`、成果物ref／digest、親Decision、受入時刻を記録し、別repoのTask依存へ偽装しない。
- [x] cancelled TaskがControl finalizationを永久に阻害するlifecycle矛盾を修正する。
  - 正規`task-cancel-record`後も`control-finalize`が全Taskの`task-finalize`を要求する一方、cancelled Taskへの
    `task-finalize`は`INVALID_TRANSITION`で拒否されることをObserver Control revision 60で再現した。
  - Control閉鎖条件、`status --brief`のunresolved集合、将来receipt容量予約では、Taskを
    `task-finalized または cancelled`ならterminalとみなす。
  - cancelled Taskへの`task-finalize`拒否、cancel Decision証拠、cancelled依存をreadyへ変えない規則は維持する。
  - focused testでcancelのみのTaskを持つControlがphase gate後にfinalize／archiveでき、cancelがunresolvedへ
    二重掲載されず、既存の取消拒否testが残ることを証明する。
  - `closedTaskIds`をControl閉鎖、brief、receipt予約の3面で共用し、254件目のreceiptまで使用した境界fixtureを含む
    focused 5/5を通した。cancelled依存のadmission規則とcancelled Taskへの`task-finalize`拒否は変更していない。
- [x] archiveのfinalization証拠検証でも、旧Decision digestのbounded git履歴保持を認める。
  - Observer foundation Control revision 71の正規`archive`で、過去に可変`docs/plan_observer.md`を使った
    Task finalization receiptが`EVIDENCE_DIGEST_MISMATCH`となり、Controlがfinalizedのまま閉鎖不能になることを再現した。
  - `resume-check`で既に採用済みの「同一repo・同一path・regular blob・完全一致SHA-256・最大256 commit・
    合計64 MiB」の探索だけを、Task／Control finalizationの`type=decision`へ再利用する。
  - `type=file`、別path、近似一致、unsafeな現path、bare repoを履歴fallbackで成功へ変えない。
  - focused testで、同一pathの旧Decision blobが履歴に残る時だけarchiveでき、digest不一致拒否の既存契約を維持する。
  - `verifyFinalizationRetention`へ既存のbounded履歴探索を接続し、履歴に旧版がある`type=file`を一度拒否した後、
    current bytesを復元した同じControlだけがarchiveできるfocused 1/1を通した。
  - 完了記録: `docs/elastic-orchestrator-archive-decision-history.md`。
- [x] 各provider矢印をlaneへ固定する。
  - Observer: Worker／Consultationではなく、製品固有runtime＋同provider host adapter。
  - Codex→Claude Worker: 新設する`claude-native` execution adapter。
  - Codex→Claude相談: workspaceを持たないClaude Consultation adapter。
  - Claude→Codex相談: workspaceを持たないCodex Consultation adapter。既存sidecarを使う場合もconsultation schemaへ投影する。
  - `claude-internal`: dispatch不能なhost projectionのまま維持する。
- [x] rate-aware証拠はControl schemaをversion upして束縛する方針を採用する。quota snapshot／selector decision／pool reservationをcandidate digestとreceiptへ含め、旧v25 active Controlの継続読取、v26新規作成、migration／rollbackを同じTODOで固定する。
- [x] quota poolの最小identityと並行予約規則を固定する。
  - snapshotは非秘密の`quota_pool_id`、`host_instance_id`、対象executor集合を持つ。
  - windowは`window_id`、`starts_at`または`duration_seconds`、`reset_at`を持つ。
  - v1は同一poolのplacementを直列化し、一回の選択ごとにsnapshot再取得を要求する。reset境界で旧snapshot／reservationを失効させる。
- [x] v1親identityを`project target + host identity + parent thread hash + completed-turn cursor`とする。
  - hostに信頼できるsession終了eventがなく、Throughline monitor stateも表示用TTLであるため、active
    lease／epochを推測実装しない。一project一活動親をv1前提とし、Throughlineが検出した
    `ambiguous_parent`はfail closedにする。将来leaseは正式lifecycle証拠とmigrationを持つ別waveで追加する。
- [x] Observerの起動責任を、ユーザーの明示指示を受けた現在親に固定する。
  - install／SessionStart／project openから暗黙起動せず、親が同providerの正式background／child入口を使う。
  - provider child起動前にObserver所有stateで一target一watchを確保し、二重起動、後勝ちtakeover、
    推測TTLによるlock奪取、自動再起動を禁止する。停止もユーザーの明示指示を親が処理する。
  - 正本: Observer `docs/adr/0002-explicit-parent-launch.md`（commit `0a47f22`）。
- [x] Claude親からClaude Observerを継続させる正式event、payload、完了証拠、長時間wait、continuation、停止方法を実hostで基礎characterizationする。
  - 公式契約ではmain turnの`Stop.last_assistant_message`、API失敗の`StopFailure`、background sessionのjob ID／`agents --json`／`logs`／`stop`／`respawn`まで確認した。
  - 2026-07-15にMax accountへ認証し、Haiku 4.5／plan権限でheadless `result/end_turn`、同じsession IDのresume、`SessionStart:resume`、background job `busy/working → idle/done → stop`を実測した。`--bg`と`--print`は明示競合するため、Observerはbackground job handle、Workerはstream-json `result`を別契約で扱う。
  - Claude completed turnはfinal assistant、process exit、mtimeで推測せず、Throughline Stop hookがpair capture後にatomic publishする製品所有receiptへ束縛する。Claude `/rewind`はforkなので同一conversation rollback surfaceを作らない。
  - この完了はheadless／resume／background lifecycleの基礎characterizationだけを指す。既存background jobへの
    公開非対話request、job `sessionId`／Stop `session_id`相関、Observer所有の隔離result capture、
    terminal exact result readは未実証であり、queue 19cを閉じない。
- [x] Codex親からClaudeをWorker／相談役として呼ぶ正規入口を棚卸しし、installed→registered→verified→execution-verifiedを分ける。
  - headless `claude -p --output-format stream-json`＋session resumeと、read-only background sessionを入口候補に固定した。
  - 現行aiterm callable toolにClaude Agentはなく、Elastic adapter catalogも`claude-internal` projection-only。Claude CLI自体は認証後のheadless／resume／background smokeに成功してexecution-verifiedだが、Elastic adapterは未登録である。
- [ ] Claude親からCodex旗艦を相談役として呼ぶ正規入口とtimeout回収を実測する。
- [x] Claude／Codexの残quota、window、reset時刻を取得できる公式またはprovider-owned入口を調査し、取得不能も結論として記録する。
  - Claude公式は5h／7dの`used_percentage`と`resets_at`、Agent SDKのmodel別7日枠を持つ。
  - 認証後のprovider-owned `rate_limit_event`で週次利用率76%、reset `2026-07-17T08:00:00Z`、overage未使用を実測した。5時間枠は当該eventに現れなかったため、存在を推測せずwindow欠落として扱う。
  - Codex CLI 0.144.3のproduct-owned eventで週次10080分枠、used 2%、reset `2026-07-21T20:37:04Z`を非秘密fieldだけで実測した。
- [x] 調査した外部仕様を各一次ソースからRAGへ保存し、`rag/INDEX.md`へ追記する。
  - `rag/orchestration/provider-quota-and-claude-runtime.md`とraw一次ソース6件へ保存した。

**Gate:** 未実測host挙動やquota値を実装済み扱いせず、正規入口と失敗時の見え方が裁定される。OpenAI／Anthropic双方のquota入口がverified以上にならない場合、rate-aware部分をblockedとしてowner再裁定へ戻し、推測実装へ進まない。

### Phase 1: Throughline両host completed-turn feed

- [x] Throughline側正本TODOをCodex専用からClaude／Codex共通契約へ更新する。
  - `docs/14_observer_completed_turn_feed_plan.md`、ADR 0002／0003へClaude Stop receipt、Codex `task_complete`、completed pair chain、host-neutral cursor境界を固定した。Claude receipt実装はThroughline commit `b585e98`、cursor裁定は`682fed2`。
- [x] host-neutral cursorへproject identity、host／thread hash、host固有の完了証拠を束縛し、
  detected ambiguityをfail closedにする。v1前提外の一般的な複数活動親をmtime／PID／TTLで推測しない。
- [x] Codexは`task_complete`、ClaudeはPhase 0で実証した完了証拠だけを採用し、mtimeや進行中projectionを完了扱いしない。
- [x] snapshot／delta／thread switch／host switch／resync／projection pending／paginationをblack-box固定する。
- [x] Observer以外にも再利用できるJSON-only read／wait CLI、cancel、timeout境界、65秒超live waitを両hostで検証する。
- [x] Throughline既存Claude pathとCodex pathの回帰gateを通し、独立commit／rollback単位を保つ。
  - 両host live fixture 2/2（68.442秒）、関連gate 130/130、full 661件中660成功・Windows限定1 skip。
  - 独立監査で検出したClaude複数turn receipt欠落とPOSIX project case誤照合は、Throughline
    `02a809f`／`88fafaf`で独立修正し、focused 28/28を通した。監査時点のFAILEDはControlでreject保持した。
  - Throughline ADR 0010／0011、監査修正Control revision 15、closure Control revision 78、
    計画final commit `ebfc152`をPhase 1のcross-repo受入証拠とする。

**Gate:** 両hostで進行中turnを除外し、完了turnを欠落・重複なくObserverへ渡せる。

### Phase 2: Observer完成

- [ ] Observer runtimeをhost-neutral SupervisorとCodex／Claude host adapterへ分離する。
  - [x] model operation journal core、lock／completed locator／planned rollover／processed cleanup補正を
    Observer `4c3cc03`／`8afebca`、ADR 0049／0053で受け入れた。
  - [x] deterministic message ID、record-first receipt、strict recoveryを持つmodel operation専用
    Mailbox exact replayをObserver `0e7a005`、ADR 0052で受け入れた。
  - [x] Supervisorのissue／recover／apply／finalize統合をObserver `c226cc9`、focused 15/15、
    関連gate 47/47、ADR 0054、Control revision 62で受け入れた。
  - [x] provider固有result journal coreとSupervisor cleanup順序をObserver `4443ff9`／`3600876`、
    ADR 0056／0057で受け入れた。
  - [x] AI wait loopとSupervisorの二重所有を解消し、Codexをcycleごとの`turn/start`とexact result回収へ
    訂正した。Observer `3f35dbb`、focused 38/38、Supervisor関連16/16、ADR 0060／0061で受け入れた。
  - [ ] 外部Supervisor production callerを一target一process／一cycle一stepで接続する。timeoutではAIを起動せず、
    record-first operationからprovider request／result／apply／cursor commitを駆動する。
    - [x] `applyCycle`／`finalizeAppliedCycle`をdurable cycle input／operation時刻へ束縛し、advisoryの
      Mailbox exact replayとapplied後cleanupへ接続した。Observer `fc51157`、ADR 0062／0063、関連40/40で受け入れた。
    - [x] 一target一process lock、evidence input、Codex provider callback、sanitized receiptを束ねる一step callerを
      Observer `0ca7abe`、ADR 0064／0065、関連44/44で受け入れた。
    - [x] verified Throughline clientとpre-initialized Codex app-server sessionを所有する外部process／CLIへ
      一step coreを配線し、timeout／cancel／fault／explicit stop loopを固定した。Observer `77cbae4`／
      `4e29398`／`6d03b71`／`96ccad7`、corrective `dda8567`／`f7efa09`、最終関連70/70、
      ADR 0066〜0069、計画commit `e2adbca`で受け入れた。実host requestはH gateへ残す。
  - [ ] Codex live app-serverとClaude公開非対話delivery／session相関／隔離Stop captureをH gateで実証する。
- [ ] parent identityから現在親のhostを解決し、Observer modelを同じprovider familyへ固定する。
  host不明またはThroughlineの`ambiguous_parent`はfail closedにする。
- [ ] ユーザーの明示指示を受けた親launcherだけが、provider child起動前に一target一watchを確保する。
  active watchが既にある場合は`already_active`で停止し、暗黙起動、二重起動、後勝ちtakeoverを行わない。
- [ ] Codex ObserverとClaude Observerで同じwatch／status／stop UXを提供する。
- [x] Observer hostのproject identityを、監視対象ごとの作業folderではなく単一のObserver repo rootへ固定する。
  - Observer rootの`AGENTS.md`／`CLAUDE.md`が伴走者、read-only、既定沈黙、一サイクル一件、同providerという
    静的役割を所有し、起動ごとのpromptはtarget、watch、cursor等の可変情報だけを渡す。
  - targetの`project_root`はchild start envelopeとSupervisor state照合にだけ使い、host `cwd`、一時git repo、アプリ上の
    project identityへ投影しない。正本: Observer ADR 0017、commit `6abd9e6`。
- [ ] Claude host adapterで、可変長の`--mcp-config`／`--tools`より前にprompt positionalを置くargv契約を固定し、
  terminal receiptのowner、作成時点、atomic保存、job ID／result digest相関、再開手順を耐久契約として実装する。
  即時完了、terminal直前のadapter crash、実行中adapter restart、daemon消失、失敗terminalを独立fixtureにし、
  terminal後に`claude logs <id>`の`control.sock`が失われても成功や空結果へ丸めず、Claude private job state直読を標準fallbackにしない。
  raw `claude logs`はアカウント／利用状況表示を含み得るため親出力、Control、Observer stateへ流さず、子process内で
  allowlist済みのjob ID、terminal state、result digest、観測時刻だけを構造化receiptへ抽出する。後追いmaskを安全境界にしない。
- [x] production Observer AIのtool allowlistを空にし、Throughline wait／read、project読取、shell／file toolを
  AIへ公開しない。既存Observer MCP serverは削除せず、compatibility／diagnostics上の存廃をPhase 2内の別Taskで裁定する。
- [ ] Claude stop前に公開`agents --json`でterminalなら`already_terminal`を返してCLI stopを再発行せず、実行中stopの
  command receiptとterminal state観測を分離する。stop確認不能では同じjob IDを再観測し、terminal不明なら`stopping`を維持する。
- [ ] Claude backgroundのuser／project／local settings、hooks、pluginsを隔離し、HEAD、index、tracked／untracked、modeを含む
  project fingerprint不変を確認する。65秒超の実行中jobでstop、子process残存なし、再stop、親／launcher再起動後の状態を実証する。
- [ ] project-local Stop hookはmatching provider resultのcaptureだけを行い、block continuationを返さない。
  次cycleは外部Supervisorが開始し、親Mailbox hook adapterは別責務の高速配送員として維持する。
- [ ] Observer AIへ伴走者契約、既定沈黙、一サイクル一件、dedupe／cooldownを強制し、常時反証や第二の親への逸脱を拒否する。
- [ ] read-only、誤配送防止、crash recovery、faulted停止、installer／verify／rollbackを両hostで完遂する。
  - [x] Observer ADR 0022のversioned fragment／read-only verifierをconsumeするdotagents adapterを実装する。
    Observer CLIがClaude／Codex別のcanonical `Stop` entryを所有し、dotagentsはmessage、Mailbox、routing、renderを
    再実装しない。CLI不在、schema不一致、candidate不正はfail loudにする。
    - [x] Observer側P3-4b1のrepo、Control、commit、immutable ADR digest、親受入時刻をcross-repo receiptへ固定した。
      - 正本: [ADR 0007](adr/0007-observer-hook-config-cross-repo-receipt.md)。
    - dotagents実装・受入: commit `2fb48cb`、Control report import revision 45、parent accept revision 46。
      正本: [ADR 0008](adr/0008-observer-hook-config-transaction-adapter.md)。
  - [x] 既定dry-run、既存hook保持、Observer entry各一件への正規化、Claude `settings.json`とCodex `hooks.json`の
    二file prepare／backup／atomic replace／途中失敗時rollbackをclean HOME fixtureで固定する。
    trust、model、effort、permission、credential、Spotter等の他製品hookは変更しない。
    focused gate `bash tests/install/observer-hook-config.sh`と`make lint-py`を通し、専用targetを`make ci`へ配線した。
  - [x] P5-2aとしてObserver製品manifest、sanitized diagnostics、4 executable binと、dotagentsの
    isolated npm install→reinstall→verify→rollbackを閉じた。Observer `630c5ff`／`b45c07a`／`d03495d`、
    dotagents `894799b`、Observer ADR 0099〜0100をcross-repo receiptとする。
  - [x] P5-2bとして空Mailbox fast pathと通常waitの性能分布／閾値、completed receipt cleanupの
    保護集合、cleanup失敗時の再実行決定性を隔離fixtureで閉じた。Observer
    `1d045df`／`8b49493`／`876fe5c`、ADR 0101〜0102を受入receiptとする。
  - [x] P5-1b／P3-4cのlive H実施前に、両host prerequisite、必須相関証拠、停止条件、
    rollback、収集禁止情報をversioned preflight receiptとrunbookへ固定する。
    Observer `50b4e86`／`bbe407d`／`80b06f0`と
    [cross-repo receipt](adr/0023-observer-live-preflight-receipt.md)で受け入れた。
  - [x] Codex parent caller coreとinitial generation bootstrapをObserver製品repoで閉じた。
    Observer `133cf37`／`286a6db`／`8f5fb90`、focused 9/9、related 77/77、`npm run check` green、
    [受入receipt](adr/0025-observer-codex-parent-caller-core-receipt.md)。
  - [x] Codex parent entry／配布をdotagentsのisolated HOME gateで閉じた。
    Observer `659924c`／`0690ee0`／`41a031d`、dotagents `21bc352`、focused 12/12、related 25/25、
    isolated install／verify／rollback、[受入receipt](adr/0026-observer-codex-parent-entry-distribution-receipt.md)。
  - [x] Claude characterization専用の隔離Stop capture、sanitized receipt、prepare／verify／cleanup
    harnessをObserver製品repoのfixtureで先に閉じた。親Mailbox hookをresult captureへ流用しない。
    Observer `f40b672`、dotagents `78c358b`、focused 10/10、related 26/26、package／isolated
    install gateを[ADR 0028](adr/0028-observer-claude-characterization-harness-receipt.md)で受け入れた。
  - [ ] 上記harness完成後、Claude公開非対話reply／result readをH characterizationし、実証済み公開面だけで
    Claude callerを実装してからdual-host live Hへ進む
    （[queue correction](adr/0024-observer-parent-caller-queue-correction.md)）。live Hは一つのjobで実施済みだが、
    再Hでhook invocation、job／session、Stop payloadはconfirmedとなった。canonical resultは
    `E_CLAUDE_CHARACTERIZATION_RESULT_INVALID`、reply／terminal exact resultはunsupportedのため
    旧background job callerはblockedである
    （[ADR 0032](adr/0032-observer-claude-live-recharacterization-blocked.md)）。
    - [x] Stop未発火とstdin／payload／result不正を区別するraw-free diagnostic receiptをObserverで閉じた。
      Observer `f239a07`、focused 9/9、related 29/29、`npm run check` green、
      [ADR 0031](adr/0031-observer-claude-diagnostic-receipt-acceptance.md)を受入証拠とする。
    - [x] diagnostic receipt受入後、別H承認で一つのClaude job／Haiku requestだけを再characterizeした。
      terminal、cleanup、project／host settings不変はconfirmed、追加spawnと明示stopは不要だった。
      必要な公開delivery／result contractが現れるまでcallerを部分実装しない。
    - [x] Aitermの永続PTYへ対話型`claude_agent`を追加し、同じ利用者可視sessionへの初回／follow-up、
      Stop完了、operation相関付きexact result、timeout後回収、interrupt／closeを公開契約として閉じる。
      Throughline L2をObserver自身の継続理解の代替にせず、Supervisorは非AI transport制御へ限定する
      （Aiterm `dd43c40`／`3842ff2`、focused 1/1、related 122/122、full 262/262、独立反証後green、
      [ADR 0033](adr/0033-observer-persistent-context-and-aiterm-claude-route.md)）。
    - [x] Aiterm公開面だけでClaude production callerを実装し、同じ永続Claude sessionへcompleted turnを
      順次投入する。generation rollover／same-provider parent rebindではstructured close後に別sessionへ切り替え、
      launch response lossは相関済み`claude_agent` exact replayだけで回収する。completed turnごとの
      `claude -p`／fresh evaluatorは禁止する。Observer `7bfafa4`、focused 20/20、related 50/50、
      full 393/393、Control revision 62／20 archiveを
      [ADR 0038](adr/0038-observer-claude-generation-lifecycle-receipt.md)で受け入れた。
    - [ ] **IN PROGRESS — 承認済み:** 実Claude初回／follow-up各1 turn、Stop、exact result、session closeを
      dual-host campaignと同じ19e live Hで一度確認する。fixture成功をlive成功へ丸めず、model requestを伴うため
      明示承認後にだけ実行する。通常campaignは2026-07-16にオーナー承認済み。intentional crash／通信断は
      別承認のまま実施しない。
    - [x] 19e開始前に、陳腐化したObserver preflight／runbookをAiterm production routeと実Throughline
      `observer-read`疎通へ補正し、`apply-observer-hook-config`へ検証済みarchiveからの原子的restore、
      absent状態、mode／owner保持を追加する。rollback入口がgreenになるまで実HOMEへapplyしない。
    - [x] 最初のClaude live attemptで再現したstate root不一致を根治する。Observer hook fragment／preflightと
      dotagents adapterへ同じexplicit state rootを必須化し、旧root targetをcanonical一件へ置換する。
      失敗attemptは成功へ含めず、独立gate／commit後にqueue 19eへ戻る
      （[ADR 0024](adr/0024-observer-hook-state-root-binding.md)）。Observer focused 28/28、related 48/48、
      dotagents hook transaction／isolated package gate、対象docs lintはgreen。
  - [ ] actual apply、hook trust、Claude／Codex実火はH gateとして分離し、isolated HOMEのapply／restore testを
    live host成功へ丸めない。
- [ ] Codex／Claude E2EとPhase監査を通し、Observer側active planの全受け入れ条件を閉じる。

**Gate:** 同じObserver製品が親hostと同じproviderで伴走し、正常進行では沈黙する。

### Phase 3: Elasticのprovider対称化

- [ ] shared orchestration契約へ「Observer同社／相談役異社／一般Worker適応配置」を反映する。
- [ ] Codex親からClaude Worker／相談役を呼ぶadapter、handle、observe、resume、failure mappingを実装する。
- [ ] Claude親からCodex相談役を呼ぶ経路を既存sidecar／native境界と整合させる。
- [ ] Consultationを`gpt-connector`固定からlane別adapterへ拡張し、Workerと別collectionのまま維持する。ObserverをControlのWorker票やConsultation票へ混ぜない。
- [ ] provider障害時の別社切替は新Runとして記録し、fallback元の成功へ偽装しない。
- [ ] role別の適格provider集合と、親と異なる相談役をplacement fixtureで固定する。

**Gate:** 親hostにかかわらず、同じControlとlane固有のPacket／Report／Decision／timeout回収契約で両社レーンを使える。host projectionをexecution成功へ投影しない。

### Phase 4: Rate-aware Elastic Scheduler

- [ ] `quota_pool_id`、`host_instance_id`、対象executor集合、`provider`、`model_family`、`windows[]`、`remaining_ratio`、`starts_at`または`duration_seconds`、`reset_at`、`observed_at`、`source`、`confidence`を持つquota snapshot契約を定義する。
- [ ] OpenAI／Anthropic adapterでquota snapshotを取得し、秘密、cookie、token、account内部stateをControlへ複製しない。
- [ ] 異なるreset時刻をUTCで正規化し、`pace_ratio`と最も逼迫したwindowを計算する純粋selectorを実装する。
- [ ] role適格候補だけを入力にし、Observer／相談役／F作業を自動均衡対象から除外する。
- [ ] 会社間の頻繁な切替を防ぐhysteresis、quota pool単位lock、選択ごとのsnapshot再取得、reset時失効、同率時の決定的tie-breakを実装する。
- [ ] stale／取得失敗／残量ゼロ／window矛盾／reset境界／時差／一社のみ適格をfail-loud fixtureで固定する。
- [ ] Control schema v26へ使用snapshot digest、quota pool、評価時刻、選択理由、reservationを持つselector decisionを追加し、candidate digest／receiptへ束縛する。v25 reader継続、v26新規作成、migration／rollback fixtureを同時に通す。
- [ ] 実消費と選択結果を週次で評価し、両社がreset時に過不足なく使われるかdogfood記録を残す。

**Gate:** 架空quotaやsilent fallbackなしで、適格Workerを日割り余裕のあるproviderへ再現可能に配置できる。

### Phase 5: 工場wire v3とBugHub編入

- [ ] 既存wire v2計画の全残件が現行12製品契約のまま完遂されたfinalization receiptを確認する。
- [ ] wire v3を固定13製品（端末能力9製品＋ServerManager＋基盤toolchain 3種）として設計する。
- [ ] Observerのversion、native diagnostics、runtime error、host／connector matrix、更新経路、adapter、fixture、rollbackを追加する。
- [ ] BugHub schema、期待matrix、scanner、reporter、read-only集約をv3へ更新する。
- [ ] 未対応hostは`missing`へ誤投影せず、契約どおり`unsupported`／`not_applicable`／`unverified`を使い分ける。
- [ ] v2 clientとの互換、v3 migration、image rebuild、rollbackをServerManager側正本TODOで閉じる。
- [ ] Observer受け入れ完了後にだけPLAN／AGENTS／READMEの工場コア一覧を9製品から10製品へ更新する。

**Gate:** Observerが独立製品の所有境界を保ったまま、工場の更新・診断・bug・compatibility管理へ入る。

### Phase 6: Elastic orchestration dogfood receipt集約と完了監査

- [ ] Phase 1以降のA作業を各repoのControl／Task／Packet／Worker Report／親受入で運用し、Codex偏重や回収不能を観測する。
- [ ] 各委譲前に入口availability、role、provider、quota snapshot、reservationを記録する。
- [ ] timeoutは同一handleで回収し、同一taskを重複起動しない。
- [ ] 正規入口で再現したオーケストレーション欠陥はdotagentsの本計画TODOへ追加し、独立gate／独立commitで即修正してからObserver本筋へ戻る。
  - [x] worktreeで未作成のTask `doc_ref`を渡した時、内部`git hash-object`失敗を`GIT_FAILURE`へ誤分類せず、利用者が直せる`IO_FAILURE: task document is unavailable`として返す。
    - focused test 1/1 PASS、Observer実Controlの同じ入力で`IO_FAILURE`を再確認した。
  - [x] Claude background CLIの可変長flagがpromptを取り込むargv順序と、terminal後の一時daemon終了により`claude logs <id>`が
    `control.sock`不在になる運用摩擦を再現した。Observer ADR 0010へ失敗2件と成功1件を固定し、Phase 2のhost adapter TODOへ
    bounded receipt収集とprivate state非依存を追加した。adapter実装とcrash回収gateは未完のまま維持する。
  - [x] Claude backgroundでMCP toolを`--tools`だけへ指定すると`dontAsk`が拒否すること、`--allowedTools`へ同toolをexact追加すると
    75秒超`working`を維持して実行中stopできることを再現した。再stopは成功receiptを返さず、公開一覧は`stopped`を保持したため、
    Phase 2へ公開／無人許可の分離、terminal先行確認、stop receiptとstate観測の分離を追加した。実adapterは未完のまま維持する。
  - [x] `claude logs`がObserverの必要情報以外のアカウント／利用状況表示を含み得ることを再確認した。raw出力を保存・親表示せず、
    子process内のallowlist抽出だけを構造化receiptへ返す出力衛生をPhase 2へ追加した。sanitizing adapter testは未完のまま維持する。
  - [x] Delegation Packetの`report_template`が最上位field名しか示さず、native implementerがnested evidence／validationを
    strict schemaどおり返せない運用摩擦を解消する。保存済みpacketからexactなWorker Report skeletonを生成するread-only入口を追加し、
    packetとskeletonをdispatch前に保存して子へ渡す。親の手補正を標準運用にせず、生成物を埋めたreportがそのままimportできるfocused fixtureを通す。
    - `worker-report-skeleton`を追加し、correlation、executor handle、validation refs、nested evidence shapeをprefillする。
      write Runはbaseline確定後のadmittedだけに制限し、active回収でも同じdigestを維持する。focused test 1/1 PASS。
  - [x] Codex native follow-upで保存済みpacket／skeletonを要約転記すると、子がstrict nested shapeを再発明して
    `worker-report-import`不能になる運用摩擦を防ぐ。follow-upには両artifactの実pathを明示し、子へ原本を読ませる。
    pathを渡せない時はdispatchせず、schemaの説明文だけで代用しない。新しいschema／自動dispatch／個別testは増やさない。
    - Codex `orchestrate` appendixへ原本path必須、要約転記禁止、pathなしdispatch禁止を追加した。
  - [x] write Runのplanned時にDelegation Packetを生成すると、admit時のbaseline HEAD確定でpacket digestが変わり、
    active report相関に使えなくなる契約不整合を直す。write Runはadmitted後だけpacket生成を許し、read Runのplanned生成は維持する。
    - planned writerを`INVALID_TRANSITION`で拒否し、admitted packetとactive回収skeletonのdigest一致を固定した。
      関連focused gateは各1/1 PASS。
  - [x] Worker Report skeletonが`observed_at`を一般的なRFC 3339と案内する一方、strict importerは
    ミリ秒付きUTC canonical ISO-8601だけを受理する不整合を直す。placeholder自身へ
    `YYYY-MM-DDTHH:mm:ss.sssZ`を明示し、実native Reportを親の手補正なしでimportできる形へ戻す。
    - focused test 1/1 PASS。正本: [ADR 0006](adr/0006-worker-report-canonical-timestamp-guidance.md)。
  - [x] TODO完了候補時に一度だけ、親が標準経路外の手補正・証拠再構成・代替回収の有無を確認する。
    有った場合は最終成功で握り潰さず、所有repoの`docs/`正本TODOを登録または参照してから本筋へ戻る。
    専用receipt／schema／個別testは増やさず、TODO単位の共有契約として固定する。
  - [x] Worker Reportの親受入を`reject`した時、native implementerが完了報告を撤回したままTaskも終了する運用摩擦を直す。
    report import前の受入差分は同じTask／Run相関／executor handleで再作業し、正式reject後は同じTask／assignmentの
    新しいretry Runへ再配置する。rejected Runを再dispatchせず、具体的blockerがある時だけ証拠付きで停止する契約を
    共有の委譲正典へ固定した。専用schemaや反復監査は追加しない。
  - [x] Control記録済みnative Runへの`agents.interrupt_agent`を、親が`worker-cancel-request`より先に実行した順序誤りを再発防止する。Codex appendixへcancel request先行、interrupt receipt回収、`observe-worker=cancelled`の順を固定した。今回のRunは順序違反をDecisionに明記したrev52とterminal receiptのrev53で閉じ、成功へ丸めていない。
  - [x] Observer repoで`codex-sidecar`の正規dry-runを実行すると、project-ownedな`.codex-sidecar.yml`がなく
    `CONFIG_NOT_FOUND`でfail loudになる統合欠落を解消した。Observerの所有境界内へpath allowlist、read-only preset、
    隔離worktree writer、`gpt-5.6-terra/medium`の明示policyを追加し、秘密、login、host設定変更、実Codex呼出なしで
    `diagnostics=ok`、review `dry-run`、factory diagnostics `overall=ready`を確認した（Observer commit `33bde15`）。
    実writer利用は別のexecution-verified gateまで進めない。
  - [x] Control finalizationは完了済みphase gateを必須にするのに、公開CLIが未設定のまま最初のTaskを記録でき、
    全Task完了後まで失敗を遅延させる運用摩擦を解消する。`control-init`直後・最初の`task-record`前に
    `phase-gate-record`を必須とする共有契約へ更新し、公開CLIは未設定を早期にfail loudする。
    - 公開CLIは`PHASE_GATE_NOT_RECORDED`で拒否し、phase記録後のTask作成とrecord-only非実行境界を
      focused test 1/1で確認した。内部library APIは既存Control／fixture互換のため変更していない。
  - [x] Worker Reportの証拠時刻がimport時刻より約33分未来でもControlが受理する欠陥を、Observer
    Supervisor統合Runのrevision 55で再現した。異host間のclock skewを5分まで許容し、それを超える
    `evidence[].observed_at`と`validation_results[].evidence.observed_at`を`EVIDENCE_FROM_FUTURE`で
    拒否するようdotagents `d6702b6`で修正した。旧Runはrevision 56でrejectし、同一assignmentの
    retry Reportを正時刻でrevision 60にimport、revision 61でacceptした。
- [ ] Claudeレーン失敗をCodexへの暗黙fallbackで隠さず、adapter／routingの根本原因を修正する。
- [ ] TODO完了候補ごとに親がdiff、受け入れ条件、関連testを一回確認し、重い独立監査はPhaseごとに一回行う。
- [ ] knowledge returnをRAG／caveat／正典へ還流し、本計画をarchiveする。
- [ ] 4 repoのTask finalization、cross-repo receipt、Phase監査を集約し、各Controlをfinalize／archiveする。

Dogfood記録（2026-07-15）:

- Control `observer-factory-20260715`を正本確認後に初期化し、Task、Registry observation、placement dry-run、reservation、Delegation Packet、native dispatchを正規順で開始した。
- Registry capabilityの未整列入力は`INVALID_SCHEMA`でfail loudになり、暗黙補正せず正規順へ修正した。
- 親が`observe-worker=completed`をWorker Report importより先に記録すると、後続importは`INVALID_TRANSITION`で拒否される。これは親の回収順序誤りであり、正規順を`dispatched/running → worker-report-import（completed化）→ accept/reject`として本計画の残りRunで実証する。
- Refuter Runでは正規順でstrict Worker Report importに成功した。反証でP1六件、P2二件を採用候補とし、親がControl、adapter catalog、schema実物を照合して本計画へ反映した。
- 4 repoに独立Controlを置いた。Observerの既存`observer-scaffold` Runは親workspaceの初回baseline変更により`WORKSPACE_DRIFT`で失敗しており、成功へ書き換えず保持する。scaffold自体は親が独立にbaseline commit `7b699c8`と16 test greenで受け入れ、Task finalizationの証拠はObserver側正本へ記録する。
- dotagents Controlの`resume-check`は、本計画とworkspaceが正当に更新されたため`evidence-digest-mismatch`でblocked、`control-dirty-state-changed`／`control-workspace-content-changed`でreview-requiredになった。古い証拠を現内容へ読み替えず、次のTaskは更新後の新しいartifact digestで記録する。

**Gate:** Observer完成だけでなく、Elastic orchestration自身が両社配置と回収契約を実運用で証明する。

## 5. 完了条件

1. ObserverがClaude／Codex両hostで同じUXを持ち、親と同じprovider familyで動く。
2. Observerが伴走者として既定沈黙を守り、継続的反証役へ変質しない。
3. 親の相談役が原則として異なるproviderから配置される。
4. 一般Workerがrole適格性を満たしたうえで、resetまでの日割り余裕によりClaude／Codex間へ配置される。
5. quota不明、stale、rate limit、timeout、provider障害がfail loudかつ回収可能である。
6. Throughline、Observer、dotagents、ServerManagerが独立履歴とrollbackを保つ。
7. wire v2残件が閉じ、wire v3固定13製品でObserverのfactory diagnostics／BugHub統合がgreenになる。
8. H操作は実行時に目的、影響、rollbackを説明し、個別承認を得る。

## 6. repo別検証コマンド

| repo | focused gate | full gate |
|---|---|---|
| dotagents | `node --test test/orchestrate-*.test.mjs`（対象test実名へ固定して実行） | `make ci` |
| Observer | `npm run syntax && npm run check` | `npm test` |
| Throughline | 対象CLI testを`node --import ./src/test-env.mjs --test <files>`で実行 | `npm test` |
| ServerManager | `npm --prefix bughub test`と対象bridge／scanner test | `npm test` |

大規模Phase開始時にbaselineを1回取り、同一HEAD・同一workspace digestなら再利用する。実装中はfocused、TODO完了候補はrelated、repo full gateはPhase完了時に1回だけ行い、親diff確認と重複実行を避ける。Hを要する実host／deploy／rollback drillはテストgreen後に別gateで実施する。
