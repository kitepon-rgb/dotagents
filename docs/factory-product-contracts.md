# 工場管理11製品＋基盤toolchain 3製品の有限契約台帳

更新日: 2026-07-25。正本はdotagents。host期待状態は [factory-host-product-matrix.md](factory-host-product-matrix.md)、wire契約はServerManager `bughub/FACTORY_INTEGRATION.md`。

## 共通境界

- 現役管理対象は自作コア10製品（Caveat、Throughline、Spotter、Lattice、gpt-connector、aiterm-mcp、codex-sidecar、AIShell、Observer、ServerManager）と、公開CLIだけをblack-box管理する第三者製品MarkItDownの計11製品である。AIShellはmacOS arm64、ObserverはmacOS専用で、非対応hostは構造的`unsupported`とする。LatticeはCodegraphの正式後継であり独立Codegraphを現役の製品・依存・配線へ含めない。Claude Code CLI、Codex CLI、Grok Buildは基盤toolchain、Oracleはv1互換・rollback専用である。
- 現役契約はLattice `docs/01_integration-package.md`と本台帳・[factory-host-product-matrix.md](factory-host-product-matrix.md)が正、導入経緯は[docs/archive/plan_lattice-factory-integration.md](archive/plan_lattice-factory-integration.md)と[docs/archive/plan_observer-core-integration.md](archive/plan_observer-core-integration.md)が正。
- コア製品の修理・機能追加はcommit/pushで止めず、version bump→publish→対象端末へのglobal install→公開後smoke→公開証跡記録までを同一waveで完遂する。release gateは「publish対象は既定ブランチの祖先だけ」を機械gateとして実装したものだけを合格とし、AIShellの`scripts/verify-release-commit.mjs`＋`prepublishOnly`をreference実装とする。gate未実装の製品は、次にrelease作業を行うwaveで同時に導入する。
- 工場の再現欠陥では、データ損失、security・認可・秘密漏洩、公開契約・履歴破壊、回復不能、現在のcritical pathまたはPhase受入を塞ぐP0/P1だけを即時修理する。非criticalは最小再現・影響・所有repoを既存planのmaintenance queueへ一度記録し、通常TODO後かつfull regression/Phase監査前のmaintenance wave一回で重複統合、再現確認、repo別修理、focused/related gate、repo別commitまで閉じる。欠陥ごとのplan、Control、ADR、独立監査、receiptは作らない。第三者製品または基盤toolchain本体が原因かつ修理所有者である欠陥はdotagentsのToDo、maintenance queue、H承認待ちへ登録せず範囲外とし、dotagents所有adapter・設定生成・互換projectionの欠陥は範囲内とする。権限外変更、コア製品publish、本番deploy、credential/login、意図的障害試験は理由と必要条件を記録しH承認待ちとしてcarry overする。
- 各製品のhost/connector期待状態は本台帳へ複製せず、[factory-host-product-matrix.md](factory-host-product-matrix.md)の親別connector matrixだけが持つ。
- adapterは下記の正規入口だけをread-onlyで使う。未実装native diagnosticsを内部stateの推測で補わない。
- `latest_version`、update/compatibility、state schema/migration、runtime errorは製品所有者の正規診断が出るまで省略または`unverified`。`unsupported`/`unverified`/`skipped`をpassへ丸めない。
- 第三者製品のfork、patch、`node_modules`改変、内部DB読解を禁止。自作製品もdotagentsがDB/schemaを直接解釈しない。
- reportへsecret、credential、prompt、session/file本文、生log、絶対pathを出さない。

## 台帳

### `caveat`

- 所有/修正先: 自作 / `kitepon-rgb/Caveat`。version入口: `caveat --version`。
- diagnostics/state正本: `caveat factory-diagnostics --json`（schema `caveat.native_factory_diagnostics.v1`）。Caveat repoのown DB/schema/migration、sync、connectorをread-onlyで返す。公開runtime errorは`caveat runtime-errors snapshot --after-cursor 0 --limit 256 --json`／`ack <cursor> --json`。
- 現adapter: native JSONをexact allowlistで検証し、`ready`＋exit 0をpass/compatible、`not_ready`＋非0を固定fingerprintのfail/incompatible、`unverified`＋非0・schema不正をunverifiedへ射影する。DB schema/migrationと、明示opt-inされた公開runtime error snapshot/ackを接続済み。
- 表現/禁止: 診断不能は`unverified`、CLI不在は`missing`。Caveat DB直接queryやhook推測は禁止。

