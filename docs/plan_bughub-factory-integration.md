# 工場コア9製品＋基盤CLI 3製品 BugHub 統合計画

作成: 2026-07-13  
状態: 実装中（Wave 0〜5のrepo実装は完了、実環境登録はWave 8へ継続。Oracle→gpt-connector置換と基盤CLI 3製品追加をWave 6へ収録し、Wave 7以降を継続中）
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

- [x] 端末能力8製品、ServerManager、基盤CLI 3製品について、製品別のversion・diagnostics・state/schema・migration・互換性契約が有限表になっている
- [x] 4環境×12管理製品の期待状態（required / optional / forbidden / unsupported）、期待connector、欠落時severityが一意なmatrixになっている
- [ ] Mac、main-server、FOX WSL2、FOX Windows nativeの4環境が、認証付きでBugHubへ観測結果を報告できる
- [x] BugHubにhost×productの現在値と履歴があり、installed/latest・contract・schema・update・compatibilityの状態を区別できる
- [x] 互換異常は既存BugHubのfingerprint・severity・再発・解決・Discord・`/ai`へ統合される
- [x] 既存4アプリのpull巡回・重大度・resolve/reopen・dashboard・日次/週次通知に回帰がない
- [x] 第三者製品をfork、`node_modules`パッチ、内部DB決め打ちで改造していない
- [x] 自作製品は機械可読な正規diagnosticsを製品側に持ち、dotagentsが内部状態を勝手に解釈しない
- [x] 自作製品をクオ管理端末で実利用した時の構造化errorを、入力本文・秘密・ファイル内容なしでローカル記録し、dotagents reporter経由でBugHubへ集約できる
- [x] `gpt-connector`がversioned native factory diagnosticsとopt-inのlocal runtime error storeを製品側で所有し、dotagentsが内部stateやChatGPT会話を解析せずBugHubへ投影できる
- [ ] factory wireをserver-firstの新majorへ移行し、固定管理集合をv1のコア9から「Oracleを`gpt-connector`へ置換したコア9＋基盤CLI 3」の12製品へ拡張しても、旧client、Oracle履歴、resolve/reopen、dashboard、通知が壊れない
- [ ] Claude Code CLI、Codex CLI、Grok Buildについて、installed/latest、更新前後version、update成否、対応host、親別互換性をBugHubで追跡し、1製品の更新失敗を他製品の成功で隠さない
- [ ] 全現役hostで`gpt-connector`の導入・更新・診断・期待connector・MCPをmatrixどおり検証し、Oracleへの暗黙fallbackなしで切替とrollback drillを完了する
- [x] 公開製品の外部利用者からは明示opt-inなしにtelemetryを送らない
- [x] BugHub自身をBugHubの自己申告だけで合格させず、main-server上の外部runnerがServerManager/BugHubを検証する
- [x] 報告不能時は端末ローカルのdotagents所有outboxへ保持し、成功扱いせず、復旧後に冪等再送できる
- [ ] 更新後contract gateと定期read-only gateがgreenになり、失敗製品・host・検査項目をBugHubとローカルlogで特定できる
- [ ] 自作製品のfactory diagnostics/runtime error契約が各端末の正規配布版へ収録され、repo HEADだけに存在する未公開実装へ依存していない
- [ ] 各repoを独立commit・独立rollback可能なwaveで実装し、全remoteへpushして真実を返している
- [ ] 最終反証、全端末E2E、本番canary、rollback drillを完了し、本計画を`docs/archive/`へ退避している

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

- [x] 当時はaudit-gauntletの指摘を反映したが、同skillは2026-07-14に過大結果のため廃止された。
  この監査結果は現在の完了根拠として扱わず、本計画を再変更する際は実ファイルとテストから再検証する。
- [x] 9製品とdotagents/ServerManagerでfetch→origin照合→stash→dirtyを記録
- [x] Caveatの並行dirtyはオーナー/作業sessionの完了までロックし、収容・破棄を勝手に行わない
- [x] Throughline `.agents/` の所有意図を確認し、無関係なら触らず作業範囲を分離
- [x] 4 host×9 productのrequired/optional/forbidden/unsupported matrixと期待connectorを`docs/factory-host-product-matrix.md`へ正本化
- [x] ServerManager BugHubの現行pull、DB、通知、`/ai`、deployをcharacterizationする
- [x] `INTEGRATION.md`の`master` URL、ServerManager AGENTSの`origin master`例、BugHub README/deploy commentの旧`~/projects` pathを現行`main`/`~/Developer`へ照合・訂正
- [x] 文書にだけある`auctionbot` adapter記載を実registryと照合し、実在する入口だけに訂正

### Wave 1 — ServerManagerの安全網とprotocol（F中心）

- [x] BugHubにCIと実SQLite characterization testを先に追加
- [x] 既存4sourceのpoll、severity素通し、再発、resolve表示、digest、`/ai`を固定
- [x] Discord送信が`false`の時に`markAlerted`しないこと、delivery failureを記録・再通知できることを固定
- [x] versioned DB migration runner、backup/restore test、schema versionを追加
- [x] 既存signature契約との対応表、factory report JSON Schema、severity判定表、fingerprint規則、privacy allowlist、認証、冪等、host binding、size/time validationを仕様化
- [x] 可変値違い、類似別原因、resolve後再発、秘密混入、重複retryのcontract fixtureを先にgreenにし、製品instrumentation開始gateにする
- [x] host credentialのprovision/rotate/revokeと401/403、紛失host廃止をfixture化
- [x] `deploy.sh`の`rsync --delete`をdry-run必須にし、image rebuildとhealth確認を固定

