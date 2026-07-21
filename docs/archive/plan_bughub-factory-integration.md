# 工場コア9製品＋基盤CLI 3製品 BugHub 統合計画

作成: 2026-07-13  
状態: 完了・archive（2026-07-21。Lattice `bughub-factory-integration` の受入証拠を正本とする）
対象工場: dotagents  
中央管理製品: ServerManager（BugHub 内包）

> 実行順と全体状態の親正本は[開発工場 統合マスター計画](plan_factory-master.md)。本書は固定12製品wire v2と全host rolloutの詳細受入TODOを所有するが、単独では着手順を決めない。

進捗（2026-07-14）: `gpt-connector`製品側はrelease commit `8c5d03b`（npm `0.3.1`）、ServerManager/BugHub側はcommit `71ed5c9`、dotagents側はcommit `bf5ef00`まで独立収容・pushした。dotagentsはv2固定12製品schema/scanner/reporter、基盤CLI更新台帳、host別Oracle退役、正典/MCP切替、配布CLIまで実装し、実`gpt-connector` consultで`gpt-5-6-thinking`＋`min`の成功とfactory diagnostics greenを確認した。固定負座標が複数displayで画面内へclampされる欠陥は、窓なしcold起動→background最小化target→正規PIDだけunhideする製品launcherへ置換し、npm `0.3.1`公開・registry install・最小化中の実Chatまで完了した。main-serverとFOX WSL2のv2 rollout、Pi5 bridgeの正常系canary、Codex Sidecar `0.3.7`のWindows npm shim修正・公開も完了。残件はFOX Windows native再送、Mac再起動後のlaunchd canary、Oracle rollback drill、意図的障害canary、全端末E2Eである。

2026-07-15裁定: 本計画のwire v2固定12製品は残件を含めて契約を変更せず完遂する。Observerの第10コア製品編入は[後続のwire v3計画](plan_observer-factory-integration.md)で固定13製品として扱い、本計画へ後付けしない。

## 0. 目的

dotagents が管理対象とするコア9製品と基盤toolchain 3製品について、全現役端末の導入version、更新結果、正規diagnostics、state/schema/migration、親別connector互換、既知bugをBugHubへ集約する。

工場そのものはdotagentsである。ServerManagerはdotagentsが管理・連携する中央管理コアで、BugHubはServerManager内部のversion・bug・compatibility統括コンポーネントである。BugHubを独立した第10製品、またはdotagentsと並ぶ別工場へ分離しない。

2026-07-13のオーナー裁定により、ChatGPT second-opinion製品はOracleから自作`gpt-connector`へ置換することを確定した。以後は置換可否を再検討せず、`gpt-connector`をdotagentsの自作コア製品契約へ適合させ、Oracleは履歴を保持したまま退役させる。障害時の一時切戻しは運用rollbackであり、製品選定の再裁定ではない。

同日の追加裁定により、Claude Code CLI、Codex CLI、Grok BuildもBugHubのversion・update・compatibility管理対象にする。ただし、この3製品は工場能力を構成するコア製品ではなく、コアを動かす基盤toolchainとして別区分に置く。したがって工場コアは9製品のまま、置換後wire majorの固定管理集合はコア9＋基盤CLI 3の計12製品とする。

## 1. 完了条件（本計画がTODOを兼ねる）

- Latticeへ移管済み: bf-0026 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L14
- Latticeへ移管済み: bf-0027 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L23
- Latticeへ移管済み: bf-0028 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L31
- Latticeへ移管済み: bf-0029 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L38
- Latticeへ移管済み: bf-0030 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L47
- Latticeへ移管済み: bf-0031 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L55
- Latticeへ移管済み: bf-0032 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L65
- Latticeへ移管済み: bf-0033 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L70
- Latticeへ移管済み: bf-0034 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L78
- Latticeへ移管済み: bf-0035 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L89
- Latticeへ移管済み: bf-0036 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L97
- Latticeへ移管済み: bf-0037 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L102
- Latticeへ移管済み: bf-0038 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L110
- Latticeへ移管済み: bf-0039 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L121
- Latticeへ移管済み: bf-0040 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L129
- Latticeへ移管済み: bf-0041 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L137
- Latticeへ移管済み: bf-0042 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L148
- Latticeへ移管済み: bf-0043 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L154
- Latticeへ移管済み: bf-0044 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L165
- Latticeへ移管済み: bf-0045 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L175

## 2. 現状の実測

### 2.1 BugHub

- 正本はServerManager内 `bughub/`。2026-07-13実測で `http://192.168.1.2:39310/healthz` は `{"ok":true}`、既存4アプリのpoll履歴も取得できた。
- 現行契約はLAN内のアプリ管理APIをBugHubがpullする。severityは報告元アプリが決め、BugHubは推測・上書きしない。
- signature契約の`app_version`は任意で、現実装は`issues.sample`へ文字列化するだけ。host×productのversion台帳、latest比較、schema/compatibility履歴はない。
- DBは`CREATE TABLE IF NOT EXISTS`中心でschema version/migration runnerを持たない。BugHub自身のpackage versionは0.1.0。
- BugHub sourceはimageへ焼き込まれ、`src`はbind mountされない。変更反映にはrestartだけでなくimage rebuildが必要。
- `deploy.sh`は`rsync --delete`を使う。実装waveでは先にdry-run・削除一覧・秘密混入確認を追加し、それまで本番deployしない。
- `INTEGRATION.md`のGitHub正本URLは`master`を指す一方、ServerManagerの現行branchは`main`。AIオンボーディングを壊すため最初に訂正する。
- `/healthz`は無条件なprocess応答に近く、DB query、poll/ingest鮮度、source error、Discord deliveryまで保証しない。composeにもhealthcheckがない。
- 文書は`auctionbot` adapterを記載するが、実registryは`signature`と`kikoeru`だけである。計画では文書名を信用せず、実registryとcharacterization testを基準に訂正する。

### 2.2 管理対象と作業状態

