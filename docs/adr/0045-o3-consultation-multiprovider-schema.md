# ADR 0045: O3 Consultation多provider schema裁定

- Status: Accepted
- Date: 2026-07-16
- Parent canon: `docs/plan_factory-master.md`
- Control: `observer-factory-20260715` Task `o3-consultation-multiprovider-schema-design`
- 先行Decision: [ADR 0043](0043-o3-claude-provider-adapter-boundary.md)（§6が本裁定を予約）
- 反証: 独立refuter 2票（schema互換・migration視点／adapter catalog・実CLI契約視点）を通し、
  生存した指摘を本文へ反映済み。棄却した指摘は「反証の裁定」節に記録する。

## Context

現行manifest schema `dotagents.orchestration-control.v25`のConsultationは
`connector="gpt-connector"`固定・`slug`文字列必須である。O3のElastic provider対称化では
Codex親→Claude相談役とClaude親→Codex相談役が必要だが、Claude session IDやCodex側handleを
`slug`へ詰めると型付き相関とresume契約を失う（ADR 0043で禁止済み）。

過去のschema遷移（v23→v24→v25）は旧readerを持たない定数差替えだった。現在はactive v25
Control（`observer-factory-20260715`ほか）が存在するため、同じ手を使うと既存Controlが
読めなくなる。また子計画はrate-aware selector decision用に「v26」を予約していた。

## Decision

### 1. Version順

- Consultation多provider化はmanifest schema変更を要する（typed handle unionの導入）。
- **O3がv26を取り、O4 rate-aware selector decisionはv27へ移す。** 子計画内の
  rate-aware向け「v26」参照は**全箇所**（Phase 4 TODOおよびPhase 0完了記録の該当行）を
  本Decisionと同一commitで更新する。完了記録側は削除せず「v27へ変更（本ADR）」の訂正注記とする。
  番号は予約であって実装物ではないため、migrationは発生しない。

### 2. v26のConsultation shape

- `connector`を`"gpt-connector" | "claude-native" | "codex-sidecar"`のclosed enumへ拡張する。
  未知connectorはfail closed。enum追加は常に新しいschema versionを要する。
- `slug`フィールドを廃し、connector別exact shapeの**`consultation_handle`**へ置換する:
  - `gpt-connector`: `{ "slug": "..." }` — 既存semantics（caller既知slug、timeout後は同一slugを
    `sessions`で回収）を維持する。
  - `claude-native`: `{ "session_id": "<lowercase UUID>" }` — Worker handleと同一validator。
    ただしConsultationはWorkerと別collection・別laneであり、workspaceを持たず、同一session IDだけで
    resumeする。caller timeoutは`unknown`のまま同一sessionのprocess状態回収後に親が裁定する。
  - `codex-sidecar`: `null`固定 — 同期read-only consultation（`codex_opinion`）はdurable handleを
    持たない製品契約のため、handleを捏造せずconsultation_id＋request相関で結果を照合する。
- 他のfield（`consultation_id / task_id / assignment_id / model / effort / budget_reservation /
  state / executor_observation / decision_ref / terminal_evidence`）とtruth table、
  `consultTransitions`、H task operation digest要求は不変。
- **ObserverはWorker票・Consultation票のどちらにも入らない**（ADR 0043-5維持）。相談役は原則
  親と異なるprovider（役割→モデルは`docs/02_models.md`のみで解決）。

### 3. Adapter catalogとadapter層の同時Decision

- adapter catalog schema（`dotagents.executor-adapter.v1`）は変更しない。catalogの一意キーは
  `adapter_id×contract_version`なので、consultation laneは**別contract entry**として追加する:
  - `claude-native@consult-v1`（lane=consultation、interface `consultation-session`、
    operations start/resume）
  - `codex-sidecar@consult-v1`（lane=consultation、interface `consultation-opinion`、
    operation `consult`→MCP `codex_opinion`、effect=control）
- **request／observation両schemaをWorker laneと分離する**（refuter採用指摘）。consultation用
  observation schemaは専用ID（例: `dotagents.claude-native.consult-observation.v1`）とし、
  `workerProjectionCore`は consultation observation schemaを`PROJECTION_UNSUPPORTED`で拒否する。
  現行`buildConsultationControlObservation`はgpt-connector固定のため、connector別dispatchへ
  拡張する。consultationの結果がWorker control observationへ流入する経路を作らない。
