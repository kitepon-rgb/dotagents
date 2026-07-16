# ADR 0057: O4 Wave A受入（provider quota観測adapterとquota pool lock配線）

- Status: Accepted
- Date: 2026-07-17
- Parent canon: `docs/plan_factory-master.md` Phase O4
- Design decision: [ADR 0054](0054-o4-rate-aware-scheduler-design.md) Decision 1/2・Wave A（本ADRは受入記録であり、0054へ追記しない）
- Source contract: `rag/orchestration/provider-quota-and-claude-runtime.md`（一次仕様verbatimは同raw/）
- Control: `observer-factory-20260715` Task `o4-wave-a-implementation`

## 受入対象

| 種別 | 内容 |
|---|---|
| source | `lib/orchestrate/quota-adapter.mjs` — 観測request builder・Anthropic/OpenAI projection純関数・取得失敗のtyped error projection |
| source | `lib/orchestrate/control-record.mjs` — quota pool lock（lease）と`placement-reserve`への保持検証配線、`bin/orchestrate-run.mjs`の`quota-pool-lock-acquire`／`quota-pool-lock-release` |
| test | `tests/orchestrate/quota-adapter.test.mjs`（新規6件）、`control-record.test.mjs`のpool lock lifecycle＋selector reservation配線fixture |

## ADR 0054 Wave Aとの照合

- **request純関数**: `buildQuotaObservationRequest`は`dotagents.quota-observation-request.v1`を返す。
  v1の観測入口はproduct-owned entryの2つだけ（anthropic=`claude-agent-sdk-rate-limit-event`、
  openai=`codex-token-count-event`）。credential・cookie・account IDを一切持たず、
  `credential_policy: "product-owned-session"`を固定（adapterは秘密を扱わない）。
- **Anthropic projection**: SDK一次仕様（`RateLimitInfo`）どおり**utilizationは0.0..1.0のfraction、
  resets_atはUnix epoch秒**として写像する（`remaining_bp = 10000 - round(utilization*10000)`）。
  Task known_trapsの「percent(0..100)前提」は一次ソース実読で訂正した（委譲契約7条の前提再検証）。
  window写像は`five_hour→5h`／`seven_day→7d`／`seven_day_opus→7d-opus(scope=opus)`／
  `seven_day_sonnet→7d-sonnet(scope=sonnet)`。`overage`は課金状態でありquota窓にしない
  （混在時は除外、単独では`NO_QUOTA_WINDOWS`）。percent値・epochミリ秒・`raw`同梱・
  未知window種（`SCHEMA_DRIFT`）・status逸脱・型重複はすべてtyped errorでfail loud。
- **OpenAI projection**: Codex CLI 0.144.3実測shape（`{limit_id, primary, secondary}`、
  slot=`{used_percent(0..100), window_minutes, resets_at(epoch秒)}`）をfixtureへ焼き込み。
  `secondary: null`は実測済み正当形として受け、未知field・slot欠落field・値域逸脱はfail loud。
  実測イベント（used_percent 2.0／10080分／1784666224）がそのまま受入fixtureである。
- **取得失敗→typed error**: `projectQuotaObservationFailure`は必ずthrowし決して返らない。
  失敗語彙はclosed（`entry-unavailable/timeout/credential-missing/malformed-event/schema-drift`）で、
  語彙外・provider外は`INVALID_SCHEMA`。取得失敗がsnapshotや暗黙fallbackへ丸まる経路は構造的に無い。
- **projectionの出口は既存契約**: 成功projectionは`validateQuotaSnapshot`を通過した
  `dotagents.quota-snapshot.v1`そのもの（`WINDOW_CONTRADICTION`等は同codeで伝播）。
  canonical digest経路にfloat・rawを持ち込まない。
- **quota pool lock配線**: 既存lock-owners機構（owner file protocol）を
  `<store>/quota-pool-locks/<pool_id>/`へ再利用したpool単位lease。射程はADR 0054どおり
  単一host・単一Control store。**selector_decision付き`placement-reserve`はleaseの保持が必須**
  （`QUOTA_POOL_LOCK_REQUIRED`）で、observe→select→reserveの臨界区間がpool単位で直列化される。
  tokenは入力側検証のみでmanifestへ書かない（reservationのsubject digest束縛を破らない）。
  競合は`LOCK_CONTENDED`が保持者token・acquired_atを開示。**leaseはCLI呼出を跨ぐため
  owner pidは保持中も通常deadであり、pid生死による自動回収はしない**——回収は開示tokenでの
  明示releaseだけ（単一host協調前提。この裁定を本Decisionとして固定する）。

## Gate（実測）

- orchestration full（全8 suite）: **159/159・fail 0・skip 0**（一回）。
- `make lint-js` green、`git diff --check` clean。
- CLI smoke: 実storeで`quota-pool-lock-acquire`→`quota-pool-lock-release`往復green。
- 既存fixtureの互換: v26の`SCHEMA_UPGRADE_REQUIRED`はlock検証より先に発火（検査順fixture固定）。

## 未実施（本単位の非目標）

- **実quota取得（live H）**: account usage読取・Claude login後の実`RateLimitEvent`取得は
  H承認待ち。活性化前に実イベントでutilization単位（fraction）とshapeをfixture再確認する
  （rag「残る実測gate」どおり）。
- Anthropic statusline補助入口・xAI pool・cross-host pool直列化。
- Wave D（dogfood・週次消費評価）——実需開始時。
