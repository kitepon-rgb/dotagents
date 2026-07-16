# ADR 0054: O4 rate-aware scheduler設計（quota snapshot契約・純粋selector・Control schema v27）

- Status: Accepted
- Date: 2026-07-17
- Parent canon: `docs/plan_factory-master.md` Phase O4／`docs/plan_observer-factory-integration.md` Phase 4
- Control: `observer-factory-20260715` Task `o4-rate-aware-design`
- 先行Decision: [ADR 0045](0045-o3-consultation-multiprovider-schema.md) §1（v27はO4予約）、
  [ADR 0050](0050-o3-placement-policy-and-switch-fixtures-acceptance.md)（role配置関係）、
  [ADR 0053](0053-consultation-orphaned-planned-closure-exemption.md)（cancelled state導入をv27へ予約）
- 反証: 独立refuter 2票（schema互換・migration視点／selector実装可能性・数理・製品契約視点）を通し、
  生存指摘を本文へ反映済み。件数遷移は「反証の裁定」節。

## Context

一般Workerを両providerの残quotaに基づいて配置するrate-aware selectorをO4で導入する。
架空quota・暗黙fallback・秘密複製を許さない契約を、実装前に不変ADRで固定する。
本ADRは設計裁定であり、実装（v27 reader/writer・selector・quota adapter・live取得）は
別の受入単位で行う。

## Decision 1: Quota snapshot契約（`dotagents.quota-snapshot.v1`）

```text
quota_snapshot {
  schema_version: "dotagents.quota-snapshot.v1"
  quota_pool_id:    identifier — 課金/制限を共有するpoolのcaller命名ラベル（selector入力内で一意）
  host_instance_id: identifier — 観測したhost端末
  executor_scope:   [{ adapter_id, contract_version, workflow_id, handle_schema_id... }]
                    — Registryと同じ4要素executor envelope 1件以上。selector入力全体で
                      1 executorは高々1つのpoolに属する（違反はINVALID_SCHEMA）
  provider:         "anthropic" | "openai"（closed enum。xAIはv1対象外）
  windows[] 1件以上: {
    window_id:      identifier（pool内一意。例 "5h" / "weekly" / "weekly-opus"）
    starts_at:      ISO UTC ─ または duration_seconds: positive integer（排他・一方必須）
    reset_at:       ISO UTC
    remaining_bp:   integer 0..10000（basis points。floatをdigest経路へ持ち込まない）
    model_family_scope: bounded string | null（null=account全体。providerのmodel別枠を表現する）
  }
  observed_at:      ISO UTC
  source:           "provider-api" | "app-ui" | "manual"（closed enum）
  confidence:       "measured" | "reported" | "estimated"（closed enum）
}
```

- **window_lengthの定義**: `duration_seconds`型は`duration_seconds`、`starts_at`型は
  `reset_at - starts_at`。validatorは`starts_at < reset_at`、`reset_at > observed_at`、
  `0 < (reset_at - observed_at) <= window_length`を要求し、違反は`WINDOW_CONTRADICTION`
  （`manual`入力のreset日誤り等をfail closedに拾う）。
- 秘密・cookie・token・account内部ID・raw responseを持たない。全fieldはbounded exact schemaで
  fail closed。`quota_pool_id`はcaller命名であり、account識別子を入れない規約を文書で固定する。
- 時刻は全てcanonical ISO UTC。timezoneはsnapshot生成側で解決する。host間のclock skewは
  selector policyの鮮度許容（`max_snapshot_age_seconds`）へ吸収し、別途skew定数を設けない。
- snapshotのcanonical digestはcontrol-recordの`canonicalJson`をexportして共有する
  （別実装のcanonical化差異でdigestを割らない）。数値は全て整数（basis points）で表現し、
  floatをdigest対象へ含めない。

## Decision 2: 純粋selector（`dotagents.selector-decision.v1`を返す純関数）

- 入力を全て明示引数にする: `{ now, role, target_model_family, candidates[], snapshots[],
  previous_selection | null, policy }`。`Date.now()`等の非決定入力・環境読取・network I/Oを
  持たない。
- **役割語彙はADR 0050の`ROLE_PROVIDER_PLACEMENT`と同一の`{observer, consultant, worker}`**。
  task.roleの下位role（implementer/refuter/sorter等）は呼び出し側（placement）が`worker`へ解決して
  渡す。`observer`／`consultant`は`ROLE_NOT_BALANCED`でfail loud。親直轄Fはselectorの役割語彙に
  含めない——F write=parent強制は既存`EXECUTOR_FORBIDDEN`が担保し、selectorで重複判定しない。
