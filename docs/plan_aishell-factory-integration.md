# AIShell 開発工場コア編入計画

**状態:** Active
**作成日:** 2026-07-19
**対象:** AIShell、dotagents、ServerManager / BugHub、対応host
**製品番号:** 端末能力9製品目（コア10製品）。旧「第12コア」表記はObserver/Latticeを別番号で数えた体系のもので廃止

## 1. 目的と成功条件

AIShellを、日常の既定shell入口として使いながら製品自身の欠陥も修理・releaseする、
dotagents管理下の正式な第12コア製品へ編入する。

成功条件:

- [x] AIShellが製品所有のversion付きfactory diagnosticsを公開し、秘密・許可path・操作本文を漏らさない
- [x] macOS arm64ではinstall、MCP登録、診断、実操作smoke、更新、rollbackが再現できる（0.4.1で実測。証拠は[受入matrix](evidence/2026-07-25-aishell-factory-integration-close.md)）
- [x] 非対応hostは黙って欠損扱いにせず、構造的な`not_applicable`として判定できる
- [x] dotagentsの製品契約、host / connector matrix、更新経路、verify、privacy fixtureが同期する
- [x] ServerManager / BugHubへserver-firstでsourceを登録し、既存wire v2 / v3 / v4を変更しない
- [ ] Lattice wire v4完了後のwire v5でAIShellを固定集合へ正式編入する
- [x] release時はversion bump、publish、global install、公開後smoke、証拠記録まで同一waveで閉じる

## 2. 非目標と不変条件

- Observerの第10枠、Latticeの第11枠を改番しない。
- 凍結済みwire v2 / v3 / v4のproduct set、schema、受入証拠を後付け変更しない。
- macOS arm64専用という現行製品境界を、未実装hostで動くかのように見せない。
- Claude親の接続性は実測前にrequired / supportedと宣言しない。
- shell、AppleScript、JXAへの暗黙fallbackを追加しない。
- AIShell repoの移動・改名を行わない。
- 許可rootの実path、操作履歴、ファイル本文、command argumentをfactory診断やBugHubへ送らない。

## 3. 順序とwire裁定

```text
A1 AIShell native diagnostics
  -> A2 dotagents contract / install / verify / privacy
  -> A3 ServerManager optional source registration
  -> A4 supported Mac live acceptance
  -> A5 wire v5 enrollment (wire v4完了後)
  -> A6 release / rollout / archive
```

- A1〜A4は、既存wireとファイル所有が交差しない範囲で準備できる。
- A3ではAIShellを既存wireの固定product setへ加えず、server側のoptional sourceとして先行登録する。
- A5で初めてwire v5の固定集合、expectation matrix、client cutoverを定義する。
- wire v5はserver endpoint先行、dual-run、client切替、旧endpoint退役判定の順で進める。

## 4. F / A / H境界

| 区分 | 内容 |
|---|---|
| F | diagnostics schema、host support、wire v5 product set、privacy、error意味論、rollback裁定 |
| A | AIShell実装、dotagents adapter / fixture / test、ServerManager非本番実装、focused / related gate |
| H | registry publish、global install、実host MCP設定変更、本番BugHub deploy / canary、push、意図的障害試験 |

H操作は、実行直前に目的・影響・rollbackを示し、オーナーの明示承認後にだけ行う。

## 5. 実行TODO

### Phase A0 — ベースラインと契約固定

- [x] AIShell / dotagentsのorigin同期、dirty、stashを確認する
- [x] caveatと`rag/INDEX.md`を先に検索し、重複調査がないことを確認する
- [x] AIShell 0.2.1の公開契約、配布、MCP登録、対応platform、既存診断面を実読する
- [x] wire v2 / v3 / v4の固定集合とLatticeのserver-first先行登録precedentを確認する
- [x] 本計画をControl `aishell-core-integration-v1`へ登録し、risk=high・behavior-changeのphase gateを固定する

