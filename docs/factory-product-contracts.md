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
- diagnostics/state正本: repo所有の`throughline doctor`等、state schema/DB migration。現adapterは未接続。
- host/connector: 全4 host required、Claudeはhook/CLI、Codexはhook/skill/CLI required。
- 現adapter: presenceとversionのみ。capture/restore/handoff、hook、state、runtime errorは未実装。
- 表現/禁止: 正規JSON診断なしは`unverified`。session本文送信、破壊的restore、`.agents`直接解釈は禁止。

### `spotter`

- 所有/修正先: 自作 / `kitepon-rgb/Spotter`。version入口: `spotter --version`。
- diagnostics/state正本: `spotter doctor`、`spotter diagnostics logs --json`、`spotter status`、marker/catalog/tool DB。現adapterは未接続。
- host/connector: 全4 host required。明示install済み対象projectだけClaude/Codex hook required。
- 現adapter: presenceとversionのみ。marker/catalog/hook/Throughline context/runtime errorは未実装。
- 表現/禁止: 対象外projectは`not_applicable`、対象で診断不能は`unverified`。全project自動activation、tool DB直接読解は禁止。

### `codegraph`

- 所有/修正先: 第三者 / `kitepon-rgb/dotagents`外付けadapter。version入口: `codegraph --version`。
- diagnostics/state正本: 既存indexの`codegraph status --json`を試行。現CLI helpは`status`のみを保証し、JSONが得られた場合だけ`initialized`を判定する。`.codegraph/`はupstream所有。
- host/connector: 全4 host required、Claude/Codex MCP required。
- 現adapter: version、`initialized:true`なら`index=pass`、falseなら`skipped:not_indexed`、非JSON/非対応は`unverified`。
- 禁止: `codegraph init`/index自動作成、内部index解析。

### `markitdown`

- 所有/修正先: 第三者 / `kitepon-rgb/dotagents`外付けadapter。version入口: `markitdown --version`。
- diagnostics/state正本: 一時local text fixtureを`markitdown <file>`で変換しstdout byte数を確認。永続state/schema/migrationは契約しない。
- host/connector: 全4 host required、Claude/Codex CLI required。
- 現adapter: versionとlocal fixtureのみ。latest/update/runtime errorは未実装。失敗/空出力は`unverified`。
- 禁止: URL/JSレンダリングをhealth扱い、rc=0だけでpass。

### `oracle`

- 所有/修正先: 第三者 / `kitepon-rgb/dotagents`外付けadapter。version入口: `oracle --version`。
- diagnostics/state正本: `oracle doctor --providers --json`を試行しobject JSONだけを機械可読結果として扱う。認証/browser runtimeはconnector側状態。
- host/connector: 全4 host required、Claude MCP、Codex skill/MCP required。browser runtime非対応connectorは`unsupported`。
- 現adapter: versionとdoctor JSON shapeだけ。exit 0のobjectはpass、機械可読なprovider未準備は`unverified:provider_not_ready`、非JSONは`unverified`。認証詳細、latest、runtime errorは未実装。
- 禁止: `consult`、prompt送信、人間向け出力解析。

### `aiterm-mcp`

- 所有/修正先: 自作 / `kitepon-rgb/aiterm-mcp`。version入口: `aiterm-mcp --version`が安定するまでpackage版を代用しない。
- diagnostics/state正本: MCP initialize、read-only `pty_list`、vendor prerequisite診断（製品repo所有、現adapter未接続）。
- host/connector: 全4 host required。Claude MCP、CodexはGrok/Composer用MCPのみ。
- 現adapter: `aiterm-mcp --version`抽出だけ。非出力なら`unverified`。MCP/PTY/vendor/runtime errorは未実装。
- 禁止: PTY/agent起動をhealth扱い、Codex親から入れ子Codex。native Windowsの`agent_done`非対応は`unsupported`。

### `codex-sidecar`

- 所有/修正先: 自作 / `kitepon-rgb/codex-sidecar`。version入口: `codex-sidecar-mcp --version`または製品が明示するCLI。
- diagnostics/state正本: `codex-sidecar diagnostics --project …`、dry-run、result schema/model policy（製品repo所有、現adapter未接続）。
- host/connector: 全4 host required。Claude MCP required、Codex親connectorはforbidden。
- 現adapter: `codex-sidecar-mcp --version`抽出だけ。package整合、diagnostics/dry-run/schema/policy/runtime errorは未実装。
- 表現/禁止: 診断不能は`unverified`。実agent起動をhealth扱い、Codex親connector登録は禁止。

### `servermanager`

- 所有/修正先: 自作 / `kitepon-rgb/ServerManager`。version入口: repoの`package.json`/source revision（現adapter未接続）。
- diagnostics/state正本: 外部runnerのBugHub health、poll/ingest鮮度、DB migration、container/source一致、Pi5監視。SQLite migration/Pi5 runtimeはServerManager所有。
- host/connector: main-serverのみrequired、他3 hostは`not_applicable`。親connectorはnot_applicable。
- 現adapter: server profileでもempty product=`unverified`、非server=`not_applicable`。version/health/migration/runtime errorは未実装。
- 禁止: BugHub自己申告だけで合格、dotagentsからDB直接読解。
