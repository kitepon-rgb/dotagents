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

- Latticeへ移管済み: of-0096 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L120
- Latticeへ移管済み: of-0097 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L121
- Latticeへ移管済み: of-0098 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L122
- Latticeへ移管済み: of-0099 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L123
  - dotagents: Observer関連は`PLAN.md`、`docs/02_models.md`、`docs/plan_bughub-factory-integration.md`、本計画。WSL relay RAGと`tmp/pdfs`は別作業として分離する。
  - Observer: 全24ファイルが初回commit前だった。秘密候補とstage後whitespaceを検査・修正し、16 testとsyntaxをgreenにしてbaseline commit `7b699c8`へ固定した。remoteは未設定。
  - Throughline: Observer計画と索引だけがdirtyだった。既存full testは615 pass／0 fail／1 skip。2026-07-15のオーナーGOでsource holdを解除し、この同一baselineをPhase 1で再利用して実装を開始した。
  - ServerManager: BugHub restart loop復旧commit `08d47ca`／`776a7c1`を独立push・deploy済み。本計画のwire v3までは追加変更しない。
- Latticeへ移管済み: of-0104 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L6
  - dotagents: `observer-factory-20260715` → `docs/plan_observer-factory-integration.md`
  - Observer: `observer-independent-foundation-20260714` → `docs/plan_observer.md`
  - Throughline: `observer-feed-20260715` → `docs/14_observer_completed_turn_feed_plan.md`
  - ServerManager: `factory-wire-v2-20260715` → `bughub/docs/FACTORY_V2_ROLLOUT_PLAN.md`
  - cross-repo receiptは本計画に`repo`、`control_id`、`task_id`、成果物ref／digest、親Decision、受入時刻を記録し、別repoのTask依存へ偽装しない。
- Latticeへ移管済み: of-0110 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L7
  - 正規`task-cancel-record`後も`control-finalize`が全Taskの`task-finalize`を要求する一方、cancelled Taskへの
    `task-finalize`は`INVALID_TRANSITION`で拒否されることをObserver Control revision 60で再現した。
  - Control閉鎖条件、`status --brief`のunresolved集合、将来receipt容量予約では、Taskを
    `task-finalized または cancelled`ならterminalとみなす。
  - cancelled Taskへの`task-finalize`拒否、cancel Decision証拠、cancelled依存をreadyへ変えない規則は維持する。
  - focused testでcancelのみのTaskを持つControlがphase gate後にfinalize／archiveでき、cancelがunresolvedへ
    二重掲載されず、既存の取消拒否testが残ることを証明する。
  - `closedTaskIds`をControl閉鎖、brief、receipt予約の3面で共用し、254件目のreceiptまで使用した境界fixtureを含む
    focused 5/5を通した。cancelled依存のadmission規則とcancelled Taskへの`task-finalize`拒否は変更していない。
- Latticeへ移管済み: of-0120 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L8
  - Observer foundation Control revision 71の正規`archive`で、過去に可変`docs/plan_observer.md`を使った
    Task finalization receiptが`EVIDENCE_DIGEST_MISMATCH`となり、Controlがfinalizedのまま閉鎖不能になることを再現した。
  - `resume-check`で既に採用済みの「同一repo・同一path・regular blob・完全一致SHA-256・最大256 commit・
    合計64 MiB」の探索だけを、Task／Control finalizationの`type=decision`へ再利用する。
  - `type=file`、別path、近似一致、unsafeな現path、bare repoを履歴fallbackで成功へ変えない。
  - focused testで、同一pathの旧Decision blobが履歴に残る時だけarchiveでき、digest不一致拒否の既存契約を維持する。
  - `verifyFinalizationRetention`へ既存のbounded履歴探索を接続し、履歴に旧版がある`type=file`を一度拒否した後、
    current bytesを復元した同じControlだけがarchiveできるfocused 1/1を通した。
  - 完了記録: `docs/elastic-orchestrator-archive-decision-history.md`。
- Latticeへ移管済み: of-0130 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L9
  - Observer: Worker／Consultationではなく、製品固有runtime＋同provider host adapter。
  - Codex→Claude Worker: 新設する`claude-native` execution adapter。
  - Codex→Claude相談: workspaceを持たないClaude Consultation adapter。
  - Claude→Codex相談: workspaceを持たないCodex Consultation adapter。既存sidecarを使う場合もconsultation schemaへ投影する。
  - `claude-internal`: dispatch不能なhost projectionのまま維持する。
- Latticeへ移管済み: of-0136 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L10
  - 訂正（2026-07-16）: rate-aware selector用のversionは[ADR 0045](adr/0045-o3-consultation-multiprovider-schema.md)で**v27**へ変更した。v26はO3 Consultation多provider化が取る。本行の「v26新規作成」は当時の予約記録として保持する。
- Latticeへ移管済み: of-0138 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L11
  - snapshotは非秘密の`quota_pool_id`、`host_instance_id`、対象executor集合を持つ。
  - windowは`window_id`、`starts_at`または`duration_seconds`、`reset_at`を持つ。
  - v1は同一poolのplacementを直列化し、一回の選択ごとにsnapshot再取得を要求する。reset境界で旧snapshot／reservationを失効させる。
