<!--
source: https://docs.x.ai/developers/models/grok-4.5（一次・2026-08-11 再取得）／
        docs.x.ai・x.ai ローカル models catalog（前セッション一次調査）／
        AA Intelligence Index・DeepSWE・AA-Omniscience・Snorkel GDPval+（二次・ベンチマーク集計、前セッション調査）／
        ~/.grok/README.md（一次・CLI 挙動）／
        本セッションでの再検証: ~/.grok/models_cache.json（端末実測・fetched_at 2026-07-10T00:27:19Z）
audit_by: ベル配下 implementer（作業委譲・2026-07-11）
fetched: 2026-07-08（前セッション一次取得）／2026-07-11（実装再検証）／2026-08-11（公式Web再取得）
confidence: 高（価格・context window・effort 対応は端末実測で裏取り済み）〜中（ベンチマーク数値は二次資料、
  本セッション未再検証）。claim ごとに below 明記。
-->

# xAI: Grok 4.5 / Composer 2.5

## grok-4.5

2026-07-08 リリース。**本セッションで `~/.grok/models_cache.json`（端末実測・fetched_at 2026-07-10T00:27:19Z）から裏取り**:

- `context_window`: 500,000（実測一致）
- 価格: $2/$6 per Mtok、cached input $0.30。200K context 超は別料金（2026-08-11 公式再確認）
- `reasoning_efforts`: `high`（既定・`default: true`）/ `medium` / `low` の3段のみ（実測一致——xhigh/max/ultra 相当は存在しない）

2026-08-11 の独立 snapshot では Artificial Analysis v4.1.1（high）が56、SWE-bench Pro が64.7%（Verified）。いずれも task 型を限定した値で、幅広い思考力・ハルシネーション耐性・設計力の順位へ一般化しない。現行比較と限界は [[benchmark-snapshot-20260811.md]] に分離した。

## grok-composer-2.5-fast

Composer 2.5（2026-06-01 Grok Build 搭載・Kimi K2.5 基盤・Cursor 由来）。**本セッションで端末実測**:

- `context_window`: 200,000（実測一致）
- `supports_reasoning_effort`: **false**（実測一致——effort 指定は無効。`reasoning_effort` フィールドも `null`）
- `description`: "Cursor's latest coding model"（実測）

過去に記録した価格は標準 $0.50/$2.50・fast 版 $3/$15 だが、2026-08-11 に現行契約を再検証していないため比較表へは載せない。SWE-Bench Pro 54% も二次資料・未再検証。

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
  3. → aiterm プロジェクト側への改修依頼リストとして [[../../docs/archive/plan_gpt56-rewiring.md]] に4件登録済み。

## API と CLI 契約を混ぜない

`grok-4.5` の $2/$6 は xAI API 定価である。`grok-composer-2.5-fast` は Grok CLI / OAuth 契約のモデルなので、この単価を CLI quota 消費へ換算しない。xAI API の `grok-build-latest` alias が `grok-4.5` を指す事実も、端末 CLI の Composer slug を自動的に置き換える根拠にはならない。

## 関連

- [[gpt-5.6-family.md]] — 同時期の Codex 側モデル世代（比較対象）
- [[../../docs/02_models.md]] — 役割→ティア×effort 決定表（xAI レーンの解決例）
- [[../../docs/archive/plan_gpt56-rewiring.md]] — aiterm 改修依頼の完了記録
