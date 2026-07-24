# Lattice ToDo archive
Plan: bughub-factory-integration
Batch: ledger-cutover-20260719
Revision: d5c5e57393657f7adb2cae68d23d3ba8c3920dc2da7ab5c54bd877e423965792

- [x] 当時はaudit-gauntletの指摘を反映したが、同skillは2026-07-14に過大結果のため廃止された。
- [x] 9製品とdotagents/ServerManagerでfetch→origin照合→stash→dirtyを記録
- [x] Caveatの並行dirtyはオーナー/作業sessionの完了までロックし、収容・破棄を勝手に行わない
- [x] Throughline `.agents/` の所有意図を確認し、無関係なら触らず作業範囲を分離
- [x] 4 host×9 productのrequired/optional/forbidden/unsupported matrixと期待connectorを`docs/factory-host-product-matrix.md`へ正本化
- [x] ServerManager BugHubの現行pull、DB、通知、`/ai`、deployをcharacterizationする
- [x] `INTEGRATION.md`の`master` URL、ServerManager AGENTSの`origin master`例、BugHub README/deploy commentの旧`~/projects` pathを現行`main`/`~/Developer`へ照合・訂正
- [x] 文書にだけある`auctionbot` adapter記載を実registryと照合し、実在する入口だけに訂正
- [x] 端末能力8製品、ServerManager、基盤CLI 3製品について、製品別のversion・diagnostics・state/schema・migration・互換性契約が有限表になっている
- [x] BugHubにCIと実SQLite characterization testを先に追加
- [x] 既存4sourceのpoll、severity素通し、再発、resolve表示、digest、`/ai`を固定
- [x] Discord送信が`false`の時に`markAlerted`しないこと、delivery failureを記録・再通知できることを固定
- [x] versioned DB migration runner、backup/restore test、schema versionを追加
- [x] 既存signature契約との対応表、factory report JSON Schema、severity判定表、fingerprint規則、privacy allowlist、認証、冪等、host binding、size/time validationを仕様化
- [x] 可変値違い、類似別原因、resolve後再発、秘密混入、重複retryのcontract fixtureを先にgreenにし、製品instrumentation開始gateにする
- [x] host credentialのprovision/rotate/revokeと401/403、紛失host廃止をfixture化
- [x] `deploy.sh`の`rsync --delete`をdry-run必須にし、image rebuildとhealth確認を固定
- [x] 4環境×12管理製品の期待状態（required / optional / forbidden / unsupported）、期待connector、欠落時severityが一意なmatrixになっている
- [x] 9製品adapterからのreport生成を実装
- [x] schema検証・送信・outbox・retry・上限を実装
- [x] fake BugHubで成功、401、schema reject、timeout、duplicate、outbox再送をテスト
- [x] enqueue-before-send、single-flight、overflow、dead-letter、応答消失をテスト
- [x] 受理後・削除前failureの同一bytes再送と、server dedupe retention（outbox上限超・期限前後prune）をテスト
- [x] host ID/tokenをrepoへ保存しない設定・rotation・revoke手順を追加
- [x] Mac launchd、Linux/WSL cron、Windows Task Schedulerのinstall/uninstallとOS別state/ACL契約を実装・fixture化
- [x] Mac、main-server、FOX WSL2、FOX Windows nativeの4環境が、認証付きでBugHubへ観測結果を報告できる（2026-07-18: 4host全部がv2 reportのaccepted・`factory_v2_current` 12製品・`/readyz` factory_ingest readyを実査）
- [x] 4環境でschedulerをH承認後に実登録し、実火・uninstall・state/ACLを確認（2026-07-18: Mac launchd apply→kickstart実火→uninstall→再apply・state 0700、FOX Task Scheduler apply→/Run実火(LastTaskResult=0)→uninstall→再apply・owner ACL、FOX WSLはitem 4既済＋今日13:17実走green、main-serverはcron外部書換被弾から正規再登録＋cron同等最小env実火green。main-serverの次回:17自走は継続監視）
- [x] `agents-update`後にcontract scan→reportを接続し、update失敗後も観測と報告を試行して最終的に非0終了
- [x] Codegraph: version＋既存index限定status。index無しは`skipped:not-indexed`
- [x] MarkItDown: version＋local fixture byte判定。JS URLはhealth fixtureに使わない
- [x] Oracle: version＋wrapper＋`doctor --providers --json`。認証依存を区別しconsult/status禁止。2026-07-13の置換裁定によりWave 6で退役対象へ変更
- [x] upstream version drift fixtureとunsupported表現を固定
- [x] BugHubにhost×productの現在値と履歴があり、installed/latest・contract・schema・update・compatibilityの状態を区別できる
- [x] Caveat: DB schema/migration/own sync/Claude MCP・hook/Codex native hookの機械可読診断
- [x] Throughline: state schema/hook/代表smokeの機械可読診断
- [x] Spotter: 既存doctor/status/Codex diagnosticsの統合JSONまたはadapter契約
- [x] aiterm-mcp: versionとMCP/PTY/vendor readinessのread-only診断
- [x] codex-sidecar: package整合、diagnostics/dry-run、result schema/model policy診断
- [x] 各製品で既存error log/診断を棚卸し、共通fieldへ安全に出せるものだけlocal structured error storeへ接続
  - [x] Throughline、Spotter、aiterm-mcp、codex-sidecarは、明示opt-in、local store、resolution、cursor/ack、retentionを製品側の公開CLI契約として実装
  - [x] Caveatもロック解除後の独立waveで明示opt-in、local store、resolution、cursor/ack、retentionを実装
