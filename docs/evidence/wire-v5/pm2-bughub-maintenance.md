# PM2受入証拠 — cutoverで見つけたBugHub欠陥の修理

- 日付: 2026-07-25
- 所有repo: ServerManager（wv5-0870）、dotagents（wv5-0880）

## wv5-0870 — 退役製品のexpectation issueが永久に残る

### 欠陥

full snapshotに現れない製品はそのwire majorから退役している。退役製品は以後どのreportでも
評価されないため、**退役前に開いたexpectation issueが自動では永久に解決しない**。

実測（修理前）: 退役済み`codegraph`のexpectation issueが**4 host全て**で開いたまま。
`state`は`recurred` / `ongoing`、最終更新は**2026-07-20**（Codegraph退役日）。
4日間observation面のnoiseとして残り続けていた。

### 修理

`applyFactoryIssues`の末尾に`resolveRetiredProductExpectations`を追加した。
`report_mode === 'full'`の時だけ、報告集合に無い製品のopen expectation issueを明示解決する。
full snapshotを唯一の真実として扱う設計であり、部分reportでは何もしない。

将来どの製品が退役しても自動で効く。個別の管理コマンドを増やさない。

### 実測（修理後）

```
codegraph: fox-wsl=resolved mac-kite=resolved main-server=resolved windows-workstation=resolved
```

**4 host全てで解決した。** 残るopen expectation issueは9件で、すべて実在の欠落
（fox-wslのコア製品8種、windows-workstationのaiterm-mcp warn）である。
本waveと無関係な既存の問題であり、noiseではない。

BugHub test **89/89**（回帰test「退役製品のexpectation issueはfull snapshotで明示解決される」を追加）。

## wv5-0880 — contract_versionの意味が製品間で不揃い

### 不整合

`lib/factory/scan.mjs`の`emptyProduct()`が`contract_version: '1.0'`（v1期の値）を固定する。
`latticeProduct` / `aishellProduct`はwire版で上書きしていたが、`serverManagerNative`だけ
漏れていた。結果、main-serverの`servermanager`だけが`1.0`を返し、他製品は`5.0`だった。

v4時点のBugHub履歴でも`1.0`であり、**v5の回帰ではない**既存不整合。

### 裁定

`contract_version`は**wire contract版を一貫して指す**。製品固有のschema版は
`state_schema_version`が持つ（AIShellが`aishell.runtime_configuration.v2`を返す例）。
v5でservermanagerもwire版へ上書きする。

### 実測（統一後）

mac-kiteのv5 snapshot:

```
  aishell        presence=installed       contract=5.0
  servermanager  presence=not_applicable  contract=5.0
  codegraph      presence=not_applicable  contract=2.0   ← 退役製品の履歴は当時の値を保持
```

退役済み`codegraph`だけがv2期の`2.0`を保つ。**major越しの履歴は書き換えない**という
compatibility契約どおりで、現役製品はすべてwire版に揃った。

client test **8/8**。

## deploy

- ServerManager `9a9e3b95be7a5b5fb55c81968d27539a5766d1cf`（`origin/main`の祖先を事前確認）
- `deploy.sh --apply` → `/readyz` = `ready`、`source_revision` = `9a9e3b95be7a`
- v5 endpointは`401`（認証要求＝経路生存）を維持
