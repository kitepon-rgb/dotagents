# ADR 0063: R2 Mac read-only監査の受入

日付: 2026-07-19

## Status

Accepted。

## Decision

- `fm-0580` のMac受入は未完のまま維持する。routing 3 role green、install検証、MCP登録、Lattice診断を全体合格へ拡張しない。
- Codex hooksは静的配線と実火を分離する。初回INFO、同session 2回目沈黙、compact再武装、Stop pending配送は未収容。
- Spotterはmarker / hook配線がverifiedだが、`spotter.hook_event.v1`の新規session実火まではexecution-verifiedとしない。
- コアCLI 8製品＋Latticeはinstalled / verified。`gpt_connector`はregistered / enabled。実consult前はexecution-verifiedとしない。
- Lattice `factory-diagnostics` 0.5.0はoverall=ok、5 checks green。Lattice MCP面はwire v4前のため未配線のまま。
- `fm-0585` と `fm-0593` はactive表示だが、それぞれ `fm-0584`、`fm-0586` の未充足依存がある。`fm-0580`以外を二重dispatchしない。

## Evidence

- Control `r2-host-rollout-20260718`:
  - accepted: `r2-mac-core-sorter-20260719`
  - rejected: `r2-mac-e2e-refuter-20260719`（親がclaimsを要約転記した収容手順違反）
  - accepted: `r2-mac-e2e-refuter-retry-20260719`（exact minified Reportをそのままimport）
- 親再検証: `verify-install` green、`lattice todo verify` stale=false、`lattice todo status`で依存を確認、git status clean。

## H境界

`--apply`、hook trust、MCP追加・OAuth login、remote host変更は本監査で実行していない。read-only診断はH後の実火receiptを代替しない。