- [x] 互換異常は既存BugHubのfingerprint・severity・再発・解決・Discord・`/ai`へ統合される
- [x] `collection.enabled`と`reporting.enabled`を分離し、送信が既定OFF、明示ON時だけnetwork I/Oすることをfixtureと文書で固定
- [x] stderr、生stack、例外オブジェクトの丸投げと、同じ失敗の複数layer計上をnegative fixtureで拒否
- [x] 各repoでbaseline green→characterization→実装→full gate→独立commit→push
  - [x] Throughline、Spotter、aiterm-mcp、codex-sidecarは独立commit・push・full gate・独立反証まで完了
  - [x] Caveatもbaseline→characterization→実装→full gate→独立commit/pushを完了
- [x] `POST /api/factory/v1/reports`とfactory DBを実装
- [x] v1 full snapshot、check lifecycle、消失だけでは非resolve、producer明示resolve、再観測reopen、host廃止、長期offlineの状態遷移を固定
- [x] 既存4アプリのpull巡回・重大度・resolve/reopen・dashboard・日次/週次通知に回帰がない
- [x] deltaとBugHub側manual resolveをv1非目標とし、将来schema majorの互換設計へ分離
- [x] check failureを既存issueへhost付きで統合し、明示resolve、再観測reopen、古いoffline観測による巻き戻し拒否を固定
- [x] runtime errorのack/cursor/retentionを全自作製品で固定
  - [x] 完了済み4製品はBugHubの同一report受理後だけackし、ack失敗は非0・単一atomic outbox envelope保持・duplicate再受理後再試行とする
  - [x] Caveatも製品側storeと接続し、同一report受理後だけackする