### `throughline`

- 所有/修正先: 自作 / `kitepon-rgb/Throughline`。version入口: `throughline --version`。
- diagnostics/state正本: `throughline factory-diagnostics --json`（schema `throughline.native_factory_diagnostics.v1`）。DB schema/migration、connector、capture/restore/handoffをread-onlyで返す。
- 現adapter: native JSONのversion、database schema/migration、overallと、明示opt-inされた公開runtime error snapshot/ackを接続済み。製品診断が示すClaude connector `unverified`等をgreenへ丸めない。
- 表現/禁止: 正規JSON診断なしは`unverified`。session本文送信、破壊的restore、`.agents`直接解釈は禁止。

### `spotter`

- 所有/修正先: 自作 / `kitepon-rgb/Spotter`。version入口: `spotter --version`。
- diagnostics/state正本: `spotter diagnostics factory`（schema 1.0）。既存doctor inspectorとtool DB validatorを再利用するread-only JSON。
- 現adapter: native JSONのversion、marker schema、overallと、明示opt-inされた公開runtime error snapshot/ackを接続済み。
- 表現/禁止: 対象外projectは`not_applicable`、対象で診断不能は`unverified`。全project自動activation、tool DB直接読解は禁止。

### `lattice`

- 所有/修正先: 自作 / `kitepon-rgb/Lattice`。version入口は`lattice --version`（`factory-diagnostics`のpackage versionと一致）。
- project工程discovery正本: `lattice status --json`（schema `lattice.project_status.v1`、state `uninitialized|ready|active_run|invalid`、canonical store、active plan/run、`can_create_plan`、`next_action`）。`.lattice/`の有無を接続判定へ使わず、invalidをMarkdownへfallbackしない。
- diagnostics/state正本: `lattice factory-diagnostics --json`と`lattice runtime-errors snapshot|ack ... --json`。run store、sensor index、runtime error storeはLatticeが所有し、dotagentsは直接解釈しない。コード構造面は同梱sensorと`lattice-mcp`だけから提供する。
- 現adapter: native JSONをexact allowlistで検証し、現行wire v6の正式製品`lattice`へ射影する。BugHubは4現役hostをwire v6へenroll済み。sensorのindex不在・破損・version不整合はtyped failure／guidanceであり、外部Codegraphへfallbackしない。
- runtime dispatch面（0.12.21〜0.12.26で公開）: request契約は`plan compile --schema --json`、executor adapter登録は`run adapter register|list`、参照controllerは配布binの`lattice-scripted-adapter`。`run_request.v1`・`executor_packet.v1`・`executor_receipt.v1`・`runtime_adapter_registration_input.v1`のJSON Schemaは配布物に同梱される。dotagentsはこれらをexact validationで消費し（`lib/orchestrate/lattice-receipt-projection.mjs`・`lattice-control-saga.mjs`）、schemaを自前で再定義しない。実dispatchの所有者はhostであり、初回駆動が効くのは配布binをlaunch argvへ明示したmanaged runだけである。
- TODO↔runtime相関: `lattice todo bindings [--plan <key>] --json`（`lattice.todo_binding_projection.v1`）。`compile_binding`から`compiled_plan_digest`→`runtime_plan.v1`→`executor_packet.v1`→`executor_receipt.v1`を辿る。status面の現行wireは`todo_status_result.v6`（`audit_pending`に加えて`plan_notes`／`coordination`／`parallel_candidates`の工程3欄を持つ。監査待ちも工程に属する義務も、statusが答える——ADR 0159・0160）。dotagents側の消費者は`lib/orchestrate/lattice-projection.mjs`・`lib/orchestrate/lattice-control-saga.mjs`・`lib/lattice-hook.py`の3つで、いずれもexact key-setでv6だけを受理する。Control manifestの`external_source.contract_version`は束縛時点の履歴なので、照合はv4・v5・v6を受理する（観測schemaとは別軸。過去版は消さない）。
- 互換: `codegraph_*` MCP tool名は入力互換名としてのみ残し、provider／sensor_owner=`lattice`とLattice系列versionを返す。独立Codegraph package、PATH command、MCP登録、daemon、SDK依存は禁止。
- 表現/禁止: 生message・絶対path・repo/prompt内容をreportへ転記しない。診断のためにindex生成・run実行・provider起動を行わない。

