# wire v5 設計正本 — AIShellの固定集合編入

**状態:** Active（[AIShell編入計画](plan_aishell-factory-integration.md) Phase A5-P0の成果物）
**工程正本:** Lattice plan `aishell-factory-integration`
**対象:** dotagents reporter、ServerManager / BugHub ingest、4 active host

本書はwire v5の**契約**を所有する。工程状態・完了証拠はLattice storeが、
実装手順は各repoのコードと[reporter runbook](factory-reporter-runbook.md)が持つ。

## 1. なぜ新しいwire majorが要るのか

AIShellをBugHubの観測面へ載せる方法は、着手時点では2つあると考えていた。

- **A案**: 新しいwire majorを切り、固定集合へ`aishell`を加える
- **B案**: majorを切らず、server側のexpectation matrixだけで`aishell`をmac=requiredへ昇格させる

**B案はschemaが塞いでいる**。2026-07-25の実測:

| 面 | 実測 |
|---|---|
| BugHub v2 schema | 14キー定義／12必須。`lattice`・`aishell`をoptional keyとして受理する |
| BugHub v4 schema | 12キー定義、`additionalProperties: false`。`aishell`のスロットが**無い** |
| dotagents client | `lib/factory/contract.mjs`の`exactKeys(report.products, V4_PRODUCT_IDS)`が13個目のキーを拒否する |

つまり現役wire v4では、`aishell`を送ろうとしても**client / server両端で拒否される**。
「optionalだから報告が無いだけ」ではなく、構造的に席が無い。

A3で入れたserver-first optional登録はv2 schemaにだけ存在し、v4 cutoverの時点で
観測面から消えていた。**編入中製品のoptional key登録はwire majorを越えて継承されない**——
これが本waveで最も高くついた発見であり、[還流対象の罠](evidence/wire-v5/)である。

したがって**A案が唯一の経路**であり、B案は棄却する。

## 2. 固定13製品集合

```
caveat, throughline, spotter, lattice, markitdown, gpt-connector,
aiterm-mcp, codex-sidecar, servermanager, claude-code, codex-cli, grok-build,
aishell
```

v4の固定12製品を**順序も含めてそのまま保持**し、`aishell`を1つ加えた集合とする。
`report_mode="full"`、`schema_version="5.0"`、endpoint `POST /api/factory/v5/reports`。

### 不変条件

- **v5はv4の意味を差し替えない**。v4 endpoint、v4 schema、v4の受入証拠は一切変更しない。
  v5は追加であって改訂ではない。
- v2 / v4のproduct set、schema、凍結済み受入証拠を後付けで書き換えない。
- 製品IDの綴りは既存のまま使う（`gpt-connector`、`aiterm-mcp`、`codex-sidecar`、
  `claude-code`、`codex-cli`、`grok-build`）。v5で改名しない。
- `aishell`のsafe_context allowlistは空から始める。必要keyは契約testと同時に個別追加する。

### v3番号の扱い

`v3`はObserver編入（固定13製品）のために予約された番号だが、**client / serverどちらにも
実装が存在しない**（2026-07-25実測: `lib/factory/`・`bin/`・`bughub/`のいずれにもv3は0件）。
v4がv3を飛び越えて着地している。

v5はこの空き番号を再利用**しない**。Observerが将来編入される時は、その時点の現役majorの
次番号を取る。v3はObserver予約の未実装番号として温存し、v5でObserverを扱わない。

## 3. expectation matrix

server側の期待値は[正本matrix](factory-host-product-matrix.md)と一致させる。v5の`aishell`行は
正本が既に定義している——mac=`required`（Apple Silicon / macOS 15+）、server / wsl /
windows-native=`unsupported`（macOS native API不在）。

| product | mac | server | wsl | windows-native |
|---|---|---|---|---|
| caveat / throughline / spotter / lattice / markitdown / gpt-connector / aiterm-mcp / codex-sidecar | required | required | required | required |
| servermanager | not_applicable | required | not_applicable | not_applicable |
| claude-code | required | required | required | **unsupported** |
| codex-cli | required | required | required | required |
| grok-build | **optional** | **optional** | **optional** | **unsupported** |
| **aishell** | **required** | **unsupported** | **unsupported** | **unsupported** |

### 意味論

- `required` + `missing` / `unverified` だけがexpectation issueを作る（`missing`=high、
  `unverified`=warn）。`optional` / `unsupported` / `not_applicable`の欠落はissueにしない。
- **`required`なprofileで`not_applicable`が来た場合もissueにしない**。AIShellはApple Silicon
  専用であり、Intel Macが将来hostに加わればmac profileのまま`not_applicable`を報告する。
  profileの粒度がarchを区別しない以上、製品が構造的な非対応を宣言したらそれを信じる。
  黙って欠損へ読み替えない。
- severityは各報告元の製品契約が決めた値を素通しする。BugHubは再判定しない。

### v5分岐はfall-throughへ委ねない

`factoryExpectation()`は現在`v2`分岐だけを持ち、それ以外は全て`required`へ落ちる。
v5分岐は上表を明示的に書き、fall-throughに頼らない。