### Phase A1 — AIShell所有のnative diagnostics

- [x] 現在のSwift source / test / runtime storeを実読し、診断責務と秘密境界を確定する
- [x] version付きschema `aishell.native_factory_diagnostics.v1`を製品正典へ記録する
- [x] read-only `factory_diagnostics` MCP toolを実装する
- [x] platform / architecture、製品version、MCP readiness、runtime store schema / migration、
      manager / app bundle readiness、pause状態をtyped fieldで返す
- [x] 許可rootは件数と状態だけを返し、pathや操作本文を返さないprivacy fixtureを追加する
- [x] 非対応platform、store破損、app bundle不在、pauseを区別し、暗黙fallbackを禁止する
- [x] focused 3/3 → AIShell全19/19 → release package / 実MCP 21 tool smokeを通す

### Phase A2 — dotagents統合契約

- [x] `factory-product-contracts.md`へ所有repo、version、diagnostics、state、migration、error、rollbackを追加する
- [x] host matrixへmacOS arm64 required、他host `unsupported`の構造理由を追加する
- [x] connector matrixはCodex MCPの実測契約を追加し、Claudeは実測までunverifiedとする
- [x] `agents-update.sh`へdarwin/arm64限定の`@quolu/aishell@latest`を追加し、非対応hostでinstallしない
- [x] update / verify / Codex config断片へ冪等なAIShell導入・登録・診断契約を追加する
- [x] AIShell diagnostics adapter、privacy fixture、supported / unsupported fixtureを追加する
- [x] 既存の`V2_PRODUCT_IDS`固定12製品回帰を通し、AIShellをwire v2〜v4へenrollしていないことを確認する
- [x] focused adapter 5/5、v2関連20/20、factory-core smoke、cron update fixtureを通す

### Phase A3 — ServerManager / BugHub server-first

- [x] ServerManager側の現行source registry、expectation matrix、schema migrationを実読する
- [x] AIShell sourceを既存固定集合外のoptional sourceとして登録する
- [x] AIShell専用diagnostics ingestionとprivacy rejection fixtureを追加する
- [x] 未対応hostをmissingでなく`not_applicable`へ遷移させる
- [x] 非本番focused / related gateを通す
  - ServerManager `d85c70a` / `95ce6db`: 固定12製品不変、AIShell optional、空safe_context allowlist、severity素通し、非対応host `not_applicable`
  - focused 32/32、BugHub Node related 76/76、`not_applicable`追補focused 16/16、`git diff --check` green
- [x] 本番deploy / canaryはH承認後に実行し、rollback setの実在と構成を実証する（意図的rollback drillは別H）
  - 2026-07-19実施: main-server revision `95ce6dbde456280861dd64eae3736ee2edba57e6`、`/readyz`全check pass・revision一致
  - 本番container内canary: AIShell登録、optional、固定required 12不変、未知product拒否、safe_context空。DB書込みなし
  - SQLite backup `bughub-predeploy-20260719T071032Z.db`（8,110,080 bytes）とrollback set `20260719T071035Z-42955`（旧image / manifest / active marker / quiesced DB snapshot）を確認
  - **2026-07-25時点でこの本番状態は存在しない**。deploy元branchがmainへ着地しないまま、mainがwire v4を受理してdeployされたため上書きされた。実測: 本番`source_revision`はmain HEADと一致し、mainの`bughub/`に`aishell`は0件。着地しないまま出す習慣が作業を失わせた2例目であり、規則は共通憲法「git・shell・ファイルの作法」へ記録済み
- [x] 未着地branchを現mainへ再着地させる（ServerManager `16f96c1`。衝突なし、BugHub test 78/78、v2固定集合の凍結後編入という理由をコメントへ明確化。branchはlocal/remoteとも削除済み）
- [x] 再deployは行わないと裁定する。dotagentsの`V2_PRODUCT_IDS`/`V4_PRODUCT_IDS`に`aishell`は0件で報告するclientが存在せず、server-first登録が効くのはwire v5から。本番はmain前進後も`ready`/`revision_match`で、次の通常deployが本変更を運ぶ

