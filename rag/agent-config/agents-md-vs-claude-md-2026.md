# AGENTS.md vs CLAUDE.md — AI 指示ファイルの 2026 規約

- 出典: [Claude Code Memory Docs](https://code.claude.com/docs/en/memory)（一次）・[Codex AGENTS.md Docs](https://learn.chatgpt.com/docs/agent-configuration/agents-md)（一次）・[agents.md](https://agents.md/)・自前実測
- 取得日: 2026-07-05（Codex global scopeを2026-07-16に再確認・訂正）
- 確度: 高（primary source ＋ 独立2ソース一致・claude-code-guide 検証・自前実測で適用）

## 問い

新端末オンボーディングを「URL を AI に渡して最適化」で終わらせたい。AI 指示ファイルは AGENTS.md か CLAUDE.md か。どちらが土台で、Claude Code はどう扱うか。

## 確定事項

1. **Claude Code は `CLAUDE.md` を読み、`AGENTS.md` はネイティブに読まない**（一次ソース逐語）:
   > "Claude Code reads CLAUDE.md, not AGENTS.md. If your repository already uses AGENTS.md for other coding agents, create a CLAUDE.md that imports it so both tools read the same instructions without duplicating them."
2. **推奨相互運用形** = AGENTS.md を共有土台に、CLAUDE.md が `@AGENTS.md` で import（＋Claude 固有を下に追記）。Claude 固有が無ければ `ln -s AGENTS.md CLAUDE.md` でも可（Windows は import 推奨）。
3. **`@import` は展開されて文脈を食う**（インライン展開・launch 時ロード）。整理にはなるが文脈削減にはならない。
4. **AGENTS.md は 2026 の横断標準**: 2025 年半ば発（Sourcegraph/OpenAI/Google/Cursor）→ Linux Foundation 傘下。Codex・Cursor・Copilot・Gemini CLI・Windsurf・Aider・Zed・Warp 等が対応（「一ファイル・全エージェント」）。
5. **グローバル vs リポ単位**: `~/.claude/CLAUDE.md`はClaudeのグローバル指示、`~/.codex/AGENTS.md`はCodexのグローバル指示。Codexはglobal scopeで`AGENTS.override.md`が非空ならそちらだけを読み、無ければ`AGENTS.md`を読む。同一scopeの通常Markdownリンクをinstruction chainへ自動展開する仕様ではないため、必須共通規範をruntimeリンク読込へ委ねない。
6. **`/init`** は既存 AGENTS.md / `.cursorrules` / `.devin/rules/` / `.windsurfrules` を読んで CLAUDE.md に取り込む。

## dotagents への適用（自前実測 2026-07-05）

- リポ直下 `AGENTS.md` を新設＝全エージェント共有の土台＋「AI オンボーディング」節（URL を渡された AI が clone→install→settings.json 断片マージ→verify を自走）。
- リポ直下 `CLAUDE.md` を `@AGENTS.md`＋ベル固有の薄いラッパに組み替え。
- 2026-07-16、共通憲法を`shared/constitution.md`、host差分を`claude/CLAUDE.delta.md`／`codex/AGENTS.delta.md`へ分離。両runtime向け全文はgeneratorで決定論的に合成し、従来どおりsymlink配布する。必須規範をモデル自身の追加読込へ委ねない。
- 詳細計画: `docs/archive/2026-07_agents-md-onboarding.md`（完遂・退避済み）。
