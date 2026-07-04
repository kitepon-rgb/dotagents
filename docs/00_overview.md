# docs/ の地図（正典入口）

dotagents の文書群の全体地図。docs/ 直下は**生きた文書だけ**を置き、役目を終えた文書は [archive/](archive/) へ退避する（文書3分類の規約は [../PLAN.md](../PLAN.md) 憲章「文書の作法」、経緯は [adr/0003](adr/0003-campaign-close-plan-todo-merge.md)）。ファイル名は生きた参照＝みだりにリネームしない（[adr/0002](adr/0002-docs-names-are-live-references.md)）。

## 読む順

| 文書 | 役割 |
|---|---|
| [../PLAN.md](../PLAN.md) | **憲章（聖典 v4）**。趣旨・原則1〜10・文書の作法・定常運用・残件 |
| [PROJECT_LAYOUT.md](PROJECT_LAYOUT.md) | 全プロジェクト共通のフォルダ構成標準 |
| [MODELS.md](MODELS.md) | 役割→現行モデル対応の唯一の参照点 |
| [settings.fragments.md](settings.fragments.md) | .claude/settings.json の生成手順・断片 |
| [P4_PROMOTION_QUEUE.md](P4_PROMOTION_QUEUE.md) | 端末メモリ→リポ正典への昇格待ち行列（全行消化で削除） |
| [adr/](adr/) | このリポ自身の構造決定の記録 |
| [archive/](archive/) | 役目を終えた文書（Fable 期キャンペーンの計画 v3・消化台帳一式） |

## 関連

- 罠DB: [../caveat/](../caveat/)（own エントリの正本。caveat MCP が symlink 越しに読む）
- 調査資産: [../rag/INDEX.md](../rag/INDEX.md)
- 人格・全端末規範: [../claude/CLAUDE.md](../claude/CLAUDE.md)（グローバル CLAUDE.md 正本）