- **candidateはRegistryと同じ4要素executor envelope**（adapter_id/contract_version/workflow_id/
  handle_schema_id）。適格性（role・能力・独立性）は入力前に満たしている前提で、selectorは
  Registry／placementの責務を複製しない。candidate→poolの対応はsnapshotの`executor_scope`
  包含で解決し、対応するsnapshotが無い候補は`SNAPSHOT_MISSING`でfail loud（暗黙除外しない）。
- 評価:
  - 鮮度: `now - observed_at > policy.max_snapshot_age_seconds`なら`SNAPSHOT_STALE`。
    `reset_at <= now`のwindowは`SNAPSHOT_EXPIRED`（reset跨ぎは再観測を要求＝「選択ごとの
    snapshot再取得」を鮮度検証で強制する）。
  - 適用windowの選別: `model_family_scope`がnullまたは`target_model_family`に一致するwindowだけを
    そのpoolの評価対象にする（providerのmodel別枠が無関係なmodel配置を殺さない）。
  - windowごとに`remaining_time_ratio = (reset_at - now) / window_length`、
    `pace_ratio = (remaining_bp / 10000) / max(remaining_time_ratio, policy.epsilon_time)`。
    poolの実効headroomは**最も逼迫した適用window**（min pace_ratio）。
  - **eligibility下限**: いずれかの適用windowで`remaining_bp < policy.min_remaining_bp`のpoolは
    選択不可（reset直前の残量僅少poolがpace膨張で最優先になる逆転を防ぐ）。
  - **pace飽和**: `pace_ratio`は`policy.pace_cap_bp/10000`で飽和させ、reset近傍の発散値を
    選好へ持ち込まない（時計進行だけで起きるhysteresis突破＝フラッピングを抑える）。
  - 全候補不可なら`NO_ELIGIBLE_POOL`でfail loud（架空値・暗黙fallbackで配置を成功扱いしない）。
  - エラー検査順は固定: `INVALID_SCHEMA → WINDOW_CONTRADICTION → SNAPSHOT_EXPIRED →
    SNAPSHOT_STALE → SNAPSHOT_MISSING → ROLE_NOT_BALANCED → NO_ELIGIBLE_POOL`
    （fixtureがtyped errorを決定的にpinできるように）。
- **hysteresis**: `previous_selection.quota_pool_id`がeligibleである限り、最良poolの飽和後
  pace_ratioが前回poolの`policy.switch_threshold_bp/10000`倍を超えない限り前回poolを維持する。
  前回poolがcandidates/snapshotsに存在しない、またはineligibleなら、hysteresisは不適用
  （通常選好で選ぶ）。前回poolのsnapshotが不備なら選択全体が`SNAPSHOT_*`で失敗する——
  離脱にも健全なsnapshotが要るのはfail-loud哲学の帰結として明示する（親は候補除外で裁定できる）。
- **決定的順序**: `pace_bucket = floor(pace_ratio * 10000 / policy.epsilon_tie_bp)`で量子化し、
  `(-pace_bucket, quota_pool_id)`の全順序ソート先頭を選ぶ（ペアワイズ近似の非推移性を避ける）。
  pool内のexecutor選択はexecutor envelopeのcanonicalJson辞書順先頭で決定的に選ぶ。
- **reason優先順位**: `only-eligible > hysteresis-hold > max-headroom`。eligible poolが
  1件ならその経緯（入力1件・他が失格）によらず`only-eligible`。
- policy既定値（`epsilon_time`・`epsilon_tie_bp`・`min_remaining_bp`・`pace_cap_bp`・
  `switch_threshold_bp`・`max_snapshot_age_seconds`）は実装で定数化しfixtureで固定する。
- 出力（selector decision）:

```text
selector_decision {
  schema_version: "dotagents.selector-decision.v1"
  selected_quota_pool_id, selected_executor: 4要素executor envelope
  evaluated_at: now（入力のecho）
  reason: "max-headroom" | "hysteresis-hold" | "only-eligible"（closed enum）
  pool_evaluations[]: { quota_pool_id, min_pace_bp: integer, binding_window_id,
                        eligible, exclusion_reason | null }
  snapshot_evidence[]: 既存evidence descriptor shape { type, ref, digest, observed_at }
                       — 使用した全snapshotをcaller保持のevidenceとして参照する。
                       実体を保持しない場合は入力再検証が監査不能になることを受け入れる
                       裁定をControl側Decisionへ残す
  reservation: { wall_time_seconds, cost_microusd } — 既存budget reservationと同shape
}
```

- pool lockの射程は**単一host・単一Control store内**に限る（既存lock-owners機構の再利用）。
  cross-hostの同一pool競合はv1では直列化せず、snapshot鮮度と再観測で吸収する。