| 製品 | 所有 | version取得 | 現行diagnostics候補 | 現状 |
|---|---|---|---|---|
| Caveat | 自作・別repo | `caveat --version`（0.16.3） | native factory diagnostics、runtime error store | 0.16.3公開・registry smoke完了 |
| Throughline | 自作・別repo | `throughline --version`（0.6.3） | native factory diagnostics、runtime error store | 0.6.3公開・public CI 9/9・registry smoke完了 |
| Spotter | 自作・別repo | `spotter --version`（1.4.23） | native diagnostics、runtime error store | 1.4.23公開・registry smoke完了 |
| Codegraph | 第三者 | `codegraph --version`（1.4.1） | 既存indexだけ`status`/read-only query | 本体改造禁止。index自動作成禁止 |
| MarkItDown | 第三者 | `markitdown --version`（0.1.5） | ローカルfixture変換＋出力byte数 | `uv tool`管理。本体改造禁止 |
| gpt-connector | 自作・別repo | `gpt-connector --version`（0.3.1） | native factory diagnostics、runtime error store | 0.3.1公開・registry smoke完了。通常Chat、正規添付、model/effort、冪等job、再起動後回収、offscreen起動、read-only診断が成立 |
| aiterm-mcp | 自作・別repo | package.json/npm（0.12.2） | native diagnostics、runtime error store | 0.12.2公開・MCP Registry / registry smoke完了 |
| codex-sidecar | 自作・別repo | CLI/package群（0.3.7） | diagnostics/dry-run、result schema | 0.3.7公開・CI・registry install smoke完了。Windows npm `.cmd`診断修正を収録 |
| ServerManager | 自作・別repo | package.json/source commit（2.0.0） | BugHub health/poll/DB/container/Pi5 | clean。BugHubを内包 |
| Claude Code CLI | 第三者・基盤toolchain | `claude --version`（2.1.207） | npm registry latest、hook/settings/親実行互換 | `@anthropic-ai/claude-code@latest`で更新済み。BugHub product未登録 |
| Codex CLI | 第三者・基盤toolchain | `codex --version`（0.144.1） | npm registry latest、config parser/hooks/native routing互換 | `@openai/codex@latest`更新対象。2026-07-13時点latest 0.144.3、BugHub product未登録 |
| Grok Build | 第三者・基盤toolchain | `grok --version`（0.2.87 stable） | `grok update --check --json`、aiterm/headless入口互換 | npm外のinternal installer。2026-07-13時点stable latest 0.2.99、週次更新・BugHub productとも未登録 |

## 3. ルール変更の裁定

### 3.1 変更する

1. **BugHubはpull-only**を廃止し、二つの正規入口を持つ。
   - 既存サーバーアプリ: 従来どおりBugHubがread-only pull。
   - 工場端末のCLI製品: dotagents runnerが観測し、BugHubへ認証付きpush。
2. **「全アプリはHTTP閲覧口を持つ」**を工場製品には要求しない。CLI、hook、MCP、ローカルstateを持つ製品へdaemonを埋め込むのは保守負債だからである。
3. **versionをissueのsampleだけで扱う**契約を拡張し、host×productの観測台帳と履歴をBugHubへ追加する。
4. **BugHubは読むだけ**を「BugHubから報告元の製品状態を書き換えない」へ精密化する。端末から観測reportを受信・保存することは許可する。

### 3.2 維持する

1. 既存`INTEGRATION.md`のerror意味論を継承する。severityは観測側の製品契約が決め、BugHubは推測・格上げ・格下げしない。
2. BugHubは製品を自動修復しない。初期scopeは観測・通知・AIガイドまで。
3. resolve/reopenは明示的かつ冪等。異常の再観測時は再openする。
4. LAN限定＋認証、秘密は端末ローカル、失敗は非0・記録、silent fallback禁止。
5. `fingerprint`は同じ原因を同じbug classへ束ね、可変値を除いた`message_template`、累計発生数、UTCの最終発生時刻、`open / resolved`を持つ。新しいpush入口でもこの意味を変えない。

## 4. 採用アーキテクチャ

```text
各端末
  dotagents factory reporter
    ├─ product adapter（正規CLI・公開I/Oだけ）
    ├─ local observation
    ├─ bounded outbox（dotagents所有）
    └─ POST /api/factory/v1/reports
                    │
                    ▼
ServerManager / BugHub
  ├─ report認証・schema検証・冪等化
  ├─ host×product observation履歴
  ├─ failed check → 既存issue/fingerprint系へ統合
  ├─ dashboard / Discord / daily / weekly / /ai
  └─ 既存アプリのpull collector（後方互換で維持）
```

### 4.1 wire contract v1

正確なJSON Schemaの正本はServerManager `bughub/FACTORY_INTEGRATION.md` とversioned schema fileに置く。dotagentsはclient fixtureと対応schema versionを持ち、server/client双方が未知のmajor versionを明示拒否する。

**この正本とfixtureがgreenになるまで、各製品へruntime error観測点を追加しない。** 既存BugHubのsignature契約を基礎に、CLI向けpushでも`severity / fingerprint / message_template / occurrence_count / last_seen / status`の意味を固定する。stderr文字列、生stack、例外オブジェクトをそのまま転送する実装はBugHub対応と認めない。

reportの必須概念:

- `schema_version`
- `report_id`（冪等キー）
- `host_id`（tokenに結び付け、payloadだけを信用しない）
- `host_profile`（server / mac / wsl / windows-native。server側期待matrixと照合）
- `report_mode`（v1は完全snapshotを既定とし、deltaを許す場合は別contract versionで意味を固定）
- `observed_at`
- `received_at`（serverが付与し、payload値を信用しない）
- `created_at`（body確定・enqueue時。再送で変更しない）
- `X-Factory-Sent-At` HTTP header（送信attemptごと。body hashに含めない）
- `reporter`（version / dotagents commit）
- products（schema majorごとに固定した製品IDをkeyとするobject。同一ID重複を構造的に禁止。v1はOracleを含むコア9、置換後majorは`gpt-connector`を含むコア9＋`claude-code`／`codex-cli`／`grok-build`の12製品）
  - `presence_status`（installed / missing / not_applicable / unverified）
  - `installed_version`
  - `latest_version`（取得できる時だけ。不能を推測しない）
  - `source_revision`（自作repoで取得できる時だけ）
  - `contract_version`
  - `state_schema_version` / `migration_status`（製品の正規診断が出す時だけ）
  - `update_status` / `compatibility_status`
  - checks[]（id、status、失敗時のseverity、fingerprint、message_template、count、first/last seen、安全なcontext）
  - runtime_errors[]（自作製品の管理端末だけ。error code、fingerprint、count、first/last seen、安全なtemplate）
  - resolutions[]（過去fingerprintの明示解決。snapshotからの消失だけでは解決しない）

