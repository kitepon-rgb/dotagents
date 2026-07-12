# 工場9製品の有限契約台帳

更新日: 2026-07-13。正本はdotagents。host期待状態は [factory-host-product-matrix.md](factory-host-product-matrix.md)、wire契約はServerManager `bughub/FACTORY_INTEGRATION.md`。

## 共通境界

- adapterは下記の正規入口だけをread-onlyで使う。未実装native diagnosticsを内部stateの推測で補わない。
- `latest_version`、update/compatibility、state schema/migration、runtime errorは製品所有者の正規診断が出るまで省略または`unverified`。`unsupported`/`unverified`/`skipped`をpassへ丸めない。
- 第三者製品のfork、patch、`node_modules`改変、内部DB読解を禁止。自作製品もdotagentsがDB/schemaを直接解釈しない。
- reportへsecret、credential、prompt、session/file本文、生log、絶対pathを出さない。

## 台帳

### `caveat`

- 所有/修正先: 自作 / `kitepon-rgb/Caveat`。version入口: `caveat --version`。
- diagnostics/state正本: Caveat repoのown DB/schema/migration、sync、hook/MCP。製品側machine-readable入口が確定するまでadapterは接続しない。
- host/connector: 全4 host required、Claude/Codex MCP＋hook required。
- 現adapter: presenceとversionのみ。native diagnostics、latest、state/migration、runtime errorは未実装。
- 表現/禁止: 診断不能は`unverified`、CLI不在は`missing`。Caveat DB直接queryやhook推測は禁止。

### `throughline`

- 所有/修正先: 自作 / `kitepon-rgb/Throughline`。version入口: `throughline --version`。
- diagnostics/state正本: `throughline factory-diagnostics --json`（schema `throughline.native_factory_diagnostics.v1`）。DB schema/migration、connector、capture/restore/handoffをread-onlyで返す。
- host/connector: 全4 host required、Claudeはhook/CLI、Codexはhook/skill/CLI required。
- 現adapter: native JSONのversion、database schema/migration、overallを接続済み。runtime errorは未実装。製品診断が示すClaude connector `unverified`等をgreenへ丸めない。
- 表現/禁止: 正規JSON診断なしは`unverified`。session本文送信、破壊的restore、`.agents`直接解釈は禁止。

### `spotter`

- 所有/修正先: 自作 / `kitepon-rgb/Spotter`。version入口: `spotter --version`。
- diagnostics/state正本: `spotter diagnostics factory`（schema 1.0）。既存doctor inspectorとtool DB validatorを再利用するread-only JSON。
- host/connector: 全4 host required。明示install済み対象projectだけClaude/Codex hook required。
- 現adapter: native JSONのversion、marker schema、overallを接続済み。runtime errorは未実装。
- 表現/禁止: 対象外projectは`not_applicable`、対象で診断不能は`unverified`。全project自動activation、tool DB直接読解は禁止。

### `codegraph`

- 所有/修正先: 第三者 / `kitepon-rgb/dotagents`外付けadapter。version入口: `codegraph --version`。
- diagnostics/state正本: 既存indexの`codegraph status --json`を試行。現CLI helpは`status`のみを保証し、JSONが得られた場合だけ`initialized`を判定する。`.codegraph/`はupstream所有。
- host/connector: 全4 host required、Claude/Codex MCP required。
- 対応version: stable `>=1.4.0 <1.5.0`（build metadata付きは許容、prereleaseは未検証で範囲外）。範囲外は`installed`を保った`index=unsupported:upstream_version_unsupported`、version取得不能・形式drift・CLI不在は`unverified:version_unverified`として診断を実行しない。
- 現adapter: 対応versionだけ診断を実行し、`initialized:true`なら`index=pass`、falseなら`skipped:not_indexed`、診断出力が非JSONまたはshape非対応なら`index=unverified`。version範囲外の`unsupported`とは区別する。
- 禁止: `codegraph init`/index自動作成、内部index解析。

### `markitdown`

- 所有/修正先: 第三者 / `kitepon-rgb/dotagents`外付けadapter。version入口: `markitdown --version`。
- diagnostics/state正本: 一時local text fixtureを`markitdown <file>`で変換しstdout byte数を確認。永続state/schema/migrationは契約しない。
- host/connector: 全4 host required、Claude/Codex CLI required。
- 対応version: stable `>=0.1.0 <0.2.0`（build metadata付きは許容、prereleaseは未検証で範囲外）。範囲外は`installed`を保った`local_fixture=unsupported:upstream_version_unsupported`、version取得不能・形式drift・CLI不在は`unverified:version_unverified`としてfixture診断を実行しない。
- 現adapter: 対応versionだけlocal fixtureを実行する。fixture診断の失敗または空出力は`local_fixture=unverified`であり、version範囲外の`unsupported`とは区別する。latest/update/runtime errorは未実装。
- 禁止: URL/JSレンダリングをhealth扱い、rc=0だけでpass。