- [x] runtime adapter/outbox契約を独立反証し、collection OFF時のqueue drain、二ファイルorphan、ack失敗のfalse successがないことを確認
- [x] dashboardにhost×product matrix、version履歴、latest/compat/schema状態を追加
- [x] `/ai`とDiscord/daily/weeklyへ修正先repo・host・product・fingerprintを追加
- [x] 既存pull sourceとの後方互換testを通す
- [x] 第三者製品をfork、`node_modules`パッチ、内部DB決め打ちで改造していない
- [x] オーナー裁定としてOracle→`gpt-connector`置換を確定し、Oracle継続・併用を選択肢から外す
- [x] オーナー裁定としてClaude Code CLI、Codex CLI、Grok BuildをBugHubのversion/update/compatibility管理対象へ追加し、コア製品とは別区分に置く
- [x] 工場コア製品を正規入口で実利用中に再現した欠陥は、所有repoの正本TODOへ追加し、独立gate・独立commitで修正してから本筋へ戻ることをオーナー恒久裁定として固定する。単なる気づきや大掃除へ拡張せず、publish・本番deploy・credential/login・意図的障害試験は引き続きHとする
- [x] オーナー裁定として、Codex親はnative同時実行上限（親を含む4枠）を全体上限とせず、external executionとして`codex-sidecar`とaiterm上のCodex/Grok/Composerを積極利用する。限界突破目的の入れ子Codexを許可し、旧「Codex親はnative一択・aiterm/MCP経由の入れ子Codex禁止」を撤回する。`gpt-connector`はconsultation専用でworkerには数えない
- [x] 自作製品は機械可読な正規diagnosticsを製品側に持ち、dotagentsが内部状態を勝手に解釈しない
- [x] `gpt-connector@0.2.0`の通常Chat、正規添付、model/effort、冪等job、terminal回収、read-only diagnostics、Oracle互換`consult`/`sessions`を実ブラウザと配布物で確認する
- [x] Oracleとの同一prompt＋2添付shadowで、`gpt-connector`成功、Oracle upload timeoutを確認し、Oracleへ自動fallbackしないことを確認する
- [x] 3 CLIの正規version/update入口を実測する。Claude Code=`@anthropic-ai/claude-code@latest`、Codex=`@openai/codex@latest`、Grok Build=`grok update --stable`／read-only `--check --json`
- [x] `gpt-connector` repoの`docs/`へ本waveの製品側TODO正本を作り、既存AI installer作業と書き込み範囲・commitを分離する
- [x] 3repoでfetch、origin照合、stash、dirty、baseline full gateを取り、`gpt-connector`の`doctor`／`consult`／`sessions`／MCP tool schemaとdotagents v1 reporterをcharacterizationする
- [x] 既存`gpt-connector.diagnostics.v1`を壊さず、`gpt-connector factory-diagnostics --json`相当のversioned read-only入口を追加する。version、diagnostic schema、overall、state/job schemaとmigration、CDP、official origin、auth、runtime bridge、MCP contractを固定check IDで返す
- [x] factory diagnosticsはChrome/CDP/auth未準備を`not_ready`、host非対応を`unsupported`、未検証を`unverified`として区別し、upload・conversation・archive・job作成を一切行わない
- [x] 自作製品をクオ管理端末で実利用した時の構造化errorを、入力本文・秘密・ファイル内容なしでローカル記録し、dotagents reporter経由でBugHubへ集約できる
- [x] `runtime-errors snapshot|diagnostics|ack|resolve|reopen|compact --json`相当のproduct-owned storeを追加し、canonical dotagents configのJSON boolean `collection.enabled: true`だけで収集する。network送信は実装せず、`reporting.enabled`やtoken存在から収集を推測しない
- [x] error定義をCDP/auth/runtime drift、upload/attachment read-back、Chat/stream/archive、job state永続化・migration等の修正可能な製品境界へ限定する。通常の入力拒否、利用者取消、期待されたunsupportedをerror件数へ水増ししない
- [x] 固定code/template、SHA-256 fingerprint、count、first/last seen、resolve/reopen、monotonic cursor/ack、unacked保護retention、owner-only atomic state、symlink拒否、bounded snapshotをfixture化する
- [x] prompt、assistant response、file名/内容/digest、conversation/session/job ID、cookie/token、CDP dump、絶対path、生stack/stderrを入力・保存・出力できないprivacy allowlistとnegative fixtureを固定する
- [x] 実配布CLIで`gpt-connector --help`がChrome/CDP接続より前にusageを表示するよう修正し、read-onlyコマンドが未起動Chromeを理由に誤って`CDP_UNAVAILABLE`へ落ちないことを配布物smokeで固定する
- [x] `gpt-connector browser start`を製品所有の正規入口にし、true headlessを使わず専用profile・loopback CDPで窓なしcold起動する。background最小化targetを作成して正規PIDだけunhideし、既存Chromeの二重起動を避ける。unit fixtureに加え、macOS cold smokeでCDP `windowState=minimized`、Window Server上の同一PID layer 0画面内windowゼロ、同時start収束、最小化中の実送受信を固定した。`browser show`と再startは同じ実windowの`0→1→0`を固定した
- [x] runtime error storeの異常終了後に残ったlockを有界・安全に回収し、diagnosticsがstale lockを偽greenにしないcharacterizationと修復を追加する
- [x] runtime error adapter失敗が、秘密や生stderrを出さずに失敗製品IDと固定reason codeをローカル診断へ残す
- [ ] macOS、Linux、WSL2、Windows nativeでCLI/version/read-only diagnosticsを動かし、live Chat connectorの期待可否はhost matrixで別管理する。未対応hostを導入失敗や偽greenへ丸めない
- [x] `pnpm check`、pack/install smoke、既存Chat/添付/job回帰をgreenにし、version更新・release準備後、npm publishは対象version・影響・rollbackを提示してH承認後だけ行う
- [x] `gpt-connector`がversioned native factory diagnosticsとopt-inのlocal runtime error storeを製品側で所有し、dotagentsが内部stateやChatGPT会話を解析せずBugHubへ投影できる
- [x] product IDを`claude-code`、`codex-cli`、`grok-build`へ固定し、製品表示名、所有者、修正先、version形式、update入口、latest取得、host期待、severityを有限表へ追加する
- [x] Claude CodeとCodexは`agents-update`の既存npm `@latest`処理を維持し、更新前version、registry latest、install結果、更新後version、post-update互換gateを製品別に記録する。registry不能・install失敗・version不一致を別reason codeにする
- [x] Grok Buildはnpm対象へ入れず、`grok update --check --json`でcurrent/latest/updateAvailable/channel/installer/autoUpdate/errorを検証してから`grok update --stable`を実行し、更新後`grok --version`と再checkを記録する。alpha channelへ自動切替せず、更新不能時はfail-loudにする
- [x] 1製品の更新失敗後も残り製品の更新とfactory reportを継続するが、最終exitは非0にし、成功製品だけで全体をgreenへしない。更新logとBugHub observationは同じproduct ID/reason codeへ対応させる
- [x] Claude Codeは必須hook/settings、Codexはconfig parser/hooks/native routing、Grok Buildはstable channelとaiterm/headless入口をread-only fixtureで検証する。session/agent起動、prompt送信、login/logout、OAuth変更をhealth checkに使わない
- [x] host matrixでClaude Code/Codex/Grok Buildのrequired/optional/unsupportedを個別に決め、optional hostのmissingをissue化せず、required hostのmissing/update failure/compat driftだけを所定severityへ写像する
- [x] npm registry JSONとGrok `--check --json`のschema drift、未知version、downgrade、部分更新、更新後CLI消失、PATH shadowをfixture化し、人間向けstdout解析や無根拠なlatest推測を禁止する
- [ ] factory wireをserver-firstの新majorへ移行し、固定管理集合をv1のコア9から「Oracleを`gpt-connector`へ置換したコア9＋基盤CLI 3」の12製品へ拡張しても、旧client、Oracle履歴、resolve/reopen、dashboard、通知が壊れない
  - [x] npm latestをJSON stringのexact semverだけへ束縛し、registry不明時はClaude/Codexのinstallを開始しない。
  - [x] installed > latestを`downgrade_refused`で拒否し、他製品の更新と最終reportは継続する。
  - [x] Grokのexact keys、`installer=internal`、stable channel、error null、version大小と`updateAvailable`の
  - [x] schema drift、未知version、downgrade、部分失敗、更新後CLI消失、PATH shadowのfocused fixtureを通し、
