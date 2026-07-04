# docs/ の地図（正典入口）

dotagents の文書群の全体地図。**このリポの docs/ は意図的に連番リネームしない**——`TODO.md`・`PENDING_OWNER.md` 等のファイル名は、全端末の運用指示・コピペ文・グローバル CLAUDE.md から名前で参照される「生きた参照」であり、リネームは全端末を同時に壊す（PROJECT_LAYOUT の見送り基準＝破壊的リスク>益。決定の記録は [adr/0002](adr/0002-docs-names-are-live-references.md)）。

## 読む順

| 文書 | 役割 |
|---|---|
| [../PLAN.md](../PLAN.md) | **聖典**。環境整備の方針・原則・理由（Why の正） |
| [TODO.md](TODO.md) | 消化状況の正（チェックボックス・波・台帳） |
| [PENDING_OWNER.md](PENDING_OWNER.md) | オーナー承認・人手待ちの単一集約点 |
| [PROJECT_LAYOUT.md](PROJECT_LAYOUT.md) | 全プロジェクト共通のフォルダ構成標準（P3 の正） |
| [P3_GAP_LEDGER.md](P3_GAP_LEDGER.md) | 標準化対象18リポの確定・ギャップ台帳 |
| [MODELS.md](MODELS.md) | 役割→現行モデル対応の唯一の参照点 |
| [SYNC_LEDGER.md](SYNC_LEDGER.md) | 端末別の同期掃引台帳 |
| [OTHER_TERMINAL_KICKOFF.md](OTHER_TERMINAL_KICKOFF.md) | 他端末へのコピペ指示文 |
| [settings.fragments.md](settings.fragments.md) | .claude/settings.json の生成手順・断片 |
| [adr/](adr/) | このリポ自身の構造決定の記録 |

## 関連

- 罠DB: [../caveat/](../caveat/)（own エントリの正本。caveat MCP が symlink 越しに読む）
- 調査資産: [../rag/INDEX.md](../rag/INDEX.md)
- 人格・全端末規範: [../claude/CLAUDE.md](../claude/CLAUDE.md)（グローバル CLAUDE.md 正本）
