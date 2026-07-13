# 工場コア9製品 BugHub 統合計画

作成: 2026-07-13  
状態: 実装中（Wave 0〜5のCaveat以外は完了、Wave 6以降を継続中）
対象工場: dotagents  
中央管理製品: ServerManager（BugHub 内包）

## 0. 目的

dotagents が管理対象とするコア9製品について、全現役端末の導入version、更新結果、正規diagnostics、state/schema/migration、親別connector互換、既知bugをBugHubへ集約する。

工場そのものはdotagentsである。ServerManagerはdotagentsが管理・連携する中央管理コアで、BugHubはServerManager内部のversion・bug・compatibility統括コンポーネントである。BugHubを独立した第10製品、またはdotagentsと並ぶ別工場へ分離しない。

## 1. 完了条件（本計画がTODOを兼ねる）

- [x] 端末能力8製品とServerManagerについて、製品別のversion・diagnostics・state/schema・migration・互換性契約が有限表になっている
- [x] 4環境×9製品の期待状態（required / optional / forbidden / unsupported）、期待connector、欠落時severityが一意なmatrixになっている
- [ ] Mac、main-server、FOX WSL2、FOX Windows nativeの4環境が、認証付きでBugHubへ観測結果を報告できる
- [x] BugHubにhost×productの現在値と履歴があり、installed/latest・contract・schema・update・compatibilityの状態を区別できる
- [ ] 互換異常は既存BugHubのfingerprint・severity・再発・解決・Discord・`/ai`へ統合される
- [x] 既存4アプリのpull巡回・重大度・resolve/reopen・dashboard・日次/週次通知に回帰がない
- [x] 第三者製品をfork、`node_modules`パッチ、内部DB決め打ちで改造していない
- [ ] 自作製品は機械可読な正規diagnosticsを製品側に持ち、dotagentsが内部状態を勝手に解釈しない
- [ ] 自作製品をクオ管理端末で実利用した時の構造化errorを、入力本文・秘密・ファイル内容なしでローカル記録し、dotagents reporter経由でBugHubへ集約できる
- [x] 公開製品の外部利用者からは明示opt-inなしにtelemetryを送らない
- [ ] BugHub自身をBugHubの自己申告だけで合格させず、main-server上の外部runnerがServerManager/BugHubを検証する
- [x] 報告不能時は端末ローカルのdotagents所有outboxへ保持し、成功扱いせず、復旧後に冪等再送できる
- [ ] 更新後contract gateと定期read-only gateがgreenになり、失敗製品・host・検査項目をBugHubとローカルlogで特定できる
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
| Caveat | 自作・別repo | `caveat --version`（実測0.15.0） | sync、Codex hook、MCP、own DB | repoに別作業のdirty多数。無断着手禁止 |
| Throughline | 自作・別repo | `throughline --version`（0.6.1） | doctor/status、Codex smoke、state schema | `.agents/`未追跡あり。意図確認後に着手 |
| Spotter | 自作・別repo | `spotter --version`（1.4.22） | doctor/status/logs、Codex hook diagnostics | clean |
| Codegraph | 第三者 | `codegraph --version`（1.4.1） | 既存indexだけ`status`/read-only query | 本体改造禁止。index自動作成禁止 |
| MarkItDown | 第三者 | `markitdown --version`（0.1.5） | ローカルfixture変換＋出力byte数 | `uv tool`管理。本体改造禁止 |
| Oracle | 第三者 | `oracle --version`（0.16.0） | canonical wrapper、`doctor --providers --json` | Chrome/ChatGPT認証依存。consult/statusをhealthに使わない |
| aiterm-mcp | 自作・別repo | package.json/npm（0.12.1） | MCP initialize、PTY list、vendor前提 | clean。現行CLIはversion出力なし |
| codex-sidecar | 自作・別repo | CLI/package群（0.3.5） | diagnostics/dry-run、result schema | clean |
| ServerManager | 自作・別repo | package.json/source commit（2.0.0） | BugHub health/poll/DB/container/Pi5 | clean。BugHubを内包 |

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
- products（固定9製品IDをkeyとするobject。同一ID重複を構造的に禁止）
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

Caveat、Throughline、Spotter、aiterm-mcp、codex-sidecar、ServerManagerは、各製品repoに機械可読diagnosticsを置く。dotagents adapterが内部DBや設定を独自解釈する形にしない。