### Phase A4 — 対応Mac live acceptance

- [x] candidate packageを隔離prefixへ入れ、Codex MCPでlive handshakeする
  - 実測: worktree `dist/AIShell.app` のcandidateを一時config overrideで登録し、Codex実セッションが`aishell_candidate.factory_diagnostics`を1回だけ完了。schema v1、ready、issues 0、privacy非露出を確認した
- [x] `runtime_status`、worktree自動認識、read / write前提条件、直接process実行をsmokeする
  - 実測: 新規AIShell/dotagents worktreeを自動認識。誤SHA-256更新は拒否、正しいSHA-256更新は成功し、fixtureはTrashへ回収した
- [x] diagnosticsがpath / command / contentを漏らさないことを実レスポンスで確認する
  - 実測: release packageの実MCP 21 tool handshakeでschema v1・ready・issues空、`/Users/`と`allowedRootPaths`非露出
- [x] pause / resume、許可root不足、manager誘導を通常状態へ戻せる範囲で確認する
  - 実測: 管理画面で停止→`isPaused=true`・通常操作拒否・`runtime_open_manager`誘導→再開。4 root保持、`isPaused=false`、file操作復帰を確認した
- [x] 受入中に再現したstdin EOF欠陥をAIShell `8219f8c`で修理し、全20/20、release package、candidate実MCP `/bin/cat`（92ms・exit 0・timeoutなし）を確認した（`/bin/bash`拒否は公開禁止契約どおり）

### Phase A5 — wire v5正式編入

- [x] wire v4完了を依存証拠で確認する
  - Lattice編入planは`docs/archive/`へ退避済み・未消化0。[cutover受入証拠](evidence/2026-07-20-codegraph-lattice-cutover-acceptance.md)で4 active host全てv4 canary success
  - 本番実測: `/readyz`=`ready`、`factory_ingest` pass、`source_revision` `2242768`。Mac reporter configは`/api/factory/v4/reports`
- [x] wire v5の依存前提として、AIShellのoptional key登録がv4に存在しないことを実測で確定する
  - v2 schemaは14キー定義／12必須で`lattice`・`aishell`をoptional受理。v4 schemaは12キー定義・`additionalProperties: false`で`aishell`のスロットが無い
  - client側も`lib/factory/contract.mjs`の`exactKeys(report.products, V4_PRODUCT_IDS)`が13個目のキーを拒否する
  - 結論: expectation matrixだけでrequiredへ昇格させる安価な経路はschemaが塞いでおり、新wire majorが唯一の経路である

> A5以降の工程正本はLattice plan `aishell-factory-integration`（`lattice todo status --json`）である。
> 以下の各行はstoreのToDoを指す参照であり、状態・依存・完了証拠はstoreだけが持つ。
> 元のcheckboxは[cutover archive](archive/lattice-cutover-aishell-wire-v5.md)へ退避済み。

#### A5-P0 設計の正本化と敵対的反証（gate: `design-refutation`）