- Latticeへ移管済み: of-0142 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L12
  - hostに信頼できるsession終了eventがなく、Throughline monitor stateも表示用TTLであるため、active
    lease／epochを推測実装しない。一project一活動親をv1前提とし、Throughlineが検出した
    `ambiguous_parent`はfail closedにする。将来leaseは正式lifecycle証拠とmigrationを持つ別waveで追加する。
- Latticeへ移管済み: of-0146 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L13
  - install／SessionStart／project openから暗黙起動せず、親が同providerの正式background／child入口を使う。
  - provider child起動前にObserver所有stateで一target一watchを確保し、二重起動、後勝ちtakeover、
    推測TTLによるlock奪取、自動再起動を禁止する。停止もユーザーの明示指示を親が処理する。
  - 正本: Observer `docs/adr/0002-explicit-parent-launch.md`（commit `0a47f22`）。
- Latticeへ移管済み: of-0151 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L14
  - 公式契約ではmain turnの`Stop.last_assistant_message`、API失敗の`StopFailure`、background sessionのjob ID／`agents --json`／`logs`／`stop`／`respawn`まで確認した。
  - 2026-07-15にMax accountへ認証し、Haiku 4.5／plan権限でheadless `result/end_turn`、同じsession IDのresume、`SessionStart:resume`、background job `busy/working → idle/done → stop`を実測した。`--bg`と`--print`は明示競合するため、Observerはbackground job handle、Workerはstream-json `result`を別契約で扱う。
  - Claude completed turnはfinal assistant、process exit、mtimeで推測せず、Throughline Stop hookがpair capture後にatomic publishする製品所有receiptへ束縛する。Claude `/rewind`はforkなので同一conversation rollback surfaceを作らない。
  - この完了はheadless／resume／background lifecycleの基礎characterizationだけを指す。既存background jobへの
    公開非対話request、job `sessionId`／Stop `session_id`相関、Observer所有の隔離result capture、
    terminal exact result readは未実証であり、queue 19cを閉じない。
- Latticeへ移管済み: of-0158 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L15
  - headless `claude -p --output-format stream-json`＋session resumeと、read-only background sessionを入口候補に固定した。
  - 現行aiterm callable toolにClaude Agentはなく、Elastic adapter catalogも`claude-internal` projection-only。Claude CLI自体は認証後のheadless／resume／background smokeに成功してexecution-verifiedだが、Elastic adapterは未登録である。
- Latticeへ移管済み: of-0161 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L16
- Latticeへ移管済み: of-0162 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L17
  - Claude公式は5h／7dの`used_percentage`と`resets_at`、Agent SDKのmodel別7日枠を持つ。
  - 認証後のprovider-owned `rate_limit_event`で週次利用率76%、reset `2026-07-17T08:00:00Z`、overage未使用を実測した。5時間枠は当該eventに現れなかったため、存在を推測せずwindow欠落として扱う。
  - Codex CLI 0.144.3のproduct-owned eventで週次10080分枠、used 2%、reset `2026-07-21T20:37:04Z`を非秘密fieldだけで実測した。
- Latticeへ移管済み: of-0166 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L18
  - `rag/orchestration/provider-quota-and-claude-runtime.md`とraw一次ソース6件へ保存した。

**Gate:** 未実測host挙動やquota値を実装済み扱いせず、正規入口と失敗時の見え方が裁定される。OpenAI／Anthropic双方のquota入口がverified以上にならない場合、rate-aware部分をblockedとしてowner再裁定へ戻し、推測実装へ進まない。

### Phase 1: Throughline両host completed-turn feed

- Latticeへ移管済み: of-0173 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L19
  - `docs/14_observer_completed_turn_feed_plan.md`、ADR 0002／0003へClaude Stop receipt、Codex `task_complete`、completed pair chain、host-neutral cursor境界を固定した。Claude receipt実装はThroughline commit `b585e98`、cursor裁定は`682fed2`。
- Latticeへ移管済み: of-0175 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L20
  detected ambiguityをfail closedにする。v1前提外の一般的な複数活動親をmtime／PID／TTLで推測しない。
- Latticeへ移管済み: of-0177 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L21
- Latticeへ移管済み: of-0178 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L22
- Latticeへ移管済み: of-0179 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L23
- Latticeへ移管済み: of-0180 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L24
  - 両host live fixture 2/2（68.442秒）、関連gate 130/130、full 661件中660成功・Windows限定1 skip。
  - 独立監査で検出したClaude複数turn receipt欠落とPOSIX project case誤照合は、Throughline
    `02a809f`／`88fafaf`で独立修正し、focused 28/28を通した。監査時点のFAILEDはControlでreject保持した。
  - Throughline ADR 0010／0011、監査修正Control revision 15、closure Control revision 78、
    計画final commit `ebfc152`をPhase 1のcross-repo受入証拠とする。

**Gate:** 両hostで進行中turnを除外し、完了turnを欠落・重複なくObserverへ渡せる。

### Phase 2: Observer完成