### Wave 2 — dotagents reporter骨格（F＋A）

- [x] 9製品adapterからのreport生成を実装
- [x] schema検証・送信・outbox・retry・上限を実装
- [x] fake BugHubで成功、401、schema reject、timeout、duplicate、outbox再送をテスト
- [x] enqueue-before-send、single-flight、overflow、dead-letter、応答消失をテスト
- [x] 受理後・削除前failureの同一bytes再送と、server dedupe retention（outbox上限超・期限前後prune）をテスト
- [x] host ID/tokenをrepoへ保存しない設定・rotation・revoke手順を追加
- [x] Mac launchd、Linux/WSL cron、Windows Task Schedulerのinstall/uninstallとOS別state/ACL契約を実装・fixture化
- [ ] 4環境でschedulerをH承認後に実登録し、実火・uninstall・state/ACLを確認
- [x] `agents-update`後にcontract scan→reportを接続し、update失敗後も観測と報告を試行して最終的に非0終了

### Wave 3 — 第三者3製品adapter（A、完了済み旧Oracle契約を含む）

- [x] Codegraph: version＋既存index限定status。index無しは`skipped:not-indexed`
- [x] MarkItDown: version＋local fixture byte判定。JS URLはhealth fixtureに使わない
- [x] Oracle: version＋wrapper＋`doctor --providers --json`。認証依存を区別しconsult/status禁止。2026-07-13の置換裁定によりWave 6で退役対象へ変更
- [x] upstream version drift fixtureとunsupported表現を固定

### Wave 4 — 当時の自作5製品のnative diagnostics（repo別A、契約はF）

- [x] Caveat: DB schema/migration/own sync/Claude MCP・hook/Codex native hookの機械可読診断
- [x] Throughline: state schema/hook/代表smokeの機械可読診断
- [x] Spotter: 既存doctor/status/Codex diagnosticsの統合JSONまたはadapter契約
- [x] aiterm-mcp: versionとMCP/PTY/vendor readinessのread-only診断
- [x] codex-sidecar: package整合、diagnostics/dry-run、result schema/model policy診断
- [x] 各製品で既存error log/診断を棚卸し、共通fieldへ安全に出せるものだけlocal structured error storeへ接続
  - [x] Throughline、Spotter、aiterm-mcp、codex-sidecarは、明示opt-in、local store、resolution、cursor/ack、retentionを製品側の公開CLI契約として実装
  - [x] Caveatもロック解除後の独立waveで明示opt-in、local store、resolution、cursor/ack、retentionを実装
- [x] `collection.enabled`と`reporting.enabled`を分離し、送信が既定OFF、明示ON時だけnetwork I/Oすることをfixtureと文書で固定
- [x] stderr、生stack、例外オブジェクトの丸投げと、同じ失敗の複数layer計上をnegative fixtureで拒否
- [x] 各repoでbaseline green→characterization→実装→full gate→独立commit→push
  - [x] Throughline、Spotter、aiterm-mcp、codex-sidecarは独立commit・push・full gate・独立反証まで完了
  - [x] Caveatもbaseline→characterization→実装→full gate→独立commit/pushを完了

### Wave 5 — BugHub ingestion・表示・通知（F＋A）

- [x] `POST /api/factory/v1/reports`とfactory DBを実装
- [x] v1 full snapshot、check lifecycle、消失だけでは非resolve、producer明示resolve、再観測reopen、host廃止、長期offlineの状態遷移を固定
- [x] deltaとBugHub側manual resolveをv1非目標とし、将来schema majorの互換設計へ分離
- [x] check failureを既存issueへhost付きで統合し、明示resolve、再観測reopen、古いoffline観測による巻き戻し拒否を固定
- [x] runtime errorのack/cursor/retentionを全自作製品で固定
  - [x] 完了済み4製品はBugHubの同一report受理後だけackし、ack失敗は非0・単一atomic outbox envelope保持・duplicate再受理後再試行とする
  - [x] Caveatも製品側storeと接続し、同一report受理後だけackする
- [x] runtime adapter/outbox契約を独立反証し、collection OFF時のqueue drain、二ファイルorphan、ack失敗のfalse successがないことを確認
- [x] dashboardにhost×product matrix、version履歴、latest/compat/schema状態を追加
- [x] `/ai`とDiscord/daily/weeklyへ修正先repo・host・product・fingerprintを追加
- [x] 既存pull sourceとの後方互換testを通す

### Wave 6 — gpt-connector製品適合・Oracle置換・基盤CLI 3製品追加（F＋repo別A＋H）

このwaveは`gpt-connector`、dotagents、ServerManagerの3repoを独立commit・独立rollback可能に保つ。挙動不変のcharacterization／adapter追加と、収集開始・wire major・MCP切替・Oracle撤去の挙動修正を混ぜない。

#### 6.0 正本・baseline・契約固定（挙動不変）