- **failure supportのキー粒度を`adapter_id×lane`へ拡張する**（refuter採用指摘）。現行
  `ADAPTER_FAILURE_SUPPORT`／`lookupAdapterFailureSupport`／`projectAdapterCallerTimeout`は
  adapter_id単独キーのため、`codex-sidecar` consultationのcaller timeoutにdurable work用
  `result`回収（idempotencyKey必須）を返す等の誤指示が生じる。consultation laneの
  `codex-sidecar`はtimeout回収operation無し（unknown保持）、`claude-native`のworkspace系family
  は`not-applicable`とする。既存worker laneの表は不変。
- **consult系contractのlane固定をvalidatorで担保する**（refuter採用指摘）。`consult-v1`系
  contract_versionのdescriptorは`lane==="consultation"`必須とし、worker laneでの登録を
  `LANE_FORBIDDEN`でfail closedにする。gpt-connectorのWorker禁止（`EXECUTOR_FORBIDDEN`）は不変。
- read-only性は実在する仕組みで担保する: 製品側tool descriptorの`readonly: true`
  （codex-sidecar配布物の`codex_opinion`）と、request builderがwrite系引数（`allowWork`等）を
  一切生成しないことを固定する。存在しない「catalog上のread-only capability field」を根拠にしない。
- 製品契約の細部束縛: `codex_opinion`は`projectRoot`必須・effortは`low|medium|high|xhigh`のみ
  （`max`なし）。claude-native consultationのCLI実行はcwdを要する。**Consultation recordは
  workspace fieldを持たないが、request builderはprojectRoot／cwdを要求し、Controlへ複製しない。**
  effort語彙はconnectorごとに製品契約へ束縛し、共通語彙を捏造しない。
- claude-native consultationのtool policyは相談専用（`--tools ""`＝全tool無効。Claude Code
  2.1.211のCLI helpに明記）。ただし`-p`＋全tool無効のlive挙動は本単位では未実測であり、
  live H gateで一度実測してから運用へ入れる。

### 4. v25継続読取とmutation

- readerは`{v25, v26}`のclosed setを受理し、manifestの`schema_version`ごとにconsultation
  validatorをdispatchする。他collectionの検証は両versionで同一とする。
- **v25 active Controlは読取だけでなくmutationも従来契約のまま継続する**（connector=
  `gpt-connector`固定・`slug`）。v26新機能（多provider consultation record）はv26 manifestに
  限る。v25 manifestへの多provider consultation記録は`SCHEMA_UPGRADE_REQUIRED`でfail closedにする。
- **transition receiptのoperation enumは両versionで`control-migrate`を追加受理する**
  （refuter採用指摘）。rollback後のv25 manifestにはmigrate/rollbackのreceiptが恒久に残るため、
  これを拒否すると「v25として有効」が成立しない。enum追加以外のv25検証は不変。
- **status brief／resume-checkのprojectionをv7へbumpする**（refuter採用指摘）。現行v6は
  active consultationの`slug`を固定shapeへ焼き込むため、`consultation_handle`投影へ置換した
  `dotagents.orchestration-status-brief.v7`／`orchestration-resume-check.v7`を定義し、
  shared文書の該当shape記述と既存test pinを同時更新する。silent shape変形を許さない。
- 新規`init`はv26で作成する。

### 5. Migration（明示・一方向）

- 暗黙migrationはしない（mutation時の自動昇格を禁止）。新しい明示コマンド
  `control-migrate`だけがv25→v26を一回で行う:
  - 決定的変換: 各consultationの`slug: s`→`consultation_handle: { slug: s }`、connectorは
    既存の`gpt-connector`のまま。他collectionは不変。
  - `record_revision`を+1し、transition receiptへ`operation="control-migrate"`、
    from/to schema versionを記録する。
  - finalized／archivedのControlはmigrateしない（歴史はそのversionのまま読む）。
  - receipt容量上限（256）近傍ではfail loudに拒否される。架空の空きを作らない
    （fixtureで容量際の拒否を固定する）。
- 実施はControlごとに親が裁定する。O3実装後、`observer-factory-20260715`のmigrationは
  多provider consultationを実際に記録する直前まで行わない。

### 6. Rollback（条件付き・明示・data-plane限定）