- Latticeへ移管済み: of-0191 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L25
  - Latticeへ移管済み: of-0192 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L26
    Observer `4c3cc03`／`8afebca`、ADR 0049／0053で受け入れた。
  - Latticeへ移管済み: of-0194 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L27
    Mailbox exact replayをObserver `0e7a005`、ADR 0052で受け入れた。
  - Latticeへ移管済み: of-0196 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L28
    関連gate 47/47、ADR 0054、Control revision 62で受け入れた。
  - Latticeへ移管済み: of-0198 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L29
    ADR 0056／0057で受け入れた。
  - Latticeへ移管済み: of-0200 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L30
    訂正した。Observer `3f35dbb`、focused 38/38、Supervisor関連16/16、ADR 0060／0061で受け入れた。
  - Latticeへ移管済み: of-0202 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L31
    record-first operationからprovider request／result／apply／cursor commitを駆動する。
    - Latticeへ移管済み: of-0204 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L32
      Mailbox exact replayとapplied後cleanupへ接続した。Observer `fc51157`、ADR 0062／0063、関連40/40で受け入れた。
    - Latticeへ移管済み: of-0206 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L33
      Observer `0ca7abe`、ADR 0064／0065、関連44/44で受け入れた。
    - Latticeへ移管済み: of-0208 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L34
      一step coreを配線し、timeout／cancel／fault／explicit stop loopを固定した。Observer `77cbae4`／
      `4e29398`／`6d03b71`／`96ccad7`、corrective `dda8567`／`f7efa09`、最終関連70/70、
      ADR 0066〜0069、計画commit `e2adbca`で受け入れた。実host requestはH gateへ残す。
  - Latticeへ移管済み: of-0212 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L35
    Aiterm公開Claude sessionのdelivery／session相関／StopをH gateで実証した。
- Latticeへ移管済み: of-0214 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L36
  host不明またはThroughlineの`ambiguous_parent`はfail closedにする。
- Latticeへ移管済み: of-0216 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L37
  active watchが既にある場合は`already_active`で停止し、暗黙起動、二重起動、後勝ちtakeoverを行わない。
- Latticeへ移管済み: of-0218 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L38
- Latticeへ移管済み: of-0219 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L39
  - Observer rootの`AGENTS.md`／`CLAUDE.md`が伴走者、read-only、既定沈黙、一サイクル一件、同providerという
    静的役割を所有し、起動ごとのpromptはtarget、watch、cursor等の可変情報だけを渡す。
  - targetの`project_root`はchild start envelopeとSupervisor state照合にだけ使い、host `cwd`、一時git repo、アプリ上の
    project identityへ投影しない。正本: Observer ADR 0017、commit `6abd9e6`。
- Latticeへ移管済み: of-0224 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L40
  `claude_agent`／`claude_turn`／`pty_close`契約へ置換した。旧案では、
  terminal receiptのowner、作成時点、atomic保存、job ID／result digest相関、再開手順を耐久契約として実装する。
  即時完了、terminal直前のadapter crash、実行中adapter restart、daemon消失、失敗terminalを独立fixtureにし、
  terminal後に`claude logs <id>`の`control.sock`が失われても成功や空結果へ丸めず、Claude private job state直読を標準fallbackにしない。
  raw `claude logs`はアカウント／利用状況表示を含み得るため親出力、Control、Observer stateへ流さず、子process内で
  allowlist済みのjob ID、terminal state、result digest、観測時刻だけを構造化receiptへ抽出する。後追いmaskを安全境界にしない。
- Latticeへ移管済み: of-0231 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L41
  AIへ公開しない。既存Observer MCP serverは削除せず、compatibility／diagnostics上の存廃をPhase 2内の別Taskで裁定する。
- Latticeへ移管済み: of-0233 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L42
  command receiptとterminal state観測を分離する。stop確認不能では同じjob IDを再観測し、terminal不明なら`stopping`を維持する。
- Latticeへ移管済み: of-0235 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L43
  project fingerprint不変を確認する。65秒超の実行中jobでstop、子process残存なし、再stop、親／launcher再起動後の状態を実証する。
- Latticeへ移管済み: of-0237 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L44
  次cycleは外部Supervisorが開始し、親Mailbox hook adapterは別責務の高速配送員として維持する。