### `markitdown`

- 所有/修正先: 第三者 / `kitepon-rgb/dotagents`外付けadapter。version入口: `markitdown --version`。
- diagnostics/state正本: 一時local text fixtureを`markitdown <file>`で変換しstdout byte数を確認。永続state/schema/migrationは契約しない。
- 対応version: stable `>=0.1.0 <0.2.0`（build metadata付きは許容、prereleaseは未検証で範囲外）。範囲外は`installed`を保った`local_fixture=unsupported:upstream_version_unsupported`、version取得不能・形式drift・CLI不在は`unverified:version_unverified`としてfixture診断を実行しない。
- 現adapter: 対応versionだけlocal fixtureを実行する。fixture診断の失敗または空出力は`local_fixture=unverified`であり、version範囲外の`unsupported`とは区別する。latest/update/runtime errorは未実装。
- 禁止: URL/JSレンダリングをhealth扱い、rc=0だけでpass。

### `gpt-connector`

- 所有/修正先: 自作 / `gpt-connector`。version入口: `gpt-connector --version`。
- diagnostics/state正本: versioned native factory diagnosticsとproduct-owned runtime error snapshot。dotagentsはChatGPT会話・job stateを直接読解しない。
- update/compatibility: 製品の正規update・diagnosticsでinstalled/latest、model/effort、MCP readinessを観測する。caller既知slugだけを受け、unknown slugを推測しない。
- 禁止: Oracle/OpenAI APIへの暗黙fallback、prompt/response/file/conversation ID/絶対pathの送信、Oracle profileの流用。timeout後は sessions で回収する。

### 基盤toolchain

- `claude-code`、`codex-cli`、`grok-build`はコア製品ではないが、version・update結果・互換性を固定product IDで管理する。
- Claude/Codexはnpm `@latest`、Grok Buildは正規self-updateを用いる。失敗を他製品の成功で隠さず、第三者本体のpatch・内部状態読解・認証変更・agent起動はしない。
- Oracleはv1互換・手動rollbackの履歴対象としてのみ残し、新規契約台帳・通常connector・更新対象には含めない。

### `aiterm-mcp`

- 所有/修正先: 自作 / `kitepon-rgb/aiterm-mcp`。version入口: native MCP `diagnostics` responseのpackage version。
- diagnostics/state正本: stdio MCP initialize後のread-only `diagnostics` tool（schema `aiterm-mcp.factory-diagnostics.v1`）。PTY一覧は件数だけ、vendor依存は実行可能性だけを返す。
- 現adapter: stdio MCP initialize→`diagnostics`と、明示opt-inされた公開runtime error snapshot/ackを接続済み。tmux不能やschema driftは`unverified`、native `not_ready`は固定fingerprintのfailへ写像する。診断toolは次回製品releaseまで現行registry版0.12.1には未収録。
- 禁止: PTY/agent起動をhealth扱い。native Windowsの`agent_done`非対応は`unsupported`。

### `codex-sidecar`

- 所有/修正先: 自作 / `kitepon-rgb/codex-sidecar`。version入口: `codex-sidecar factory-diagnostics --project <scan cwd>` の `factoryReadiness.packageVersions.packages.cli`。
- diagnostics/state正本: `factory-diagnostics` の read-only JSON（top-level `status`、`factoryReadiness.schemaVersion="1"`、`overall`、`packageVersions.status`と3 package version整合、result schema/workflow/preset/model policy/read-only dry-run readiness）。`ready`は`status:ok`かつexit 0、`not_ready`/`unverified`は`status:failed`かつ非0。`unverified`はpackage情報を省略した最小shapeも正規。実agent/Codexを起動しない。
- 現adapter: native JSONをschema allowlistで検証し、`ready`をpass/compatible、`not_ready`を固定fingerprintのfail/incompatible、`unverified`・schema不正・CLI不在をunverifiedへ射影する。installed versionは整合済みのCLI package versionだけを採用し、明示opt-inされた公開runtime error snapshot/ackも接続済み。
- 表現/禁止: raw output、absolute path、prompt/context/file内容、preset名、token/env/log/result本文をreportへ転記しない。実agent起動をhealth扱いにしない。

### `servermanager`

