# docs/ の地図（正典入口）

dotagents の文書群の全体地図。docs/ 直下は**生きた文書だけ**を置き、役目を終えた文書は [archive/](archive/) へ退避する（文書3分類の規約は [../PLAN.md](../PLAN.md) 憲章「文書の作法」）。

**命名規約**（[adr/0004](adr/0004-docs-naming-convention.md)）: 恒久正典＝`NN_` 連番・小文字ケバブ（番号が読む順）／一時文書＝`plan_`・`queue_` 接頭辞（TODO を兼ね、完遂で archive へ）／archive 内＝`YYYY-MM_` 接頭辞（時系列に並ぶ）。

## 読む順

| 文書 | 役割 |
|---|---|
| [../PLAN.md](../PLAN.md) | **憲章（聖典 v4）**。趣旨・原則1〜10・文書の作法・定常運用・残件 |
| [01_project-layout.md](01_project-layout.md) | 全プロジェクト共通のフォルダ構成標準 |
| [02_models.md](02_models.md) | 役割→現行モデル対応の唯一の参照点 |
| [03_settings-fragments.md](03_settings-fragments.md) | .claude/settings.json の生成手順・断片 |
| [04_ci.md](04_ci.md) | lint / CI ゲート（`make ci`＝CI同一、`make lint`＝静的部分ゲート）の正典 |
| [05_codex-fragments.md](05_codex-fragments.md) | Codex 端末設定の断片カタログ（MultiAgent V2 role routing 必須断片・実効値ゲート・親既定はオーナー領分） |
| [06_gpt-connector.md](06_gpt-connector.md) | ChatGPT接続の正規ランブック（`gpt_connector` / `gpt-connector-mcp`・専用Chrome・session回収） |
| [06_oracle-mcp.md](06_oracle-mcp.md) | Oracleの互換・手動rollback記録（新規導入の正本ではない） |
| [../shared/orchestrate/contract.md](../shared/orchestrate/contract.md) | 両親共通のorchestrate use-not-use・Control lifecycle・統括ゲート |
| [../shared/orchestrate/delegation-contract.md](../shared/orchestrate/delegation-contract.md) | 製品中立のDelegation Packet／Worker Reportと統括側受入契約 |
| `plan_*.md` | 進行中プラン（TODO 兼務。完遂で `YYYY-MM_` 接頭辞にして archive へ） |
| [queue_memory-promotion.md](queue_memory-promotion.md) | 端末メモリ→リポ正典への昇格待ち行列（全行消化で削除） |
| [adr/](adr/) | このリポ自身の構造決定の記録 |
| [archive/](archive/) | 役目を終えた文書（Fable 期キャンペーンの計画 v3・消化台帳一式） |

## 関連

- 罠DB: [../caveat/](../caveat/)（own エントリの正本。caveat MCP が symlink 越しに読む）
- 調査資産: [../rag/INDEX.md](../rag/INDEX.md)
- 人格・全端末規範: [../claude/CLAUDE.md](../claude/CLAUDE.md)（グローバル CLAUDE.md 正本）