- [x] オーナー裁定としてOracle→`gpt-connector`置換を確定し、Oracle継続・併用を選択肢から外す
- [x] オーナー裁定としてClaude Code CLI、Codex CLI、Grok BuildをBugHubのversion/update/compatibility管理対象へ追加し、コア製品とは別区分に置く
- [x] 工場コア製品を正規入口で実利用中に再現した欠陥は、所有repoの正本TODOへ追加し、独立gate・独立commitで修正してから本筋へ戻ることをオーナー恒久裁定として固定する。単なる気づきや大掃除へ拡張せず、publish・本番deploy・credential/login・意図的障害試験は引き続きHとする
- [x] オーナー裁定として、Codex親はnative同時実行上限（親を含む4枠）を全体上限とせず、external executionとして`codex-sidecar`とaiterm上のCodex/Grok/Composerを積極利用する。限界突破目的の入れ子Codexを許可し、旧「Codex親はnative一択・aiterm/MCP経由の入れ子Codex禁止」を撤回する。`gpt-connector`はconsultation専用でworkerには数えない
- [x] `gpt-connector@0.2.0`の通常Chat、正規添付、model/effort、冪等job、terminal回収、read-only diagnostics、Oracle互換`consult`/`sessions`を実ブラウザと配布物で確認する
- [x] Oracleとの同一prompt＋2添付shadowで、`gpt-connector`成功、Oracle upload timeoutを確認し、Oracleへ自動fallbackしないことを確認する
- [x] 3 CLIの正規version/update入口を実測する。Claude Code=`@anthropic-ai/claude-code@latest`、Codex=`@openai/codex@latest`、Grok Build=`grok update --stable`／read-only `--check --json`
- [x] `gpt-connector` repoの`docs/`へ本waveの製品側TODO正本を作り、既存AI installer作業と書き込み範囲・commitを分離する
- [x] 3repoでfetch、origin照合、stash、dirty、baseline full gateを取り、`gpt-connector`の`doctor`／`consult`／`sessions`／MCP tool schemaとdotagents v1 reporterをcharacterizationする

#### 6.1 gpt-connector native factory契約（製品側A、契約はF）

- [x] 既存`gpt-connector.diagnostics.v1`を壊さず、`gpt-connector factory-diagnostics --json`相当のversioned read-only入口を追加する。version、diagnostic schema、overall、state/job schemaとmigration、CDP、official origin、auth、runtime bridge、MCP contractを固定check IDで返す
- [x] factory diagnosticsはChrome/CDP/auth未準備を`not_ready`、host非対応を`unsupported`、未検証を`unverified`として区別し、upload・conversation・archive・job作成を一切行わない
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

#### 6.2 基盤CLI 3製品のversion/update契約（repo内A、契約はF）

- [x] product IDを`claude-code`、`codex-cli`、`grok-build`へ固定し、製品表示名、所有者、修正先、version形式、update入口、latest取得、host期待、severityを有限表へ追加する
- [x] Claude CodeとCodexは`agents-update`の既存npm `@latest`処理を維持し、更新前version、registry latest、install結果、更新後version、post-update互換gateを製品別に記録する。registry不能・install失敗・version不一致を別reason codeにする
- [x] Grok Buildはnpm対象へ入れず、`grok update --check --json`でcurrent/latest/updateAvailable/channel/installer/autoUpdate/errorを検証してから`grok update --stable`を実行し、更新後`grok --version`と再checkを記録する。alpha channelへ自動切替せず、更新不能時はfail-loudにする
- [x] 1製品の更新失敗後も残り製品の更新とfactory reportを継続するが、最終exitは非0にし、成功製品だけで全体をgreenへしない。更新logとBugHub observationは同じproduct ID/reason codeへ対応させる
- [x] Claude Codeは必須hook/settings、Codexはconfig parser/hooks/native routing、Grok Buildはstable channelとaiterm/headless入口をread-only fixtureで検証する。session/agent起動、prompt送信、login/logout、OAuth変更をhealth checkに使わない
- [x] host matrixでClaude Code/Codex/Grok Buildのrequired/optional/unsupportedを個別に決め、optional hostのmissingをissue化せず、required hostのmissing/update failure/compat driftだけを所定severityへ写像する
- [x] npm registry JSONとGrok `--check --json`のschema drift、未知version、downgrade、部分更新、更新後CLI消失、PATH shadowをfixture化し、人間向けstdout解析や無根拠なlatest推測を禁止する
  - [x] npm latestをJSON stringのexact semverだけへ束縛し、registry不明時はClaude/Codexのinstallを開始しない。
  - [x] installed > latestを`downgrade_refused`で拒否し、他製品の更新と最終reportは継続する。
  - [x] Grokのexact keys、`installer=internal`、stable channel、error null、version大小と`updateAvailable`の
    一貫性をscanner／updater共通validatorへ固定する。
  - [x] schema drift、未知version、downgrade、部分失敗、更新後CLI消失、PATH shadowのfocused fixtureを通し、
    [ADR 0011](adr/0011-toolchain-update-version-contract.md)の契約を
    [受入receipt ADR 0012](adr/0012-toolchain-update-version-acceptance.md)へ固定した（`fc3bf3f`、related Node 17/17）。