BugHubはtoken→host_idをserver側で固定し、host profile/product期待matrix、body size、`X-Factory-Sent-At`のskew、`host_id + report_id`、outboxへ保存した正確なbody bytesのhashを検証する。期待状態はclientに自己申告させずserver matrixだけを正とし、`required + missing`等はreportを受理してissue化する。`observed_at`は長期offline後も正当な履歴として受け入れ、同じhost×productの既知観測より古ければcurrent matrixを巻き戻さない。future skewと`observed_at <= created_at <= sent header`等の時刻順序、fingerprintの重複とopen/resolve排他をsemantic validationする。完全snapshotで省略されたproduct/checkを自動resolvedにせず、明示`resolutions[]`を根拠にする。秘密、絶対パス、生ログ、prompt/session本文、DB内容は送らない。

factory issueの状態遷移は既存pull issueと分けて仕様化する。v1は`report_mode=full`だけを受理し、正常な完全snapshot、producerによる明示resolve、再観測reopen、host廃止、長期offlineを区別し、「reportに無い」だけで解決しない。BugHub側の手動resolveはproducer-authoritative契約と競合するため提供せず、deltaは将来のschema majorで互換matrix・順序・欠落意味を再設計するまで非対応とする。

Oracle→`gpt-connector`と基盤CLI 3製品の追加は固定product集合の変更なので、v1へoptional keyを足して意味を曖昧にしない。既存のwire major移行ランブックに従い、ServerManagerへ新majorの別endpointをserver-firstで追加し、v1 Oracle clientと新major 12製品clientをdual-runする。host切替前にv1でOracleを明示`not_applicable`＋必要な`resolutions[]`へ遷移させ、新majorの最初のfull snapshotで`gpt-connector`と基盤CLI 3製品を観測する。schema間の「消失」だけで自動resolveせず、Oracleの履歴を物理削除しない。

#### 4.1.1 runtime error出力契約の確定順序

1. ServerManagerで既存`INTEGRATION.md`との対応表、versioned JSON Schema、severity判定表、fingerprint生成規則、privacy allowlistを正本化する。
2. 同じ原因の可変値違い、別原因の類似文、resolve後の再発、秘密混入、重複retryをfixtureにして、分類と状態遷移をcharacterizationする。
3. dotagents reporterのproducer/consumer contractをそのfixtureへ適合させる。
4. 契約がgreenになった後だけ、自作製品ごとに失敗境界を棚卸しして観測点を追加する。
5. 全製品で契約testを通し、単に出力件数が多いことを完了条件にしない。

観測点は、利用不能、処理失敗、永続化・migration失敗、外部依存・connector失敗、契約破壊など、原因特定と修正判断に使える境界へ置く。同じ失敗を複数layerで重複計上せず、retryごとの生ログではなく同一fingerprintのcountへ集約する。利用者の取消、正常な未設定、仕様どおりのunsupportedなど期待された制御フローをerrorへ水増ししない。

### 4.2 DB

- 既存`issues`を壊さず、versioned migration runnerを先に導入する。
- `factory_observations`（host×productの時系列）と`factory_reports`（冪等・受信監査）を追加する。
- `hosts`（profile、active/revoked、last_seen）とhost credential registryを追加する。
- compatibility異常は既存issueへ統合し、hostを独立fieldとして保持する。既存issueのIDと表示を後方互換にする。
- migration前にSQLite本体・WAL・SHMを整合した方法でbackupし、復旧手順と実drillを持つ。
- `factory_reports`のdedupe保持期間は、端末outboxの最大保持日数＋許容送信skewより長く固定し、無期限増加させずprune testを持つ。

### 4.3 reporterとoutbox

- reporterの状態は`$XDG_STATE_HOME/dotagents/factory-reporter/`、既定`~/.local/state/dotagents/factory-reporter/`に置く。他製品の管理directoryへ便乗しない。
- report生成と送信を分離し、生成結果をlocal JSON Schemaで検証した後、**初回送信より前に**outboxへatomic enqueueする。
- 送信はsingle-flight lockを取り、2xxと同一`report_id`の受理確認後だけ削除する。応答消失・削除前crashは同じIDで再送する。
- malformed reportはdead-letterへ隔離し、通常queueを塞がず専用failureにする。
- queueは件数・byte・保持日数を上限化する。overflow時は新規reportを黙って捨てず生成を非0にし、既存queueを保持する。上限・lock・crash recoveryをfixture化する。
- post-updateで必ず実行し、定期read-only scanも各端末の正規schedulerで行う。
- state/outbox/log/tokenはmacOS/Linux/WSLではdotagentsのXDG state、Windows nativeでは`%LOCALAPPDATA%\dotagents\factory-reporter`を既定とし、所有者限定ACLを検証する。
- `reporting.enabled`は既定`false`とし、明示設定された時だけoutboxへの送信対象enqueueとnetwork送信を行う。tokenの存在、管理端末判定、scheduler導入をONの代用にしない。
- `collection.enabled`はlocal structured error storeの収集可否を独立に制御する。収集ON・送信OFFでは端末外へ出さず、利用者が送信予定payloadをpreviewできる。
- 製品更新で`reporting.enabled`を暗黙にONへ変更しない。クオ管理端末も導入時に明示ONを記録し、設定なし・不正値・送信先不明はfail closedで送信しない。
- 設定shapeの正本は`schemas/factory-reporter-config-v1.schema.json`。top-level `host.id / host.profile`は送信同意と独立した端末identity、`collection.enabled / reporting.enabled`のJSON booleanだけを正規opt-in面にし、env文字列やtoken存在からONを推測しない。

factory ingestion認証は既存の任意dashboard tokenと分離し、常時必須のhost-scoped credentialにする。発行、server登録、端末配置、rotation猶予、revoke、紛失端末廃止、backup/restoreをrunbookとtestに含める。query parameterへtokenを出さない。

## 5. 製品別契約

### 5.1 自作製品

Caveat、Throughline、Spotter、gpt-connector、aiterm-mcp、codex-sidecar、ServerManagerは、各製品repoに機械可読diagnosticsを置く。dotagents adapterが内部DBや設定を独自解釈する形にしない。

- 共通最低要件: version、diagnostic schema version、overall status、個別check ID、state schema/migration（該当時）、秘密を含まないJSON、非0の意味。
- CLI名やJSON schemaは各製品が所有する。dotagentsはversioned adapterとfixtureで受ける。
- 既存diagnosticsが十分なら新コマンドを増やさず再利用する。不足時だけ製品側へ最小追加する。