- 共通最低要件: version、diagnostic schema version、overall status、個別check ID、state schema/migration（該当時）、秘密を含まないJSON、非0の意味。
- CLI名やJSON schemaは各製品が所有する。dotagentsはversioned adapterとfixtureで受ける。
- 既存diagnosticsが十分なら新コマンドを増やさず再利用する。不足時だけ製品側へ最小追加する。

### 5.2 第三者製品

Codegraph、MarkItDown、Oracleは本体を改造しない。

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
| Oracle | CLI | wrapper、`doctor --providers --json`、認証状態 | consult、promptを表示しうるstatus、人間向け出力解析 |
| aiterm-mcp | package/追加version入口 | MCP initialize、read-only PTY list、依存CLI状態 | Codex親から入れ子Codex起動 |
| codex-sidecar | 3 npm package | diagnostics/dry-run、result schema、model policy | 実装不要な実agent起動 |
| ServerManager | package/commit | BugHub外部health、poll鮮度、DB migration、container/source一致、Pi5監視 | BugHubの自己申告だけで合格 |

### 5.4 実利用時errorの収集境界

- 対象はクオが管理するMac、main-server、FOX WSL2、FOX Windows native上の自作製品だけ。製品は実行時errorをまず端末ローカルへ構造化保存し、`reporting.enabled=true`が明示された端末だけdotagents reporterがBugHubへ運ぶ。
- 最小fieldはproduct version、component、安定error code、可変値を除いたmessage template、fingerprint、count、first/last seen、state schema version、OS/arch。prompt、入力本文、file内容、session本文、token、cookie、絶対path、生stackの秘密部分は保存・送信しない。
- telemetry保存・送信の故障で本来の製品動作を止めない。ただし故障をsilentにせず、固定stderr、local diagnostics、reporter checkで観測可能にする。
- 解決後の同一fingerprint再発はreopenする。version更新で消えたerrorは、観測窓と製品側の明示resolve条件を満たしてからresolvedにする。
- local error storeはack/cursor、compact/delete、retention、mode/ACLを製品契約で定め、送信成功前に消さない。
- template化はallowlist fieldから組み立て、token/cookie/home/絶対path/prompt/stack断片を混入させたnegative fixtureで漏洩防止を検証する。JSON Schemaだけをprivacy gateにしない。
- npm等で配布した外部利用者からprivate BugHubへ自動送信しない。将来行う場合は明示opt-in、送信前preview、privacy文書、匿名化、削除手段、公開受信基盤を別計画で設計する。
- 第三者製品へruntime instrumentationを加えない。公開diagnosticsとblack-box smokeで観測できる範囲に限定する。

## 6. severityと状態

severityはproduct adapterが明示し、BugHubは変更しない。

- `fatal`: 製品が止まる、または利用不能。例: BugHubの受信/DB破損、reporter全体破損。
- `high`: 製品は動作していても実害がある、または条件により停止する。例: 必須製品欠落、正規migration失敗、主要connector不能、update後の契約破壊。
- `warn`: 理想状態ではないが動作しており、修正すべき。例: latest未追従、部分的diagnostic不能、特定hostだけのdrift。
- `info`: 修正すべきだが現時点で解決方法がないもの、またはそれ以下の参考情報。正常イベントの大量記録には使わない。

checkの状態は`pass / fail / unsupported / unverified / skipped`を分ける。`unsupported`や`unverified`を`pass`へ丸めない。`skipped`には必ず機械可読reasonを持たせる。

## 7. 実装wave

### Wave 0 — 正本・baseline・dirty整理（挙動不変）

- [x] 本計画をaudit-gauntletで監査し、採用指摘だけ反映
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

### Wave 3 — 第三者3製品adapter（A）

- [x] Codegraph: version＋既存index限定status。index無しは`skipped:not-indexed`
- [x] MarkItDown: version＋local fixture byte判定。JS URLはhealth fixtureに使わない
- [x] Oracle: version＋wrapper＋`doctor --providers --json`。認証依存を区別しconsult/status禁止
- [x] upstream version drift fixtureとunsupported表現を固定

### Wave 4 — 自作5製品のnative diagnostics（repo別A、契約はF）