- Latticeへ移管済み: of-0239 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L45
- Latticeへ移管済み: of-0240 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L46
  - Latticeへ移管済み: of-0241 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L47
    Observer CLIがClaude／Codex別のcanonical `Stop` entryを所有し、dotagentsはmessage、Mailbox、routing、renderを
    再実装しない。CLI不在、schema不一致、candidate不正はfail loudにする。
    - Latticeへ移管済み: of-0244 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L48
      - 正本: [ADR 0007](adr/0007-observer-hook-config-cross-repo-receipt.md)。
    - dotagents実装・受入: commit `2fb48cb`、Control report import revision 45、parent accept revision 46。
      正本: [ADR 0008](adr/0008-observer-hook-config-transaction-adapter.md)。
  - Latticeへ移管済み: of-0248 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L49
    二file prepare／backup／atomic replace／途中失敗時rollbackをclean HOME fixtureで固定する。
    trust、model、effort、permission、credential、Spotter等の他製品hookは変更しない。
    focused gate `bash tests/install/observer-hook-config.sh`と`make lint-py`を通し、専用targetを`make ci`へ配線した。
  - Latticeへ移管済み: of-0252 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L50
    isolated npm install→reinstall→verify→rollbackを閉じた。Observer `630c5ff`／`b45c07a`／`d03495d`、
    dotagents `894799b`、Observer ADR 0099〜0100をcross-repo receiptとする。
  - Latticeへ移管済み: of-0255 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L51
    保護集合、cleanup失敗時の再実行決定性を隔離fixtureで閉じた。Observer
    `1d045df`／`8b49493`／`876fe5c`、ADR 0101〜0102を受入receiptとする。
  - Latticeへ移管済み: of-0258 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L52
    rollback、収集禁止情報をversioned preflight receiptとrunbookへ固定する。
    Observer `50b4e86`／`bbe407d`／`80b06f0`と
    [cross-repo receipt](adr/0023-observer-live-preflight-receipt.md)で受け入れた。
  - Latticeへ移管済み: of-0262 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L53
    Observer `133cf37`／`286a6db`／`8f5fb90`、focused 9/9、related 77/77、`npm run check` green、
    [受入receipt](adr/0025-observer-codex-parent-caller-core-receipt.md)。
  - Latticeへ移管済み: of-0265 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L54
    Observer `659924c`／`0690ee0`／`41a031d`、dotagents `21bc352`、focused 12/12、related 25/25、
    isolated install／verify／rollback、[受入receipt](adr/0026-observer-codex-parent-entry-distribution-receipt.md)。
  - Latticeへ移管済み: of-0268 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L55
    harnessをObserver製品repoのfixtureで先に閉じた。親Mailbox hookをresult captureへ流用しない。
    Observer `f40b672`、dotagents `78c358b`、focused 10/10、related 26/26、package／isolated
    install gateを[ADR 0028](adr/0028-observer-claude-characterization-harness-receipt.md)で受け入れた。
  - Latticeへ移管済み: of-0272 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L56
    unsupportedを証拠化した上で、実証済みAiterm公開面だけでClaude callerを実装してdual-host live Hへ進む
    （[queue correction](adr/0024-observer-parent-caller-queue-correction.md)）。最初のlive Hと診断receipt後の再Hで
    hook invocation、job／session、Stop payloadはconfirmedとなったが、canonical resultは
    `E_CLAUDE_CHARACTERIZATION_RESULT_INVALID`、reply／terminal exact resultはunsupportedだったため、
    旧background job callerを[ADR 0032](adr/0032-observer-claude-live-recharacterization-blocked.md)で閉じ、
    19c3以降のAiterm対話routeへ置換した。
    - Latticeへ移管済み: of-0279 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L57
      Observer `f239a07`、focused 9/9、related 29/29、`npm run check` green、
      [ADR 0031](adr/0031-observer-claude-diagnostic-receipt-acceptance.md)を受入証拠とする。
    - Latticeへ移管済み: of-0282 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L58
      terminal、cleanup、project／host settings不変はconfirmed、追加spawnと明示stopは不要だった。
      必要な公開delivery／result contractが現れるまでcallerを部分実装しない。
    - Latticeへ移管済み: of-0285 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L59
      Stop完了、operation相関付きexact result、timeout後回収、interrupt／closeを公開契約として閉じる。
      Throughline L2をObserver自身の継続理解の代替にせず、Supervisorは非AI transport制御へ限定する
      （Aiterm `dd43c40`／`3842ff2`、focused 1/1、related 122/122、full 262/262、独立反証後green、
      [ADR 0033](adr/0033-observer-persistent-context-and-aiterm-claude-route.md)）。
    - Latticeへ移管済み: of-0290 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L60
      順次投入する。generation rollover／same-provider parent rebindではstructured close後に別sessionへ切り替え、
      launch response lossは相関済み`claude_agent` exact replayだけで回収する。completed turnごとの
      `claude -p`／fresh evaluatorは禁止する。Observer `7bfafa4`、focused 20/20、related 50/50、
      full 393/393、Control revision 62／20 archiveを
      [ADR 0038](adr/0038-observer-claude-generation-lifecycle-receipt.md)で受け入れた。
    - Latticeへ移管済み: of-0296 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L61
      dual-host campaignと同じ19e live Hで一度確認する。fixture成功をlive成功へ丸めず、model requestを伴うため
      明示承認後にだけ実行する。通常campaignは2026-07-16にオーナー承認済み。intentional crash／通信断は
      別承認のまま実施しない。Claude r12／Codex r11の通常系受入、設定のexact rollback、修理commitとgateは
      [ADR 0039](adr/0039-observer-dual-host-live-acceptance.md)を正とする。
      ただしCodex app-server二attemptのMCP process群16件がcampaign rootを`cwd`にしたまま残留したため、
      leader terminalをprocess全体の終了へ読み替えた証拠だけを
      [ADR 0041](adr/0041-observer-queue19e-process-group-correction.md)で失効した。Observer `b089448`／
      ADR 0140のP5-1b5b-r15と、独立したpost-spawn/pre-ready recovery修理、修理後HEADのPhase gateを
      Observer `1493b35`／ADR 0144、focused 16/16、related 68/68、full 412/412、P0/P1残存0、
      Control revision 26 archiveで閉じた。cross-repo receiptは
      [ADR 0042](adr/0042-observer-phase-o2-cross-repo-receipt.md)。
    - Latticeへ移管済み: of-0308 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L62
      `observer-read`疎通へ補正し、`apply-observer-hook-config`へ検証済みarchiveからの原子的restore、
      absent状態、mode／owner保持を追加する。rollback入口がgreenになるまで実HOMEへapplyしない。
    - Latticeへ移管済み: of-0311 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L63
      dotagents adapterへ同じexplicit state rootを必須化し、旧root targetをcanonical一件へ置換する。
      失敗attemptは成功へ含めず、独立gate／commit後にqueue 19eへ戻る
      （[ADR 0024](adr/0024-observer-hook-state-root-binding.md)）。Observer focused 28/28、related 48/48、
      dotagents hook transaction／isolated package gate、対象docs lintはgreen。
    - Latticeへ移管済み: of-0316 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L64
      controllerのPATH先頭をcampaign prefixへ固定し、bare `throughline process-turn`とabsolute
      `observer-read`を同じcandidateへ束縛する。失敗attemptは成功へ含めず、global updateや
      手動transcript投入へfallbackしない（[ADR 0025](adr/0025-throughline-capture-runtime-binding.md)）。
    - Latticeへ移管済み: of-0320 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L65
      PATHでfresh tmux serverを作り、global tmux serverのstale環境を再利用しない。global socket／session／
      packageは変更せず、candidate自然Stopのreceiptと`observer-read` completed turnで受け入れる
      （[ADR 0026](adr/0026-aiterm-campaign-runtime-isolation.md)）。
    - Latticeへ移管済み: of-0324 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L66
      実物`<TMPDIR>/claude-tmux-sockets/claude.sock`をmacOSで94 bytesとlaunch前に実測した。
      105-byte pathの失敗attemptは成功へ含めず、global runtimeへfallbackしない。ADR 0027の
      予測名／92 bytesは[ADR 0028](adr/0028-queue19e-socket-and-stop-flush-correction.md)で訂正する。
    - Latticeへ移管済み: of-0328 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L67
      candidate-first PATH、実Claude `end_turn`、Stop hook error 0は成立したが、final assistant行の
      transcript可視化前にone-shot backfillしてDB本文／receiptが0件になった。Throughline commit
      `a46b915`でbounded barrierを独立実装し、focused 14/14、subprocess 2/2、related 78/78を通した。
      失敗attemptは成功へ含めず、修理済みcandidate再梱包後に19eを再開する
      （[ADR 0028](adr/0028-queue19e-socket-and-stop-flush-correction.md)）。
    - Latticeへ移管済み: of-0334 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L68
      CLIだけが末尾`/`付きrootを作り、preflightと実parent callerが分岐していた。Observer
      commit `33eb05a`でcanonical directoryへ一意化し、focused 15/15、related 35/35、package verify、
      installed module smoke `providers=2 root_count=1 canonical=true`を通した。失敗attemptは成功へ含めず、
      再pack済みcandidateから19eを再開する（Observer ADR 0133）。
    - Latticeへ移管済み: of-0339 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L69
      `observer_read.v1`の正規整数msをObserver evidenceのcanonical `.sssZ`へevidence collectorで一度だけ
      変換し、文字列、負数、範囲外値はfail closedにする。Observer commit `d84c969`、focused 9/9、
      related 42/42、package verify、実feed installed smoke
      `feed_turns=1 snapshot_turns=1 canonical=true`がgreen。失敗attemptは成功へ含めず19eを再開する
      （Observer ADR 0134）。
  - Latticeへ移管済み: of-0345 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L70
    live host成功へ丸めない。通常系19eで実施後、最初のarchiveとdigest／mode／ownerが一致する設定へ復元した。
