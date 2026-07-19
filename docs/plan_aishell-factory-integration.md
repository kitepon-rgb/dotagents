# AIShell 開発工場コア編入計画

**状態:** Active
**作成日:** 2026-07-19
**対象:** AIShell、dotagents、ServerManager / BugHub、対応host
**製品番号:** 第12コア製品

## 1. 目的と成功条件

AIShellを、日常の既定shell入口として使いながら製品自身の欠陥も修理・releaseする、
dotagents管理下の正式な第12コア製品へ編入する。

成功条件:

- [ ] AIShellが製品所有のversion付きfactory diagnosticsを公開し、秘密・許可path・操作本文を漏らさない
- [ ] macOS arm64ではinstall、MCP登録、診断、実操作smoke、更新、rollbackが再現できる
- [ ] 非対応hostは黙って欠損扱いにせず、構造的な`not_applicable`として判定できる
- [ ] dotagentsの製品契約、host / connector matrix、更新経路、verify、privacy fixtureが同期する
- [ ] ServerManager / BugHubへserver-firstでsourceを登録し、既存wire v2 / v3 / v4を変更しない
- [ ] Lattice wire v4完了後のwire v5でAIShellを固定集合へ正式編入する
- [ ] release時はversion bump、publish、global install、公開後smoke、証拠記録まで同一waveで閉じる

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

- [ ] ServerManager側の現行source registry、expectation matrix、schema migrationを実読する
- [ ] AIShell sourceを既存固定集合外のoptional sourceとして登録する
- [ ] AIShell専用diagnostics ingestionとprivacy rejection fixtureを追加する
- [ ] 未対応hostをmissingでなく`not_applicable`へ遷移させる
- [ ] 非本番focused / related gateを通す
- [ ] 本番deploy / canaryはH承認後に実行し、rollbackを実証する

### Phase A4 — 対応Mac live acceptance

- [ ] candidate packageを隔離prefixへ入れ、Codex MCPでlive handshakeする
- [ ] `runtime_status`、worktree自動認識、read / write前提条件、直接process実行をsmokeする
- [ ] diagnosticsがpath / command / contentを漏らさないことを実レスポンスで確認する
- [ ] pause / resume、許可root不足、manager誘導を通常状態へ戻せる範囲で確認する
- [ ] 製品欠陥が再現した場合は重大度規則に従い、AIShell repoで修理して再受入する

### Phase A5 — wire v5正式編入

- [ ] wire v4完了を依存証拠で確認する
- [ ] wire v5の固定集合、schema、expectation matrix、compatibility、rollbackを正本化する
- [ ] ServerManager新endpointを先行deployし、v4 clientと併存させる
- [ ] dotagents reporter v5を実装し、dual-runでevent集合とprivacyを比較する
- [ ] 対応hostをv5へ切替え、非対応hostは`not_applicable`履歴を保持する
- [ ] v4退役条件を満たした後にだけ旧endpoint停止を裁定する

### Phase A6 — releaseと完了

- [ ] AIShell version bump、changelog / release note、package gateを準備する
- [ ] H承認後にpublish → global install → MCP再起動 → 公開後smokeを同一waveで完遂する
- [ ] dotagents / ServerManagerをrepo別pathspec commitで閉じ、H承認後にpushする
- [ ] cross-repo receiptをfactory masterへ還流し、本計画を`docs/archive/`へ退避する

## 6. 欠陥maintenance queue

AIShell利用中に再現した欠陥は、P0 / P1だけをcritical path上で即修理する。非critical欠陥は
ここへ最小再現、影響、所有箇所を一度記録し、Phaseの通常TODO後、full regression前の
maintenance waveで重複統合して修理する。

| 状態 | 重大度 | 最小再現 | 影響 | 所有箇所 |
|---|---|---|---|---|
| — | — | 現在なし | — | — |

## 7. rollback

- AIShell candidateは隔離prefixから削除し、公開0.2.1へ戻す。
- Codex MCP登録は変更前config backupへ戻し、server processを再起動する。
- ServerManager optional sourceは登録解除しても既存wire v2〜v4を変更しない。
- wire v5 cutover後はv4 endpoint / reporterをretention期間維持し、host単位で戻せるようにする。
- BugHub履歴は削除せず、`not_applicable`または旧wireの観測として保持する。