## 4. v4 expectation実装と正本の乖離（wv5-0030の裁定）

2026-07-25実測。`bughub/src/db.js`の`factoryExpectation()`に**v4分岐が存在しない**ため、
v4では`servermanager`以外の全製品が`required`へ落ちている。正本matrixとの乖離は2件:

| product | 正本 | v4実装 | live影響 |
|---|---|---|---|
| `grok-build` | mac/server/wsl=optional、windows-native=unsupported | required | main-serverで`unverified`→**偽のwarn expectation issueが実発生中** |
| `claude-code` | windows-native=unsupported | required | windows-workstationは現在導入済みのため**潜在**。欠落した瞬間に偽のhigh issueになる |

`codex-cli`は正本でも4 profile全てrequiredなので乖離しない。

### 裁定: v5分岐追加と同一波でv4分岐も修理する

- **理由1**: 修理対象は`factoryExpectation()`という同一関数であり、v5分岐を書く時に必ず触る。
  別waveへ回すと同じ関数を二度開けることになる。
- **理由2**: 現在の挙動は正本matrixと矛盾しており、**contract違反であって仕様ではない**。
  `bughub/FACTORY_INTEGRATION.md`は「server期待matrixはdotagents正本と一致させる」と定めている。
  v4の期待matrixが未指定なのではなく、指定に反している。
- **理由3**: 修理しないままv5分岐だけ書くと、v4→v5 cutover時にgrok-buildのissueが
  「勝手に消えた」ように見え、cutoverの受入判定を汚す。

**これはwire v4の凍結違反にあたらない**。凍結しているのはproduct set、schema、受入証拠であり、
server側expectation matrixはそのどれでもない。product setもschemaも変更しない。

修理後、main-serverのgrok-build偽warnは次のv4 reportで解決される見込みであり、
これはP5 cutoverの受入項目として実測する。

## 5. v4 → v5 compatibility契約

- **v4 endpointは受理を継続する**。v5 cutover中も、退役裁定（P6）を通すまでv4を止めない。
  `FACTORY_V4_INGEST_ENABLED`と`FACTORY_V5_INGEST_ENABLED`は独立flagとし、片方の停止が
  他方に波及しない。
- **issue identityは`host + product + fingerprint`で共有する**。wire majorをまたいでも
  同一障害を二重issue・二重通知にしない。これはv1→v2→v4で確立済みの規則を継承する。
- **late reportによる巻戻しを拒否する**。観測時刻で判定し、遅れて届いた旧majorのreportが
  新しいcurrentを上書きしない。
- **storageはmajor別に分離する**。v5のreports / observations / currentは専用tableへ入れ、
  v4履歴を削除も移動もしない。issueの原因同一性とstorage分離を混同しない。
- **credentialとendpoint schemaは増やさない**。既存のhost-scoped credentialに乗る。
  製品専用のcredentialやschema majorを作らない。

## 6. rollbackとhost別退避

- **host単位でv4へ戻せる**。global booleanでの一括切替はしない。`factory-reporter-scheduler`の
  `--wire-major v4`で当該hostだけ戻し、他hostのv5運用に影響させない。
- **戻す間もoutboxを保持する**。未送信reportを破棄しない。
- **v5 flagを無効化すればv4運用が無傷である**こと。server側で`FACTORY_V5_INGEST_ENABLED=false`
  へ戻した時、v4の受理・matrix・issueが変化しないことをrollback条件とする。
- **BugHub履歴は削除しない**。v5で観測した`aishell`の履歴は、v4へ戻しても保持する。
- Lattice cutover（wire v4）と同じく、各hostの設定backupをowner-only stateへ保存してから切替える。

## 7. 非目標と既知の罠

### 非目標

- Observerをv5で扱わない。v3はObserver予約の未実装番号として温存する。
- 凍結済みwire v2 / v4のproduct set、schema、受入証拠を後付け変更しない。
- macOS arm64専用というAIShellの製品境界を、未実装hostで動くかのように見せない。
- 製品専用のcredential、endpoint、schema majorを増やさない。
- 全hostの一括切替をしない。

### 既知の罠

1. **編入中製品のoptional key登録はwire majorを越えて継承されない**。v2で`aishell`を
   optional keyとして登録しても、v4 schemaがそれを持たなければcutoverの瞬間に観測面から消える。
   次に「編入中製品」を作る時は、**登録したmajorと、requiredへ昇格するmajorの間に別のmajorを
   挟まない**か、挟むなら当該majorにもoptional keyを引き継ぐ。
2. **AIShellのpath・許可root・process引数・native診断本文をreportへ送らない**。
   `safe_context` allowlistは空から始める。
3. **暗黙fallbackを追加しない**。非対応hostでは構造的な`not_applicable`を返し、
   shell / AppleScript / JXAへ逃がさない。
4. **`factoryExpectation()`のfall-throughに頼らない**。新majorを足す時は分岐を明示的に書く。
   書かないとv4と同じ乖離を再生産する。