- [ ] Claude Code CLI、Codex CLI、Grok Buildについて、installed/latest、更新前後version、update成否、対応host、親別互換性をBugHubで追跡し、1製品の更新失敗を他製品の成功で隠さない
- [x] 固定product集合の変更をwire majorとして扱い、Oracleを含むv1コア9を維持したまま、`gpt-connector`を含むコア9＋基盤CLI 3の固定12製品schema・別endpoint・fixture・client/server compatibility matrixを追加する
- [x] host profile期待matrix、current/history、dashboard、Discord/daily/weekly、`/ai`、修正先repoを`gpt-connector`と基盤CLI 3製品へ対応させ、Oracle履歴と既存issue/fingerprintを削除・上書きしない
- [x] v1最終Oracle `not_applicable`＋明示resolution、新major最初の`gpt-connector`＋基盤CLI 3製品を含む固定12製品full snapshot、旧観測の遅着、重複retry、resolve後再発、schema片側停止をcharacterizationする
- [x] BugHub readinessの期待DB schemaを最新migrationと一致させ、既存のv1 factory issue fingerprint saltを維持して再導入時に履歴を孤児化しない回帰testを通す
- [x] Oracle退役状態をglobal booleanではなくhost別cutover状態として保持し、移行済みhostだけを`not_applicable`にしつつ未移行hostのv1観測を早期免除しない
- [x] v1/new-major dual-run中のDB backup/restore、endpoint feature flag、revision attestation、canary、旧major retire条件をランブックへ追加する
- [x] `PRODUCT_IDS`、factory scan/reporter、runtime ack、ServerManager adapter、privacy allowlist、fixture、host-product matrixを新majorの`gpt-connector`＋基盤CLI 3契約へ更新する。v1 Oracle clientは互換期間だけ独立入口として保持する
- [ ] 全現役hostで`gpt-connector`の導入・更新・診断・期待connector・MCPをmatrixどおり検証し、Oracleへの暗黙fallbackなしで切替とrollback drillを完了する
- [x] dotagents v2 privacy validatorをServerManagerの受理条件（POSIX/Windows絶対path・emailを含む）と同値にし、clientで通過したreportがserverで拒否されるcontract driftをnegative fixtureで塞ぐ
- [x] v2 runtime ack bundleを`gpt-connector`を含む固定集合でvalidate・実行し、scan→enqueue→accepted response→製品owned ackまでをE2Eで固定する。v1 Oracle ackは互換入口から分離して保持する
- [x] v2 reporterが401/403/429/5xx/network/backoffで未送信outboxを保持しても成功exitにせず、schedulerから送信不能を観測できる非0終了と固定reason codeを返す
- [x] `agents-update`を`gpt-connector@latest`へ切り替え、Claude Code/Codexの既存npm更新結果とGrok Buildのself-update結果を製品別に投影し、install/verify、CLI prerequisite、clean HOME、macOS/Linux/WSL/Windows入口、post-update scanを更新する
- [x] Claude/CodexのMCP登録を`gpt-connector-mcp`へ切り替え、最終server IDを`gpt_connector`へ正本化する。移行期間に`oracle` server IDを使う場合もcommand実体は`gpt-connector-mcp`に限定し、期限とconsumerをfixtureで追跡する
- [x] `oracle` skill、`docs/06_oracle-mcp.md`、`docs/02_models.md`、`claude/CLAUDE.md`、AGENTS/README/PLAN、callout hook説明、overview、RAG/図解を`gpt-connector`正典へ移行する。生きた参照をゼロ確認するまで旧文書・wrapper・shim・testsを削除しない
- [x] グローバル`claude/CLAUDE.md`と`codex/AGENTS.md`、プロジェクト`AGENTS.md`／取込側`CLAUDE.md`で、ChatGPT second-opinionの正規入口とコア製品実利用中の再現バグ修正裁定を同じ契約に揃える
- [x] 旧Oracle wrapper/config/profileを`gpt-connector`へ流用せず、専用Chrome、product-owned state、model/effort明示、caller既知slug、timeout後`sessions`回収、暗黙fallback禁止を標準形として固定する
- [x] `make ci`、official/legacy install、skill discovery、factory report v1/new-major fixtureをgreenにする
- [ ] 新規Claude/Codex sessionで`gpt_connector` MCP surfaceを再読込し、両親からread-only diagnosticsをgreenにする（現在のCodex sessionは起動時cacheに旧Oracle surfaceが残るため再起動後に実施）
- [x] 公開製品の外部利用者からは明示opt-inなしにtelemetryを送らない
  - [x] Claude親（Mac・2026-07-18新規session）: `gpt-connector.diagnostics.v1` overall=`ready`・authenticated・CDP connected。同sessionでClaude hook smoke／Codex hook smoke両方ALL PASS、callout hook C系の実火（SessionStart／UserPromptSubmit／PreToolUse各INFO初回発火・依頼範囲非拡張）も確認。Codex親の新規session実火はR2残E2Eで実施
- [x] Codex親の委譲をnative／外部実行／相談の3レーンへ正典化し、外部子のtask ID・timeout回収・writer worktree隔離・git操作禁止・秘密/H非委譲・親受入れgateを`codex/AGENTS.md`、`orchestrate`、モデル表、Codex断片、host/product契約へ同期する（`1e8f9fb`、`make ci` green）
- [ ] Codex親の`codex-sidecar`／aiterm connectorをsupportedとして導入・検証面へ配線し、installed→registered→verified→execution-verifiedを区別する。aitermのGrok/Composer各2回、別Codex、codex-sidecar、gpt-connectorの回収smokeを通すまでwriter利用をgreenにしない
  - [x] このMacのCodex親へ`codex-sidecar` 0.3.7をH承認下で登録し、MCP initialize、12 toolの`tools/list`、factory diagnostics `overall=ready`を確認してverifiedまで上げた。現sessionのtool面は起動時固定のためexecution-verifiedは新規sessionへ残す
  - [x] 同じMacで配布CLIの`codex-sidecar review`を明示Terra×medium・read-onlyで完遂し、三レーン正典diffを独立レビューした。read-only external executionはexecution-verified、writerは`codex_work`未実証として未verifiedに分離する
  - [x] aitermの配布0.12.2で別CodexをTerra×medium・read-only診断へ起動し、`agent_done`とtranscript回収後にcloseした。0.12.3隔離tgzから実Grok/Composerを各2回起動して4/4を確認し、公開npm 0.12.3の隔離install後もGrok/Composerを各1回、期待応答・`agent_done`・再認証要求なし・closeまで通した
