# plan: 古い正典の全域監査（stale-canon audit）

前提: Fable 級統括／oracle 0.15.2・GPT-5.6 世代・aiterm v0.11（2026-07-11 時点）。
状態: **完了（2026-07-11。監査2ラウンド→確定12件全裁定→是正適用済み）** → docs/archive/ へ退避。本ファイルが正本＝TODO を兼ねる。

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
- [x] 確定指摘の報告とオーナー裁定（2026-07-11 全12件裁定済み）
- [x] 裁定済み修正の適用・コミット・push（9a338a3 ほか。B1/A4=現状維持、C1=管轄外、他は適用）

## 確定指摘（裁定対象・全12件）

### A. dotagents リポ

- [x] A1 完遂済みプラン2本を `2026-07_` 接頭辞で archive 退避＋oracle プランの命名是正＋参照3箇所追従（docs/03・06・rag/agent-config）
- [x] A2 (f2) 00_overview.md 読む順表に 06_oracle-mcp.md と `plan_*.md` 行を追加
- [x] A3 (f7) rag/orchestration 2記事に「delegate.sh 廃止・現行は codex-sidecar/aiterm」の日付付き注記＋INDEX 2行更新（本文の歴史は不改変）
- [x] A4 (Critic#5) codex/rules/default.rules → **オーナー裁定（2026-07-11）: 全部このまま＝現状維持**（摩擦ゼロ優先。permission 系の締め付け提案は以後しない——端末メモリ permissions-keep-bare-bash.md に統合記録）
- [x] A5 (Critic#2) codex-sidecar MCP を Claude user スコープへ登録（オーナー裁定 2026-07-11「登録しろ」。initialize handshake green 確認済み・Codex 側は入れ子禁止のため登録しない）＋AGENTS.md オンボーディング手順1へ追記

### B. 端末ローカル

- [x] B1 (f5) ~/.claude/settings.json の bare "Bash" → **オーナー裁定（2026-07-11）: 意図的設計＝現状維持**（確認プロンプトの摩擦の方が害）。端末メモリ permissions-keep-bare-bash.md に記録し、以後の監査で除外・締め付け再提案禁止
- [x] B2 (f8) Novel メモリ feedback-delegate-cheap-models を現行名（grok-4.5／composer-2.5・02 参照）へ更新

### C. 他プロジェクト（dotagents の外・各プロジェクトの領分）

- [x] C1 (r3) OpenCClaw/CLAUDE.md の BellBot モデル記述 → **オーナー裁定（2026-07-11）: dotagents の管轄外＝本セッションでは扱わない**（タスクチップも取り下げ。対応するなら OpenCClaw 側で）
- [ ] C2 (r5/f9/f10/f11) Kikoeru・WebAICoding の gpt-5.5 記述群 → **統括裁定: 修正対象から除外**。反証で「Kikoeru 本番は実際に gpt-5.5 で稼働中（CODEX_MODEL 既定・sidecar 実測）」が判明＝文書は実態に正確。真の論点は「5.6 世代へ移行するか」というプロジェクト判断であり、文書ロットではない

## 棄却（反証が殺した指摘・理由は監査ログ参照）

repo 内「Grok Build」表記（製品名として正当）／auto-deploy-on-push 前提行欠落（低価値）／codex-thread-handoff-smoke 放置（正典と無矛盾）／Kikoeru TODO・ServerManager・Chime の gpt-5.5（実稼働の事実記録・意図的設計・歴史ログ）／hooks.state 非対称（機械管理状態）／multi_agent_v2 断片（封印でなく必須断片＝finder の正典誤読を反証が検出）

## やらないこと

- docs/archive/・rag/*/raw/ の書き換え（歴史記録・一次ソースは凍結）
- 監査と同時の無断修正（確定→裁定→修正の順を守る）
- 他端末の実ファイル調査（波及チェックリストの領分）