### 5.2 第三者製品

Codegraph、MarkItDown、Claude Code CLI、Codex CLI、Grok Buildは本体を改造しない。Oracleは退役まで公開入口だけを利用し、新規改造しない。

- 公開version、公式doctor/status、black-box smoke、安定したexit codeだけを使う。
- fork、直接patch、postinstall改変、`node_modules`編集、内部DB/schema解析を禁止する。
- upstreamが機械可読診断を出さない項目は`unsupported`/`unverified`と報告し、推測でgreenにしない。
- 人間向け出力の文字列解析は原則不採用。不可避なら対応version範囲とfixtureを固定し、drift時は明示FAILする。
- 上流更新で消えるローカル改造ではなく、dotagents側の外付けadapterだけを保守する。

### 5.3 製品固有の最低smoke

| 製品 | version | compatibility / state | 禁止 |
|---|---|---|---|
| Caveat | CLI | own repo、DB schema/migration、sync状態、Claude/Codex hook、MCP検索を製品診断で確認 | dotagentsがDB内部を決め打ち |
| Throughline | CLI | state schema、hook、代表capture/restore/handoffの段階別診断 | 実session本文送信、破壊的restore |
| Spotter | CLI | doctor、marker、host別catalog、Claude/Codex hook、Throughline context | 全project無条件activation |
| Codegraph | CLI | 既存indexだけstatus/read-only query | `codegraph init`自動実行 |
| MarkItDown | CLI/uv | bundled local fixtureを変換し出力byte数>0 | URL変換のrc=0だけでgreen |
| gpt-connector | CLI | native factory diagnostics、product-owned runtime error snapshot、version、state/job schema、CDP/auth/runtime/MCP readiness | Chat/consult/uploadによるhealth判定、prompt/response/file内容/conversation ID/絶対pathの出力、Oracle/APIへのfallback |
| aiterm-mcp | package/追加version入口 | MCP initialize、read-only PTY list、依存CLI状態 | agent起動をhealth判定に使うこと、未検証入口をwriter扱いすること |
| codex-sidecar | 3 npm package | diagnostics/dry-run、result schema、model policy | 実装不要な実agent起動 |
| ServerManager | package/commit | BugHub外部health、poll鮮度、DB migration、container/source一致、Pi5監視 | BugHubの自己申告だけで合格 |
| Claude Code CLI | CLI/npm | `claude --version`、npm latest、必須hook/settings契約 | session起動、prompt送信、認証変更、人間向けupdate出力の推測解析 |
| Codex CLI | CLI/npm | `codex --version`、npm latest、config parser/hooks/native routing契約 | agent実起動、OAuth変更、モデル実行、日付付きversionの恒久pin |
| Grok Build | self-updating CLI | `grok --version`、`grok update --check --json`、stable channel、aiterm/headless入口契約 | npm packageと誤認、alphaへの自動切替、login/logout、agent実行、人間向け出力解析 |

### 5.4 実利用時errorの収集境界

- 対象はクオが管理するMac、main-server、FOX WSL2、FOX Windows native上の自作製品だけ。製品は実行時errorをまず端末ローカルへ構造化保存し、`reporting.enabled=true`が明示された端末だけdotagents reporterがBugHubへ運ぶ。
- 最小fieldはproduct version、component、安定error code、可変値を除いたmessage template、fingerprint、count、first/last seen、state schema version、OS/arch。prompt、入力本文、file内容、session本文、token、cookie、絶対path、生stackの秘密部分は保存・送信しない。
- telemetry保存・送信の故障で本来の製品動作を止めない。ただし故障をsilentにせず、固定stderr、local diagnostics、reporter checkで観測可能にする。
- 解決後の同一fingerprint再発はreopenする。version更新で消えたerrorは、観測窓と製品側の明示resolve条件を満たしてからresolvedにする。
- local error storeはack/cursor、compact/delete、retention、mode/ACLを製品契約で定め、送信成功前に消さない。
- template化はallowlist fieldから組み立て、token/cookie/home/絶対path/prompt/stack断片を混入させたnegative fixtureで漏洩防止を検証する。JSON Schemaだけをprivacy gateにしない。
- npm等で配布した外部利用者からprivate BugHubへ自動送信しない。将来行う場合は明示opt-in、送信前preview、privacy文書、匿名化、削除手段、公開受信基盤を別計画で設計する。
- 第三者製品へruntime instrumentationを加えない。公開diagnosticsとblack-box smokeで観測できる範囲に限定する。自作`gpt-connector`はWave 6で同じprivacy・ack/cursor・retention契約へ適合させる。

## 6. severityと状態

severityはproduct adapterが明示し、BugHubは変更しない。

- `fatal`: 製品が止まる、または利用不能。例: BugHubの受信/DB破損、reporter全体破損。
- `high`: 製品は動作していても実害がある、または条件により停止する。例: 必須製品欠落、正規migration失敗、主要connector不能、update後の契約破壊。
- `warn`: 理想状態ではないが動作しており、修正すべき。例: latest未追従、部分的diagnostic不能、特定hostだけのdrift。
- `info`: 修正すべきだが現時点で解決方法がないもの、またはそれ以下の参考情報。正常イベントの大量記録には使わない。

checkの状態は`pass / fail / unsupported / unverified / skipped`を分ける。`unsupported`や`unverified`を`pass`へ丸めない。`skipped`には必ず機械可読reasonを持たせる。

## 7. 実装wave

### Wave 0 — 正本・baseline・dirty整理（挙動不変）

- Latticeへ移管済み: bf-0250 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L6
  この監査結果は現在の完了根拠として扱わず、本計画を再変更する際は実ファイルとテストから再検証する。
- Latticeへ移管済み: bf-0252 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L7
- Latticeへ移管済み: bf-0253 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L8
- Latticeへ移管済み: bf-0254 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L9
- Latticeへ移管済み: bf-0255 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L10
- Latticeへ移管済み: bf-0256 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L11
- Latticeへ移管済み: bf-0257 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L12
- Latticeへ移管済み: bf-0258 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L13

### Wave 1 — ServerManagerの安全網とprotocol（F中心）