- wire v5の固定13製品集合を正本化する。v4の固定12製品へ`aishell`をrequiredとして加えた集合とし、v2/v4のproduct set・schema・受入証拠は後付け変更しない（工程正本: Lattice aishell-factory-integration / wv5-0010）
- v5 expectation matrixを`factory-host-product-matrix.md`の正本どおり明文化する。AIShellはmac=required、server/wsl/windows-native=unsupported。`not_applicable`をhigh欠落issueへ変換しない意味論も固定する（工程正本: Lattice aishell-factory-integration / wv5-0020）
- v4 expectation実装と正本の乖離2件を裁定する。`factoryExpectation()`にv4分岐が無く、grok-buildが全profile required（正本はoptional。main-serverで偽warnが実発生中）、claude-code windows-nativeがrequired（正本はunsupported。現在は潜在）（工程正本: Lattice aishell-factory-integration / wv5-0030）
- v4→v5のcompatibility契約を定義する。v4受理継続、issue identityの`host + product + fingerprint`共有、late v4 reportの巻戻し拒否、major別storage分離（工程正本: Lattice aishell-factory-integration / wv5-0040）
- v5のrollbackとhost別退避経路を定義する。host単位でv4へ戻せること、outbox保持、v5 flag無効化でv4運用が無傷であること（工程正本: Lattice aishell-factory-integration / wv5-0050）
- 非目標と既知の罠を固定する。v3番号はObserver予約の未実装番号として温存する。AIShellのpath・許可root・process引数・診断本文を送らない。暗黙fallbackを追加しない（工程正本: Lattice aishell-factory-integration / wv5-0060）
- 独立refuterで設計を反証する。親と異なるproviderで実ファイルに当て、実在指摘だけをDedupして採否と理由を還流する（工程正本: Lattice aishell-factory-integration / wv5-0070）

#### A5-P1 ServerManager / BugHub v5実装（gate: `nonprod-gate`）

- `bughub/schemas/factory-report-v5.schema.json`を追加する。固定13製品required、`additionalProperties: false`、v4 schemaは変更しない（工程正本: Lattice aishell-factory-integration / wv5-0110）
- `bughub/src/factory-contract.js`へ`V5_PRODUCT_IDS`と`validateFactoryReportV5`を追加する。privacy・semantic検証はv4と同一実装を共有する（工程正本: Lattice aishell-factory-integration / wv5-0120）
- `POST /api/factory/v5/reports`を`FACTORY_V5_INGEST_ENABLED=true`明示時だけ公開する。既定404、v4受理とcredential契約は不変（工程正本: Lattice aishell-factory-integration / wv5-0130）
- `factoryExpectation()`へv5分岐を実装する。fall-throughの`required`へ委ねず正本matrixどおり書き、A5-P0の裁定に従いv4分岐も処理する（工程正本: Lattice aishell-factory-integration / wv5-0140）
- storage・dedupe・notificationをv5へ配線する。v4履歴を削除せず、issue identityを共有して二重issue・二重通知を作らない（工程正本: Lattice aishell-factory-integration / wv5-0150）
- `factory-view.js`のaishell扱いをenrolled製品へ更新し、`db.js`のoptional固定分岐をv5でrequiredへ昇格させる。safe_context allowlistは空のまま維持する（工程正本: Lattice aishell-factory-integration / wv5-0160）
- BugHub testを追加する。mac required充足、非対応hostのunsupported、`not_applicable`非issue化、未知product拒否、privacy negative、v4受理の非回帰（工程正本: Lattice aishell-factory-integration / wv5-0170）
- BugHub full testとlintを通し、ServerManager repoへpathspec明示commitで閉じる（工程正本: Lattice aishell-factory-integration / wv5-0180）

#### A5-P2 dotagents reporter v5実装（gate: `nonprod-gate`）

- `lib/factory/v5.mjs`を追加し、`contract.mjs`へ`V5_PRODUCT_IDS`と`validateReportV5`を加える。v2/v4の固定集合とvalidatorは変更しない（工程正本: Lattice aishell-factory-integration / wv5-0210）
- `lib/factory/scan.mjs`の`aishellProduct`をv5 scanへ配線する。非対応hostでは構造的な`not_applicable`を出し、暗黙fallbackで塗り潰さない（工程正本: Lattice aishell-factory-integration / wv5-0220）
- `factory-scan-v5.mjs`、`factory-reporter-v5.mjs`、`factory-reporter-v5-schedule-runner.mjs`を追加する。v5専用state namespaceを持ちv4 outboxを列挙しない（工程正本: Lattice aishell-factory-integration / wv5-0230）
- `factory-reporter-scheduler.mjs`へ`--wire-major v5`を追加する。既存v1/v2/v4登録を壊さず`--dry-run`で変更範囲を提示する（工程正本: Lattice aishell-factory-integration / wv5-0240）
- privacy fixtureとcontract testをv5へ拡張する。AIShellのpath・root・引数・診断本文が出ないnegative testと13製品exact keysのpositive testを含める（工程正本: Lattice aishell-factory-integration / wv5-0250）
- `make ci`と`verify-install.sh --profile official`を通し、dotagents repoへpathspec明示commitで閉じる（工程正本: Lattice aishell-factory-integration / wv5-0260）