- Latticeへ移管済み: of-0347 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L71
  - Observer `1493b35`／ADR 0144、Control revision 26 archive、focused 16/16、related 68/68、
    full 412/412、独立重監査P0/P1残存0を受け入れた。次ready TODOはPhase 3。

**Gate:** 同じObserver製品が親hostと同じproviderで伴走し、正常進行では沈黙する。

### Phase 3: Elasticのprovider対称化

- Latticeへ移管済み: of-0355 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L72
  - `shared/orchestrate/contract.md`「知能の配置原則（provider対称）」節を新設（`209e2df`と同wave、
    受入[ADR 0050](adr/0050-o3-placement-policy-and-switch-fixtures-acceptance.md)）。役割→モデルの
    解決は`docs/02_models.md`単独のまま、providerとの関係だけを契約化した。
- Latticeへ移管済み: of-0359 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L73
  - Worker laneは`claude-native@v1`（[ADR 0044](adr/0044-o3-claude-native-adapter-acceptance.md)）、
    相談役laneは`claude-native@consult-v1`（同一UUID resume・`--tools ""`全tool無効・cwd非複製、
    `50d79d5`、受入[ADR 0049](adr/0049-o3-consultation-v26-implementation-acceptance.md)）。
    いずれもprojection純関数で、実model live dispatchはH gateへ残置。
- Latticeへ移管済み: of-0364 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L74
  - `codex-sidecar@consult-v1`＝同期read-only `codex_opinion`（製品契約: `readonly:true`・
    `projectRoot`必須・effort `low|medium|high|xhigh`）。durable handleを捏造せず
    `consultation_handle:null`固定、write系引数非生成、caller観測error/timeoutで終端可（`50d79d5`）。
- Latticeへ移管済み: of-0368 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L75
  - Control schema v26のconnector closed enum＋typed `consultation_handle`、v25継続mutation、
    明示`control-migrate`（rollbackは非gpt不在時のみ）、brief/resume-check v7、failure supportの
    adapter_id×lane keying、consultation observationのworker projection遮断まで`50d79d5`で実装。
    ADR 0045 Gateの全focused fixture固定、related 127/127・fail 0・skip 0、`make lint-js` green。
    受入は[ADR 0049](adr/0049-o3-consultation-v26-implementation-acceptance.md)。
