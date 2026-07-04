# P3 ギャップ台帳 — 各リポ×PROJECT_LAYOUT 標準適合（2026-07-04）

> **📦 役目終了（2026-07-05 アーカイブ）**: Fable 期環境整備キャンペーン（聖典 v3）の消化文書。全端末展開完了（オーナー宣言）。未消化に見える項目は [../../PLAN.md](../../PLAN.md)（憲章 v4）の残件節へ転記済みか端末側で処遇済み。
> 18/18 リポ標準化・push 済みで完遂。

- 採点: Workflow で21リポを並列委譲（sonnet・低 effort・読み取り専用）＝統括 Fable 窓の消費ゼロ。裁定はベル。
- 標準: [PROJECT_LAYOUT.md](../01_project-layout.md)。**見送り基準（churn>益なら触らない）を先に適用**。

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

**実作業の委譲方針**: 仕様が固まった機械作業＝**Codex CLI（レート非依存）へ委譲**（MODELS.md の第一選択）。ベルは仕様・罠リスト・検証コマンドの作成と diff レビュー・コミットのみ。

## 標準化ミッション（2026-07-04 方針転換・オーナー指示「動くからやらないは Fable 性能の浪費」）

見送り裁定を撤回。Fable 期は churn を恐れず付属物（rag/・CI・docs 連番・adr/・.claude/settings.json）を積極的に足す。見送るのは破壊的リスク時のみ（PROJECT_LAYOUT 標準化方針）。

**標準化対象18リポ（オーナー確定 2026-07-04・これが正。worth/skip 分類は撤回済み＝対象は等しく標準化）**:
sprite-forge-mcp / codex-sidecar / ServerManager（master→main も同時）/ MMOAuction / OpenCClaw / Caveat / WebAICoding / browser-to-api / videomarketing / nextflic / Chime / Spotter / aiterm-mcp / rpgdev / dotagents / dobojo / Throughline / **Novel(forklore)**〔2026-07-04 作業完了→ロック解除で追加。着手時は掟どおり fetch→照合してから〕

**除外（触らない・理由つき）**:
- **Kikoeru** — オーナーが別セッションでやると明言
- **codex-link** — 現役の作業ブランチ・オーナーが「問答無用で対象外」と明示
- **codex-rc・x-article-mcp** — この端末では休眠（behind・作業は主端末。二重作業で競合回避）

対象判断のルール（これだけ）: **この端末が主作業（掃引時に同期 or ahead）だった稼働リポが対象**。GitHub より古い（behind）＝主作業は別端末＝対象外。worth/skip の旧基準は無効。

進め方: 1リポずつ Codex 委譲（PROJECT_LAYOUT を読ませ欠落付属物を足す・git mv で履歴保存・commit しない）→ ベルが diff 検証・ゲート→ 独立コミット・push。CLAUDE.md も標準思想（rag/CI 参照）を反映。**この実標準化は実行順序③＝他端末展開②の後に着手**。

## 完遂記録（2026-07-04）

**18/18 全リポ標準化・push 済み。** 消化状況の詳細は docs/TODO.md（P3/P5）が正。実施形: codex exec 並列委譲（gpt-5.5 high・最大11並列・Claude レート消費ゼロ）→統括が全件 diff レビュー＋ゲート再実行→pathspec コミット。裁定メモ:
- 双方向の誤り訂正が機能: 委譲先が台帳の誤り5件（CI 既存等）を正し、統括が委譲先の誤り2件（.github テンプレ参照漏れ・上流ショーケースの誤追跡解除）を検収で捕捉
- Novel＝変更ゼロ（標準の母体・適合済み。CLAUDE.md の意図的 ignore は forklore セッションの裁定として尊重）
- dotagents＝連番リネーム意図的見送り（docs/adr/0002・生きた参照）
- OpenCClaw＝CI 見送り（既存テスト赤7件。「通らない CI を張らない」原則。green 化後に新設）