## Decision 3: Control schema v27

- **readerは`{v25, v26, v27}`のclosed set**。新規initはv27実装完了時点でv27へ切替。
  v26→v27は`control-migrate`の拡張で行い、多段（v25→v26→v27）はそれぞれ一回ずつ明示的に行う
  （直行migrationは作らない）。
- **placement reservationへ`selector_decision`をoptional **key**として追加する**（常在keyの
  null可にしない）。selectorを経ないreservationにはkey自体が存在しない。
  **v26→v27 migrationは既存`placement_reservation` objectを一切書き換えない**——reservationは
  canonical JSON全体が作成時receiptの`subject_digest`へ束縛されており、keyの追加・null注入は
  既存Controlの読取を恒久破壊するため。記録経路は既存`placement-reserve`のみで、field存在時は
  subject digestへ自動束縛される。手動`worker-run-record`は本fieldを持たない。v27未満の
  manifestで本fieldは`INVALID_SCHEMA`。selector_decisionなしのreservationはv27でも従来どおり有効。
- **consultationへ`cancelled` stateを追加する**（ADR 0053の本修正）:
  - 遷移は`planned -> cancelled`のみ（dispatched以降は従来どおりterminal回収必須）。
    観測（`observeConsultation`）のstate enumには`cancelled`を含めない＝観測経由の偽装cancelは
    構造的に不可能なまま。
  - 新mutation `consultation-cancel`が親Decision証拠（`type=decision`）を必須とし、
    **証拠はtransition receiptだけが保持する**。cancelledの真理値表行は
    `executor_observation = null`・`decision_ref = null`・`terminal_evidence = []`（planned同形）。
  - `CONSULT_TERMINAL`定数へは**無条件に**`cancelled`を追加してよい（v26以下はstate enum検証で
    cancelledを持ち得ないため挙動不変）。受理の門番はv27 consultation validatorのstate enumだけ。
    `CONSULT_NONTERMINAL`は変更不要。
  - cancelled consultationはWorker完成件数へ数えず、同一assignmentの再相談を許す——
    「failedと同扱い」は**`assignmentAllows`の再相談許可（`failed | cancelled`）に限る**。
  - **v26→v27 migrationは、取消済みTaskの孤児planned consultationを決定的に`cancelled`へ変換する**。
    control-migrate receiptは既存不変量どおり**evidence空のまま**（変換の発生時点のみを証する）。
    migration産cancelledは対応する`consultation-cancel` receiptを持たない別形として正当であり、
    「`cancelled` ∧ 当該taskがtask_cancellationsに存在 ∧ consultation-cancel receiptなし」で
    機械的に識別できる。consultation系はreceiptとrecordの突合検証を持たない既存非対称のまま、
    cancelledへのreceipt必須不変量は置かない（migration産に無いため）。
  - **ADR 0053の孤児除外のretire対象は3箇所**——`campaignAllTerminal`・`requiredClosingReceipts`・
    `assertControlReadyForFinalization`（いずれもreader semantics。validateManifestには存在しない）。
    v27ではmigrationにより孤児plannedが存在しないため、除外分岐はv27で到達不能となる。
    shared正典の該当行（cancelled導入予定・再相談許可条件）も同時更新する。
  - brief/resume-checkは**v7を維持**する。cancelledは`CONSULT_NONTERMINAL`に含まれないため
    active/uncollected/unknown分類・resume-check再照会列挙は無変更でterminal扱いになり、
    shape・値域とも不変（campaign-status member stateはworker経由で既に`cancelled`を値域に持つ）。
    実装時にshape変更が生じた場合のみv8へbumpし、silent変形を許さない。
- **rollback（v27→v26）**: `selector_decision`付きreservation、またはmutation産cancelled
  （`consultation-cancel` receiptを持つcancelled）が1件でも存在すれば`ROLLBACK_UNSUPPORTED`。
  **migration産cancelledは決定的にplannedへ復元する**（識別規則は上記。復元後のv26では
  ADR 0053の除外が復活して有効なmanifestになる）。これによりv27機能を使っていないControlの
  rollback権はmigrationで焼かれない。migrate系receiptは恒久に残る（ADR 0045 §6と同じ
  data-plane限定の規律）。

## Decision 4: 実装waveの分割（次ゴールの受入単位）

1. **Wave Q**: `quota-snapshot.mjs`（validator＋canonical digest共有）＋fail-loud fixture
   （stale・bp範囲外・window矛盾（starts_at逆転／length超過含む）・reset境界・時差・欠落field・
   executor重複帰属・pool ID重複）。
