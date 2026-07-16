# ADR 0055: O4 Wave Q/S受入（quota snapshot validator・rate-aware selector純関数）

- Status: Accepted
- Date: 2026-07-17
- Parent canon: `docs/plan_factory-master.md` Phase O4
- Design decision: [ADR 0054](0054-o4-rate-aware-scheduler-design.md)（本ADRは受入記録であり、0054へ追記しない）
- Control: `observer-factory-20260715` Task `o4-wave-qs-implementation`

## 受入対象

| 種別 | commit | 内容 |
|---|---|---|
| source/test | `83236c4` | `quota-snapshot.mjs`（shape/window検証・set検証・canonical digest）、`rate-selector.mjs`（純関数selector）、Wave Q/S Gate fixture一式、`canonicalJson`のexport共有 |

## ADR 0054 Gateとの照合

- **Wave Q fixture**: bp範囲外・enum・envelope・欠落field・時差（offset付きISO拒否）、
  window矛盾（starts_at逆転／reset境界／length超過）、executor重複帰属・pool ID重複、
  digestの決定性（field順序非依存・内容感度）。
- **Wave S fixture**: hysteresis保持と閾値突破・前回pool不在／失格時の不適用、
  量子化全順序tie-break（入力順非依存）、残量下限、pace飽和（`pace_cap_bp`ちょうどの整数化）、
  残量ゼロ→`NO_ELIGIBLE_POOL`、reset跨ぎ失効→`SNAPSHOT_EXPIRED`、
  一社のみ適格→`only-eligible`優先、`model_family_scope`選別（account全体枠とmodel別枠の分離・
  適用windowゼロ→`no-applicable-window`）、エラー検査順（ADR固定順を複合入力でpin）。
- policy既定値（`epsilon_time=0.005`／`epsilon_tie_bp=100`／`min_remaining_bp=200`／
  `pace_cap_bp=50000`／`switch_threshold_bp=12500`／`max_snapshot_age_seconds=900`）を
  定数`DEFAULT_SELECTOR_POLICY`としてfixtureで固定。

## 実装裁定（ADR 0054の設計意図内での確定事項）

1. **selector入力に`reservation`を追加**: ADR 0054 Decision 2の入力列挙に無いが、出力契約が
   `reservation` echoを要求するため必須入力とした（selectorは予算を計算しない）。
2. **未知roleは`INVALID_SCHEMA`**: placement語彙（`observer|consultant|worker`）外のroleは
   入力shape違反。`ROLE_NOT_BALANCED`はobserver/consultantだけが、固定検査順どおり
   snapshot健全性検査の後に受ける。
3. **失効はsnapshot単位**: 候補が参照するsnapshotの**全window**（適用外scope含む）で
   `reset_at <= now`を検査する（ADR「そのsnapshotでは選ばない」のsnapshot単位解釈。
   再観測は全windowを更新するため保守側に倒した）。
4. **観測が呼出側nowより未来のsnapshotは`INVALID_SCHEMA`**（clock skewは鮮度境界で吸収、
   未来観測は拒否）。

## Gate（実測）

- orchestration full（`tests/orchestrate/*.test.mjs`全7 suite）: **148/148・fail 0・skip 0**（一回）。
- `make lint-js` green、`git diff --check` clean。

## 未実施（本単位の非目標）

- Wave V（Control schema v27・`consultation-cancel`・placement束縛・migration/rollback）。
- Wave A（provider quota観測adapter。取得失敗→typed error fixtureはWave A受入に含める）。
- 実quota取得・pool lock配線（store機構再利用はWave V/A）・live H・dogfood。
