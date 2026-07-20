# Codegraph退役・Lattice cutover受入証拠

- 日付: 2026-07-20
- Control: `codegraph-lattice-cutover-20260720`
- Lattice release: `@quolu/lattice@0.7.0`
- Lattice commit: `278f0fe8cf641f2b4273e602c32c73872bfb0c4a`
- ServerManager commit: `e7eac92`（merge/push: `2242768`）

## Host別cutover

| host | Lattice | Claude/Codex MCP | Codegraph package/command/process | daemon registry |
|---|---|---|---|---|
| Mac | 0.7.0 | `lattice`登録、実Claude sessionでtool実行 | 撤去、0件 | 旧73 recordをowner-only rollback backupへ移動、現0件 |
| main-server | 0.7.0 | `lattice`登録・接続・JSON-RPC smoke | 撤去、0件 | 旧recordなし |
| FOX WSL2 | 0.7.0 | `lattice`登録・接続・JSON-RPC smoke | 撤去、0件 | 旧1 recordをrollback backupへ移動、現0件 |
| FOX Windows | 0.7.0 | `lattice`登録・接続、sensor init | 撤去、0件 | 旧recordなし |

## 実session証拠

新規Claude processから許可toolを`mcp__lattice__codegraph_status`だけに限定して実行し、次を得た。

```json
{"provider":"lattice","sensor_owner":"lattice","version":"0.7.0-lattice.1","mode":"daemon"}
```

isolated HOMEではClaude/Codexへ`lattice-mcp`だけを登録し、両方のlistがLatticeのみ、Claude healthが
Connectedであることを確認した。

## 残存分類

| 分類 | 結果 | 扱い |
|---|---|---|
| 禁止: PATH command、外部package/SDK、MCP登録、process、daemon、更新・install対象、required製品 | 0件 | fail-closed検査対象 |
| 許可: LICENSE、NOTICE、fork attribution、不変ADR、archive、移行証拠、v1/v2履歴欄 | 残置 | 改竄・削除しない |
| 要裁定: `codegraph_*` tool名、`.codegraph/` storage、`CODEGRAPH_*` internal ABI | 残置 | ADR 0047/0049/0059どおりLattice所有identityを返す互換面 |

## Rollback

各hostの設定backupとMac/WSLのdaemon record backupをowner-only stateへ保存した。必要時は設定を復元し、
`@colbymchenry/codegraph@1.4.1`を明示再導入できる。rollback経路はinstaller、updater、MCP設定へ恒久配線しない。

## Server

BugHubへ`/api/factory/v4/reports`を追加し、固定12製品はLattice必須・Codegraph拒否とした。v4は既存履歴tableを
共有してCodegraph履歴を削除しない。main-serverへrevision `2242768`をdeployしreadinessを通過した。