- Latticeへ移管済み: of-0374 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L76
  - Consultation切替をv26実fixtureで固定（gpt failed終端後のみ同一assignmentでclaude-native新record可、
    元recordのstate・handle・terminal_evidence不変、nonterminal/completed中は`ASSIGNMENT_ACTIVE`、
    ID再利用は`DUPLICATE_ID`。`209e2df`）。Worker側は既存のfallback宣言（v20/v21）が正のまま。
- Latticeへ移管済み: of-0378 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L77
  - `lib/orchestrate/placement-policy.mjs`（observer=same／consultant=cross-first／worker=adaptive、
    connector→family分類、fail-closed）と、policy＝v26 connector enum＝catalog consultation laneの
    三者一致fixture（`209e2df`、related 132/132・fail 0・skip 0）。相談役異社は第一候補原則で
    あり強制拒否にしない（同社ChatGPT相談laneを保全）。
- Latticeへ移管済み: of-0383 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L78
  - [ADR 0043](adr/0043-o3-claude-provider-adapter-boundary.md)で、既存v25 Worker契約を変えない
    `claude-native` adapterを最初の独立単位とし、Consultationの多provider schema変更を別gateにした。
  - Claude Code 2.1.211の`--bare`はOAuth／keychainを読まないためsubscription routeへ使わず、
    `--continue`、推測session、`--fallback-model`、`claude-internal` dispatch転用も禁止する。
  - baselineはorchestration関連115/115、fail 0、skip 0。実model request／network／credentialは未実施。
- Latticeへ移管済み: of-0389 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L79
  mappingを純粋projectionとして実装し、禁止flagと別session fallbackをfocused testで拒否する。
  - dotagents `4a3c9a7`（adapter＋focused test＋Control handle UUID厳格化）、`1573fce`（監査検出の
    大文字UUID非対称修理）。変更後focused 5/5、related gate（executor-adapters＋executor-contracts＋
    control-record）117/117・fail 0・skip 0、`make lint-js` green。argv契約はClaude Code 2.1.211の
    実CLI helpと照合済み。受入は[ADR 0044](adr/0044-o3-claude-native-adapter-acceptance.md)。
    実model request／login／credential／network dispatchは未実施。
- Latticeへ移管済み: of-0396 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L80
  型付きhandle、migration／rollback、O4のv26予約とのversion順を不変ADRで裁定する。
  - [ADR 0045](adr/0045-o3-consultation-multiprovider-schema.md)で裁定。O3=v26／O4=v27、
    connector別`consultation_handle`（gpt=slug、claude-native=同一UUID、sidecar=null）、
    v25継続mutation、明示`control-migrate`、data-plane限定rollback、brief/resume-check v7、
    failure supportのlane別keying、sidecar同期consultの終端evidence条件化を固定した。
    独立refuter 2票（互換視点・実装可能性視点）を通し、採用7群・棄却4群を件数遷移付きで
    ADRへ記録した。実装は`50d79d5`で完了（受入[ADR 0049](adr/0049-o3-consultation-v26-implementation-acceptance.md)）。
- Latticeへ移管済み: of-0404 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L81
  `claude -p` allowはO3権限規則として別scope／別commitで閉じる。保護指定pathを本adapter commitへ混ぜない。
  - `0170f00`（WSL relay RAG＋INDEX行）、`cd2ea3a`（mcp-observer INDEX行追補）、`cffb342`
    （`claude -p` allow。model H承認ではない）。CDC中間物はrag raw保存・出典URL・消費者ゼロを
    確認のうえ保全不要と裁定して削除。Lattice向けallow行は別セッション所有として非commit保全。

**Gate:** 親hostにかかわらず、同じControlとlane固有のPacket／Report／Decision／timeout回収契約で両社レーンを使える。host projectionをexecution成功へ投影しない。

- Phase gate前半実施済み（2026-07-17）: orchestration full regression **136/136・fail 0・skip 0**、
  クロスprovider Phase監査（Codex `codex_review`→refuter反証→統括裁定、採用5・棄却1、修理`a77b889`）を
  [ADR 0051](adr/0051-o3-phase-audit-record.md)で記録。
- **Gate充足（2026-07-17）**: オーナー承認のlive H gate（4 smoke全green: `--tools ""`＋`-p`、
  同一UUID resume、worker Read-only、`codex_opinion` liveの自前projection往復）を
  [ADR 0052](adr/0052-o3-live-h-gate-acceptance.md)で受入。Phase 3は完了。
  execution-verified昇格とdogfood consultation記録・v25→v26 migrationは実需時（Phase 4/6）へ。

### Phase 3 maintenance queue

- Latticeへ移管済み: of-0422 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L82
  planned consultationがControl finalizeを恒久ブロックする。記録元:
  [ADR 0051](adr/0051-o3-phase-audit-record.md)）。
  - [ADR 0053](adr/0053-consultation-orphaned-planned-closure-exemption.md)で裁定・実装。
    stateを書き換えず、finalize準備・closing容量予約・campaign終端判定の3箇所で孤児を除外
    （shape不変・両version・migrationなし）。容量上限ちょうどでのfinalize/archive成功と
    未取消時の従来ブロックをfixtureで固定、full 138/138。明示`cancelled` stateはv27（O4設計）で
    導入し本除外を廃止する。