#### 6.3 ServerManager/BugHubのserver-first互換面（F）

- [x] 固定product集合の変更をwire majorとして扱い、Oracleを含むv1コア9を維持したまま、`gpt-connector`を含むコア9＋基盤CLI 3の固定12製品schema・別endpoint・fixture・client/server compatibility matrixを追加する
- [x] host profile期待matrix、current/history、dashboard、Discord/daily/weekly、`/ai`、修正先repoを`gpt-connector`と基盤CLI 3製品へ対応させ、Oracle履歴と既存issue/fingerprintを削除・上書きしない
- [x] v1最終Oracle `not_applicable`＋明示resolution、新major最初の`gpt-connector`＋基盤CLI 3製品を含む固定12製品full snapshot、旧観測の遅着、重複retry、resolve後再発、schema片側停止をcharacterizationする
- [x] BugHub readinessの期待DB schemaを最新migrationと一致させ、既存のv1 factory issue fingerprint saltを維持して再導入時に履歴を孤児化しない回帰testを通す
- [x] Oracle退役状態をglobal booleanではなくhost別cutover状態として保持し、移行済みhostだけを`not_applicable`にしつつ未移行hostのv1観測を早期免除しない
- [x] v1/new-major dual-run中のDB backup/restore、endpoint feature flag、revision attestation、canary、旧major retire条件をランブックへ追加する

#### 6.4 dotagents配線と正典（repo内A、契約はF）

- [x] `PRODUCT_IDS`、factory scan/reporter、runtime ack、ServerManager adapter、privacy allowlist、fixture、host-product matrixを新majorの`gpt-connector`＋基盤CLI 3契約へ更新する。v1 Oracle clientは互換期間だけ独立入口として保持する
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
  - [x] Claude親（Mac・2026-07-18新規session）: `gpt-connector.diagnostics.v1` overall=`ready`・authenticated・CDP connected。同sessionでClaude hook smoke／Codex hook smoke両方ALL PASS、callout hook C系の実火（SessionStart／UserPromptSubmit／PreToolUse各INFO初回発火・依頼範囲非拡張）も確認。Codex親の新規session実火はR2残E2Eで実施
- [x] Codex親の委譲をnative／外部実行／相談の3レーンへ正典化し、外部子のtask ID・timeout回収・writer worktree隔離・git操作禁止・秘密/H非委譲・親受入れgateを`codex/AGENTS.md`、`orchestrate`、モデル表、Codex断片、host/product契約へ同期する（`1e8f9fb`、`make ci` green）
- [ ] Codex親の`codex-sidecar`／aiterm connectorをsupportedとして導入・検証面へ配線し、installed→registered→verified→execution-verifiedを区別する。aitermのGrok/Composer各2回、別Codex、codex-sidecar、gpt-connectorの回収smokeを通すまでwriter利用をgreenにしない
  - [x] このMacのCodex親へ`codex-sidecar` 0.3.7をH承認下で登録し、MCP initialize、12 toolの`tools/list`、factory diagnostics `overall=ready`を確認してverifiedまで上げた。現sessionのtool面は起動時固定のためexecution-verifiedは新規sessionへ残す
  - [x] 同じMacで配布CLIの`codex-sidecar review`を明示Terra×medium・read-onlyで完遂し、三レーン正典diffを独立レビューした。read-only external executionはexecution-verified、writerは`codex_work`未実証として未verifiedに分離する
  - [x] aitermの配布0.12.2で別CodexをTerra×medium・read-only診断へ起動し、`agent_done`とtranscript回収後にcloseした。0.12.3隔離tgzから実Grok/Composerを各2回起動して4/4を確認し、公開npm 0.12.3の隔離install後もGrok/Composerを各1回、期待応答・`agent_done`・再認証要求なし・closeまで通した

#### 6.5 shadow、cutover、撤去（H＋F）

- [ ] 代表fixture（添付なし/あり、standard/extended/max、timeout、auth loss、runtime drift、process restart）を全対象hostの期待matrixどおりshadowし、requested/resolved model/effort、terminal回収、archive、privacyを確認する。OracleやAPIへ再送・fallbackしない
- [ ] hostごとにv1 Oracle最終snapshot→MCP切替→新major 12製品初回snapshotを順序付きで実行し、`gpt-connector`と基盤CLI 3製品のBugHub current/history、通知、resolve/reopenを確認する
- [ ] 全host greenとH承認後だけOracle package、更新対象、MCP登録、wrapper/shim、skill配布を外す。削除前に`rg -a`と利用可能な索引でconsumerを確認し、Oracle履歴・archive/RAGは保持する
- [ ] rollback drillは新major送信停止、前`gpt-connector` release/MCP設定への復帰、必要時のOracle command一時切戻しを分けて実証する。一時切戻しでOracleを正規コアへ戻したり、自動fallbackを追加したりしない
- [ ] gpt-connector、dotagents、ServerManagerのfull gate、registry由来install、BugHub canary、全host E2E、独立反証を通し、各repoを独立commit/pushする

### Wave 7 — ServerManager/BugHub自己監視（F）

- [x] main-server上のdotagents reporterからBugHubを外部probe
  - [x] loopback `/readyz`限定の外部probe CLIとserver profile adapter、SSRF/privacy/contract fixtureを実装
  - [x] main-serverへ配布し、実reportでServerManagerの6 readiness check（DB/schema/pull/ingest/delivery/revision）を確認
