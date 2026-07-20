# 工場コア9製品＋基盤toolchain 3製品の有限契約台帳

更新日: 2026-07-20。正本はdotagents。host期待状態は [factory-host-product-matrix.md](factory-host-product-matrix.md)、wire契約はServerManager `bughub/FACTORY_INTEGRATION.md`。

## 共通境界

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

- 所有/修正先: 自作 / `kitepon-rgb/Lattice`。version入口: `lattice --version`。
- diagnostics/state正本: `lattice factory-diagnostics --json`と`lattice runtime-errors snapshot|ack ... --json`。コード構造面は同梱sensorと`lattice-mcp`だけから提供する。
- 現adapter: native JSONをexact allowlistで検証し、wire v4の正式製品`lattice`へ射影する。sensorのindex不在・破損・version不整合はtyped failure／guidanceであり、外部Codegraphへfallbackしない。
- 互換: `codegraph_*` MCP tool名は入力互換名としてのみ残し、provider／sensor_owner=`lattice`とLattice系列versionを返す。独立Codegraph package、PATH command、MCP登録、daemon、SDK依存は禁止。

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

### `lattice`（編入中・L6）

- 所有/修正先: 自作 / `kitepon-rgb/Lattice`。**第11コア**（第10枠はObserver予約・Codegraph退役完了までは入替でなく追加）。
  version入口: `lattice --version`（＝`factory-diagnostics`の`version`と同一のpackage version）。
- project工程discovery正本: `lattice status --json`（schema `lattice.project_status.v1`、state
  `uninitialized|ready|active_run|invalid`、canonical store、active plan/run、`can_create_plan`、
  `next_action`）。未初期化はexit 0、invalidはexit 1。初期authoringは
  `lattice plan create --input <ref>`、入力schemaは`lattice plan create --schema --json`で取得する。
  `.lattice/`の有無を接続判定へ使わず、invalidをMarkdownへfallbackしない。
- diagnostics/state正本: `lattice factory-diagnostics --json`（schema
  `lattice.native_factory_diagnostics.v1`・check 5本＝package_version/node_runtime/cli_surface/
  mcp_entry/sensor_attribution・overall `ok|failed`・failedは非0）。runtime errorは
  `lattice runtime-errors snapshot --after-cursor 0 --limit 256 --json`／`ack <cursor> --json`
  （schema `lattice.runtime_errors.v1`・opt-in＝工場共有`factory-reporter.json`の`collection.enabled`・
  Caveat同型契約）。run store・sensor index・runtime error storeのstate/schema/migrationはLattice所有で、
  dotagentsは直接解釈しない。
- BugHub server側: factory v2へ**server-first登録済み**（ServerManager `0bb3ef3`・required外の
  任意key・期待matrix全profile `optional`・severity素通し・既存host credential。契約は
  ServerManager `bughub/FACTORY_INTEGRATION.md` §4.1.1。本番deployは別途H）。
- 現adapter: 実装済み・**wire v3 reportへ未enroll**（enrollmentはL7 wire v4）。diagnosticsは
  `latticeProduct`（`lib/factory/scan.mjs`・exact schema・overall/exit整合・detailの秘密/絶対path拒否）、
  runtime errorは`collectLatticeRuntimeErrors`（固定catalog 5 code検証・ack round-trip接続）。
  編入契約・claim境界はLattice `docs/01_integration-package.md`と
  Lattice ADR 0051（条件付きsupport）が正。
- 表現/禁止: 生message・絶対path・repo/prompt内容をreportへ転記しない（storeは固定catalogの
  templateのみ保存）。Windows nativeはLattice runtime構造的unsupported（分離表現はhost matrix所有）。
  診断のためにindex生成・run実行・provider起動を行わない。

### `servermanager`

- 所有/修正先: 自作 / `kitepon-rgb/ServerManager`。version入口: loopback readinessのpackage versionとbuild/deploy source revision。
- diagnostics/state正本: 外部runnerのBugHub health、poll/ingest鮮度、DB migration、container/source一致、Pi5監視。SQLite migration/Pi5 runtimeはServerManager所有。
- 現adapter: server profileではloopback `/readyz`とdeploy revision manifestを外部probeで照合し、DB/schema/pull/ingest/delivery/revisionの固定checkへ投影する。Pi5のdurable external eventは公開connector経由でsnapshot/ackし、非serverは`not_applicable`。
- 禁止: BugHub自己申告だけで合格、dotagentsからDB直接読解。