- [ ] 代表fixture（添付なし/あり、standard/extended/max、timeout、auth loss、runtime drift、process restart）を全対象hostの期待matrixどおりshadowし、requested/resolved model/effort、terminal回収、archive、privacyを確認する。OracleやAPIへ再送・fallbackしない
- [x] BugHub自身をBugHubの自己申告だけで合格させず、main-server上の外部runnerがServerManager/BugHubを検証する
- [x] hostごとにv1 Oracle最終snapshot→MCP切替→新major 12製品初回snapshotを順序付きで実行した（2026-07-18: v1 `factory_current`で4host全部oracle=`not_applicable`を実査、v2 currentは4host×12製品。resolve/reopenは2a drill・6bで実証）
- [ ] 全host greenとH承認後だけOracle package、更新対象、MCP登録、wrapper/shim、skill配布を外す。削除前に`rg -a`と利用可能な索引でconsumerを確認し、Oracle履歴・archive/RAGは保持する
- [ ] rollback drillは新major送信停止、前`gpt-connector` release/MCP設定への復帰、必要時のOracle command一時切戻しを分けて実証する。一時切戻しでOracleを正規コアへ戻したり、自動fallbackを追加したりしない
- [ ] gpt-connector、dotagents、ServerManagerのfull gate、registry由来install、BugHub canary、全host E2E、独立反証を通し、各repoを独立commit/pushする
- [x] main-server上のdotagents reporterからBugHubを外部probe
  - [x] loopback `/readyz`限定の外部probe CLIとserver profile adapter、SSRF/privacy/contract fixtureを実装
  - [x] main-serverへ配布し、実reportでServerManagerの6 readiness check（DB/schema/pull/ingest/delivery/revision）を確認
- [x] 報告不能時は端末ローカルのdotagents所有outboxへ保持し、成功扱いせず、復旧後に冪等再送できる
- [x] BugHub停止、stale poll、DB migration失敗、image/source不一致をfixture化
  - [x] stale pull、source未設定、DB query/schema mismatch、factory ingest/delivery stale・失敗を`/readyz`の固定reason codeでfixture化
  - [x] process停止・到達不能を外部probeの`unreachable`としてfixture化
  - [x] image/source一致はrebuild済み判定と分離し、build時source revisionをOCI labelとread-only readiness fieldへ焼き込み、main-serverのdeploy manifestに保存した期待revisionと外部probeで比較する
  - [x] revision欠落・不正・期待値不一致を固定reason codeへ写像し、Docker restartだけでは一致扱いにしないfixtureを追加
- [x] BugHub停止中のoutbox保持→復旧後再送を実測（2026-07-18 6a: 33秒停止中flush非0・retained=1・dead-letter 0→復旧後flush sent=1）
- [x] readinessをDB query、poll/ingest鮮度、source error、pull/factory通知deliveryまで拡張し、Docker healthcheckとdeploy canaryを`/readyz`へ接続
- [x] BugHub停止/readiness failureはBugHubを経由しないPi5→Discord専用bridgeで通知し、復旧後に同じfingerprintをBugHubへ還流（2026-07-18: 6a/6bで全sub実証済み。還流経路自体のv2欠落は`5f22ed4`で修理）
  - [x] 専用bridgeは既存の監視抑止に入る時に未trigger観測窓だけを切り、`/readyz`をDocker health retryとは独立した60秒tickerで観測する。trigger済みeventは保持し、抑止解除後2連続失敗（通常約120秒）で通知を試行し、配送失敗はtimeout付きでdurable retryする。自動restartは行わず、既存Layer 3の3周期観測・restart責務を奪わない
  - [x] `sha256(servermanager:<check_id>:<reason_code>)`（process到達不能は固定`availability:unreachable`）をdurable eventとしてPi5に保存し、dotagents所有の明示connector CLI経由でmain-server reporterへopen/resolveを渡す
- [ ] 更新後contract gateと定期read-only gateがgreenになり、失敗製品・host・検査項目をBugHubとローカルlogで特定できる
  - [x] Discord成功とBugHub還流成功を別ackにし、片方の失敗をもう片方の成功で消さない。復旧後もBugHub accepted確認までeventを保持する
  - [x] main-serverのexternal-event connectorとPi5のbridge/tickerを配布し、実`/readyz` ready状態で120秒間にstate mtimeが2回進み、events空・connector pending 0を維持するnormal canaryを確認する
  - [x] Pi5 bridge/ticker本体の所有repo、immutable commit/path、`run(deps)` fixtureを受け入れ、再配布／rollback可能なsource契約を固定する。ServerManager `74c315b`／`b3ac6da`、focused 12＋4件、[ADR 0021](adr/0021-servermanager-pi5-bughub-bridge-receipt.md)を証拠とし、意図的canaryはH-only残件へ分離する
  - [x] Wave 8.6a/6bの分離済み意図的canaryで、transient誤openなし（6a）とDiscord通知→BugHub accepted→resolve→isolated state削除（6b）をそれぞれ実証した（2026-07-18）