2. **Wave S**: `rate-selector.mjs`（純関数）＋fixture（hysteresis保持と閾値突破・前回pool不在／
   ineligible時の不適用・決定的tie-break（量子化順序）・残量下限・pace飽和・残量ゼロ・全候補不可・
   reset跨ぎ失効・一社のみ適格＝only-eligible優先・model_family_scope選別・エラー検査順）。
3. **Wave V**: Control schema v27——reader dispatchの**v26等値判定の集合判定化**
   （validateConsultationのhandle field/connector/effort分岐・briefManifestのhandle投影・
   observeConsultationの期待handle・consultationRecordの入力schema推定・controlMigrateのedge分岐、
   計7箇所を名指しでfixture固定）、`consultation-cancel` mutation、placement `selector_decision`
   optional key（validatePlacementReservation系4呼出へのversion配管込み）、migration
   （孤児planned→cancelled変換）とrollback（migration産cancelled復元・v27機能使用時の
   `ROLLBACK_UNSUPPORTED`）、ADR 0053除外のv27到達不能化、`assignmentAllows`の
   `failed | cancelled`拡張、shared正典同時更新。
4. **Wave A**: provider quota観測adapter（Anthropic/OpenAI）。**request/projection純関数まで**を
   先に実装し、取得失敗→typed errorのprojection fixtureを受入に含める。実取得（account usage読取）は
   live H gateで別途承認を得る。
5. **Wave D**: dogfood——実Controlでのselector decision記録と週次消費評価（実需開始時）。

各waveはfocused fixture＋related gate一回で独立revert可能にし、受入ADRで閉じる。

## Gate（設計受入条件）

- refuter 2票の反証を通過し、採用・棄却を件数遷移付きで本ADRへ記録する（下記）。
- 親・子planのv27参照と本設計の整合（ADR 0045 §1のv27予約をO4が使用）。
- 実装・実quota取得・live Hは本単位で行わない。

## 非目標

- xAI（Grok/Composer）poolのselector対象化。
- Observer・相談役・親直轄F作業の自動配置。
- provider APIの利用規約を超えるquota推定（取得不能はfail loudのまま）。
- cross-hostのpool直列化（v1はsnapshot鮮度で吸収）。

## 反証の裁定（件数遷移）

独立refuter 2票で計19群の指摘。**採用17・棄却2**。

- 票1（schema互換・migration視点）6群を全採用:
  ①`selector_decision`のoptional key化とmigrationのreservation非改変（digest束縛破壊の防止・最重要）
  ②cancelled真理値表行の確定（planned同形・証拠はcancel receiptのみ・migrate receiptはevidence空維持）
  ③rollback権の保全（migration産cancelledの決定的復元。全面禁止は必要条件でないとの反証を採用）
  ④reader dispatchのv26等値判定7箇所の名指しfixture化 ⑤`CONSULT_TERMINAL`無条件追加＋state enum門番
  ⑥ADR 0053除外のretire箇所の正確な局在（3 reader sites）と`assignmentAllows`／shared正典の同時更新。
- 票2（実装可能性・数理・製品契約視点）13群中11採用:
  ①window_length定義と検証穴（starts_at逆転・length超過） ②残量下限とpace飽和（近reset膨張・
  時計駆動フラッピングの抑止） ③ε分離（epsilon_time/epsilon_tie_bp）と量子化全順序tie-break
  ④candidate/executor_scopeの4要素envelope化・pool一意性・pool内executor決定則
  ⑤role語彙のADR 0050整合（下位role→worker解決・親直轄Fの語彙除外） ⑥reason優先順位と
  エラー検査順の固定・取得失敗fixtureのWave A追加 ⑦snapshot digestのevidence ref化と
  canonicalJson共有・basis points整数化（float排除） ⑧migration産cancelledの正当形（票1②と統合）
  ⑨windowのmodel_family_scope（Anthropic model別weekly枠） ⑩pool lock射程の明示（単一host限定）
  ⑪previous pool不在/stale時の帰結明文化＋clock skewの鮮度吸収。
- 棄却2: hysteresisのInfinity/ゼロ除算破綻（remaining=0はeligibility除外・分母clampで構成不能）、
  pace_ratioの単調性が意図と逆という主張（向きは正しいと双方確認。1bは「単調性」でなく
  「headroom妥当性」の指摘として採用済み）。
- 確認済み（反証が支持した点）: reservation subject digest束縛の実在、reader closed set・
  多段migrationの現行実装整合、lock機構の実在、budget予約合算のcancelled整合、
  brief v7維持の成立条件、`consultTransitions`無変更で観測経由の偽装cancelが不可能なこと。