#### A5-P3 dual-run比較とcutover可否裁定（gate: `dual-run-compare`）

- Macでv4 scanとv5 scanを同一時点で実行し、共通12製品のobservationが同値であることを差分で確認する（工程正本: Lattice aishell-factory-integration / wv5-0310）
- v5 reportをclient検証器とserver検証器の両方へ通し、受理・拒否の判定と理由が一致することを確認する（工程正本: Lattice aishell-factory-integration / wv5-0320）
- 非対応profileのv5 scanでaishellが構造的`not_applicable`になり、expectation issueを生まないことを確認する（工程正本: Lattice aishell-factory-integration / wv5-0330）
- dual-run差分・privacy結果・非対応host挙動をevidenceへ固定し、本番deployへ進むかを裁定する（工程正本: Lattice aishell-factory-integration / wv5-0340）

#### A5-P4 本番先行deployとcanary（gate: `h-approval`）

- deploy対象commitが`origin/main`の祖先であることを`git merge-base --is-ancestor`で確認する。祖先でなければ先にmainへ着地させる（工程正本: Lattice aishell-factory-integration / wv5-0410）
- 【H】SQLite backupとrollback setを取得し、実在とサイズを確認する（工程正本: Lattice aishell-factory-integration / wv5-0420）
- 【H】`FACTORY_V5_INGEST_ENABLED=false`のままv5対応revisionをdeployし、`/readyz`全checkとv4受理継続を確認する（工程正本: Lattice aishell-factory-integration / wv5-0430）
- 【H】flagを`true`にして再deployし、本番container内canaryで13製品受理・未知product拒否・非対応host unsupported・safe_context空をDB書込みなしで確認する（工程正本: Lattice aishell-factory-integration / wv5-0440）

#### A5-P5 host別v5切替（gate: `h-approval`）

- 【H】mac-kiteをv5へ切替え、初回full 13製品snapshotの受理とaishell=installedを確認する（工程正本: Lattice aishell-factory-integration / wv5-0510）
- 【H】main-serverをv5へ切替え、aishell=unsupportedとgrok-build偽warnの解消を確認する（工程正本: Lattice aishell-factory-integration / wv5-0520）
- 【H】fox-wslをv5へ切替え、aishell=unsupportedと既存codex-cli欠落issueが二重化していないことを確認する（工程正本: Lattice aishell-factory-integration / wv5-0530）
- 【H】windows-workstationをv5へ切替え、aishell=unsupportedと基盤CLI expectationが正本どおりであることを確認する（工程正本: Lattice aishell-factory-integration / wv5-0540）
- 4 host全てのBugHub matrixでv5 currentが揃い、v4 issueが二重化・巻戻ししていないことを確認する（工程正本: Lattice aishell-factory-integration / wv5-0550）

#### A5-P6 v4退役判定（gate: `retirement-decision`）

- v4退役の判定基準（retention期間、全host v5安定、host別rollback不要の確証）を実測へ当てる（工程正本: Lattice aishell-factory-integration / wv5-0610）
- 基準を満たす場合だけ旧v4 endpoint停止を裁定する。満たさない場合は据置理由と再評価条件を記録して閉じる（工程正本: Lattice aishell-factory-integration / wv5-0620）

### Phase A6 — releaseと完了

- [x] AIShell 0.3.0 version bump、release note、package gateを準備する
  - AIShell `29ff528`: 新規公開toolを含むためSemVer minor。Swift 20/20、package整合性、candidate診断version 0.3.0、stdin smoke green