- [ ] Caveat: 並行dirty解消後、DB schema/migration/own/sync/hook/MCPの機械可読診断
- [x] Throughline: state schema/hook/代表smokeの機械可読診断
- [x] Spotter: 既存doctor/status/Codex diagnosticsの統合JSONまたはadapter契約
- [x] aiterm-mcp: versionとMCP/PTY/vendor readinessのread-only診断
- [x] codex-sidecar: package整合、diagnostics/dry-run、result schema/model policy診断
- [ ] 各製品で既存error log/診断を棚卸し、共通fieldへ安全に出せるものだけlocal structured error storeへ接続
  - [x] Throughline、Spotter、aiterm-mcp、codex-sidecarは、明示opt-in、local store、resolution、cursor/ack、retentionを製品側の公開CLI契約として実装
  - [ ] Caveatはオーナー指示によるロック中。既存作業へ干渉せず、解除後に別waveで実装
- [x] `collection.enabled`と`reporting.enabled`を分離し、送信が既定OFF、明示ON時だけnetwork I/Oすることをfixtureと文書で固定
- [x] stderr、生stack、例外オブジェクトの丸投げと、同じ失敗の複数layer計上をnegative fixtureで拒否
- [ ] 各repoでbaseline green→characterization→実装→full gate→独立commit→push
  - [x] Throughline、Spotter、aiterm-mcp、codex-sidecarは独立commit・push・full gate・独立反証まで完了
  - [ ] Caveatはロック解除後に実施

### Wave 5 — BugHub ingestion・表示・通知（F＋A）

- [x] `POST /api/factory/v1/reports`とfactory DBを実装
- [x] v1 full snapshot、check lifecycle、消失だけでは非resolve、producer明示resolve、再観測reopen、host廃止、長期offlineの状態遷移を固定
- [x] deltaとBugHub側manual resolveをv1非目標とし、将来schema majorの互換設計へ分離
- [x] check failureを既存issueへhost付きで統合し、明示resolve、再観測reopen、古いoffline観測による巻き戻し拒否を固定
- [ ] runtime errorのack/cursor/retentionを全自作製品で固定
  - [x] 完了済み4製品はBugHubの同一report受理後だけackし、ack失敗は非0・単一atomic outbox envelope保持・duplicate再受理後再試行とする
  - [ ] Caveatはロック解除後に製品側storeと接続
- [x] runtime adapter/outbox契約を独立反証し、collection OFF時のqueue drain、二ファイルorphan、ack失敗のfalse successがないことを確認
- [x] dashboardにhost×product matrix、version履歴、latest/compat/schema状態を追加
- [x] `/ai`とDiscord/daily/weeklyへ修正先repo・host・product・fingerprintを追加
- [x] 既存pull sourceとの後方互換testを通す

### Wave 6 — ServerManager/BugHub自己監視（F）

- [ ] main-server上のdotagents reporterからBugHubを外部probe
  - [x] loopback `/readyz`限定の外部probe CLIとserver profile adapter、SSRF/privacy/contract fixtureを実装
  - [ ] main-serverへ配布し、実reportでServerManagerの6 readiness check（DB/schema/pull/ingest/delivery/revision）を確認
- [ ] BugHub停止、stale poll、DB migration失敗、image/source不一致をfixture化
  - [x] stale pull、source未設定、DB query/schema mismatch、factory ingest/delivery stale・失敗を`/readyz`の固定reason codeでfixture化
  - [x] process停止・到達不能を外部probeの`unreachable`としてfixture化
  - [ ] image/source一致はrebuild済み判定と分離し、build時source revisionをOCI labelとread-only readiness fieldへ焼き込み、main-serverのdeploy manifestに保存した期待revisionと外部probeで比較する
  - [ ] revision欠落・不正・期待値不一致を固定reason codeへ写像し、Docker restartだけでは一致扱いにしないfixtureを追加
- [ ] BugHub停止中のoutbox保持→復旧後再送を実測
- [x] readinessをDB query、poll/ingest鮮度、source error、pull/factory通知deliveryまで拡張し、Docker healthcheckとdeploy canaryを`/readyz`へ接続
- [ ] BugHub停止/readiness failureはBugHubを経由しないPi5→Discord専用bridgeで通知し、復旧後に同じfingerprintをBugHubへ還流
  - [ ] 専用bridgeは`/readyz`をDocker health retryとは独立に観測し、2連続失敗（最大120秒）で通知する。自動restartは行わず、既存Layer 3の3周期観測・restart責務を奪わない
  - [ ] `sha256(servermanager:<check_id>:<reason_code>)`（process到達不能は固定`availability:unreachable`）をdurable eventとしてPi5に保存し、dotagents所有の明示connector CLI経由でmain-server reporterへopen/resolveを渡す
  - [ ] Discord成功とBugHub還流成功を別ackにし、片方の失敗をもう片方の成功で消さない。復旧後もBugHub accepted確認までeventを保持する