- v26→v25 rollbackは、**非`gpt-connector` consultationが1件も存在しない場合に限り**決定的に
  可能（`consultation_handle:{slug}`→`slug`）。1件でも存在すれば`ROLLBACK_UNSUPPORTED`で
  fail loudにし、silent degradeやhandle捨てを行わない。rollbackも`control-migrate`の明示
  operation（方向指定）とし、transition receiptへ記録する。
- **rollbackの範囲はdata-planeに限る**（refuter採用指摘）。rollback後manifestにもmigrate系
  receiptは恒久に残り、store内にv26 manifestが1つでも存在する限り、O3実装前のコードは
  （`scanManifests`が全Controlを検証するため）無関係なv25 Controlの操作も含めて動作しない。
  したがって**O3実装コミット自体のrevertは、v26 manifest・migrate receiptが1件も生まれる前
  にのみ安全**であり、以後の後退はdata-plane rollback＋前方修正で行う。これを縮小や
  隠蔽なしに運用上の制約として固定する。

### 7. Failure・終端・切替の非偽装

- provider障害時の別provider切替は、元Consultationのterminal（`failed`）Decision後に
  **新しいConsultation**として記録する。元の成功へ丸めず、元のhandleを書き換えない。
- caller timeoutは全connectorで`unknown`とし、gpt-connectorは同一slugの`sessions`、
  claude-nativeは同一session IDのprocess状態で回収する。
- **codex-sidecar consultationの終端経路を明示する**（refuter採用指摘）。同期consultには
  再照会入口が無いため、結果喪失時に「所有製品のterminal状態を確認した証拠」は原理的に
  取得できない。`failed`終端のterminal_evidenceとして、**caller側で観測したMCPエラー／
  timeout観測の`command`または`executor-receipt` evidence**をconnector条件付きで認める。
  shared文書の該当要求（terminal evidence条項）をconnector別に条件化し、`unknown`のまま
  task finalizeが恒久ブロックされる契約穴を塞ぐ。放置＝finalize不能は受け入れない。
- claude-nativeのterminal回収では**process exitを完了信号にしない**。`-p`モードは
  backgrounded taskが残る限り`type:result`後もprocessが生存する実測（罠DB:
  `claude-code-p-mode-hangs-after-type-result-until-backgrounded-tasks-finish`）があるため、
  stream-jsonの`type:result`を完了信号とし、process生存はtimeout誤判定へ繋げない。

## 反証の裁定（件数遷移）

- refuter 2票で計12群の指摘。採用7群（§1の全参照更新、§3のobservation分離・failure keying・
  lane validator・read-only根拠・製品契約細部、§4のreceipt enum・brief v7、§6のdata-plane限定、
  §7のsidecar終端経路、§5の容量際fixture）。
- 棄却・確認済み: migrationが壊す不変量（existence: false — receipt chain／admission_digest／
  subject digestは非破壊と確認）、v25 mutation継続の実現性（init以外にschema_versionを書く
  箇所なしと確認）、delegation-contractのtimeout条項との矛盾（Workerレーン限定文言のため
  非矛盾）、UUIDv1-5限定リスク（Worker側と同一validatorの既存前提であり本ADR固有でない）。

## Gate（実装時の受入条件）

- focused fixture: v25読取＋v25 mutation継続、v26新規作成、v25→v26 migration、rollback可否
  （可・不可両方）、receipt容量際のmigrate拒否、未知connector／handle shape違反／slug詰込みの
  拒否、consultation observation schemaのworker projection拒否、consult-v1のworker lane登録拒否、
  brief/resume-check v7のconsultation_handle投影。
- related gate: `tests/orchestrate/control-record.test.mjs`＋`executor-adapters.test.mjs`＋
  `executor-contracts.test.mjs`を一回。`make lint-js` green。
- source/testと本ADR・plan更新は独立revert可能なcommitに分ける。ただし§6のとおり、
  v26 manifestが生まれた後のコードrevertは安全でないことを受入時に再確認する。
- 実model request、login、credential、network dispatchはこの単位で行わない。
  `--tools ""`のlive挙動実測は後続live H gateへ残す。

## 非目標

- O4 selector decision fieldの実装（v27の内容はO4で裁定する）。
- aiterm（Grok/Composer）のconsultation lane追加（xAI枠はv1 selector対象外・別計画）。
- 既存gpt-connector製品契約・MCP実装の変更。
