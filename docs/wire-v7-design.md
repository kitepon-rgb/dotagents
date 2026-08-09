# wire v7 設計正本 — peertableの固定集合編入

**状態:** Active（[peertable編入campaign](plan_peertable-onboarding.md)の設計成果物）
**工程正本:** Lattice plan `peertable-onboarding`
**対象:** dotagents reporter（client実装のみ。ServerManager / BugHub ingestと4 host cutoverはH承認待ち）
**契約:** [s1合意（決定45、peertable repo `docs/plan.md`）](https://github.com/kitepon-rgb/peertable)

本書はwire v7のclient側契約を所有する。wire v6踏襲のserver-first・dual-run設計を維持しつつ、
本waveで実装した範囲（`lib/factory/v7.mjs`・`lib/factory/contract.mjs`配線・tests・privacy fixture）と、
H承認待ちで実行していない範囲（server実装・endpoint有効化・host cutover）を明示的に分ける。

## 1. 新しいwire majorが必要な理由

現役wire v6は固定14製品を完全報告する契約であり、`additionalProperties: false`とexact-key検証により
未知の製品キーを拒否する。peertableをv6へ暗黙追加することは、同じversion文字列のschemaを事後変更する
契約破壊になる（Observer編入時にwire v5へ足さずwire v6を起こした理由と同型）。よってpeertableは
新しいwire v7へ編入し、v6は履歴として凍結する。

## 2. 固定15製品

`products`のキーは次の順序・集合に固定する。

1. `caveat`
2. `throughline`
3. `spotter`
4. `lattice`
5. `markitdown`
6. `gpt-connector`
7. `aiterm-mcp`
8. `codex-sidecar`
9. `servermanager`
10. `claude-code`
11. `codex-cli`
12. `grok-build`
13. `aishell`
14. `observer`
15. `peertable`

clientとserverはこの15キーの完全一致を検証する。欠落、余剰、別名、重複を拒否し、
製品集合をoptional keyやserver側だけのexpectationで拡張しない。

## 3. transportとversion

- schema: `factory.report.v7`
- `schema_version`: `7.0`
- endpoint（設計。本waveでは有効化しない）: `POST /api/factory/v7/reports`
- report: 各hostの固定15製品を毎回完全報告する
- identity、late-report ordering、current/history保存はv6までの契約を継承する
- v6 endpointとschemaはrollback期間中、変更せず並存させる

serverはrequest pathから決まる実際のwire versionでschemaとexpectationを評価する。
共有save pathを通る場合も、v7をv2/v5/v6の既定分岐へfall-throughさせない
（実装はH承認後のServerManager waveが持つ。本waveはclient側契約の設計だけを確定する）。

## 4. peertableの診断projection

### 4.1 正規入口

reporterは製品所有の正規入口 `peertable-client diagnostics --json` を実行し、
schema `peertable.native_factory_diagnostics.v1`だけを解釈する（決定45）。

projectionは`lib/factory/v7.mjs`の`projectPeertableFactory`が機械的に照合する。

- `product.name`が`peertable`、`product.version`がsemver
- `checks`が`version_consistency` / `bin_integrity` / `node_runtime` / `skill_bundle` / `room_reachability`の
  exact allowlistで、各値が`pass` / `fail` / `not_applicable` / `unverified`
- `overall`が`ready` / `not_ready` / `unverified`で、exit code（`overall === 'ready'`のときだけ0）と一致する
- `overall === 'ready'`→`compatibility_status: compatible`・全check `pass`
- `overall === 'not_ready'`→`compatibility_status: incompatible`・fail checkは固定fingerprint
  （`sha256(peertable\0check_id\0reason_code)`、occurrence_count 1、first_seen=last_seen=observed_at。
  永続state不要——v5.mjsの`failure()`と同型の単発scan設計）
- schema不正・CLI不在は`compatibility_status: unverified`へfail closed
  （CLI不在は`presence_status: missing`、schema不正は`unverified`。理由コードは`native_schema_invalid`固定でv6 Observerパターンを踏襲する）

### 4.2 room_reachabilityの扱い

`room_reachability`checkは`PEERTABLE_URL`未設定時`not_applicable`になる（peertable自身のnpm publish gateと同じ設計、決定45）。
dotagents adapterは`peertable-client`を呼ぶ際、親環境の`PEERTABLE_URL`値によらず常に空文字へ倒す
（`lib/factory/v7.mjs`の`peertableProduct`）。工場scanの製品健全性判定を、たまたまLAN roomが落ちている
かどうかに結合させないための設計であり、不可侵原則「room server到達性はServerManagerのserver profile /
Observerの`not_applicable`という既存パターンを踏襲する」の具体化である。

### 4.3 privacy

peertableの`safe_context` allowlistは初期状態で空集合とする（`lib/factory/contract.mjs`の
`SAFE_CONTEXT_ALLOWLIST`）。決定45の診断出力自体がpath・token・room本文を含まない設計だが、
adapter側でも同じ空allowlistを強制し、将来の診断拡張がsafe_context経由で内部stateを
漏らすことをclient側で先に拒否する。room DB・member state・message本文はadapterが解釈しない
（不可侵原則）。

## 5. host expectation（設計方針。matrix本体はt-docsが持つ）

peertableはNode.js CLI（`engines.node >= 20`）であり、Observer/AIShellのようなmacOS固有APIに
依存しない。4 active hostすべてで`peertable-client`が動作しうるため、host expectationは
Observer型の`unsupported`分岐ではなく、他のnpm CLI製品（gpt-connector等）と同じ`required`型を
想定する。実際のmatrix行追加とseverity確定はt-docsの範囲とする。

## 6. BugHub issue契約（設計。実装はH承認後）

- issue identityは既存どおり`host + product + fingerprint`
- severityは報告元の製品診断またはadapter契約が決め、BugHubは上書きしない
- `resolve` / `reopen`と`/ai`の既存契約を維持する
- late reportはcurrent viewを巻き戻さない
- v6とv7で同じ根因を観測した時は、wire versionだけで別issueを増殖させない

## 7. server-first migration（設計。本waveは1・5のclient側だけ実装済み）

1. ~~ServerManagerへv7 schema、固定15製品、expectation、fixture、endpointを追加する。~~ dotagentsへv7
   client（`lib/factory/v7.mjs`・contract配線・tests・privacy fixture）を追加する（本wave完了）。
2. `FACTORY_V7_INGEST_ENABLED=false`を既定にし、v6 ingestを変更しない。（H承認後）
3. v7のschema、unknown-key拒否、late-report、issue identity、v6 regressionを検証する。（H承認後）
4. server側だけv7 ingestを有効化し、client未送信状態がv6運用へ影響しないことを確認する。（H承認後）
5. ~~dotagentsへv7 reporter、peertable adapter、fixture、host matrixを追加する。~~ adapter・fixtureは本wave完了。
   reporter bin（`bin/factory-reporter-v7.mjs`等）とhost matrix行はt-hpkg承認後またはt-docsの範囲。
6. canary hostからv6/v7 dual-runを始める。（H承認後）
7. 全active hostでpeertableの構造化判定（required/unsupported）が期待どおりであることを確認する。（H承認後）
8. 全active hostのv7 current view、history、issue transition、privacyを照合してcutoverする。（H承認後）

feature flagはv6と独立させる。単一のglobal switchでv6を同時停止しない。

## 8. rollback

rollbackはhost単位でv7 reporterを止め、backup済み設定からv6 reporterへ戻す。
server側は`FACTORY_V7_INGEST_ENABLED=false`でv7受付を停止できる。

rollback時も次を維持する。

- v6 endpointと固定14製品契約
- v6/v7のreport historyとoutbox
- BugHub issue history
- peertableの公開releaseと導入済みartifact

historyを削除せず、v7 reportをv6形式へ書き換えない。peertableが導入済みでも、
v6 reporterはpeertableを報告しない。

## 9. 非目標

- peertableの機能追加、UI追加、platform support拡大
- 既存wire major（v1〜v6）の履歴改変
- v6 schemaへのpeertable後付け
- room DB・member state・message本文の集約またはServerManagerへの送信
- ServerManagerによるpeertable内部状態の直接変更
- 全host一括の不可逆cutover
- server側実装（ServerManager/BugHub ingest）とhost cutoverの実行（H承認待ち。t-hpkgが承認要求文書を持つ）

## 10. 受入条件

1. client / contract / tests / privacy fixtureが固定15製品の同一集合を使う。
2. v7は欠落・未知・余剰product keyを拒否する（clientの`validateReportV7`）。
3. `peertable-client diagnostics --json`の実測JSONからprojectionが`compatible` / `incompatible` / `unverified`を
   正しく導出する（ready / not_ready / schema不正 / CLI不在の4経路）。
4. `room_reachability`が親環境の`PEERTABLE_URL`によらずadapter呼び出し時は`not_applicable`相当へ倒れる。
5. peertableのpath・token・room本文がreportへ流れない（safe_context空allowlist・privacy fixture）。
6. v6 endpoint、schema、固定14製品、issue transitionのregressionがgreenである。
7. server-first、dual-run、host別cutover、host別rollbackの設計がv6と同型で説明できる（実証はH承認後）。

## 工程正本

task、依存、ready frontier、完了証拠はLattice plan `peertable-onboarding`だけを正本とする。
この文書へtask checkboxを複製しない。