### Phase 4: Rate-aware Elastic Scheduler

> 設計正本は[ADR 0054](adr/0054-o4-rate-aware-scheduler-design.md)（2026-07-17裁定、refuter 2票
> 通過・採用17棄却2）。quota snapshot契約（remaining_bp整数化・window単位model scope・
> window_length検証）、純粋selector（残量下限・pace飽和・量子化tie-break・エラー検査順固定・
> 4要素executor envelope）、Control schema v27（selector_decision optional key・consultation
> cancelled state・migration/rollback）、実装wave Q/S/V/A/Dの分割を固定した。
> 以下のTODOはADR 0054の裁定に従って実装する。

- Latticeへ移管済み: of-0440 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L83
  - [ADR 0054](adr/0054-o4-rate-aware-scheduler-design.md) Decision 1で裁定（refuter指摘により
    remaining_ratioをbasis points整数へ、model_familyをwindow単位scopeへ、window_length検証を追加）。
    validator実装はWave Q。
- Latticeへ移管済み: of-0444 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L84
  - request/projection純関数と秘密非複製は`lib/orchestrate/quota-adapter.mjs`（受入[ADR 0057](adr/0057-o4-wave-a-acceptance.md)）。
    live H実測で**OpenAI verified**（実token_count往復・[ADR 0058](adr/0058-o4-live-quota-observation-acceptance.md)）、
    **Anthropic verified**（statusline `used_percentage`入口・実capture往復・
    [ADR 0059](adr/0059-o4-statusline-quota-entry-acceptance.md)。stream eventはutilization不在を
    `UTILIZATION_UNAVAILABLE`で実態固定し前方互換pathとして保持）。自動配置の開始はWave D。
- Latticeへ移管済み: of-0450 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L85
  - `lib/orchestrate/rate-selector.mjs`（`83236c4`、受入[ADR 0055](adr/0055-o4-wave-qs-acceptance.md)）。
    canonical ISO UTC強制・model_family_scope選別・残量下限・pace飽和・量子化tie-break。
- Latticeへ移管済み: of-0453 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L86
  - placement語彙`{observer, consultant, worker}`で受け、observer/consultantは`ROLE_NOT_BALANCED`、
    親直轄Fは語彙外（既存`EXECUTOR_FORBIDDEN`が担保。ADR 0054裁定）。
- Latticeへ移管済み: of-0456 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L87
  - hysteresis・鮮度強制（選択ごと再取得）・reset失効・決定的tie-breakは`83236c4`で実装・fixture固定済み。
    quota pool単位lockはWave Aでlock-owners機構再利用のpool leaseとして配線し、selector_decision付き
    placement-reserveへ保持必須を課した（受入[ADR 0057](adr/0057-o4-wave-a-acceptance.md)）。
- Latticeへ移管済み: of-0460 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L88
  - 取得失敗以外の6項目は`83236c4`のWave Q/S fixtureで固定済み。取得失敗はWave Aの
    `projectQuotaObservationFailure`（必ずtyped error・closed語彙）fixtureで固定（受入[ADR 0057](adr/0057-o4-wave-a-acceptance.md)）。
- Latticeへ移管済み: of-0463 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L89
  Consultation多provider化へ割当済み）へ使用snapshot digest、quota pool、評価時刻、選択理由、
  reservationを持つselector decisionを追加し、candidate digest／receiptへ束縛する。旧version reader
  継続、v27新規作成、migration／rollback fixtureを同時に通す。
  - `75f33fc`で完了（受入[ADR 0056](adr/0056-o4-wave-v-acceptance.md)）。selector_decisionは
    optional keyとしてplacement-reserve subject digestへ自動束縛（改竄の恒久検出をfixture固定）。
    v27はconsultation `cancelled` state（`consultation-cancel`・ADR 0053除外のretire）も導入。
    reader {v25,v26,v27}継続・隣接migration/条件付きrollback・full 152/152・fail 0・skip 0。
- Latticeへ移管済み: of-0471 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L90

**Gate:** 架空quotaやsilent fallbackなしで、適格Workerを日割り余裕のあるproviderへ再現可能に配置できる。

### Phase 5: 工場wire v3とBugHub編入

- Latticeへ移管済み: of-0477 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L91
- Latticeへ移管済み: of-0478 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L92
- Latticeへ移管済み: of-0479 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L93
- Latticeへ移管済み: of-0480 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L94
- Latticeへ移管済み: of-0481 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L95
- Latticeへ移管済み: of-0482 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L96
- Latticeへ移管済み: of-0483 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L97

**Gate:** Observerが独立製品の所有境界を保ったまま、工場の更新・診断・bug・compatibility管理へ入る。

### Phase 6: Elastic orchestration dogfood receipt集約と完了監査

