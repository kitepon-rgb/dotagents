# 開発工場 統合マスター計画

**状態:** Active  
**工程正本:** Lattice `factory-master`

この文書は開発工場campaignの目的と現役導線だけを示す。Task、依存、状態、完了証拠は
Lattice storeが唯一の正本であり、Markdown checkboxや旧queueへ二重化しない。

## 現在の工場

- 開発工場: dotagents
- 自作コア10製品: Caveat／Throughline／Spotter／Lattice／gpt-connector／aiterm-mcp／
  codex-sidecar／AIShell／Observer／ServerManager
- 第三者管理製品: MarkItDown（公開CLIだけをblack-box管理）
- 基盤toolchain: Claude Code CLI／Codex CLI／Grok Build
- 現役factory wire: v6・固定14製品
- 独立Codegraph: retired／not_applicable。Lattice sensorが正式後継

所有境界と恒久規則は[AGENTS.md](../AGENTS.md)、趣旨は[PLAN.md](../PLAN.md)、有限契約は
[factory-product-contracts.md](factory-product-contracts.md)、host別受入は
[factory-host-product-matrix.md](factory-host-product-matrix.md)を正とする。

## 完了campaign

- [Lattice編入](archive/plan_lattice-factory-integration.md)
- [AIShell編入](archive/plan_aishell-factory-integration.md)
- [Observerコア編入](archive/plan_observer-core-integration.md)
- [Codex全対応](archive/plan_codex-full-support.md)
- [BugHub工場統合](archive/plan_bughub-factory-integration.md)
- [工場全文書同期](archive/plan_factory-documentation-sync.md)

## 現在のwave

Tier 2機械境界wave（`fm-0687`〜`fm-0690`・2026-08-02起票・lane `canon-layer-redesign`）が進行中。
各ToDoの平文設計メモは[source-ledger](archive/lattice-source-ledger/canon-tier2-gates-20260802.md)にある
（`lattice todo note`経路が下記欠陥で塞がっている間の一時迂回）。

## maintenance queue

- **Lattice `todo note`がスタブrevisionでfail closed**（2026-08-02記録・所有repo=Lattice・非クリティカル）:
  `factory-master`履歴中の`rev-c7e2409e…`（2026-07-20移行中断の残骸・`plan.json`欠落）でnote投影が
  `NOTE_PROJECTION_INVALID`になる。最小再現・迂回はcaveat
  `lattice-todo-note-revision-plan-json-note-projection-invalid`が正。2026-08-02に Lattice 0.40.1（`3d6b882`）で修理・publish済み＝**解消**。

工程表示は次で生成する。

```bash
lattice todo status --json
lattice todo gantt --scope live
lattice todo gantt status
```

旧queue、wire v2〜v5の移行過程、完了済みH gate、障害訂正の詳細はgit履歴・archive・ADR・
Lattice storeに保持し、本書へ再掲しない。