### `oracle`

- 所有/修正先: 第三者 / `kitepon-rgb/dotagents`外付けadapter。version入口: `oracle --version`。
- diagnostics/state正本: `oracle doctor --providers --json`を試行しobject JSONだけを機械可読結果として扱う。認証/browser runtimeはconnector側状態。
- host/connector: 全4 host required、Claude MCP、Codex skill/MCP required。browser runtime非対応connectorは`unsupported`。
- 対応version: stable `>=0.16.0 <0.17.0`（build metadata付きは許容、prereleaseは未検証で範囲外）。範囲外は`installed`を保った`doctor=unsupported:upstream_version_unsupported`、version取得不能・形式drift・CLI不在は`unverified:version_unverified`としてdoctorを実行しない。
- 現adapter: 対応versionだけdoctor JSON shapeを実行する。exit 0のobjectはpass、機械可読なprovider未準備は`unverified:provider_not_ready`、診断出力の非JSON/shape不正は`doctor=unverified`であり、version範囲外の`unsupported`とは区別する。認証詳細、latest、runtime errorは未実装。
- 禁止: `consult`、prompt送信、人間向け出力解析。

### `aiterm-mcp`

- 所有/修正先: 自作 / `kitepon-rgb/aiterm-mcp`。version入口: native MCP `diagnostics` responseのpackage version。
- diagnostics/state正本: stdio MCP initialize後のread-only `diagnostics` tool（schema `aiterm-mcp.factory-diagnostics.v1`）。PTY一覧は件数だけ、vendor依存は実行可能性だけを返す。
- host/connector: 全4 host required。Claude MCP、CodexはGrok/Composer用MCPのみ。
- 現adapter: stdio MCP initialize→`diagnostics`を接続済み。tmux不能やschema driftは`unverified`、native `not_ready`は固定fingerprintのfailへ写像する。runtime errorは未実装。診断toolは次回製品releaseまで現行registry版0.12.1には未収録。
- 禁止: PTY/agent起動をhealth扱い、Codex親から入れ子Codex。native Windowsの`agent_done`非対応は`unsupported`。

### `codex-sidecar`

- 所有/修正先: 自作 / `kitepon-rgb/codex-sidecar`。version入口: `codex-sidecar factory-diagnostics --project <scan cwd>` の `factoryReadiness.packageVersions.packages.cli`。
- diagnostics/state正本: `factory-diagnostics` の read-only JSON（top-level `status`、`factoryReadiness.schemaVersion="1"`、`overall`、`packageVersions.status`と3 package version整合、result schema/workflow/preset/model policy/read-only dry-run readiness）。`ready`は`status:ok`かつexit 0、`not_ready`/`unverified`は`status:failed`かつ非0。`unverified`はpackage情報を省略した最小shapeも正規。実agent/Codexを起動しない。
- host/connector: 全4 host required。Claude MCP required、Codex親connectorはforbidden。
- 現adapter: native JSONをschema allowlistで検証し、`ready`をpass/compatible、`not_ready`を固定fingerprintのfail/incompatible、`unverified`・schema不正・CLI不在をunverifiedへ射影する。installed versionは整合済みのCLI package versionだけを採用する。runtime error store/telemetryは未実装。
- 表現/禁止: raw output、absolute path、prompt/context/file内容、preset名、token/env/log/result本文をreportへ転記しない。実agent起動をhealth扱い、Codex親connector登録は禁止。

### `servermanager`

- 所有/修正先: 自作 / `kitepon-rgb/ServerManager`。version入口: repoの`package.json`/source revision（現adapter未接続）。
- diagnostics/state正本: 外部runnerのBugHub health、poll/ingest鮮度、DB migration、container/source一致、Pi5監視。SQLite migration/Pi5 runtimeはServerManager所有。
- host/connector: main-serverのみrequired、他3 hostは`not_applicable`。親connectorはnot_applicable。
- 現adapter: server profileでもempty product=`unverified`、非server=`not_applicable`。version/health/migration/runtime errorは未実装。
- 禁止: BugHub自己申告だけで合格、dotagentsからDB直接読解。