- Latticeへ移管済み: of-0489 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L98
- Latticeへ移管済み: of-0490 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L99
- Latticeへ移管済み: of-0491 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L100
- Latticeへ移管済み: of-0492 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L101
  - Latticeへ移管済み: of-0493 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L102
    - focused test 1/1 PASS、Observer実Controlの同じ入力で`IO_FAILURE`を再確認した。
  - Latticeへ移管済み: of-0495 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L103
    `control.sock`不在になる運用摩擦を再現した。Observer ADR 0010へ失敗2件と成功1件を固定し、Phase 2のhost adapter TODOへ
    bounded receipt収集とprivate state非依存を追加した。adapter実装とcrash回収gateは未完のまま維持する。
  - Latticeへ移管済み: of-0498 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L104
    75秒超`working`を維持して実行中stopできることを再現した。再stopは成功receiptを返さず、公開一覧は`stopped`を保持したため、
    Phase 2へ公開／無人許可の分離、terminal先行確認、stop receiptとstate観測の分離を追加した。実adapterは未完のまま維持する。
  - Latticeへ移管済み: of-0501 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L105
    子process内のallowlist抽出だけを構造化receiptへ返す出力衛生をPhase 2へ追加した。sanitizing adapter testは未完のまま維持する。
  - Latticeへ移管済み: of-0503 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L106
    strict schemaどおり返せない運用摩擦を解消する。保存済みpacketからexactなWorker Report skeletonを生成するread-only入口を追加し、
    packetとskeletonをdispatch前に保存して子へ渡す。親の手補正を標準運用にせず、生成物を埋めたreportがそのままimportできるfocused fixtureを通す。
    - `worker-report-skeleton`を追加し、correlation、executor handle、validation refs、nested evidence shapeをprefillする。
      write Runはbaseline確定後のadmittedだけに制限し、active回収でも同じdigestを維持する。focused test 1/1 PASS。
  - Latticeへ移管済み: of-0508 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L107
    `worker-report-import`不能になる運用摩擦を防ぐ。follow-upには両artifactの実pathを明示し、子へ原本を読ませる。
    pathを渡せない時はdispatchせず、schemaの説明文だけで代用しない。新しいschema／自動dispatch／個別testは増やさない。
    - Codex `orchestrate` appendixへ原本path必須、要約転記禁止、pathなしdispatch禁止を追加した。
  - Latticeへ移管済み: of-0512 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L108
    active report相関に使えなくなる契約不整合を直す。write Runはadmitted後だけpacket生成を許し、read Runのplanned生成は維持する。
    - planned writerを`INVALID_TRANSITION`で拒否し、admitted packetとactive回収skeletonのdigest一致を固定した。
      関連focused gateは各1/1 PASS。
  - Latticeへ移管済み: of-0516 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L109
    ミリ秒付きUTC canonical ISO-8601だけを受理する不整合を直す。placeholder自身へ
    `YYYY-MM-DDTHH:mm:ss.sssZ`を明示し、実native Reportを親の手補正なしでimportできる形へ戻す。
    - focused test 1/1 PASS。正本: [ADR 0006](adr/0006-worker-report-canonical-timestamp-guidance.md)。
  - Latticeへ移管済み: of-0520 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L110
    有った場合は最終成功で握り潰さず、所有repoの`docs/`正本TODOを登録または参照してから本筋へ戻る。
    専用receipt／schema／個別testは増やさず、TODO単位の共有契約として固定する。
  - Latticeへ移管済み: of-0523 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L111
    report import前の受入差分は同じTask／Run相関／executor handleで再作業し、正式reject後は同じTask／assignmentの
    新しいretry Runへ再配置する。rejected Runを再dispatchせず、具体的blockerがある時だけ証拠付きで停止する契約を
    共有の委譲正典へ固定した。専用schemaや反復監査は追加しない。
  - Latticeへ移管済み: of-0527 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L112
  - Latticeへ移管済み: of-0528 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L113
    `CONFIG_NOT_FOUND`でfail loudになる統合欠落を解消した。Observerの所有境界内へpath allowlist、read-only preset、
    隔離worktree writer、`gpt-5.6-terra/medium`の明示policyを追加し、秘密、login、host設定変更、実Codex呼出なしで
    `diagnostics=ok`、review `dry-run`、factory diagnostics `overall=ready`を確認した（Observer commit `33bde15`）。
    実writer利用は別のexecution-verified gateまで進めない。
  - Latticeへ移管済み: of-0533 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L114
    全Task完了後まで失敗を遅延させる運用摩擦を解消する。`control-init`直後・最初の`task-record`前に
    `phase-gate-record`を必須とする共有契約へ更新し、公開CLIは未設定を早期にfail loudする。
    - 公開CLIは`PHASE_GATE_NOT_RECORDED`で拒否し、phase記録後のTask作成とrecord-only非実行境界を
      focused test 1/1で確認した。内部library APIは既存Control／fixture互換のため変更していない。
  - Latticeへ移管済み: of-0538 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L115
    Supervisor統合Runのrevision 55で再現した。異host間のclock skewを5分まで許容し、それを超える
    `evidence[].observed_at`と`validation_results[].evidence.observed_at`を`EVIDENCE_FROM_FUTURE`で
    拒否するようdotagents `d6702b6`で修正した。旧Runはrevision 56でrejectし、同一assignmentの
    retry Reportを正時刻でrevision 60にimport、revision 61でacceptした。
- Latticeへ移管済み: of-0543 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L116
- Latticeへ移管済み: of-0544 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L117
- Latticeへ移管済み: of-0545 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L118
- Latticeへ移管済み: of-0546 → docs/archive/lattice-source-ledger/observer-factory-integration-cutover-20260719.md#L119

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

テスト頻度・baseline再利用は共通憲法と`shared/orchestrate/contract.md`の頻度規約に従う（本planへ複製しない。repo別コマンドは上表が固有分）。Hを要する実host／deploy／rollback drillはテストgreen後に別gateで実施する。