- Latticeへ移管済み: bf-0262 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L15
- Latticeへ移管済み: bf-0263 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L16
- Latticeへ移管済み: bf-0264 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L17
- Latticeへ移管済み: bf-0265 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L18
- Latticeへ移管済み: bf-0266 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L19
- Latticeへ移管済み: bf-0267 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L20
- Latticeへ移管済み: bf-0268 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L21
- Latticeへ移管済み: bf-0269 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L22

### Wave 2 — dotagents reporter骨格（F＋A）

- Latticeへ移管済み: bf-0273 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L24
- Latticeへ移管済み: bf-0274 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L25
- Latticeへ移管済み: bf-0275 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L26
- Latticeへ移管済み: bf-0276 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L27
- Latticeへ移管済み: bf-0277 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L28
- Latticeへ移管済み: bf-0278 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L29
- Latticeへ移管済み: bf-0279 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L30
- Latticeへ移管済み: bf-0280 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L32
- Latticeへ移管済み: bf-0281 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L33

### Wave 3 — 第三者3製品adapter（A、完了済み旧Oracle契約を含む）

- Latticeへ移管済み: bf-0285 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L34
- Latticeへ移管済み: bf-0286 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L35
- Latticeへ移管済み: bf-0287 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L36
- Latticeへ移管済み: bf-0288 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L37

### Wave 4 — 当時の自作5製品のnative diagnostics（repo別A、契約はF）

- Latticeへ移管済み: bf-0292 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L39
- Latticeへ移管済み: bf-0293 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L40
- Latticeへ移管済み: bf-0294 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L41
- Latticeへ移管済み: bf-0295 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L42
- Latticeへ移管済み: bf-0296 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L43
- Latticeへ移管済み: bf-0297 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L44
  - Latticeへ移管済み: bf-0298 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L45
  - Latticeへ移管済み: bf-0299 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L46
- Latticeへ移管済み: bf-0300 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L48
- Latticeへ移管済み: bf-0301 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L49
- Latticeへ移管済み: bf-0302 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L50
  - Latticeへ移管済み: bf-0303 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L51
  - Latticeへ移管済み: bf-0304 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L52

### Wave 5 — BugHub ingestion・表示・通知（F＋A）

- Latticeへ移管済み: bf-0308 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L53
- Latticeへ移管済み: bf-0309 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L54
- Latticeへ移管済み: bf-0310 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L56
- Latticeへ移管済み: bf-0311 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L57
- Latticeへ移管済み: bf-0312 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L58
  - Latticeへ移管済み: bf-0313 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L59
  - Latticeへ移管済み: bf-0314 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L60
- Latticeへ移管済み: bf-0315 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L61
- Latticeへ移管済み: bf-0316 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L62
- Latticeへ移管済み: bf-0317 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L63
- Latticeへ移管済み: bf-0318 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L64

### Wave 6 — gpt-connector製品適合・Oracle置換・基盤CLI 3製品追加（F＋repo別A＋H）

このwaveは`gpt-connector`、dotagents、ServerManagerの3repoを独立commit・独立rollback可能に保つ。挙動不変のcharacterization／adapter追加と、収集開始・wire major・MCP切替・Oracle撤去の挙動修正を混ぜない。

#### 6.0 正本・baseline・契約固定（挙動不変）

- Latticeへ移管済み: bf-0326 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L66
- Latticeへ移管済み: bf-0327 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L67
- Latticeへ移管済み: bf-0328 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L68
- Latticeへ移管済み: bf-0329 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L69
- Latticeへ移管済み: bf-0330 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L71
- Latticeへ移管済み: bf-0331 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L72
- Latticeへ移管済み: bf-0332 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L73
- Latticeへ移管済み: bf-0333 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L74
- Latticeへ移管済み: bf-0334 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L75

#### 6.1 gpt-connector native factory契約（製品側A、契約はF）

- Latticeへ移管済み: bf-0338 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L76
- Latticeへ移管済み: bf-0339 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L77
- Latticeへ移管済み: bf-0340 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L79
- Latticeへ移管済み: bf-0341 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L80
- Latticeへ移管済み: bf-0342 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L81
- Latticeへ移管済み: bf-0343 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L82
- Latticeへ移管済み: bf-0344 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L83
- Latticeへ移管済み: bf-0345 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L84
- Latticeへ移管済み: bf-0346 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L85
- Latticeへ移管済み: bf-0347 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L86
- Latticeへ移管済み: bf-0348 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L87
- Latticeへ移管済み: bf-0349 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L88

#### 6.2 基盤CLI 3製品のversion/update契約（repo内A、契約はF）

- Latticeへ移管済み: bf-0353 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L90
- Latticeへ移管済み: bf-0354 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L91
- Latticeへ移管済み: bf-0355 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L92
- Latticeへ移管済み: bf-0356 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L93
- Latticeへ移管済み: bf-0357 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L94
- Latticeへ移管済み: bf-0358 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L95
- Latticeへ移管済み: bf-0359 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L96
  - Latticeへ移管済み: bf-0360 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L98
  - Latticeへ移管済み: bf-0361 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L99
  - Latticeへ移管済み: bf-0362 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L100
    一貫性をscanner／updater共通validatorへ固定する。
  - Latticeへ移管済み: bf-0364 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L101
    [ADR 0011](adr/0011-toolchain-update-version-contract.md)の契約を
    [受入receipt ADR 0012](adr/0012-toolchain-update-version-acceptance.md)へ固定した（`fc3bf3f`、related Node 17/17）。

#### 6.3 ServerManager/BugHubのserver-first互換面（F）

- Latticeへ移管済み: bf-0370 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L103
- Latticeへ移管済み: bf-0371 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L104
- Latticeへ移管済み: bf-0372 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L105
- Latticeへ移管済み: bf-0373 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L106
- Latticeへ移管済み: bf-0374 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L107
- Latticeへ移管済み: bf-0375 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L108

#### 6.4 dotagents配線と正典（repo内A、契約はF）

- Latticeへ移管済み: bf-0379 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L109
- Latticeへ移管済み: bf-0380 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L111
- Latticeへ移管済み: bf-0381 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L112
- Latticeへ移管済み: bf-0382 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L113
- Latticeへ移管済み: bf-0383 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L114
- Latticeへ移管済み: bf-0384 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L115
- Latticeへ移管済み: bf-0385 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L116
- Latticeへ移管済み: bf-0386 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L117
- Latticeへ移管済み: bf-0387 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L118
- Latticeへ移管済み: bf-0388 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L119
- Latticeへ移管済み: bf-0389 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L120
  - Latticeへ移管済み: bf-0390 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L122
