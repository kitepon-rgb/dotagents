# rag/ INDEX

調査・研究の再利用棚。1 エントリ 1 行（トピック/ファイル — 要旨。出典・取得日・確度は各ファイル冒頭）。

- [second-brain/karpathy-obsidian-llm-knowledge-base.md](second-brain/karpathy-obsidian-llm-knowledge-base.md) — Karpathy 流 LLM 知識ベース×Obsidian の一次発言集約と、うちの rag/ 設計への含意（2026-07-04・確度高）
- [second-brain/raw/karpathy-joins-anthropic-techcrunch-20260519.md](second-brain/raw/karpathy-joins-anthropic-techcrunch-20260519.md) — Karpathy の Anthropic 入り報道 verbatim（TechCrunch 2026-05-19）
- [second-brain/raw/obsidian-pricing-20260704.md](second-brain/raw/obsidian-pricing-20260704.md) — Obsidian 公式 pricing verbatim（2026-07-04）
- [second-brain/raw/obsidian-commercial-license-20260704.md](second-brain/raw/obsidian-commercial-license-20260704.md) — 商用ライセンス条件（WebFetch 要約経由・markitdown は JS ページで空出力の罠あり）
- [second-brain/notebooklm-second-brain-critique.md](second-brain/notebooklm-second-brain-critique.md) — NotebookLM「第二の脳」論の批評: 主脳不適（サイロ・API Enterprise 限定）／窓なら可／還流思想は Karpathy と収束（2026-07-04・確度は claim 別）
- [second-brain/longterm-memory-tools-survey.md](second-brain/longterm-memory-tools-survey.md) — 長期記憶ツール調査（mem0/Hindsight/claude-mem 等）: 全て見送り＝保存層サイロ化が原則7違反、既存5層で充足。再訪条件つき（2026-07-04）
- [orchestration/ai-collaboration-as-code.md](orchestration/ai-collaboration-as-code.md) — AI協業のコード化（@UT_Codex: GPT計画×Codex実行 Skill）。委譲構造の外部実証（2026-07-04。文中 delegate.sh は廃止済み→現行は codex-sidecar/aiterm）
- [orchestration/smux-terminal-agent-mesh.md](orchestration/smux-terminal-agent-mesh.md) — smux（Claude Code⇄Codex のターミナル双方向対話）。aiterm PTY と機能重複で不採用（2026-07-04。文中の「現構成」は当時）
- [model-steering/fable-behavior-porting-audit.md](model-steering/fable-behavior-porting-audit.md) — connect24h「型は移植できる」検分: output style での型移植は Fable に逆行（公式 L174/L9-13）＝棄却。記事の「Opus 4.8 は 200K」は誤り（1M 既定）。うちの会話規範は Fable の型と整合／憲法の選択的スリム化が宿題（2026-07-05・確度高・refuter 通過）
- [agent-config/agents-md-vs-claude-md-2026.md](agent-config/agents-md-vs-claude-md-2026.md) — AGENTS.md vs CLAUDE.md の 2026 規約: Claude Code は CLAUDE.md を読み AGENTS.md は `@import` 推奨／AGENTS.md は横断標準だがリポ単位のみ（グローバル等価物なし）。dotagents に適用（2026-07-05・確度高・一次ソース）
- [models/gpt-5.6-family.md](models/gpt-5.6-family.md) — GPT-5.6 世代（Sol/Terra/Luna）: 価格・effort 段階（Luna は ultra 非対応の5段階＝新発見）・ネイティブ agent role TOML の3必須キー・ultra=max+proactive委譲・sidecar 連携（2026-07-11・確度は claim 別。端末実測とバイナリ strings 実読で裏取り済み）
- [models/xai-grok45-composer25.md](models/xai-grok45-composer25.md) — Grok 4.5（実務判断首位・難関SWE弱い）/Composer 2.5（effort非対応・物量特化）: 価格・context window・aiterm 隔離設計・改修依頼3件（2026-07-11・確度は claim 別。端末 models_cache.json 実測で価格以外は裏取り済み）
- [tools/chatgpt-chat-quota-mcp-survey.md](tools/chatgpt-chat-quota-mcp-survey.md) — ChatGPT Chat枠×MCP の実勢: 公式経路なし・ヘッドレスは Cloudflare 壁（独立2ソース）・oracle 最成熟で乗り換え先なし・Web2API 再訪条件・oracle 0.15.2 実装読解＋導入実測の罠3件（undici EINVAL 即死／hideWindow 送信破壊／Google SSO ブロック）（2026-07-11・確度は claim 別）
- [tools/gpt-connector-macos-window-launch.md](tools/gpt-connector-macos-window-launch.md) — macOSの固定offscreen座標が複数displayでclampされる罠と、窓なしcold起動→background最小化target→正規PID unhide、Window ServerのPID/layer 0検査、`Page.bringToFront`復帰で画面上窓0・実Chat成功を満たす契約（2026-07-14・実機再現）
- [hooks/callout-hooks-firing-behavior.md](hooks/callout-hooks-firing-behavior.md) — 呼びかけ hook 群の発火挙動実測（Claude C1-C4／Codex X1-X5）と現行INFO契約: セッション初回＋compact再武装、Stop pending配送、PreToolUse additionalContext、hot-reload、Codex async/trust、状態ファイル形式（2026-07-12・確度 reproduced・実火観測）
- [orchestration/bell-orchestration-map.md](orchestration/bell-orchestration-map.md) — ベルのオーケストレーション全景マップ（SVG＋解説）: 着手ゲート F/A/H→統括ベル→書ける委譲先4枠（Codex/Grok/aiterm/Claude内）→統括ゲート→還流。Oracle は相談窓口（書けない・破線）、⚡呼びかけ hook が注入。正典（CLAUDE.md/orchestrate/02_models）と照合済み・初版の Oracle 物量誤配置を修正した v2（2026-07-12・確度高）
- [codex/codex-full-support-foundations.md](codex/codex-full-support-foundations.md) — dotagents Codex 全対応の公式仕様基盤: 9監査面、公式 skill 面 `$HOME/.agents/skills`、legacy `~/.codex/skills` 実測、import は同期でなく検出器、plugin は二重管理防止を実証後に裁定。Wave 2 のclean HOME受入れとCI parser固定も記録（2026-07-12・確度高）
- [codex/subagent-thread-limits.md](codex/subagent-thread-limits.md) — Codex subagentの公開設定 `agents.max_threads`（既定6）／`max_depth`（既定1）と、Desktopセッション側の低い実効上限を分離。旧「max_threadsは起動エラー」説を公式仕様で訂正（2026-07-13・確度はclaim別）
- [codex/raw/openai-subagents-2026-07-13.md](codex/raw/openai-subagents-2026-07-13.md) — OpenAI公式 Subagents 文書のverbatim保存（2026-07-13）
- [macos-launchd-local-network/apple-tn3179-launchd.md](macos-launchd-local-network/apple-tn3179-launchd.md) — macOS 15+のLaunchAgentはTerminal/SSH子と異なりLANがLocal Network Privacyで遮断される。Apple公式のresponsible code要件、短命alert既知問題、管理端末向けCIDR許可と再起動条件、Mac実機再現（2026-07-14・確度高）
- [orchestration/openai-cdc-prompt-concepts.md](orchestration/openai-cdc-prompt-concepts.md) — OpenAI CDC promptの動的fan-out、approach family、独立context、blocked再開条件、敵対監査、完全性gateを抽出し、dotagents固有のF/A/H・worktree・Executor stateへ適応（2026-07-14・確度高）
