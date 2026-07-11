# plan: 古い正典の全域監査（stale-canon audit）

前提: Fable 級統括／oracle 0.15.2・GPT-5.6 世代・aiterm v0.11（2026-07-11 時点）。
状態: 承認済み（2026-07-11 オーナー「全力でチェックして、エージェント駆使して」）→ 実施中。本ファイルが正本＝TODO を兼ねる。完了後は docs/archive/ へ。

## Context — なぜやるか

2026-07-11 の oracle 再配線・GPT-5.6 再配線で正典（02/05/06）は更新したが、**取り残された旧正典が2件、同日中に実害を出した**:

1. 端末ローカル `~/.codex/skills/oracle`（7/8 作成・リポ管理外）が旧構成を「正規設定」と記述 → NoveLore Codex セッションが正典 config.json を旧形へ"修復"（→ 9f213da で収容・是正）
2. 憲法 claude/CLAUDE.md:75 が封印済み `preset: "chatgpt-pro-heavy"` を指示 → Caveat Claude セッションが忠実に従い暴走（→ 614d722 で是正）

同型の「正典更新に取り残された資産」が他にも残っていないかを全域監査する。

## 方法

orchestrate 型1（Find→Dedup→Verify→Critic）。finder=sonnet×medium ×7 スライス、検証=主モデル継承×high の2票制（existence/value）、Critic の盲点は第2ラウンド。読み取り専用（修正は監査確定後にオーナー承認を経て別途）。

## 監査対象スライス

- [ ] F1: dotagents docs/（00〜06・adr。archive は対象外＝歴史記録）
- [ ] F2: dotagents 規範層（claude/CLAUDE.md・codex/AGENTS.md・AGENTS.md・CLAUDE.md・README.md・PLAN.md）
- [ ] F3: dotagents 実行資産（skills・commands・codex/agents/*.toml・rules・bin/・install.sh・Makefile・CI）
- [ ] F4: 端末ローカル Claude 資産（~/.claude/skills・commands・agents・settings.json・全プロジェクト memory）
- [ ] F5: 端末ローカル Codex 資産（~/.codex/skills・rules・agents・config.toml・override・~/.local/bin 実体）
- [ ] F6: 他プロジェクトの正典文書（~/Developer/*/AGENTS.md・CLAUDE.md・docs/ のうち oracle/モデル配置に言及するもの）
- [ ] F7: rag/ コンパイル記事・INDEX（「現在の推奨」として封印済み構成を語る箇所。raw/ は対象外＝一次ソース verbatim）

## 判定の正典（finder に渡す基準）

docs/02_models.md・05_codex-fragments.md・06_oracle-mcp.md・claude/CLAUDE.md（2026-07-11 HEAD）。要点: oracle は wrapper 入口・manualLogin/ignore・preset 等封印／モデルはバージョン固定禁止・grok-4.5/Terra 世代／Codex は V2 routing 断片・3必須キー toml／aiterm は v0.11 の model 引数・effort enum。

## 消化

- [x] Find（8 finder 並列・11件発見）
- [x] Dedup（コード照合・重複0）
- [x] Verify（2票制・確定8/棄却3。棄却例: 「Grok Build」製品名 vs モデル slug の混同を反証が検出）
- [x] Critic（盲点5件 → 直轄確認2件＋第2ラウンド3 finder。R2 で確定+2/棄却5、bin/ 全8本は違反なし）
- [ ] 確定指摘の報告とオーナー裁定（2026-07-11 報告済み・裁定待ち）
- [ ] 裁定済み修正の適用・コミット・push

## 確定指摘（裁定対象・全12件）

### A. dotagents リポ

- [ ] A1 (f5相当の正典側は無し) 完遂済みプラン2本の archive 退避: plan_agents-md-onboarding.md・plan_plan-gate-hook.md（+ 既退避 plan_oracle-chat-quota.md の命名を ADR 0004 の `2026-07_` 接頭辞へ是正）
- [ ] A2 (f2) 00_overview.md 読む順表に 06_oracle-mcp.md を追加・plan_ 群の導線を整理
- [ ] A3 (f7) rag/orchestration 2記事＋INDEX が削除済み bin/delegate.sh を現行構成として提示 → 冒頭に「現行は codex-sidecar/aiterm（当時の記述）」の注記を追加（歴史は書き換えない）
- [ ] A4 (Critic#5) codex/rules/default.rules: `rtk npm publish`・`npm install -g` 無条件 allow＋プロジェクト固有裁定の全端末配布 → 要オーナー裁定（縮退 or プロジェクト移設）
- [ ] A5 (Critic#2) 憲法の「codex-sidecar MCP はツール一覧に常在」が実機未登録と矛盾 → 登録する（AGENTS.md オンボーディング項へ追加）か憲法を実態に合わせるかの裁定

### B. 端末ローカル

- [ ] B1 (f5) ~/.claude/settings.json の bare "Bash" 全許可 → docs/03 のスコープ付き断片へ置換（high・要オーナー裁定＝プロンプト増を伴う）
- [ ] B2 (f8) Novel メモリ feedback-delegate-cheap-models の「Grok Build（Composer モデル）」表記を 02 の現行名（grok-4.5／composer-2.5）へ更新

### C. 他プロジェクト（dotagents の外・各プロジェクトの領分）

- [ ] C1 (r3) OpenCClaw/CLAUDE.md: BellBot 会話モデル `BELLBOT_CODEX_MODEL=gpt-5.5` が現行手順として複数箇所（158/612 ほか）→ 実デプロイ env と併せた棚卸しが必要
- [ ] C2 (r5/f9/f10/f11) Kikoeru・WebAICoding の gpt-5.5 記述群 → **統括裁定: 修正対象から除外**。反証で「Kikoeru 本番は実際に gpt-5.5 で稼働中（CODEX_MODEL 既定・sidecar 実測）」が判明＝文書は実態に正確。真の論点は「5.6 世代へ移行するか」というプロジェクト判断であり、文書ロットではない

## 棄却（反証が殺した指摘・理由は監査ログ参照）

repo 内「Grok Build」表記（製品名として正当）／auto-deploy-on-push 前提行欠落（低価値）／codex-thread-handoff-smoke 放置（正典と無矛盾）／Kikoeru TODO・ServerManager・Chime の gpt-5.5（実稼働の事実記録・意図的設計・歴史ログ）／hooks.state 非対称（機械管理状態）／multi_agent_v2 断片（封印でなく必須断片＝finder の正典誤読を反証が検出）

## やらないこと

- docs/archive/・rag/*/raw/ の書き換え（歴史記録・一次ソースは凍結）
- 監査と同時の無断修正（確定→裁定→修正の順を守る）
- 他端末の実ファイル調査（波及チェックリストの領分）