- [x] H承認後にpublish → global install → MCP再起動 → 公開後smokeを同一waveで完遂する
  - 2026-07-19: `@quolu/aishell@0.3.0`をpublic / latestでpublish。registry shasum `7d2495a832b27d2ef796d0e8a6689b123848d138`一致
  - global 0.3.0へ更新、app再起動（PID 33396）、fresh Codex MCPでversion 0.3.0・schema v1・ready・issues 0、stdin smoke exit 0を確認。local tag `v0.3.0`
- [x] AIShell / dotagents / ServerManagerをrepo別pathspec commitで閉じ、H承認後にbranchをpushする（AIShell tag `v0.3.0`もpush済み）
- [x] cross-repo receiptをfactory masterへ還流する（[受入matrix](evidence/2026-07-25-aishell-factory-integration-close.md)・[ADR 0118](adr/0118-aishell-factory-profile-and-control-v1-closure.md)）

#### A5-PM コア製品欠陥のmaintenance（gate: `maintenance-wave`）

本waveで再現したコア製品の欠陥を、記録だけで終わらせず同一waveで修理する。所有repoが
Lattice / gpt-connectorなので、wire v5本筋（dotagents / ServerManager）とはファイルが
交差せず全期間並行できる。

- gpt-connector `consult`が全呼び出しで失敗するのを修理する。`diagnostics`は`ready`（cdpConnected / officialOrigin / authenticated すべてtrue、bridgeBuildId解決済み）を返すのに、`consult`は添付の有無に関わらず`CHAT_FAILED: Cannot read properties of undefined (reading 'timeStamp')`で落ちる。`timeStamp`はrepo内に存在せずChatGPT webapp側のDOM Event propertyであり、page-bridgeが呼ぶ上流内部関数の契約変更が疑われる。ChatGPT相談レーンが全面停止しており、本waveのPhase gate反証も塞いだ（工程正本: Lattice aishell-factory-integration / wv5-0860）

- Lattice `phaseV3CarrySemantics`を修理する。phaseを持たない先行planを`carry`した時に`phase_id: undefined`を作って素の`TypeError`で落ちる。characterization testを先に置き、typed `REVISION_INVALID`で拒否するか正しくcarryするかを裁定する（工程正本: Lattice aishell-factory-integration / wv5-0810）
- Lattice `docs/todo-extraction-v1.md`の新規plan authoring入口を実装どおりに直す。既存storeはextraction→`todo migrate`、`plan create`は空store専用であることを明記する（工程正本: Lattice aishell-factory-integration / wv5-0820）
- Lattice repoへpublish祖先gate（`verify-release-commit.mjs`＋`prepublishOnly`）を導入する。既存裁定「gate未実装の製品は次にそのrepoでrelease作業を行うwaveで同時に導入する」の適用であり、reference実装はAIShell（工程正本: Lattice aishell-factory-integration / wv5-0830）
- Lattice `revise-phase`の非原子的失敗を修理する。v3で`reconciled`なmemberへ`phase_todo_revision.v2`を適用すると拒否されず、manifestとrevision bindingが食い違って以後`todo status`／`verify`が`STORE_INCONSISTENT: manifest_revision_binding_mismatch`で読めなくなる。世代降格を事前に拒否するか、失敗時にstore bytesを不変に保つ（工程正本: Lattice aishell-factory-integration / wv5-0850）
- 【H】Lattice repoのfocused / related gateを通し、version bump→publish→global install→公開後smoke→公開証跡記録までを同一waveで閉じる（工程正本: Lattice aishell-factory-integration / wv5-0840）

#### A6-P7 受入証拠・ADR・知識還流とarchive（gate: `closeout-reflow`）