0. [x] H承認後、repo実装済み・公開版未収録のThroughline、Spotter、aiterm-mcpと、今回追加するCaveatのfactory契約を独立releaseし、npm `latest`・packed install smoke・`--version`・native diagnostics/runtime snapshotを確認する（codex-sidecarはv0.3.6へ収録済み）
- [ ] 自作製品のfactory diagnostics/runtime error契約が各端末の正規配布版へ収録され、repo HEADだけに存在する未公開実装へ依存していない
0a. [x] Wave 6の`gpt-connector`公開版、基盤CLI 3製品adapter/update契約、ServerManagerの固定12製品new-major endpoint、dotagents new-major clientをregistry/配布物由来で確認し、v1 Oracle clientを壊さず受理できる状態をrollout開始gateにする
0b. [ ] SpotterのWindows Codex実行経路修正版とdotagentsの`auditor` presetを受け入れ、4 hostの実配布receiptで閉じる
   - [x] Windows npm shimをprobe／auditor／Sidecarの用途別に安全に解決し、timeout時のprocess tree終了失敗もfail-loudにしたSpotter v1.4.25を、製品repoの公開記録とfocused 131/131で[ADR 0016](adr/0016-spotter-windows-codex-product-receipt.md)へ受け入れた
   - [x] dotagentsの`.codex-sidecar.yml`に`auditor` presetが収録済みで、Spotter callerとSidecar 0.3.7正規diagnosticsが一致することを[ADR 0018](adr/0018-sidecar-auditor-preset-local-receipt.md)で確認した
   - [x] factory v2 scannerから`--preset auditor`を明示し、`readOnlyDryRun.workflow=auditor`とexplicit model policyをexact検証して、review誤配線／inherited policyをnegative fixtureで拒否した（`a35e987`、focused 10/10、[ADR 0020](adr/0020-sidecar-auditor-adapter-receipt.md)）
   - [ ] Mac、main-server、FOX WSL2、FOX Windows nativeでinstall・doctor・Codex auditor・Sidecar diagnosticsを実配布版から検証する（実host apply／trust／scanはH/R2）
1. [x] main-server: `FACTORY_INGEST_ENABLED=true`でv1を維持し、v2 ingest/view OFFでschema 4対応serverをDB backup付き配備 → `/readyz`とv1継続を確認 → v2 ingest/viewをON → v2 endpoint単体canaryを確認する。candidateはrevision一致activation markerまでHTTP書込みを503で閉じ、activation前の切替失敗だけをquiesced rollback setから自動復元する。旧containerなしの初回導入も同じfixtureで扱う
1a. [x] v1 scannerへ一回限りの明示`--oracle-retired`入口を追加し、Oracle CLIを実行せず`not_applicable`にした最終full snapshotをschema検証付きで生成する。通常scanとv1 rollback schedulerは従来どおりOracleを観測する
1b. [x] `factory-reporter` / `factory-reporter-v2`がinstall.shの配布symlink経由でもmainを必ず実行し、exit 0・無出力でenqueue/flushを省略しない回帰テストを追加する
1c. [x] v1受理後ACKを5製品の実公開response schemaへ合わせ、失敗時は生出力なしで製品IDをローカル結果へ残し、duplicate再受理で安全に完遂する
- [ ] 各repoを独立commit・独立rollback可能なwaveで実装し、全remoteへpushして真実を返している
1d. [x] macOS schedulerはHomebrew Cellarのversion固定Nodeではなくstable symlinkを保存し、stable入口欠落時は登録前に明示失敗する
1e. [x] v1 reporterもHTTP/network/timeoutによる保持とpermanent rejectのdead-letterを送信失敗として非0終了し、rollback schedulerがfalse successにしない
1f. [x] v2 scannerは全製品の観測完了後にreportのobserved_atを確定し、gpt-connectorの診断failureと並行runtime eventを未来timestampにしない
1g. [x] FOX Windows native実機で`factory-reporter-v2 enqueue`のowner-only ACL適用が失敗する経路を根治し、current-SID-onlyのdirectory/file契約、秘密非表示、非0 fail-loudを維持したWindows回帰testと実機scan→enqueue→flushを通す
1h. [x] `agents-update`を配布symlinkから起動するとtoolchain ledger helperを`.mjs`付きで誤参照する欠陥を直し、source直実行と`~/.local/bin`配布入口の双方でClaude Code／Codex CLI／Grok Build台帳とpost-update reportを確定する
1i. [x] FOX Windows nativeでnpm `.cmd` shimをNodeの直接spawnが解決できず導入済み製品を`missing`へ誤投影する欠陥を、固定CLI・引数非再解釈・timeout/output上限を保つ共通command runnerで直し、12製品matrixを実機再送する
1j. [x] `agents-update`が追加する`/usr/local/bin`でWSLの正規npm global CLIをshadowし、Claude Code更新後versionを旧入口から読む欠陥を直す。検証済み`npm prefix -g`のbinを更新・version確認の同一入口にし、PATH shadowをfixtureと実host ledgerで閉じる
1k. [ ] registry公開版のThroughline／Spotter／aiterm-mcp／codex-sidecar native diagnosticsとdotagents v2 adapterのschema driftを、製品側正本とexact validatorを保ったまま同期し、main-serverのCaveat診断とGrok Build導入状態も分離して全host post-update gateをgreenにする
   - [x] aiterm-mcpのmanaged `GROK_HOME`でOAuth承認結果が一時homeへ取り残される欠陥を、Grok公式 `GROK_AUTH_PATH` 経路へ置換してreleaseする（完了正本: aiterm-mcp `docs/archive/14_grok-auth-path-plan.md`）
