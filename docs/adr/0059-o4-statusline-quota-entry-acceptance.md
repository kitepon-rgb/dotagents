# ADR 0059: O4 statusline quota入口受入（Anthropic lane live verified）

- Status: Accepted
- Date: 2026-07-17
- Parent canon: `docs/plan_factory-master.md` Phase O4
- Design decision: [ADR 0054](0054-o4-rate-aware-scheduler-design.md) Wave A／[ADR 0058](0058-o4-live-quota-observation-acceptance.md)裁定3の次候補(b)
- Control: `observer-factory-20260715` Task `o4-statusline-quota-entry`（H・オーナー承認 2026-07-17 chat「自走しろ」＝ADR 0058残置分の続行指示）
- 実測記録: `rag/orchestration/provider-quota-and-claude-runtime.md`「live H実測追記」

## 実施内容（session限定・global設定非変更・account変更なし）

`--settings`（session限定settings）でstatusline captureコマンドを仕込んだ対話Claude session
（Claude Code 2.1.211・aiterm PTY・scratchpad cwd）を1ターンだけ実行し、statusline入力JSONの
`rate_limits`を実取得した。global `~/.claude/settings.json`は変更していない。

## 裁定

1. **Anthropic lane: statusline入口でlive verified。** 実取得値は
   `five_hour {used_percentage: 31, resets_at: 1784257800}`／
   `seven_day {used_percentage: 28.999999999999996, resets_at: 1784275200}`。
   `five_hour.resets_at`は同日先行のstream `rate_limit_event`のresetsAtと完全一致し、
   両入口の相互整合を確認した。seven_dayのFP割算ノイズは実測のままfixtureへ焼き込み、
   bp整数化（`10000 - round(pct*100)`）が吸収することを固定した。
2. **`projectAnthropicStatuslineRateLimits`を実装**: `{five_hour?, seven_day?}`各
   `{used_percentage: 0..100, resets_at: epoch秒}`、windowの独立欠落は公式契約どおり許容、
   両方欠落（最初のAPI応答前）は`NO_QUOTA_WINDOWS`。`source: "app-ui"`。未知window・
   shape逸脱・percent値域・epochミリ秒はfail loud。実captureそのまま→snapshot
   （5h残6900bp・7d残7100bp）→canonical digestの往復green。
3. **Anthropicの正規観測entryをstatuslineへ切替**: `QUOTA_OBSERVATION_ENTRIES.anthropic =
   "claude-statusline-rate-limits"`。stream event（utilization不在）は前方互換pathとして
   projection・fixtureを保持し、CLIがutilizationを配信し始めたら再characterizeする。
4. **これで両providerのquota snapshot取得がlive verified**（OpenAI=ADR 0058、Anthropic=本ADR）。
   ADR 0054のrate-aware配置前提が実データで成立した。実際の自動配置開始と週次消費評価は
   Wave D（実需開始時）で行い、本単位では開始しない。
5. 運用注記: statusline入口の常設化（global settingsへのstatusLine追加）は行っていない。
   実観測が必要になる都度、session限定`--settings`または既存sessionのstatusline経由で取得する。
   常設が必要になったらその時点で別途H承認を得る。

## Gate（実測）

- 実capture→projection→digestの往復green（値は本ADRとfixtureに固定）。
- `tests/orchestrate/quota-adapter.test.mjs` 9/9、orchestrate full green、`make lint-js`、
  `git diff --check` clean。

## 未実施（本単位の非目標）

- statusline常設化（global設定変更）・xAI pool。
- rate-aware自動配置の開始・Wave D週次dogfood（実需開始時）。