- Latticeへ移管済み: bf-0391 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L123
- Latticeへ移管済み: bf-0392 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L124
  - Latticeへ移管済み: bf-0393 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L125
  - Latticeへ移管済み: bf-0394 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L126
  - Latticeへ移管済み: bf-0395 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L127

#### 6.5 shadow、cutover、撤去（H＋F）

- Latticeへ移管済み: bf-0399 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L128
- Latticeへ移管済み: bf-0400 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L130
- Latticeへ移管済み: bf-0401 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L131
- Latticeへ移管済み: bf-0402 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L132
- Latticeへ移管済み: bf-0403 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L133

### Wave 7 — ServerManager/BugHub自己監視（F）

- Latticeへ移管済み: bf-0407 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L134
  - Latticeへ移管済み: bf-0408 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L135
  - Latticeへ移管済み: bf-0409 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L136
- Latticeへ移管済み: bf-0410 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L138
  - Latticeへ移管済み: bf-0411 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L139
  - Latticeへ移管済み: bf-0412 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L140
  - Latticeへ移管済み: bf-0413 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L141
  - Latticeへ移管済み: bf-0414 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L142
- Latticeへ移管済み: bf-0415 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L143
- Latticeへ移管済み: bf-0416 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L144
- Latticeへ移管済み: bf-0417 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L145
  - Latticeへ移管済み: bf-0418 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L146
  - Latticeへ移管済み: bf-0419 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L147
  - Latticeへ移管済み: bf-0420 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L149
  - Latticeへ移管済み: bf-0421 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L150
  - Latticeへ移管済み: bf-0422 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L151
  - Latticeへ移管済み: bf-0423 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L152

### Wave 8 — 4環境canary rollout（H＋F）

0. Latticeへ移管済み: bf-0427 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L153
   - 2026-07-13: Throughline `0.6.2`（`e6ce6e3` / CI `29238704750`）、Spotter `1.4.23`（`a117a99` / CI `29238199094`）、Caveat `0.16.3`（`8f06d17` / CI `29238199765`）をnpm `latest`、annotated tag、GitHub Releaseへ公開した。
   - aiterm-mcp `0.12.2`（`239e7e4`）はtag CI `29245251184`のTrusted Publishingでnpmへ公開し、Release起点のMCP Registry workflow `29245462227`もgreen。4製品をregistry由来の隔離prefixへinstallし、version、native diagnostics、runtime snapshotを確認した。collectionは既定OFFで、このsmokeから外部送信は発生しない。
0a. Latticeへ移管済み: bf-0430 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L155
0b. Latticeへ移管済み: bf-0431 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L156
   - Latticeへ移管済み: bf-0432 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L157
   - Latticeへ移管済み: bf-0433 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L158
   - Latticeへ移管済み: bf-0434 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L159
   - Latticeへ移管済み: bf-0435 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L160
1. Latticeへ移管済み: bf-0436 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L161
1a. Latticeへ移管済み: bf-0437 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L162
1b. Latticeへ移管済み: bf-0438 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L163
1c. Latticeへ移管済み: bf-0439 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L164
1d. Latticeへ移管済み: bf-0440 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L166
1e. Latticeへ移管済み: bf-0441 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L167
1f. Latticeへ移管済み: bf-0442 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L168
1g. Latticeへ移管済み: bf-0443 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L169
1h. Latticeへ移管済み: bf-0444 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L170
1i. Latticeへ移管済み: bf-0445 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L171
1j. Latticeへ移管済み: bf-0446 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L172
1k. Latticeへ移管済み: bf-0447 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L173
   - **2026-07-18根因診断（Codex外部レーン`r2-1k-drift-diagnosis`・親が実出力照合済み）**: ①Throughline=配布0.8.0がlabel `throughline.database.v8`のままDB version 9/9を返しadapterのv8固定と矛盾（Mac実測で確定。製品側label修正が本修理・dotagentsは観測済みtuple限定の一時救済）②Caveat=adapterがSidecar以外の非0 exitを無条件拒否するがCaveatの正規契約はnot_ready⇔exit 1（dotagentsのみ修理）③aiterm=source 0.14がvendorへ`claude`追加済みでadapterの2 keys固定が将来drift（adapter追従）④codex-sidecar FOX `native_unverified`=schema driftではなくpackageVersions unverifiedのnative素通し投影（FOX raw JSON取得後に製品側診断・P2）。dotagents側修理①救済②③＋fixtureは外部Codexレーン（隔離worktree）実装を親受入し`d53bd55`で収容、Mac実scanでthroughline=installed回復を実火確認・main-server配布済み。Throughline label修正は製品repo独立waveへ、toolchain ledger `post_gate_failed`残留はagents-update再走で別途解消
   - Latticeへ移管済み: bf-0449 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L174
     - Latticeへ移管済み: bf-0450 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L176
     - Latticeへ移管済み: bf-0451 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L177
1m. Latticeへ移管済み: bf-0452 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L178
   - Latticeへ移管済み: bf-0453 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L179
   - Latticeへ移管済み: bf-0454 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L180
   - Latticeへ移管済み: bf-0455 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L181
   - Latticeへ移管済み: bf-0456 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L182
     - 2026-07-17 FOX WSL2実機（read-only `throughline factory-diagnostics --json` v0.6.3）: `overall.status=ready`・
       `hooks.events`（userPromptSubmit/postToolUse/stop）全`ready`で整合し、旧`events=ready`／summary=`unverified`矛盾は解消。
       残る`connectors.claude=unverified`（reason=`diagnostic_unverified`）は1oの正当な非ブロッキングtuple（headless Claude connector）で別物。
       formalなhost scan/report receiptはR2（H）へ合流。
1n. Latticeへ移管済み: bf-0461 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L183
1o. Latticeへ移管済み: bf-0462 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L184
1p. Latticeへ移管済み: bf-0463 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L185
   - Latticeへ移管済み: bf-0464 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L186
   - Latticeへ移管済み: bf-0465 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L187
1q. Latticeへ移管済み: bf-0466 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L188
   - Latticeへ移管済み: bf-0467 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L189
   - Latticeへ移管済み: bf-0468 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L190
1r. Latticeへ移管済み: bf-0469 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L191
   - Latticeへ移管済み: bf-0470 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L192
   - Latticeへ移管済み: bf-0471 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L193
