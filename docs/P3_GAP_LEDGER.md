# P3 ギャップ台帳 — 各リポ×PROJECT_LAYOUT 標準適合（2026-07-04）

- 採点: Workflow で21リポを並列委譲（sonnet・低 effort・読み取り専用）＝統括 Fable 窓の消費ゼロ。裁定はベル。
- 標準: [PROJECT_LAYOUT.md](PROJECT_LAYOUT.md)。**見送り基準（churn>益なら触らない）を先に適用**。

## 採点結果（21リポ）

| リポ | 型 | 主な欠落 | 採点者判定 |
|---|---|---|---|
| aiterm-mcp | C-mcp | docs連番化・adr・.claude/settings | skip（稼働支障なし） |
| Caveat | A-monorepo | docs連番・adr・rag | skip |
| Throughline | B-single | docs連番・rag（docs/RAG にはある） | skip |
| **tools-manager** | B-single | **CLAUDE.md・CI・.gitignore（.DS_Store混入）・rag** | skip だが gitignore は worth |
| Kikoeru | D-ios | CI・docs連番・adr | skip（複合構成・SSOT地図あり） |
| rpgdev | B-single | rag・docs連番・.claude/settings | skip |
| **sprite-forge-mcp** | C-mcp | CI・rag | **worth** |
| WebAICoding | other | CI・rag | skip |
| **browser-to-api** | C-mcp | **CLAUDE.md・CI・rag** | skip だが CLAUDE.md は worth |
| dobojo | B-single | CI・rag | skip |
| nextflic | D-ios | CI | skip |
| **codex-sidecar** | A-monorepo | rag | **worth** |
| **ServerManager** | other | CI・rag（＋master→main） | **worth** |
| Chime | B-single | CI | skip |
| MMOAuction | B-single | CI | **worth** |
| Spotter | B-single | rag | skip |
| OpenCClaw | B-single | CI・rag | **worth** |
| codex-link | A-monorepo | CI・rag | **worth** |
| codex-rc | B-single | rag | **worth** |
| x-article-mcp | C-mcp | CI・rag | **worth** |
| videomarketing | other | CI | skip |

## ベルの裁定（工場整備の本旨・churn>益で厳格に絞る）

採点者の「worth」は理想からの逸脱を挙げたもの。統括として**実害と最小コストで再裁定**する:

**波A — 即実施（実害あり・コスト極小・機械的＝外部知能へ委譲）**
- `tools-manager`: `.gitignore` 新設＋追跡済み `.DS_Store` を `git rm`（衛生違反の実害。グローバル excludesfile とは別にリポ内 gitignore も要る）

**波B — CLAUDE.md 欠落を埋める（工場標準の核＝正典への入口。仕様はベルが出し起草は委譲）**
- `tools-manager`・`browser-to-api`: CLAUDE.md を新規作成（正典参照・検証コマンド・掟の最小形）

**波C — 見送り（churn>益。一律強制しない）**
- rag/ 欠・CI 欠・docs 連番化・adr 新設は、**各リポが次にドキュメント整理/機能追加で触る機会にまとめて**。稼働に支障がなく、今 Fable 期に一律移行する価値はない（採点者も大半 skip）。CI だけは「大きな作業を始めるリポ」で最初に張る（PLAN 作法）＝トリガーは作業発生時
- `ServerManager` の master→main 正規化は、そのリポに次に触る時に同時実施（単独では churn）

**実作業の委譲方針**: 波A・波B は仕様が固まった機械作業＝**Codex CLI（レート非依存）へ委譲**（MODELS.md の第一選択）。ベルは仕様・罠リスト・検証コマンドの作成と diff レビュー・コミットのみ。