- [x] BugHub停止、stale poll、DB migration失敗、image/source不一致をfixture化
  - [x] stale pull、source未設定、DB query/schema mismatch、factory ingest/delivery stale・失敗を`/readyz`の固定reason codeでfixture化
  - [x] process停止・到達不能を外部probeの`unreachable`としてfixture化
  - [x] image/source一致はrebuild済み判定と分離し、build時source revisionをOCI labelとread-only readiness fieldへ焼き込み、main-serverのdeploy manifestに保存した期待revisionと外部probeで比較する
  - [x] revision欠落・不正・期待値不一致を固定reason codeへ写像し、Docker restartだけでは一致扱いにしないfixtureを追加
- [ ] BugHub停止中のoutbox保持→復旧後再送を実測
- [x] readinessをDB query、poll/ingest鮮度、source error、pull/factory通知deliveryまで拡張し、Docker healthcheckとdeploy canaryを`/readyz`へ接続
- [ ] BugHub停止/readiness failureはBugHubを経由しないPi5→Discord専用bridgeで通知し、復旧後に同じfingerprintをBugHubへ還流
  - [x] 専用bridgeは既存の監視抑止に入る時に未trigger観測窓だけを切り、`/readyz`をDocker health retryとは独立した60秒tickerで観測する。trigger済みeventは保持し、抑止解除後2連続失敗（通常約120秒）で通知を試行し、配送失敗はtimeout付きでdurable retryする。自動restartは行わず、既存Layer 3の3周期観測・restart責務を奪わない
  - [x] `sha256(servermanager:<check_id>:<reason_code>)`（process到達不能は固定`availability:unreachable`）をdurable eventとしてPi5に保存し、dotagents所有の明示connector CLI経由でmain-server reporterへopen/resolveを渡す
  - [x] Discord成功とBugHub還流成功を別ackにし、片方の失敗をもう片方の成功で消さない。復旧後もBugHub accepted確認までeventを保持する
  - [x] main-serverのexternal-event connectorとPi5のbridge/tickerを配布し、実`/readyz` ready状態で120秒間にstate mtimeが2回進み、events空・connector pending 0を維持するnormal canaryを確認する
  - [x] Pi5 bridge/ticker本体の所有repo、immutable commit/path、`run(deps)` fixtureを受け入れ、再配布／rollback可能なsource契約を固定する。ServerManager `74c315b`／`b3ac6da`、focused 12＋4件、[ADR 0021](adr/0021-servermanager-pi5-bughub-bridge-receipt.md)を証拠とし、意図的canaryはH-only残件へ分離する
  - [ ] Wave 8.6a/6bの分離済み意図的canaryで、transient誤openなしとDiscord通知→BugHub accepted→resolve→isolated state削除をそれぞれ実証する

### Wave 8 — 4環境canary rollout（H＋F）

0. [x] H承認後、repo実装済み・公開版未収録のThroughline、Spotter、aiterm-mcpと、今回追加するCaveatのfactory契約を独立releaseし、npm `latest`・packed install smoke・`--version`・native diagnostics/runtime snapshotを確認する（codex-sidecarはv0.3.6へ収録済み）
   - 2026-07-13: Throughline `0.6.2`（`e6ce6e3` / CI `29238704750`）、Spotter `1.4.23`（`a117a99` / CI `29238199094`）、Caveat `0.16.3`（`8f06d17` / CI `29238199765`）をnpm `latest`、annotated tag、GitHub Releaseへ公開した。
   - aiterm-mcp `0.12.2`（`239e7e4`）はtag CI `29245251184`のTrusted Publishingでnpmへ公開し、Release起点のMCP Registry workflow `29245462227`もgreen。4製品をregistry由来の隔離prefixへinstallし、version、native diagnostics、runtime snapshotを確認した。collectionは既定OFFで、このsmokeから外部送信は発生しない。
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
1d. [x] macOS schedulerはHomebrew Cellarのversion固定Nodeではなくstable symlinkを保存し、stable入口欠落時は登録前に明示失敗する
1e. [x] v1 reporterもHTTP/network/timeoutによる保持とpermanent rejectのdead-letterを送信失敗として非0終了し、rollback schedulerがfalse successにしない
1f. [x] v2 scannerは全製品の観測完了後にreportのobserved_atを確定し、gpt-connectorの診断failureと並行runtime eventを未来timestampにしない
1g. [x] FOX Windows native実機で`factory-reporter-v2 enqueue`のowner-only ACL適用が失敗する経路を根治し、current-SID-onlyのdirectory/file契約、秘密非表示、非0 fail-loudを維持したWindows回帰testと実機scan→enqueue→flushを通す
1h. [x] `agents-update`を配布symlinkから起動するとtoolchain ledger helperを`.mjs`付きで誤参照する欠陥を直し、source直実行と`~/.local/bin`配布入口の双方でClaude Code／Codex CLI／Grok Build台帳とpost-update reportを確定する
1i. [x] FOX Windows nativeでnpm `.cmd` shimをNodeの直接spawnが解決できず導入済み製品を`missing`へ誤投影する欠陥を、固定CLI・引数非再解釈・timeout/output上限を保つ共通command runnerで直し、12製品matrixを実機再送する
1j. [x] `agents-update`が追加する`/usr/local/bin`でWSLの正規npm global CLIをshadowし、Claude Code更新後versionを旧入口から読む欠陥を直す。検証済み`npm prefix -g`のbinを更新・version確認の同一入口にし、PATH shadowをfixtureと実host ledgerで閉じる
1k. [ ] registry公開版のThroughline／Spotter／aiterm-mcp／codex-sidecar native diagnosticsとdotagents v2 adapterのschema driftを、製品側正本とexact validatorを保ったまま同期し、main-serverのCaveat診断とGrok Build導入状態も分離して全host post-update gateをgreenにする
   - [x] aiterm-mcpのmanaged `GROK_HOME`でOAuth承認結果が一時homeへ取り残される欠陥を、Grok公式 `GROK_AUTH_PATH` 経路へ置換してreleaseする（完了正本: aiterm-mcp `docs/archive/14_grok-auth-path-plan.md`）
     - [x] 製品repoでruntime-store高競合/hostile-input修正`c1a2623`、auth経路`ab11eb7`、長文PTY送信`42cf4af`、chunk直列化とstale-lock fail-closed`5c6b79a`を独立commitした。ローカル240/240、長文・別process送信10連続、tgz隔離MCP、Grok/Composer各2回の再認証なし`agent_done`、旧8-process条件の再反証P0/P1なしまで確認した
     - [x] `v0.12.3`を`52264c3`へ固定し、tag CI `29300067245`の8 test jobとTrusted Publishingをgreenにした。npm 0.12.3、GitHub Release、MCP Registry workflow `29300266525`、Registry `isLatest=true`、公開版MCP 10 tools＋Grok/Composer実smokeを確認。Mac正規CLIを0.12.3へ更新し、v1 reporterでBugHubへ送信後、`mac-kite/aiterm-mcp`が0.12.3・installed・compatible、outbox 0・ACK failure 0であることをreadbackした