1s. Latticeへ移管済み: bf-0472 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L194
   - Latticeへ移管済み: bf-0473 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L195
   - Latticeへ移管済み: bf-0474 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L196
2. Latticeへ移管済み: bf-0475 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L197
2a. Latticeへ移管済み: bf-0476 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L198
   - **P1実被弾と根本修理（2026-07-18・`8d17dcc`）**: launchd/cronの最小PATHでscheduled runnerが製品CLIをENOENTとし、Mac・main-server・FOX WSL2の3hostで本番`factory_v2_current`をほぼ全製品`missing`へ汚染していた（過去の「scheduled run確認」は実行成立のみで観測品質を未検証だった＝正直に記録）。`lib/factory/scheduler-path.mjs`で既存PATH優先順位を変えない末尾補完をv1/v2両runnerへ適用し、focused 28/28 green。3hostとも正規経路の再実行でcurrent回復（missing 0）を実査済み
3. Latticeへ移管済み: bf-0478 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L199
4. Latticeへ移管済み: bf-0479 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L200
5. Latticeへ移管済み: bf-0480 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L201
   - **実機P1×2の根本修理**: ①`schtasks /Create /XML`がBOMなしUTF-8 task XMLを構文拒否→UTF-16LE+BOM＋`encoding="UTF-16"`宣言へ（`beab0c0`）。②batch limited tokenでfresh security objectへのSet-Aclが`SeSecurityPrivilege`例外→4入口を`Get-Item→GetAccessControl('Access')→instance SetAccessControl`のDACL限定書換へ統一（`41c697b`・`8c6469c`、隔離診断taskでSETACL-OK実証）。あわせて`schtasks /Query`不在判定のlocale文字列依存をGet-ScheduledTask exit code判定へ置換（cp932→UTF-8 decodeのmojibakeで日本語regexが不一致だった）。SSH対話は管理者昇格tokenのため両欠陥とも検出不能で、Task Scheduler実火が初検出だった
6a. Latticeへ移管済み: bf-0482 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L202
   - （旧記載）H承認済みの意図的障害としてmain-serverのBugHub containerだけをhealthy tick直後から最長45秒停止し、既存アプリ本体・DBを変更しない。natural 60秒tickerで未trigger observation 1件までに留まること、停止中のreporter非0/outbox保持、`docker compose up -d bughub`と`/readyz`での復旧、復旧後flush、次のhealthy tickで未trigger stateが消えることを確認し、Discord・external-event・BugHub issueを誤openしないtransient吸収を実証する
6b. Latticeへ移管済み: bf-0484 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L203
   - **P1実被弾と根本修理（`5f22ed4`）**: v2 scanにv1の`mergeServerManagerExternal`統合が欠落しており、全host v2移行後はPi5 bridgeのoutage eventがBugHubへ届かない実ギャップを本canaryで検出（本番storeに7/13以降の未ack event 3件が滞留・bridge stateはconsecutive 4938まで積んでresolve不能だった）。server側v2 schemaは受理済みを実物確認のうえclient側を修理し、v2 ack bundleへservermanagerを拡張。related gate 94/94 green。旧3 eventは修理後の本番cronで自己回復する（open搬送→ack→bridge resolve→次cronで解消）
   - （旧記載）fixed 60秒ticker＋2連続failureの契約を変えず、open→resolve E2Eは別の隔離canaryとして実施する。Pi5 bridgeの公開`run(deps)`で本番stateをtemporary fileへ差し替え、2 synthetic observations（natural 2周期とは称さない）だけtransport failureを注入し、Discordは実module、connectorは実SSHへ委譲する。main-serverの`factory-external-event`とmanual v2 reporterも専用`XDG_STATE_HOME`へ隔離し、固定`servermanager/availability/unreachable`（high、同一fingerprint）のopen→BugHub accepted/ACKを確認する。復旧は実`/readyz`の200/readyだけを入力し、Discord success→同fingerprint resolve/ACK→isolated bridge state消去→次回本番scheduled full snapshotでreopenしないことと全環境のinstalled/latest/compat matrixを確認する

### 2026-07-18検出: main-server crontab外部書換によるscheduled run停止（要オーナー裁定）

6b検証中に、main-serverのfactory cron（毎時17分）が**2026-07-16 23:17を最後に発火していなかった**ことをsyslogで確定した。今日13:17時点のcrontabにはfactory行が不存在で、13:17〜13:22の間に何者かがcrontabを全置換し、旧型`/usr/bin/node`（main-serverには不存在）のfactory行が復活していた。毎分実行の`Bell/scripts/deploy-poller.sh`によるcrontab管理が競合している可能性が高い。dotagentsの`factory-reporter-scheduler install --apply`で正規のNVM node行へ再登録済み（`crontab`実査green）。**crontabの共同管理境界（Bell⇔dotagents⇔ServerManager pull行）はオーナー裁定待ち**として残す。dotagents側のcron契約はmarker行の自管理置換だけで、他行を保全する設計は維持している。

### Wave 9 — 定常運用と完了

- Latticeへ移管済み: bf-0494 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L204
- Latticeへ移管済み: bf-0495 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L205
- Latticeへ移管済み: bf-0496 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L206
- Latticeへ移管済み: bf-0497 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L207
- Latticeへ移管済み: bf-0498 → docs/archive/lattice-source-ledger/bughub-factory-integration-cutover-20260719.md#L208

## 8. 実行経路と役割

- **F（親直轄）**: wire contractとmajor移行、product ID、認証、DB migration、severity、所有境界、本番deploy、MCP cutover、rollback、公開API後方互換。
- **A（native委譲）**: 仕様固定後のrepo別diagnostics/runtime store、adapter、fixture、dashboard、文書の逐語追従。
- **H（オーナー）**: dirty作業の裁定、秘密/token配置、ChatGPTログイン、hook trust、npm publish、全OSのscheduler/MCP実登録・解除、DB backupを伴う本番deploy、意図的障害試験、Oracle最終撤去、実端末rollback drill。

Codex親は対象repoをcwdにし、そのrepoのAGENTS.mdを読む。委譲レーン・外部子の安全/回収/受入は[委譲契約](../shared/orchestrate/delegation-contract.md)と[docs/02_models.md](02_models.md)の共通規則に従う（本planへ複製しない）。Claude親で実施する場合も、aitermを使うこと自体を「project native」の条件にはしない。

## 9. 非目標

