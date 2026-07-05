# plan_agents-md-onboarding — AGENTS.md 化でオンボーディングを AI 一撃に

<!-- 前提: Fable/Opus 級統括（2026-07 時点）。構造の敷設＝最上位知能の使い所。 -->

## Context

オーナーのゴール: **「GitHub の URL を AI に渡して『最適化しといて』で終わる」**——
新端末オンボーディングの摩擦（特に `settings.json` 断片の手挿し）を消したい。

2026 時点、**AGENTS.md が横断標準**（2025 年半ば発・Linux Foundation 傘下・Codex/Cursor/Copilot/Gemini CLI/Windsurf/Aider/… 対応）。
Claude Code は AGENTS.md を**ネイティブに読まず**、公式は「**AGENTS.md を共有の土台にし、CLAUDE.md が `@AGENTS.md` で import する**」相互運用を推奨。
一次ソース: [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory)（確度: 高＝primary＋独立2ソース一致。rag に還流）。

**scope 縛り（不変にするもの）**: 憲法 `claude/CLAUDE.md`（グローバル・Claude 専用・AGENTS に等価物なし）と憲章 `PLAN.md` は**触らない**。
AGENTS 化するのは**リポ直下 `dotagents/CLAUDE.md`（プロジェクト指示）1枚だけ**。

## 設計

1. **新規 `AGENTS.md`（リポ直下）＝ 全エージェント共有の土台**:
   - `dotagents/CLAUDE.md` の**プロジェクト内容を移設**（役割・掟・配置規約・frontmatter 規約・含めないもの・セットアップ・ビルド/検証・自動アップデート・既知の罠）。ペルソナ「ベル」は移さない（Claude 固有）。
   - **新設「AI オンボーディング」節**＝ URL を渡された AI がこれで自走: clone → 実ファイル退避 → `./install.sh` → `verify-install` → `settings.json` 断片を jq で冪等マージ（バックアップ→追加分のみ→JSON 妥当性確認。正本化ゲート hook 必須）→ メモリ整理・自動更新常設。詳細は README §ランブック / `docs/03` を**指す**（重複を作らない）。
2. **`dotagents/CLAUDE.md` を薄いラッパに組み替え**: 先頭 `@AGENTS.md` ＋「あなたはベル（正本 `claude/CLAUDE.md`）」＋ Claude 固有の残余のみ。
3. **`README.md`**: 冒頭付近に「AI 入口＝AGENTS.md」の1行ポインタ。
4. **`rag/`**: AGENTS.md vs CLAUDE.md 2026 規約を還流（compiled 記事＋出典・取得日・確度、`rag/INDEX.md` に1行）。

## TODO（この plan が TODO を兼ねる）

- [x] `AGENTS.md` 新設（プロジェクト内容移設＋AI オンボーディング節）
- [x] `dotagents/CLAUDE.md` を `@AGENTS.md`＋ベル固有に組み替え（重複ゼロ確認）
- [x] `README.md` に AGENTS.md 入口の1行＋構成ツリー更新
- [x] `rag/agent-config/agents-md-vs-claude-md-2026.md` に調査還流＋`INDEX.md` 追記
- [x] `make lint` green（AGENTS.md を glob に追加・16ファイル 0 error）
- [x] 検証（憲法/PLAN 無変更を git diff で確認・重複ゼロ）
- [ ] commit（pathspec 明示）→ push（main・CI green 確認）

## 検証

- `make lint` green。
- `dotagents/CLAUDE.md` を Read し、先頭に `@AGENTS.md` があり移設内容が**二重化していない**こと。
- `AGENTS.md` 単体を通読し「新端末オンボーディングが AI に実行可能」（clone→install→settings マージ→verify が抜けなく並ぶ）こと。
- **憲法 `claude/CLAUDE.md`・`PLAN.md` が無変更**（`git diff` で確認）。

## 完遂 → archive

全 TODO 消化＋push＋CI green で `docs/archive/2026-07_` へ退避。
