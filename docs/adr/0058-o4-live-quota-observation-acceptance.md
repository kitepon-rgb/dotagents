# ADR 0058: O4 live quota観測受入（Codex verified・Claude utilization不在の実態固定）

- Status: Accepted
- Date: 2026-07-17
- Parent canon: `docs/plan_factory-master.md` Phase O4
- Design decision: [ADR 0054](0054-o4-rate-aware-scheduler-design.md) Wave A live H gate（受入は[ADR 0057](0057-o4-wave-a-acceptance.md)の残置分）
- Control: `observer-factory-20260715` Task `o4-live-quota-observation`（H・オーナー承認 2026-07-17 chat）
- 実測記録: `rag/orchestration/provider-quota-and-claude-runtime.md`「live H実測追記」

## 実施内容（読み取りのみ・account状態変更なし・秘密非複製）

1. **Codex**: product-owned session eventの最新`token_count.rate_limits`を実読取
   （codex-cli 0.144.3、observed 2026-07-16T23:32:39.061Z、rate_limits数値のみ抽出）。
2. **Claude**: `claude -p`最小1ターン（stream-json、Claude Code 2.1.211、cost $0.12）で
   実`rate_limit_event`を取得。

## 裁定

1. **Codex（OpenAI lane）: live verified。** 実イベントは07-15抜粋（3 key）より広い完全shape
   （`limit_name`／`credits`／`individual_limit`／`plan_type`／`rate_limit_reached_type`追加）で、
   Wave Aのstrict projectionが正しく`INVALID_SCHEMA`で弾いた＝fail-loud設計の実証。完全形を
   characterizeし（required 3 key＋optional 5 key、`individual_limit`非nullは`SCHEMA_DRIFT`、
   credits/plan_typeは検証のみでsnapshot非複製）、実イベント→snapshot（remaining_bp 7600・
   canonical digest）の往復をlive fixtureへ固定した。
2. **Claude（Anthropic lane）: 未達を実態として固定。** 実wireはcamelCase
   `{status, resetsAt, rateLimitType, overageStatus, overageDisabledReason, isUsingOverage}`で
   **utilizationが存在しない**（SDK文書のsnake_case・utilizationはSDK正規化形）。remaining_bpを
   導出できないため、`normalizeClaudeCliRateLimitEvent`（wire正規化・isUsingOverageは検証のみ）と
   `UTILIZATION_UNAVAILABLE`（専用typed error）で「snapshotを作れない」ことを名指しする。
   架空値・暗黙fallbackは導入しない。CLIがutilizationを載せた時の前方互換fixture
   （utilization 0.24→remaining_bp 7600・5h窓）は通済み。
3. **rate-aware自動配置は開始しない**（ADR 0054非目標の維持）: 両provider snapshotがverified以上に
   なるまで、という条件のうちAnthropicが未達。次の入口候補は (a) CLI側utilization追加の追observation、
   (b) statusline補助入口（`used_percentage`・設定変更＝別H承認）。
4. Task known_trapsの想定どおり、観測CLI versionを束縛した（codex-cli 0.144.3／Claude Code 2.1.211）。
   version更新時はdrift fixtureが落ちた時だけ再characterizeする。

## Gate（実測）

- 実Codexイベント→projection→digestの往復green（値はfixtureと`rag`追記に固定）。
- 実Claude wireイベント→正規化→`UTILIZATION_UNAVAILABLE`をfixtureで固定。
- `tests/orchestrate/quota-adapter.test.mjs` 8/8、orchestrate full green、`make lint-js`、
  `git diff --check` clean。

## 未実施（本単位の非目標）

- Anthropic statusline補助入口の設定変更（別H）・xAI pool。
- rate-aware自動配置の開始・Wave D週次dogfood（Anthropic入口の成立後）。