- BugHubからの自動修復・自動rollback。
- 第三者製品のforkや内部実装への追従。
- Claude Code CLI、Codex CLI、Grok Buildを工場コア製品へ再分類すること。
- CLI version/update確認のためにsession/agentを起動し、prompt送信、login/logout、OAuth・release channel変更を行うこと。
- Oracle全preset・全CLI・全session metadataのバイト互換、またはOracleと`gpt-connector`の恒久併用。
- `gpt-connector`失敗時のOracle、OpenAI API、prompt本文展開への自動fallback。
- 全projectへのCodegraph index/Spotter activationの強制。
- session本文、prompt、秘密、生DB、生logの中央送信。
- ServerManagerをdotagentsと並ぶ別工場へ昇格すること。
- 既存アプリのBugHub pull契約を一斉にpushへ移行すること。
- factory report v1へのdelta追加、BugHub側からのfactory issue手動resolve。

## 10. rollback

- BugHub ingestionはfeature flagで無効化でき、既存pull collectorだけで起動できること。
- schema 4移行前のbuild失敗では稼働中の旧container・旧revision manifest・DBを変更しない。container切替時は旧image・旧manifest・quiesced DB backupを一組にし、candidate起動/readiness失敗時だけ自動復元する。
- candidateは`/readyz`成功後にsource revision一致のactivation markerをatomic保存するまで、HTTP書込みを503で拒否する。marker保存の成否がSSH切断で曖昧な時はACK済み書込み消失を避けるためDBを自動復元せず、candidateをfail closedのまま手動確認する。
- schema 4移行後に書込みを受理した環境の通常rollbackは、v2 scheduler停止（outbox保持）と`FACTORY_V2_INGEST_ENABLED=false`／`FACTORY_V2_VIEWS_ENABLED=false`で行い、schema 4対応code上のv1 endpointを継続する。旧schema 2 code＋旧DB復元は切替直後の自動復元以外に使わず、必要時はcutover後deltaの処遇を別途裁定する。
- 旧DB復元が必要な時はquiesce、cutover後delta export、factory report replay、既存pull/resolve差分の処遇をrunbook化し、単純なbackup上書きでcanary中のデータを失わない。
- reporterはschedulerから外して停止でき、outboxを保持したまま送信だけ止められること。
- 製品native diagnosticsは既存CLI挙動を変更せず追加入口に限定すること。
- Oracleを含むv1 endpointと`gpt-connector`を含む新major endpointをfeature flagで独立停止でき、server-first導入後も旧clientを互換期間中は受理できること。Oracle退役はglobal flagではなくhost別`factory-admin retire-oracle`、復帰は`restore-oracle`で行う。
- `gpt-connector`は前releaseとMCP command/envへ戻せること。必要時のOracle一時切戻しは手動・期限付きとし、BugHubのOracle履歴を削除せず、`gpt-connector`失敗から自動発動させないこと。
- Claude Code/Codexは直前の確認済みnpm versionへ明示再installでき、Grok Buildは`grok update --version <version>`で直前stableへ戻せること。rollback後も恒久pinにせず、BugHubへdowngrade理由と再更新待ちを明示すること。
- 各repo・各waveを独立commitにし、複数repoを一つの履歴操作で巻き戻さないこと。

## 11. 監査記録

2026-07-13、初版を矛盾/実現性と網羅性/実環境整合の2視点で監査した。

- 件数遷移: `Find 26 → Dedup 15 → existence/value反証 15 → Critic新規1（Dedup内に統合） → 生存15`
- 採用: lifecycle、offline時刻、enqueue-before-send、host期待matrix、credential lifecycle、通知false成功、rollback中データ、BugHub外通知、OS別scheduler/state、dedupe retention、outbox競合/overflow、runtime error wire、privacy negative gate、runbook drift、Oracle安全入口。
- 棄却: Oracle doctor不存在、sidecar diagnostics不存在、aiterm Windows非対応、Caveat/Throughline dirty記載誤り、ServerManager wave欠落、image rebuild記載欠落。いずれも実物と合わないため棄却。
- 親裁定: 既存pull＋新規pushの二経路、第三者非改造、自作製品local error、外部利用者telemetry既定OFFを維持。上記15件を計画へ反映した。

2026-07-13、Oracle→`gpt-connector`確定裁定を受け、親自身で反対仮説を検証してWave 6を追加した。独立refuterは未使用。

- 反証1「既存Oracle adapterを`gpt-connector`へ文字列置換すればよい」: 棄却。`gpt-connector`は自作製品であり、native diagnostics、runtime error store、release、privacy契約まで所有する必要がある。
- 反証2「固定9製品のv1へoptional `gpt-connector` keyを足せばよい」: 棄却。現行contractはproduct exact keysを検証しており、product集合変更は既存client/server双方の意味を変えるためwire majorである。
- 反証3「Oracle履歴を削除して同じproduct slotへ上書きすればよい」: 棄却。別製品のversion・issue・fingerprint履歴が混線し、退役・再発・rollbackを検証不能にする。
- 反証4「製品側を先に公開し、BugHubは後追いでよい」: 棄却。新majorを受理できないserverへclientを先行させるとreport不能になるため、server-first dual-runを維持する。
- 反証5「Claude Code／Codex／Grok Buildもコア製品へ足してコア12と呼べばよい」: 棄却。3製品は工場能力そのものではなく、その能力を動かす交換可能な基盤toolchainであり、所有境界と変更管理を混同する。
- 反証6「`agents-update`のlogに名前があればBugHub productは不要」: 棄却。logだけではhost×productのcurrent/history、latest差、互換性、resolve/reopen、通知を一意に管理できない。
- 反証7「Grok Buildもnpm `@latest`へ入れればよい」: 棄却。実体は`~/.grok/bin/grok`のinternal installerで、正規更新面はmachine-readable checkを備えた`grok update`である。

2026-07-14、rollout直前に独立refuterでserver-first、schema rollback、client v1復帰、Oracle host別退役、deploy transactionを再監査した。初回指摘の誤flag/order、build前manifest更新、schema 4後の旧code rollback、v1 scheduler復帰不能、global Oracle flagを修正した後、deploy failure pathからremote command構文、旧containerなし、activation前ACK消失、modern旧imageのliveness誤判定、WAL copy失敗の成功扱いを追加検出した。write activation gate、quiesced atomic snapshot、old有無分岐、modern/legacy readiness分岐、remote `set -euo pipefail`と実shell構文fixtureへ直し、最終再反証でP0/P1なしを確認した。
