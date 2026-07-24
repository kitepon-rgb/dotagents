# ADR 0078 — Codegraph完全退役とLatticeへの原子的cutover

- Status: Accepted / Immutable
- Date: 2026-07-20
- 裁定者: オーナー
- 親plan: `docs/plan_lattice-factory-integration.md` Phase L7
- Lattice Decision: Lattice `docs/adr/0047-codegraph-absorption-and-sensor-ownership.md`、
  `0049-lattice-mcp-surface-contract.md`、`0059-lattice-sensor-identity-and-tool-name-cutover.md`

## Decision

1. CodegraphはLatticeへ完全吸収済みである。Latticeは第三者Codegraphへ依存しない機能的後継であり、
   独立Codegraphは工場の現役製品・connector・更新対象・required productから退役する。
2. 旧L7の「shadow不合格なら部分退役」と、J1／Oracle rollback完了をCodegraph退役の先行条件にする順序は、
   本オーナー裁定で上書きする。fixture実証は代替能力を確定する受入であり、旧配線を温存する待機gateではない。
3. host cutoverは、公開済み`lattice-mcp`の8面を同一fixtureで通す→Latticeを登録→旧Codegraph登録解除→
   旧daemon停止→global package撤去、の順でhost別に行う。全hostを一括greenへ丸めない。
4. BugHub／ServerManagerのCodegraph履歴は削除せず`retired`／`not_applicable`へ遷移させる。
   wire v4の現役集合はCodegraphを除きLatticeを含む。
5. rollbackは保存したhost設定backupと撤去前version `@colbymchenry/codegraph@1.4.1`の明示再導入手順で
   成立させる。ただしrollback経路を自動更新・通常install・MCP恒久配線へ残さない。
6. attribution、LICENSE、NOTICE、不変ADR、archive、移行履歴は削除しない。

## 完了判定

禁止分類の実行依存、MCP登録、global package、daemon、更新対象、required product扱いが全hostで0件になり、
Latticeの8 tool、typed failure、isolated HOME、実session、両repo CI、publish後global smokeがgreenであること。
