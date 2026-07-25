# Observer wire v6 client実装証拠

- Lattice task: `observer-core-integration/oci-0070`
- dotagents commits: `d3217ba`, `fda9f7a`
- wire contract: `6.0`
- fixed products: 14（v5の13製品順を保持し、末尾に`observer`）

## 実装

- `@quolu/observer@0.1.0`のscoped package導入・更新・隔離検証へ追従した。
- Darwinでは`observer diagnostics`の公開schemaをstrict検証し、非対応hostでは
  `not_applicable` / `unsupported`を構造的に投影する。
- v6専用scan、reporter、outbox、scheduler runner、`/api/factory/v6/reports`
  endpoint検証を実装した。v5とstate/outboxを共有しない。
- v5 transportを共通実装として再利用するが、validator、ack schema、endpoint、
  state、outbox schemaは実行majorで明示的に分離する。
- wire major契約テスト群が`make ci`から漏れていた欠陥を修正し、
  `test-factory-wire`を必須gateへ追加した。

## 検証

- focused wire/runtime/scheduler: 42 tests、0 failure。
- `make lint-js test-install test-factory-wire test-factory-reporter`: 全green。
- 実導入済み`observer`を使う`factory-scan-v6`→`factory-reporter-v6 preview`:
  schema `6.0`、14製品、Observer `installed` / `compatible`、
  diagnostics 5 checksすべて`pass`。
- `install.sh --profile official`後、
  `factory-scan-v6`、`factory-reporter-v6`、
  `factory-reporter-v6-schedule-runner`の配布symlinkを確認した。

## Rollback

v5 client、v5 state、v5 outbox、v5 endpointは変更せず保持している。
host schedulerを`--wire-major v5`で再登録すればv5へ戻せる。