- [ ] 最終反証、全端末E2E、本番canary、rollback drillを完了し、本計画を`docs/archive/`へ退避している
     - [x] 製品repoでruntime-store高競合/hostile-input修正`c1a2623`、auth経路`ab11eb7`、長文PTY送信`42cf4af`、chunk直列化とstale-lock fail-closed`5c6b79a`を独立commitした。ローカル240/240、長文・別process送信10連続、tgz隔離MCP、Grok/Composer各2回の再認証なし`agent_done`、旧8-process条件の再反証P0/P1なしまで確認した
     - [x] `v0.12.3`を`52264c3`へ固定し、tag CI `29300067245`の8 test jobとTrusted Publishingをgreenにした。npm 0.12.3、GitHub Release、MCP Registry workflow `29300266525`、Registry `isLatest=true`、公開版MCP 10 tools＋Grok/Composer実smokeを確認。Mac正規CLIを0.12.3へ更新し、v1 reporterでBugHubへ送信後、`mac-kite/aiterm-mcp`が0.12.3・installed・compatible、outbox 0・ACK failure 0であることをreadbackした
1m. [ ] Throughline factory diagnosticsの製品修正を受け入れ、残るhost導入・readinessを全host gateで閉じる
   - [x] `events=ready`なのにsummary=`unverified`となるproducer矛盾を製品repoのcharacterization→修正→patch releaseで閉じた。Throughline `f928c13`、v0.6.3 tag `fc83ddf`、公開記録`fe8ea87`、focused 15/15を[ADR 0013](adr/0013-throughline-diagnostics-product-receipt.md)で受け入れた
   - [ ] main-serverへ正規hookを導入し、factory diagnosticsを再観測する（実host applyはH）
   - [ ] Macのhandoff readinessを実配布物で再観測する（実host scan/reportはR2 host receiptへ合流）
   - [x] FOX WSL2でv0.6.3以降のproducer出力を再観測し、旧`events=ready`／summary=`unverified`観測を解消する（実host scan/reportはR2 host receiptへ合流）
1n. [x] Windows共通command runnerのnpm shim解決を実物cmd-shim variantへ追従し、PATH／shimのfilesystem解決も5秒全体deadline内のkill可能helperへ隔離して、UNC・late spawn・悪意あるshimをfail-loudに拒否する
1o. [x] native diagnosticsを単一overall checkへ潰さずThroughline／Spotter／aiterm-mcpのcomponent別checkへ安全に投影し、report/BugHubでは`unverified`を保持する。gateはdefault-denyのまま、Spotterの人手trust、Throughlineのadvisory evidence/Claude connector、headless aitermのPTY観測不能という完全tupleだけをnonblockingにする
1p. [ ] Windows factory ACLのローカル修正を受け入れ、FOX Windows native実機receiptで閉じる（2026-07-18現況: scan→enqueue→flush→Task Scheduler dry-run/apply/実火は完了済み。**post-update gateがfail 3**＝claude-code/codex-cli/grok-buildのledger `post_gate_failed`残留とcaveat/aiterm-mcp/codex-sidecarのdiagnostics `unverified`（1k drift）が先決のため未チェックのまま保持）
   - [x] toolchain ledger、v2 schedule runner、Task Scheduler control artifactをreporter本体と同じ`Set-Acl -LiteralPath`系current-SID-only契約へ統一した。ACL済みtemporary ledgerのrename後再適用を除去し、PowerShell失敗を固定reasonでfail-loudにした（`39fba73`、focused 31/31、[ADR 0014](adr/0014-windows-factory-acl-local-receipt.md)）
   - [ ] FOX Windows nativeでledger生成→post-update scan/gate/enqueue/flush→scheduler dry-run/applyを実機再確認する（credential／実host applyはH）
1q. [ ] Windows npm shim resolverのローカル修正を受け入れ、FOX Windows native実機receiptで閉じる
   - [x] 現行npm global `.cmd`の2スペース`_prog`と旧1スペース形をexact allowlistへ固定し、PATHEXT許可外候補を実行せず`.exe`／検証済みnpm `.cmd`だけへ限定した。悪意あるshim拒否、5秒全体deadline、`node_modules`内regular-file／realpath検証を維持した（`5f781a8`、`5479a73`、focused 5/5、[ADR 0015](adr/0015-windows-npm-shim-local-receipt.md)）
   - [ ] FOX Windows nativeの実配布版で12製品scan／post-update gateを再送する（実host scan/reportはH/R2）
1r. [ ] Codex SidecarのWindows npm `.cmd`診断修正を実配布版でFOX Windows nativeへ反映し、12製品scan→post-update gate→enqueue/flush→Task Scheduler dry-run/applyを再送する
   - [x] 0.3.6の`factory-diagnostics`が`spawn("codex-sidecar-mcp")`を直呼びし、MCP initialize可能なのに`packageVersions=unverified`へ誤投影する欠陥を製品側で根治した。固定command・引数非再解釈・timeout・出力上限・fail-loudを維持したWindows回帰test、pack/install smoke、独立反証を通し、Codex Sidecar 3 packageをnpm `0.3.7`、tag `v0.3.7`、global CLI `0.3.7`へ公開・検証した。実diffとfocused 18/18は[ADR 0017](adr/0017-codex-sidecar-windows-mcp-product-receipt.md)で受け入れた
   - [ ] FOX Windows nativeの実配布版で12製品scan→post-update gate→enqueue/flush→Task Scheduler dry-run/applyを再送する
