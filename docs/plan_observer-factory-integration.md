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
- [x] Claude親からClaude Observerを継続させる正式event、payload、完了証拠、長時間wait、continuation、停止方法を実hostでcharacterizationする。
  - 公式契約ではmain turnの`Stop.last_assistant_message`、API失敗の`StopFailure`、background sessionのjob ID／`agents --json`／`logs`／`stop`／`respawn`まで確認した。
  - 2026-07-15にMax accountへ認証し、Haiku 4.5／plan権限でheadless `result/end_turn`、同じsession IDのresume、`SessionStart:resume`、background job `busy/working → idle/done → stop`を実測した。`--bg`と`--print`は明示競合するため、Observerはbackground job handle、Workerはstream-json `result`を別契約で扱う。
  - Claude completed turnはfinal assistant、process exit、mtimeで推測せず、Throughline Stop hookがpair capture後にatomic publishする製品所有receiptへ束縛する。Claude `/rewind`はforkなので同一conversation rollback surfaceを作らない。
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
- [ ] host-neutral cursorへproject identity、host／thread hash、host固有の完了証拠を束縛し、
  detected ambiguityをfail closedにする。v1前提外の一般的な複数活動親をmtime／PID／TTLで推測しない。
- [ ] Codexは`task_complete`、ClaudeはPhase 0で実証した完了証拠だけを採用し、mtimeや進行中projectionを完了扱いしない。
- [ ] snapshot／delta／thread switch／host switch／resync／projection pending／paginationをblack-box固定する。
- [ ] Observer以外にも再利用できるJSON-only read／wait CLI、cancel、timeout境界、65秒超live waitを両hostで検証する。
- [ ] Throughline既存Claude pathとCodex pathの回帰gateを通し、独立commit／rollback単位を保つ。

**Gate:** 両hostで進行中turnを除外し、完了turnを欠落・重複なくObserverへ渡せる。

### Phase 2: Observer完成

- [ ] Observer runtimeをhost-neutral SupervisorとCodex／Claude host adapterへ分離する。
- [ ] parent identityから現在親のhostを解決し、Observer modelを同じprovider familyへ固定する。
  host不明またはThroughlineの`ambiguous_parent`はfail closedにする。
- [ ] ユーザーの明示指示を受けた親launcherだけが、provider child起動前に一target一watchを確保する。
  active watchが既にある場合は`already_active`で停止し、暗黙起動、二重起動、後勝ちtakeoverを行わない。
- [ ] Codex ObserverとClaude Observerで同じwatch／status／stop UXを提供する。
- [ ] Claude host adapterで、可変長の`--mcp-config`／`--tools`より前にprompt positionalを置くargv契約を固定し、
  terminal receiptのowner、作成時点、atomic保存、job ID／result digest相関、再開手順を耐久契約として実装する。
  即時完了、terminal直前のadapter crash、実行中adapter restart、daemon消失、失敗terminalを独立fixtureにし、
  terminal後に`claude logs <id>`の`control.sock`が失われても成功や空結果へ丸めず、Claude private job state直読を標準fallbackにしない。
- [ ] Claude Observer所有MCP toolは`--tools`での公開と`--allowedTools`での`dontAsk`無人許可を別々にexact指定する。
  stop前に公開`agents --json`でterminalなら`already_terminal`を返してCLI stopを再発行せず、実行中stopのcommand receiptと
  terminal state観測を分離する。stop確認不能では同じjob IDを再観測し、terminal不明なら`stopping`を維持する。
- [ ] Claude backgroundのuser／project／local settings、hooks、pluginsを隔離し、HEAD、index、tracked／untracked、modeを含む
  project fingerprint不変を確認する。65秒超の実行中jobでstop、子process残存なし、再stop、親／launcher再起動後の状態を実証する。
- [ ] 両hostのproject-local continuationと親Mailbox hook adapterを実装し、host固有wireを共通coreへ漏らさない。
- [ ] Observer AIへ伴走者契約、既定沈黙、一サイクル一件、dedupe／cooldownを強制し、常時反証や第二の親への逸脱を拒否する。
- [ ] read-only、誤配送防止、crash recovery、faulted停止、installer／verify／rollbackを両hostで完遂する。
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