- wire v5の受入matrixを`docs/evidence/`へ作成する。実測値だけを載せ、gateが実際に捕まえた欠陥も隠さず記録する（工程正本: Lattice aishell-factory-integration / wv5-0710）
- 不変ADRへwire v5のDecisionを固定する。固定13製品、expectation matrix、v4乖離2件の処理、退役裁定、棄却した代替案とその理由を含める（工程正本: Lattice aishell-factory-integration / wv5-0720）
- 再利用可能な知識をcaveatとragへ還流する。「編入中製品のoptional key登録はwire majorを越えて継承されず、major cutoverで観測面から消える」という実測罠を必ず含める（工程正本: Lattice aishell-factory-integration / wv5-0730）
- 本計画を`docs/archive/`へ退避し、`plan_factory-master.md`のAIShell行と成功条件を完了状態へ更新する（工程正本: Lattice aishell-factory-integration / wv5-0740）

## 6. 欠陥maintenance queue

AIShell利用中に再現した欠陥は、P0 / P1だけをcritical path上で即修理する。非critical欠陥は
ここへ最小再現、影響、所有箇所を一度記録し、Phaseの通常TODO後、full regression前の
maintenance waveで重複統合して修理する。

| 状態 | 重大度 | 最小再現 | 影響 | 所有箇所 |
|---|---|---|---|---|
| 修理済み (`8219f8c`) | P1 | 常駐AIShell `process_run`でstdinを読む`codex exec` / `/bin/cat`を起動するとEOFが届かずtimeout | Codex CLI等のstdin readerを正規入口から実行できない | AIShell `NativeProcessService` |
| 修理済み (0.4.1) | P1 | `aishell-mcp`をbare command名でPATH起動すると`manager.application_bundle_unavailable`／`ready:false` | MCP hostも工場adapterもこの起動形式を使うため、健全なinstallationが常にnot_ready判定 | AIShell `MCPServer.managerApplicationURL` |
| A5-PMへ登録 | 低 | `lattice todo revise-phase`へ`phase_todo_revision.v3`を渡し、先行planがphaseを持たない`todo_plan.v3`で`state_policy: carry`を指定すると、`phaseV3CarrySemantics`が先行taskをspreadして`phase_id: undefined`を作り、canonical化が素の`TypeError: todo artifact is not a JSON tree`で落ちる | typed errorでなくCONTRACT_VIOLATIONとして表面化するため原因が読めない。`reset_pending`で回避できるが、carryが正しい場面では回避手段が無い | Lattice `src/todo-store.mjs` `phaseV3CarrySemantics` |
| A5-PMへ登録 | 低 | Lattice `docs/todo-extraction-v1.md`が「新規planのauthoringには`lattice plan create`を使用する」と書くが、`plan create`は空store専用で既存storeには`STORE_WRITE_CONFLICT: store_already_exists`を返す | 既存storeへ新規planを足す正しい入口（extraction→`todo migrate`）が製品文書から読み取れない | Lattice `docs/todo-extraction-v1.md` |
| Lattice分はA5-PMへ登録 / 残5製品は既存裁定どおり次のrelease waveで | 低 | 工場コアNPM 7製品のうち、publish対象commitが既定ブランチの祖先であることを検証するgateを持つのはAIShellだけ。Caveat／Throughline／Spotter／Lattice／codex-sidecarは`prepublishOnly`自体が無く、gpt-connector／aiterm-mcpはbuild/check用で祖先検証ではない | 孤児releaseを機械的に止められない。規範は共通憲法にあるため、実行者が規範を読む限り即時の危険はない | 各製品repo。reference実装はAIShell `scripts/verify-release-commit.mjs` |

## 7. rollback

- AIShell candidateは隔離prefixから削除し、公開0.2.1へ戻す。
- Codex MCP登録は変更前config backupへ戻し、server processを再起動する。
- ServerManager optional sourceは登録解除しても既存wire v2〜v4を変更しない。
- wire v5 cutover後はv4 endpoint / reporterをretention期間維持し、host単位で戻せるようにする。
- BugHub履歴は削除せず、`not_applicable`または旧wireの観測として保持する。