1m. [ ] Throughline factory diagnosticsの製品修正を受け入れ、残るhost導入・readinessを全host gateで閉じる
   - [x] `events=ready`なのにsummary=`unverified`となるproducer矛盾を製品repoのcharacterization→修正→patch releaseで閉じた。Throughline `f928c13`、v0.6.3 tag `fc83ddf`、公開記録`fe8ea87`、focused 15/15を[ADR 0013](adr/0013-throughline-diagnostics-product-receipt.md)で受け入れた
   - [ ] main-serverへ正規hookを導入し、factory diagnosticsを再観測する（実host applyはH）
   - [ ] Macのhandoff readinessを実配布物で再観測する（実host scan/reportはR2 host receiptへ合流）
   - [x] FOX WSL2でv0.6.3以降のproducer出力を再観測し、旧`events=ready`／summary=`unverified`観測を解消する（実host scan/reportはR2 host receiptへ合流）
     - 2026-07-17 FOX WSL2実機（read-only `throughline factory-diagnostics --json` v0.6.3）: `overall.status=ready`・
       `hooks.events`（userPromptSubmit/postToolUse/stop）全`ready`で整合し、旧`events=ready`／summary=`unverified`矛盾は解消。
       残る`connectors.claude=unverified`（reason=`diagnostic_unverified`）は1oの正当な非ブロッキングtuple（headless Claude connector）で別物。
       formalなhost scan/report receiptはR2（H）へ合流。
1n. [x] Windows共通command runnerのnpm shim解決を実物cmd-shim variantへ追従し、PATH／shimのfilesystem解決も5秒全体deadline内のkill可能helperへ隔離して、UNC・late spawn・悪意あるshimをfail-loudに拒否する
1o. [x] native diagnosticsを単一overall checkへ潰さずThroughline／Spotter／aiterm-mcpのcomponent別checkへ安全に投影し、report/BugHubでは`unverified`を保持する。gateはdefault-denyのまま、Spotterの人手trust、Throughlineのadvisory evidence/Claude connector、headless aitermのPTY観測不能という完全tupleだけをnonblockingにする
1p. [ ] Windows factory ACLのローカル修正を受け入れ、FOX Windows native実機receiptで閉じる
   - [x] toolchain ledger、v2 schedule runner、Task Scheduler control artifactをreporter本体と同じ`Set-Acl -LiteralPath`系current-SID-only契約へ統一した。ACL済みtemporary ledgerのrename後再適用を除去し、PowerShell失敗を固定reasonでfail-loudにした（`39fba73`、focused 31/31、[ADR 0014](adr/0014-windows-factory-acl-local-receipt.md)）
   - [ ] FOX Windows nativeでledger生成→post-update scan/gate/enqueue/flush→scheduler dry-run/applyを実機再確認する（credential／実host applyはH）
1q. [ ] Windows npm shim resolverのローカル修正を受け入れ、FOX Windows native実機receiptで閉じる
   - [x] 現行npm global `.cmd`の2スペース`_prog`と旧1スペース形をexact allowlistへ固定し、PATHEXT許可外候補を実行せず`.exe`／検証済みnpm `.cmd`だけへ限定した。悪意あるshim拒否、5秒全体deadline、`node_modules`内regular-file／realpath検証を維持した（`5f781a8`、`5479a73`、focused 5/5、[ADR 0015](adr/0015-windows-npm-shim-local-receipt.md)）
   - [ ] FOX Windows nativeの実配布版で12製品scan／post-update gateを再送する（実host scan/reportはH/R2）
