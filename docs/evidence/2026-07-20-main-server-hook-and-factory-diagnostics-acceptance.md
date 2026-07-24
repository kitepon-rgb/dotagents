# main-server正規hook・factory diagnostics受入証拠

- Date: 2026-07-20
- Scope: Lattice `bughub-factory-integration/bf-0454`
- Result: accepted

## 受入

- [ADR 0074](../adr/0074-codex-hook-cross-host-acceptance.md) は、main-serverへ
  POSIX正規形のCodex lifecycle hookを配布し、`verify-install --profile official`が
  greenであることを固定している。
- [ADR 0072](../adr/0072-r2-four-host-rollout-receipt.md) は、同じmain-serverで
  install/config、Lattice、Caveat、Throughline、`gpt_connector`の診断がgreen／readyで、
  post gateとfinal reportが成功したことを固定している。

以上により、正規hook導入後のmain-server factory diagnostics再観測を受け入れる。
この証拠は既存の実host receiptを束ねるだけであり、host設定の再適用やLattice本体の変更は行わない。