### Wave 7 — 4環境canary rollout（H＋F）

1. [ ] Mac: Hでtoken/config opt-inとlaunchd apply → Fでlocal fake→本番BugHub、通知抑制canary、実火・uninstall・state権限を確認
2. [ ] main-server: Hでtoken/config opt-in、scheduler apply、DB backup付きdeploy → FでBugHub自身を含む全9製品とrevision attestationを確認
3. [ ] FOX WSL2: Hでtoken/config opt-inとcron apply → Fでread-only scan/outbox/再送・実火・uninstall・state権限を確認
4. [ ] FOX Windows native: Hでtoken/config opt-inとTask Scheduler apply → FでNode入口、実火・uninstall・所有者限定ACL、WSLとhost IDを混同しないことを確認
5. [ ] Hで意図的障害を許可後、Fで全環境のinstalled/latest/compat matrixと意図的1件fail→通知→修復→resolve→再発なしを実証

### Wave 8 — 定常運用と完了

- [ ] post-update gateと定期scanの頻度・timeout・通知cooldownを確定
- [ ] 製品追加/削除/第三者化/所有移管の手順をAGENTS/READMEへ正典化
- [ ] BugHub schema major変更時のclient互換matrixを追加
- [ ] `make ci`、各repo full gate、H承認済みの全端末E2E・rollback drill、最終反証を通す
- [ ] repo単位でpushし、計画をarchiveする

## 8. 実行経路と役割

- **F（親直轄）**: wire contract、認証、DB migration、severity、所有境界、本番deploy、rollback、公開API後方互換。
- **A（native委譲）**: 仕様固定後のrepo別diagnostics、adapter、fixture、dashboard、文書の逐語追従。
- **H（オーナー）**: dirty作業の裁定、秘密/token配置、hook trust、全OSのscheduler実登録/解除、DB backupを伴う本番deploy、意図的障害試験、実端末rollback drill。

Codex親は対象repoをcwdにし、そのrepoのAGENTS.mdを読んでnative subagentへ委譲する。aiterm/MCP経由で入れ子Codexを起動しない。Claude親で実施する場合は、aitermの永続PTYを対象repoのcwdで使うことはできるが、aitermを使うこと自体を「project native」の条件にはしない。

## 9. 非目標

- BugHubからの自動修復・自動rollback。
- 第三者製品のforkや内部実装への追従。
- 全projectへのCodegraph index/Spotter activationの強制。
- session本文、prompt、秘密、生DB、生logの中央送信。
- ServerManagerをdotagentsと並ぶ別工場へ昇格すること。
- 既存アプリのBugHub pull契約を一斉にpushへ移行すること。
- factory report v1へのdelta追加、BugHub側からのfactory issue手動resolve。

## 10. rollback

- BugHub ingestionはfeature flagで無効化でき、既存pull collectorだけで起動できること。
- additive migrationでは旧codeが新tableを無視する**code-only rollbackを第一選択**にする。
- 旧DB復元が必要な時はquiesce、cutover後delta export、factory report replay、既存pull/resolve差分の処遇をrunbook化し、単純なbackup上書きでcanary中のデータを失わない。
- reporterはschedulerから外して停止でき、outboxを保持したまま送信だけ止められること。
- 製品native diagnosticsは既存CLI挙動を変更せず追加入口に限定すること。
- 各repo・各waveを独立commitにし、複数repoを一つの履歴操作で巻き戻さないこと。

## 11. 監査記録

2026-07-13、初版を矛盾/実現性と網羅性/実環境整合の2視点で監査した。

- 件数遷移: `Find 26 → Dedup 15 → existence/value反証 15 → Critic新規1（Dedup内に統合） → 生存15`
- 採用: lifecycle、offline時刻、enqueue-before-send、host期待matrix、credential lifecycle、通知false成功、rollback中データ、BugHub外通知、OS別scheduler/state、dedupe retention、outbox競合/overflow、runtime error wire、privacy negative gate、runbook drift、Oracle安全入口。
- 棄却: Oracle doctor不存在、sidecar diagnostics不存在、aiterm Windows非対応、Caveat/Throughline dirty記載誤り、ServerManager wave欠落、image rebuild記載欠落。いずれも実物と合わないため棄却。
- 親裁定: 既存pull＋新規pushの二経路、第三者非改造、自作製品local error、外部利用者telemetry既定OFFを維持。上記15件を計画へ反映した。