1r. [ ] Codex SidecarのWindows npm `.cmd`診断修正を実配布版でFOX Windows nativeへ反映し、12製品scan→post-update gate→enqueue/flush→Task Scheduler dry-run/applyを再送する
   - [x] 0.3.6の`factory-diagnostics`が`spawn("codex-sidecar-mcp")`を直呼びし、MCP initialize可能なのに`packageVersions=unverified`へ誤投影する欠陥を製品側で根治した。固定command・引数非再解釈・timeout・出力上限・fail-loudを維持したWindows回帰test、pack/install smoke、独立反証を通し、Codex Sidecar 3 packageをnpm `0.3.7`、tag `v0.3.7`、global CLI `0.3.7`へ公開・検証した。実diffとfocused 18/18は[ADR 0017](adr/0017-codex-sidecar-windows-mcp-product-receipt.md)で受け入れた
   - [ ] FOX Windows nativeの実配布版で12製品scan→post-update gate→enqueue/flush→Task Scheduler dry-run/applyを再送する
1s. [ ] Macの対話shellではBugHubへHTTP 200なのにuser launchd配下だけLocal Network Privacyで遮断される実機差を、Apple TN3179の管理端末向けCIDR例外で解消する。現在の実経路`en5`（USB Ethernet）だけを対象に、root所有のCurrentUser defaults domainをLocal Network Privacyがsystem-wide設定として特別に消費する契約どおり、`AllowedEthernetLocalNetworkAddresses`へ`192.168.1.2/32`を追加し、Wi-Fi側は変更しない。再起動後にlaunchd childの実送信canaryを通し、rollbackは対象entry削除＋再起動とする
   - [x] `sudo defaults write`後、`/var/root/Library/Preferences/com.apple.network.local-network.plist`のarray値を管理者権限で実読し、`/Library/Preferences`と通常user domainが不存在であるAppleの特殊保存契約を独立反証込みで確認した。残りはMac再起動後の非root launchd child canary
   - [x] 2026-07-18消化: Mac再起動（uptime 1 day）後の非root launchd child（`launchctl kickstart gui/501/com.kite.factory-reporter`）から本番BugHubへの実送信が成功（flush sent=1・ack_failed=0）し、CIDR例外の再起動後有効化を実証した
2. [x] 2026-07-18消化: `retire-oracle mac-kite`→`--oracle-retired`最終v1 snapshot（report `62bbdb71`、server実査でoracle=`not_applicable`）→config endpointをv2へ→v2初回12製品full snapshot（report `b4e770cd`、`factory_v2_observations` 12行・`factory_v2_current`反映を実査）→launchd dry-run→apply→launchd実contextのscheduled run実火（post_gate success）→state 0700確認。uninstall確認は2a drillで実施
2a. [x] 2026-07-18消化: v2 scheduler uninstall dry-run→apply（outbox 0保持）→config v1化→`restore-oracle`→v1 scheduler install dry-run→apply→launchd実contextでv1 full scan（oracle観測込み10330 bytes）送信受理→`retire-oracle`→`--oracle-retired`最終snapshot（report `75e82296`）受理→config v2化→v1 scheduler撤去→v2 scheduler apply→v2 scheduled run受理。oracle v1履歴8件保持・oracle open issue 0・v2 current missing 0で二重化なしを実査
   - **P1実被弾と根本修理（2026-07-18・`8d17dcc`）**: launchd/cronの最小PATHでscheduled runnerが製品CLIをENOENTとし、Mac・main-server・FOX WSL2の3hostで本番`factory_v2_current`をほぼ全製品`missing`へ汚染していた（過去の「scheduled run確認」は実行成立のみで観測品質を未検証だった＝正直に記録）。`lib/factory/scheduler-path.mjs`で既存PATH優先順位を変えない末尾補完をv1/v2両runnerへ適用し、focused 28/28 green。3hostとも正規経路の再実行でcurrent回復（missing 0）を実査済み