1s. [x] 2026-07-18完了（両sub-item実証済み）: Macの対話shellではBugHubへHTTP 200なのにuser launchd配下だけLocal Network Privacyで遮断される実機差を、Apple TN3179の管理端末向けCIDR例外で解消する。現在の実経路`en5`（USB Ethernet）だけを対象に、root所有のCurrentUser defaults domainをLocal Network Privacyがsystem-wide設定として特別に消費する契約どおり、`AllowedEthernetLocalNetworkAddresses`へ`192.168.1.2/32`を追加し、Wi-Fi側は変更しない。再起動後にlaunchd childの実送信canaryを通し、rollbackは対象entry削除＋再起動とする
   - [x] `sudo defaults write`後、`/var/root/Library/Preferences/com.apple.network.local-network.plist`のarray値を管理者権限で実読し、`/Library/Preferences`と通常user domainが不存在であるAppleの特殊保存契約を独立反証込みで確認した。残りはMac再起動後の非root launchd child canary
   - [x] 2026-07-18消化: Mac再起動（uptime 1 day）後の非root launchd child（`launchctl kickstart gui/501/com.kite.factory-reporter`）から本番BugHubへの実送信が成功（flush sent=1・ack_failed=0）し、CIDR例外の再起動後有効化を実証した
2. [x] 2026-07-18消化: `retire-oracle mac-kite`→`--oracle-retired`最終v1 snapshot（report `62bbdb71`、server実査でoracle=`not_applicable`）→config endpointをv2へ→v2初回12製品full snapshot（report `b4e770cd`、`factory_v2_observations` 12行・`factory_v2_current`反映を実査）→launchd dry-run→apply→launchd実contextのscheduled run実火（post_gate success）→state 0700確認。uninstall確認は2a drillで実施
2a. [x] 2026-07-18消化: v2 scheduler uninstall dry-run→apply（outbox 0保持）→config v1化→`restore-oracle`→v1 scheduler install dry-run→apply→launchd実contextでv1 full scan（oracle観測込み10330 bytes）送信受理→`retire-oracle`→`--oracle-retired`最終snapshot（report `75e82296`）受理→config v2化→v1 scheduler撤去→v2 scheduler apply→v2 scheduled run受理。oracle v1履歴8件保持・oracle open issue 0・v2 current missing 0で二重化なしを実査
3. [x] main-server client: Hでtoken/config opt-in → Fでscheduler未登録のmanual v2受理、BugHub自身を含むコア9＋基盤CLI 3の全12管理製品とrevision attestationを確認 → cron dry-run/apply → scheduled runを確認
4. [x] FOX WSL2: Hでtoken/config opt-in → Fでscheduler未登録のread-only scan/preview/enqueue/flush、outbox/再送を確認 → cron dry-run/apply → 実火・uninstall・state権限を確認（`fox-wsl`直SSHのbanner timeoutは未解決の別blockerとして残し、Windows hostの正規`wsl.exe -d Ubuntu-26.04`入口でrolloutを実施）
5. [x] 2026-07-18消化: token/config opt-in済みを確認（endpoint v2・host.id=`windows-workstation`でWSLと非混同）→manual scan/preview/enqueue/flush green（report `64fab75a`・missing 0・sent=1）→Task Scheduler dry-run→apply→`schtasks /Run`実火（LastTaskResult=0・report再生成・outbox 0）→uninstall（Get-ScheduledTask消失）→再apply。本番`/readyz`は全check `ready`へ回復（factory_ingest stale解消）
6a. [x] 2026-07-18消化（観測可能範囲）: 直前申告のうえ本番BugHub containerを12:21:39〜12:22:12 JSTの**33秒**停止（compose stop -t 5→start、DB・他アプリ無変更）。停止中のMac reporter flushは非0・outbox保持1件・dead-letter 0、復旧後flushでsent=1。`/readyz`全check ready回復。servermanager issueの新規open/reopen 0、external-eventの新規発生0（pending 3件はすべて7/13〜今日10:46の既存未ack event）を実査。60秒ticker間隔>45秒windowなので停止を観測するtickは構造上最大1回＝2連続failure契約に達し得ない。**carry over**: Pi5内部の未trigger observation件数・healthy tick後のstate消去・Discord不着の直接確認は、逆向きSSH鍵が無くPi5内部状態へアクセス不能（ServerManager AGENTS.md 2026-06-21実機差分が正）のため、オーナーのPi5直接確認または逆向き鍵設置（H）後の再観測へ委ねる
6b. [x] 2026-07-18消化: オーナー指示でFOX WSL経由の既存鍵からMac/main-serverの公開鍵をPi5へ登録し直接経路を確立後、直前申告のうえ実施。Pi5一時state＋隔離`XDG_STATE_HOME`のdriverでrun(deps)を駆動し、synthetic transport failure 2回→trigger（Discord実alert）→connector open(seq1)→**修理後のv2 report搬送でBugHub accepted・issue open(high/new)・隔離store ack=1**→実`/readyz`復旧run→Discord実success→resolve(seq2)→resolve搬送でissue `resolved`・ack=2→最終runでbridge state event消去（`{}`実査）→隔離state/driver全削除。canary fingerprint `83b333…`は本番storeに不存在＝reopen不能を構造で確認
- [x] post-update gateと定期scanの頻度・timeout・通知cooldownを確定
- [x] 製品追加/削除/第三者化/所有移管の手順をAGENTS/READMEへ正典化
- [x] BugHub schema major変更時のclient互換matrixを追加
- [ ] `make ci`、各repo full gate、H承認済みの全端末E2E・rollback drill、最終反証を通す
- [ ] repo単位でpushし、計画をarchiveする