- 所有/修正先: 自作 / `kitepon-rgb/ServerManager`。version入口: loopback readinessのpackage versionとbuild/deploy source revision。
- diagnostics/state正本: 外部runnerのBugHub health、poll/ingest鮮度、DB migration、container/source一致、Pi5監視。SQLite migration/Pi5 runtimeはServerManager所有。
- 現adapter: server profileではloopback `/readyz`とdeploy revision manifestを外部probeで照合し、DB/schema/pull/ingest/delivery/revisionの固定checkへ投影する。Pi5のdurable external eventは公開connector経由でsnapshot/ackし、非serverは`not_applicable`。
- 禁止: BugHub自己申告だけで合格、dotagentsからDB直接読解。

### `aishell`

- 所有/修正先: 自作 / `kitepon-rgb/aishell`。version入口はMCP initializeの`serverInfo.version`と`factory_diagnostics.product.version`の一致で、Swift側`AIShellProduct.version`が単一正本、package.jsonとのdriftは`verify-npm-package.mjs`が検出する。
- diagnostics/state正本: `AISHELL_TOOL_PROFILE=factory`でだけ公開されるread-only MCP `factory_diagnostics`（schema `aishell.native_factory_diagnostics.v1`）。platform、runtime configuration schema/migration、操作readiness、MCP、管理アプリbundleを返す。許可root・Git worktreeは件数だけで、path、activity、file本文、process argumentを返さない。
- 公開面の分離: 対話hostは`AISHELL_CAPABILITY_SET=expanded-v1`の高密度11 tool面（製品が候補面と位置づける面であり、上流の変更に追従する）へ登録し、工場診断はfactory profileへ隔離する。既定7／expanded 11／full 29／legacy 25のどの一覧にも`factory_diagnostics`は現れず、profile外からは呼べない。factory profileとcapability setの併用は`FACTORY_PROFILE_CAPABILITY_SET_UNSUPPORTED`で拒否され、fallbackしない。
- runtime schema: `aishell.runtime_configuration.v2`。旧単一`allowedRootPath`は製品側のcompatible-on-readで解釈し、dotagentsは`runtime.json`や`activity.jsonl`を直接読まない。
- update/rollback: Apple Silicon Macだけ`@quolu/aishell@latest`をglobal更新し、package内`AIShell.app`と`aishell-mcp`を同版で扱う。rollbackは旧npm versionへ戻してMCP processを再起動する。診断は`0.4.1`以降で公開されており、それ以前のversionは`unverified`になる。
- 起動形式: adapterもMCP hostも`aishell-mcp`をbare command名で起動する。`verify-install`は対応Mac上のClaude/Codex両hostについて、user/enable状態、bare command、`AISHELL_CAPABILITY_SET=expanded-v1`、接続状態を検証し、CLI存在だけでは合格にしない。製品側はloaded executable pathからAIShell.app bundleを解決し、この起動形式をrelease gateが覆う。完全修飾pathでだけ検証してbare名起動を未検証のまま出さない。
- wire: v2/v3/v4固定集合へ後付けせず、ServerManager optional sourceを先行し、Lattice wire v4完了後のwire v5で正式enroll済み。wire v6でも同じ製品契約を維持する。
- 禁止: 非対応hostへの導入、shell/AppleScript/JXA fallback、`runtime_status`のpathをfactory reportへ転記、pauseを製品故障へ丸めること。

### `observer`

- 所有/修正先: 自作 / `kitepon-rgb/Observer`。version入口は`observer diagnostics`の`manifest.version`とnpm package versionの一致。
- diagnostics/state正本: `observer diagnostics`（schema `observer.product_diagnostics.v1`）と`observer-mcp --diagnostics`（schema `observer.mcp_diagnostics.v1`）。package manifest、instruction、bin integrity、Node runtime、platformをread-onlyで返す。
- 現adapter: macOSだけ正規diagnosticsをexact allowlistで検証し、全check passを`installed / compatible`へ射影する。server / WSL / Windows nativeはCLI探索や内部state推測をせず`not_applicable / unsupported`にする。
- update/rollback: macOSで`@quolu/observer@latest`をglobal更新する。公開済みversionをunpublishせず、必要時はdeprecateしてglobal installを旧版へ戻す。
- wire: v5固定13製品を変更せず、wire v6の固定14製品目としてserver-first、dual-run、4 host cutover済み。
- 禁止: watch/session/prompt/path/内部DBをfactory reportへ送信、非対応hostを`missing`扱い、ServerManagerからObserver内部stateを修復。
