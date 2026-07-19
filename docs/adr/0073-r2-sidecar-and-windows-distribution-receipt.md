# ADR 0073: R2 Sidecar・Windows実配布受入記録

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `factory-master/fm-0582`、`bughub-factory-integration/bf-0431`、`bf-0452`、`bf-0463`、`bf-0466`、`bf-0469`
- Prior receipt: [ADR 0072](0072-r2-four-host-rollout-receipt.md)

## Decision

R1でlocal受入したSpotter Windows経路、Sidecar auditor preset、Throughline diagnostics、Windows factory ACL、npm shim resolver、Sidecar Windows MCP診断を、4ホストのregistry実配布物とFOX Windows nativeのpost-update実績で受け入れる。

より広い`bf-0447`は「全host post-update gate green」を要求する。FOX WSL2には既知のCodex hook安全blockが残るため、本記録から同taskの完了を推測しない。

## 4ホスト実測

| host | Sidecar | auditor診断 | Spotter doctor | 判定 |
|---|---|---|---|---|
| Mac | `0.3.8`、CLI/core/MCP一致 | overall ready、preset ready 4 / not-ready 0、dry-run `auditor`、model policy explicit、runtime store ready / pending 0 | `1.4.25`、OK 0 warnings、Sidecar auditor available | accepted |
| main-server | 同上 | 同上 | `1.4.25`、OK 0 warnings | accepted |
| FOX WSL2 | 同上 | 同上 | `1.4.25`、OK 0 warnings | accepted。Codex hook安全blockは別task |
| FOX Windows native | `0.3.8`、CLI/core/MCP一致 | overall ready、preset ready 4 / not-ready 0、dry-run `auditor`、model policy explicit、runtime component ready。store実体は未作成のため`absent` / pending 0 | `1.4.25`、OK 0 warnings、Windows npm shim経由でSidecar auditor available | accepted |

実測時のdotagents HEADはMac `da1152b`、三remote `8365e4f`。三remoteは受入対象adapterと設定を含む同一R2配布点であり、後続のLattice工程状態commitは診断契約を変更しない。

## Throughline実配布

ADR 0072で4ホストすべてのThroughline `0.8.1`、schema v9、factory diagnostics readyを確認した。v8 DBが残っていた三remoteはDB/WAL/SHMを退避して製品正規migrationを実行済みで、再発防止はLattice `factory-master/fm-0645`へ分離した。

## FOX Windows native実配布

- `agents-update` post gate `c9f17328-e0b7-4d7f-b6a2-6d63d8460858`、final report `956c130b-c1c8-4541-98bd-e1af2c0b969b`は成功した。これにより以前残っていたtoolchain ledger `post_gate_failed`とSidecar/Caveat/aiterm diagnostics driftは解消した。
- 2026-07-18の実機scan→enqueue→flush→Task Scheduler dry-run/apply/実火、およびcurrent-SID-only ACL適用は、Lattice source ledgerのWindows ACL受入履歴に固定済みである。今回のpost-update成功が、当時の残条件だった3製品ledgerとnative diagnosticsを閉じる。
- `codex-sidecar factory-diagnostics`をPowerShellから固定Git Bash入口で実行し、npm `.cmd`配布版のCLI/core/MCP `0.3.8`一致とMCP診断readyを確認した。Spotter doctorも同じWindows実機でauditor availabilityを確認した。

## 根拠となるR1 receipt

- [ADR 0013](0013-throughline-diagnostics-product-receipt.md): Throughline producer修正
- [ADR 0014](0014-windows-factory-acl-local-receipt.md): current-SID-only ACL
- [ADR 0015](0015-windows-npm-shim-local-receipt.md): npm shim resolver
- [ADR 0016](0016-spotter-windows-codex-product-receipt.md): Spotter Windows実行経路
- [ADR 0017](0017-codex-sidecar-windows-mcp-product-receipt.md): Sidecar Windows MCP診断
- [ADR 0018](0018-sidecar-auditor-preset-local-receipt.md)・[ADR 0020](0020-sidecar-auditor-adapter-receipt.md): auditor presetとfactory adapter

## 非目標

Codex hook trustと新規対話sessionでのhook実火は後続`fm-0584` / `fm-0585`が所有する。FOX WSL2のhook再有効化、BugHub停止canary、Oracle rollback、scheduler定常運用の全体完了も本受入には含めない。
