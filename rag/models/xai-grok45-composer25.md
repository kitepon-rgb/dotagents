<!--
source: docs.x.ai・x.ai ローカル models catalog（前セッション一次調査）／
        AA Intelligence Index・DeepSWE・AA-Omniscience・Snorkel GDPval+（二次・ベンチマーク集計、前セッション調査）／
        ~/.grok/README.md（一次・CLI 挙動）／
        本セッションでの再検証: ~/.grok/models_cache.json（端末実測・fetched_at 2026-07-10T00:27:19Z）
audit_by: ベル配下 implementer（作業委譲・2026-07-11）
fetched: 2026-07-08（前セッション一次取得）／2026-07-11（本セッション実装再検証）
confidence: 高（価格・context window・effort 対応は端末実測で裏取り済み）〜中（ベンチマーク数値は二次資料、
  本セッション未再検証）。claim ごとに below 明記。
-->

# xAI: Grok 4.5 / Composer 2.5

## grok-4.5

2026-07-08 リリース。**本セッションで `~/.grok/models_cache.json`（端末実測・fetched_at 2026-07-10T00:27:19Z）から裏取り**:

- `context_window`: 500,000（実測一致）
- 価格: $2/$6 per Mtok（前セッション由来・本セッション未再検証）
- `reasoning_efforts`: `high`（既定・`default: true`）/ `medium` / `low` の3段のみ（実測一致——xhigh/max/ultra 相当は存在しない）

ベンチマーク（二次資料・前セッション調査。本セッション未再検証＝**確度: 中**）:

- AA Intelligence Index 4位（GPT-5.5・Fable 5・Opus 4.8 の下）
- トークン効率 ~14k/task（Opus 4.8 は 67k）＝約6割安
- **難関 SWE・形式推論は弱い**: DeepSWE 1.1 で 53%（GPT-5.5 は 67%・Fable 5 は 70%）
- ハルシネーション増: AA-Omniscience 25%→54%
- **実務的専門判断（Snorkel GDPval+）は首位**: 平均 29%（GPT-5.5 22%・Opus 4.8 21%）。分野別: 法務40%・教育58%・医療35%・QA37%

## grok-composer-2.5-fast

Composer 2.5（2026-06-01 Grok Build 搭載・Kimi K2.5 基盤・Cursor 由来）。**本セッションで端末実測**:

- `context_window`: 200,000（実測一致）
- `supports_reasoning_effort`: **false**（実測一致——effort 指定は無効。`reasoning_effort` フィールドも `null`）
- `description`: "Cursor's latest coding model"（実測）

価格: 標準 $0.50/$2.50・fast 版 $3/$15（"same intelligence" と宣伝、前セッション由来・本セッション未再検証）。SWE-Bench Pro 54%（二次資料・未再検証）。

位置づけ = 速度・物量特化・判断力低（オーナー体感と一致、と前セッション記録にあり）。

## grok CLI（`~/.grok/`）

**本セッションで `~/.grok/README.md` を実読して確認**:

- `-m` / TUI `/model` / config `[models] default=` でモデル切替可能。
- 対話 TUI では `grok`、非対話は `grok -p "..."` （headless）、IDE/アプリ統合は `grok agent stdio`（ACP）。
- グローバル指示は project 単位の AGENTS.md（`#agentsmd` セクション）。
- Agent Profiles・Subagents（並列 child session・role・persona）・Plugins・Hooks・Memory・Sandbox の機能を持つ（README 目次で確認。個別の並列数上限などは今回未検証）。

**`--effort` は headless（`grok -p`）専用**（一次: `~/.grok/README.md` の記述、前セッション調査由来）。対話 TUI では警告して無視される（本セッション未再実行の確度中の主張だが、models_cache.json の `grok-composer-2.5-fast` が `supports_reasoning_effort: false` である事実とは整合的）。

## aiterm 連携（`mcp__aiterm__grok_agent` / `composer_agent`）

- grok/composer は**隔離 `GROK_HOME` ＋ OAuth のみ共有**という設計（一次: aiterm-mcp `core.js`、前セッション調査）。config 丸ごとコピー問題は無い。
- 既知の齟齬（前セッション調査・本セッション未再検証）:
  1. `grok_agent` の `--model grok-build` はハードコードされた stale 値（ライブカタログ = 本セッション実測の `~/.grok/models_cache.json` にも `grok-build` という slug は存在しない。現行は `grok-4.5`）。
  2. aiterm の `reasoning_effort` enum は grok の非対応段階（`xhigh`/`max`）を許容してしまう（grok 側の実際の対応段階は `low`/`medium`/`high` のみ、本セッション実測で確認）。
  3. → aiterm プロジェクト側への改修依頼リストとして [[../../docs/plan_gpt56-rewiring.md]] に4件登録済み。

## 出典アクセスの制約

x.ai/news・openai.com 系ページは本セッションでも 403 想定でアクセス未実施。一次資料は `docs.x.ai`（前セッション参照）と端末ローカルの `models_cache.json`（本セッションで実測・最も確度が高い一次ソース）に依拠。

## 関連

- [[gpt-5.6-family.md]] — 同時期の Codex 側モデル世代（比較対象）
- [[../../docs/02_models.md]] — 役割→ティア×effort 決定表（xAI レーンの解決例）
- [[../../docs/plan_gpt56-rewiring.md]] — aiterm 改修依頼リストの正本
