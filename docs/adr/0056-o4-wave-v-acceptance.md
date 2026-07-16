# ADR 0056: O4 Wave V受入（Control schema v27）

- Status: Accepted
- Date: 2026-07-17
- Parent canon: `docs/plan_factory-master.md` Phase O4
- Design decision: [ADR 0054](0054-o4-rate-aware-scheduler-design.md) Decision 3（本ADRは受入記録であり、0054へ追記しない）
- Control: `observer-factory-20260715` Task `o4-wave-v-implementation`

## 受入対象

| 種別 | commit | 内容 |
|---|---|---|
| source/test | `75f33fc` | v27 reader/writer、`consultation-cancel`、placement `selector_decision`束縛、migration/rollback edge分岐、v26等値判定7箇所の集合判定化、Wave V Gate fixture一式 |

## ADR 0054 Decision 3との照合

- **reader dispatch**: refuter名指しの7箇所（validateConsultationのhandle field／connector・handle
  分岐／effort束縛、briefManifestのhandle投影、observeConsultationの期待handle、
  consultationRecordの入力schema推定、controlMigrateのedge分岐）を`typedConsultationSchema`
  集合判定へ置換。v27でのconsultation記録・観測・brief・handle照合・effort束縛をfixtureで固定。
- **cancelled state**: `planned -> cancelled`は`consultation-cancel` mutationのみ（親Decision証拠
  必須・証拠はreceiptだけが保持・record本体はplanned同形）。観測enumに`cancelled`は無く偽装不可。
  `CONSULT_TERMINAL`無条件追加＋v27 state enum門番、`consultTransitions.cancelled = {}`で
  state lookupを全域化。同一assignment再相談は`failed | cancelled`後に許可。
- **selector_decision**: optional key（常在null不採用）。自己完結のshape validator、
  `placement-reserve` subject digestへの自動束縛（改竄はfixtureで恒久検出を確認）、
  v27未満は`SCHEMA_UPGRADE_REQUIRED`（mutation）／`INVALID_SCHEMA`（読取）。
  migrationは既存reservationを一切書き換えない。
- **migration/rollback**: 隣接version限定（v25→v27直行は`INVALID_TRANSITION`）。v26→v27は
  孤児planned→cancelledの決定的変換（非孤児plannedは不変）、v27→v26は`selector_decision`／
  明示cancelledで`ROLLBACK_UNSUPPORTED`・migration産cancelled（cancel receipt不在で機械識別）を
  plannedへ決定的復元。分類不能なcancelledはfail loud。
- **ADR 0053除外のretire**: v27では孤児除外が適用されず、`consultation-cancel`が明示の脱出経路
  （fixture: v27で孤児plannedがfinalizeを正しくブロック→cancel→finalize成功）。v27→v26 rollback後は
  除外が再有効。
- **brief/resume-check v7維持**: consultation shape・active分類とも不変（cancelledはterminal扱い）。
  bumpなし＝ADR 0054の条件どおり。

## Gate（実測）

- orchestration full（全7 suite）: **152/152・fail 0・skip 0**（一回）。
- `make lint-js` green、`git diff --check` clean。
- 新規initはv27。実storeの既存Control（全4件・v25）は読取・mutation継続を回帰で確認
  （このControl自身のtask-record/finalizeが新コード下のv25 mutationとして成立）。

## 未実施（本単位の非目標）

- Wave A（provider quota観測adapter・取得失敗fixture）・pool lock配線・実quota取得・live H。
- Wave D（dogfood・週次消費評価）。
- 実storeのv25→v26→v27 migration（実需＝多provider consultation／selector記録の直前まで行わない。
  ADR 0045 §5・ADR 0054の運用規律どおり）。