3. [x] main-server client: Hでtoken/config opt-in → Fでscheduler未登録のmanual v2受理、BugHub自身を含むコア9＋基盤CLI 3の全12管理製品とrevision attestationを確認 → cron dry-run/apply → scheduled runを確認
4. [x] FOX WSL2: Hでtoken/config opt-in → Fでscheduler未登録のread-only scan/preview/enqueue/flush、outbox/再送を確認 → cron dry-run/apply → 実火・uninstall・state権限を確認（`fox-wsl`直SSHのbanner timeoutは未解決の別blockerとして残し、Windows hostの正規`wsl.exe -d Ubuntu-26.04`入口でrolloutを実施）
5. [x] 2026-07-18消化: token/config opt-in済みを確認（endpoint v2・host.id=`windows-workstation`でWSLと非混同）→manual scan/preview/enqueue/flush green（report `64fab75a`・missing 0・sent=1）→Task Scheduler dry-run→apply→`schtasks /Run`実火（LastTaskResult=0・report再生成・outbox 0）→uninstall（Get-ScheduledTask消失）→再apply。本番`/readyz`は全check `ready`へ回復（factory_ingest stale解消）
   - **実機P1×2の根本修理**: ①`schtasks /Create /XML`がBOMなしUTF-8 task XMLを構文拒否→UTF-16LE+BOM＋`encoding="UTF-16"`宣言へ（`beab0c0`）。②batch limited tokenでfresh security objectへのSet-Aclが`SeSecurityPrivilege`例外→4入口を`Get-Item→GetAccessControl('Access')→instance SetAccessControl`のDACL限定書換へ統一（`41c697b`・`8c6469c`、隔離診断taskでSETACL-OK実証）。あわせて`schtasks /Query`不在判定のlocale文字列依存をGet-ScheduledTask exit code判定へ置換（cp932→UTF-8 decodeのmojibakeで日本語regexが不一致だった）。SSH対話は管理者昇格tokenのため両欠陥とも検出不能で、Task Scheduler実火が初検出だった
6a. [x] 2026-07-18消化（観測可能範囲）: 直前申告のうえ本番BugHub containerを12:21:39〜12:22:12 JSTの**33秒**停止（compose stop -t 5→start、DB・他アプリ無変更）。停止中のMac reporter flushは非0・outbox保持1件・dead-letter 0、復旧後flushでsent=1。`/readyz`全check ready回復。servermanager issueの新規open/reopen 0、external-eventの新規発生0（pending 3件はすべて7/13〜今日10:46の既存未ack event）を実査。60秒ticker間隔>45秒windowなので停止を観測するtickは構造上最大1回＝2連続failure契約に達し得ない。**carry over**: Pi5内部の未trigger observation件数・healthy tick後のstate消去・Discord不着の直接確認は、逆向きSSH鍵が無くPi5内部状態へアクセス不能（ServerManager AGENTS.md 2026-06-21実機差分が正）のため、オーナーのPi5直接確認または逆向き鍵設置（H）後の再観測へ委ねる
   - （旧記載）H承認済みの意図的障害としてmain-serverのBugHub containerだけをhealthy tick直後から最長45秒停止し、既存アプリ本体・DBを変更しない。natural 60秒tickerで未trigger observation 1件までに留まること、停止中のreporter非0/outbox保持、`docker compose up -d bughub`と`/readyz`での復旧、復旧後flush、次のhealthy tickで未trigger stateが消えることを確認し、Discord・external-event・BugHub issueを誤openしないtransient吸収を実証する
6b. [x] 2026-07-18消化: オーナー指示でFOX WSL経由の既存鍵からMac/main-serverの公開鍵をPi5へ登録し直接経路を確立後、直前申告のうえ実施。Pi5一時state＋隔離`XDG_STATE_HOME`のdriverでrun(deps)を駆動し、synthetic transport failure 2回→trigger（Discord実alert）→connector open(seq1)→**修理後のv2 report搬送でBugHub accepted・issue open(high/new)・隔離store ack=1**→実`/readyz`復旧run→Discord実success→resolve(seq2)→resolve搬送でissue `resolved`・ack=2→最終runでbridge state event消去（`{}`実査）→隔離state/driver全削除。canary fingerprint `83b333…`は本番storeに不存在＝reopen不能を構造で確認
   - **P1実被弾と根本修理（`5f22ed4`）**: v2 scanにv1の`mergeServerManagerExternal`統合が欠落しており、全host v2移行後はPi5 bridgeのoutage eventがBugHubへ届かない実ギャップを本canaryで検出（本番storeに7/13以降の未ack event 3件が滞留・bridge stateはconsecutive 4938まで積んでresolve不能だった）。server側v2 schemaは受理済みを実物確認のうえclient側を修理し、v2 ack bundleへservermanagerを拡張。related gate 94/94 green。旧3 eventは修理後の本番cronで自己回復する（open搬送→ack→bridge resolve→次cronで解消）
   - （旧記載）fixed 60秒ticker＋2連続failureの契約を変えず、open→resolve E2Eは別の隔離canaryとして実施する。Pi5 bridgeの公開`run(deps)`で本番stateをtemporary fileへ差し替え、2 synthetic observations（natural 2周期とは称さない）だけtransport failureを注入し、Discordは実module、connectorは実SSHへ委譲する。main-serverの`factory-external-event`とmanual v2 reporterも専用`XDG_STATE_HOME`へ隔離し、固定`servermanager/availability/unreachable`（high、同一fingerprint）のopen→BugHub accepted/ACKを確認する。復旧は実`/readyz`の200/readyだけを入力し、Discord success→同fingerprint resolve/ACK→isolated bridge state消去→次回本番scheduled full snapshotでreopenしないことと全環境のinstalled/latest/compat matrixを確認する

### Wave 9 — 定常運用と完了

- [x] post-update gateと定期scanの頻度・timeout・通知cooldownを確定
- [x] 製品追加/削除/第三者化/所有移管の手順をAGENTS/READMEへ正典化
- [x] BugHub schema major変更時のclient互換matrixを追加
- [ ] `make ci`、各repo full gate、H承認済みの全端末E2E・rollback drill、最終反証を通す
- [ ] repo単位でpushし、計画をarchiveする

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
