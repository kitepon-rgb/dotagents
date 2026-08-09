# t-enroll-cutover ServerManager wire v7 enroll + 4host段階cutover — 完了証跡

## スコープの分割（room合意 [69][74]）

調査の結果、実体は3層に分かれることが分かったため、リスクの低い部分だけを本taskで実装し、
実deploy・flag有効化・host cutoverは別task「t-cutover-deploy」として切り出した（room[69]、
異論なし）。

- **A. ServerManager repo側のwire v7実装**（本taskで完了）
- **B. dotagents側の配信CLI追加**（本taskで完了）
- **C. 実deploy＋flag有効化＋Mac canary dual-run＋host別cutover**（t-cutover-deployへ切り出し）

## 何をしたか

### A: ServerManager（`kitepon-rgb/ServerManager`、commit `0f196d3`、push済み）

wire v6（Observer編入、commit `e0674e2`）のパターンを踏襲。

- `bughub/schemas/factory-report-v7.schema.json`（新規）: v6 schemaを複製し`peertable`を
  固定15製品目として追加、`schema_version: "7.0"`。
- `bughub/schemas/factory-safe-context-v1.json`: `peertable: []`（空allowlist）追加。
- `bughub/src/factory-contract.js`: `V7_PRODUCT_IDS`・`validateFactoryReportV7`追加。
- `bughub/src/factory-ingest.js`: `ingestFactoryReportV7`追加。
- `bughub/src/factory-router.js`: `/api/factory/v7/reports`ルート追加（`v7Enabled`引数）。
- `bughub/src/config.js`: `factoryV7IngestEnabled`（既定`false`、`FACTORY_V7_INGEST_ENABLED`）追加、
  `anyFactoryIngestEnabled`へ反映。
- `bughub/src/db.js`: `saveFactoryReportV7`追加、`factoryExpectation()`・
  `reconcileFactoryCurrentSet()`・runtime error resolution判定の`['v5','v6']`ガードを
  `['v5','v6','v7']`へ拡張。`peertable`の期待値はNode CLI（host制限なし）のため
  Observer/AIShellの`macOnly`型でなく全profile`required`型とした。
- `bughub/src/factory-view.js`・`bughub/public/index.html`: `peertable: 'kitepon-rgb/peertable'`
  repo mapping追加。
- `bughub/.env.example`・`bughub/FACTORY_INTEGRATION.md`: v7 flag・enrollment節（§4.1.5）追加。
- test 4file更新（factory-contract/ingest/router/view.test.js）。

### B: dotagents配信CLI（commit `84c143d`、push済み）

- `bin/factory-reporter-v7.mjs`・`bin/factory-reporter-v7-schedule-runner.mjs`（新規、v6と同型、
  実体はv5.mjsへdelegate）。
- `bin/factory-scan-v7.mjs`（新規、v6版の直接対応、`scanV7WithAcknowledgements`/`validateReportV7`
  を使用）。
- `bin/factory-reporter-v5.mjs`: `IS_V7`分岐追加（`process.argv[1]`のbasenameで`v7`を検出、
  endpoint/state/outboxSchemaをv7専用値へ切替）。
- `bin/factory-reporter-v5-schedule-runner.mjs`: `WIRE_MAJOR`判定へv7追加。
- `bin/factory-reporter-scheduler.mjs`: `--wire-major`許可値へ`v7`追加。
- `lib/factory/runtime-errors.mjs`: `validateAcknowledgementBundleV7`・`acknowledgeRuntimeErrorsV7`
  追加（v4以降と同じpayload契約を共有、schema_versionタグだけ`7.0`）。

## どう確認したか

- ServerManager: `npm --prefix bughub test`で133 test全green（既存127＋新規6: contract 2・
  ingest 3・router 1）。`bughub/test/deploy.test.sh`の失敗は`git stash`で変更前に戻しても
  再現する既存環境問題（`aaaa...a`プレースホルダpathのfixture欠落）と確認、本taskの変更とは
  無関係。
- dotagents: `node --test tests/wire-v7/wire-v7.test.mjs`で11 test全green（reporter/scheduler
  テスト2件を追加）。共有コード（runtime-errors.mjs、factory-reporter-v5.mjs）を触ったため
  `tests/wire-v5/wire-v5.test.mjs tests/wire-v6/wire-v6.test.mjs tests/wire-v7/wire-v7.test.mjs
  tests/lattice-cutover/wire-v4.test.mjs tests/factory-reporter/v2-contract.test.mjs
  tests/factory-scan/factory-scan.test.mjs`で61 test全green（非回帰確認）。
- `FACTORY_V7_INGEST_ENABLED`は既定`false`のため、本taskの変更は現在の本番挙動を一切変えない
  （新endpointは404のまま、既存v6運用は無変更）。

## 引き継ぎ

t-cutover-deploy（新規task、これから起票）が実deploy・flag有効化・canary・host cutoverを持つ。
FOX WSL2/Windows nativeはこのセッションから到達不能なため、その2hostのcutoverは
t-cutover-deployの中でcarry over対象として明示する。

記録者: tsumugi
