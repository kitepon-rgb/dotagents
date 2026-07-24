# ADR 0116: Control外部Task binding（v30）とLattice read-only projection

- Status: accepted（最上位ティアrefuterの反証5指摘を全採用して改訂済み）
- Date: 2026-07-24
- 対象: factory-master Wave 2（Control Taskへのclosed external-source binding／dotagents側Lattice public CLI read-only projection）
- 正本境界: [ADR 0113](0113-composable-orchestration-invariants.md)（正本分割・closed projection・saga原則）、[ADR 0114](0114-typed-lane-admission-contract.md)（typed admission）
- 非目標: 外部dispatch・Lattice mutation・saga実装（Wave 3）。Lattice製品側の契約拡張（fm-0667）。bridge DB。

## Decision 1 — manifest v30: Task `external_source`（closed tuple・nullable）

`dotagents.orchestration-control.v30`を追加し、Taskへ`external_source`キーを導入する。

- 形は closed tuple の exact 4キーだけ: `namespace`（identifier、例 `lattice.todo`）／`contract_version`（外部製品公開契約の版文字列）／`external_id`（外部Task識別子、bounded string・canonical path文字のみ）／`immutable_digest`（SHA-256。binding時点の外部側公開digest）。
- 自由形式metadata・外部label・外部state・外部依存のcopyは許さない（`exact()`で余剰キー拒否）。Latticeのtitle・status・depends_onは持ち込まない。
- `null`はdirect path（外部相関なし）の正規値。v30ではキー**存在**が必須、v25〜v29ではキー**不在**が正規形（v29のversion-aware shape原則を踏襲）。
- v29以下のmanifestへ`external_source`付きtask-recordを渡したら`SCHEMA_UPGRADE_REQUIRED`（既存のselector_decision前例に一致）。

## Decision 2 — admission_digestと**packet_digest**はnull bindingを正規化する

`taskAdmissionDigest`と`packetDigest`の双方で、snapshot上の`external_source`が`null`のときキーごと削除してからcanonical JSONを取る。

- これにより v29→v30 migration（全taskへ`null`付与）が既存taskのadmission_digestを**一切変えない**。migrationがacceptance証拠を書き換える経路を構造的に塞ぐ。
- packet_digestも同じ正規化を通す。delegation packetはstored taskを丸ごと埋め込み、report importは**現在のmanifestから**packetを再計算して照合するため、正規化なしではv29でdispatchした走行中workerのreportがmigration後に`REPORT_CORRELATION_MISMATCH`で恒久import不能になる（refuter指摘1）。null正規化でv29 packetと「v30・null binding」packetのdigestが一致し、migration/rollbackを跨ぐreport回収が保たれる。
- 非null bindingは両digestに入る＝binding付きで受入・委譲されたTaskは相関ごと不変に固定される。

## Decision 3 — migrationとrollback

- v29→v30: 全stored taskへ`external_source: null`を付与するだけ。receipt以外の副作用なし。
- v30→v29 rollback: 全taskの`external_source`が`null`の場合だけキーを削除して戻す。非null bindingが1つでもあれば`ROLLBACK_UNSUPPORTED`（binding証拠の黙殺を許さない）。
- 隣接版migrationのみ（既存EDGES規則に従いv29↔v30を追加）。

## Decision 4 — bindingは不変（mutation面を作らない）

`external_source`を書けるのはtask-recordの1回だけ。更新・差替コマンドは追加しない。外部側のdriftはbindingを書き換えるのではなく、dispatch直前の公開status再読とdigest照合で**拒否**する（正本はplan「LatticeからControlへの投影」7項）。

## Decision 5 — Lattice read-only projection module（fm-0666）

`lib/orchestrate/lattice-projection.mjs`を新設する。責務はLattice public CLIの実行と、exact schemaでのtyped判別だけ。

- 入口は`lattice status --json`／`lattice todo status --json`／`lattice run list --json`の3つ。書込コマンドは呼ばない。
- 返す判別は discriminated union: `cli_unavailable`（CLIプロセス不在・spawn失敗・stdoutが期待envelopeとしてparse不能）／`project_state`（`lattice.project_status.v1`の**uninitialized/ready/active_run/invalid 4値**——`missing`はCLI契約に存在しない。「missing相当」はCLI不在として`cli_unavailable`側の責務）／`todo_frontier`（`lattice.todo_status_result.v4`）／`run_status`（`lattice.run_list.v1`）／`version_mismatch`（観測schema文字列が期待exact版と不一致）。
- **判別はstdout parse優先**: Latticeは`invalid`（store破損）でも project_status envelope をstdoutへ出しつつ exit 1 を返す。期待schemaのvalid envelopeが読めたらexit code不問でtyped stateを採用し、parse不能のときだけexit code系情報で`cli_unavailable`へ分類する（既存consumer `lib/lattice-hook.py`の裁定を正典化。exit codeを先に見ると`invalid`が`cli_unavailable`へ丸まる——refuter指摘2）。
- `run_status`はmanaged runtime run（`.lattice/runs/`）であり、todo run（project_statusの`active_runs`／`todo start`）とは**別namespaceの互いに素な概念**。同名キー`active_runs`を相関に混用しない（refuter指摘5）。
- version不一致・parse不能・unknown stateを空集合や成功へ丸めない（typed failureで返す）。期待版はmoduleが定数で固定し、不一致時は観測schema文字列を結果へ含める。
- 可変stateを持たない（bridge DB禁止のADR 0113原則）。結果には`result_digest`をそのまま透過し、消費者のdrift照合材料にする。

## Decision 6 — `immutable_digest`はplan revision粒度で束縛する

Lattice `todo_status_result.v4`のtask entryにper-task公開digestは存在しない（refuter指摘4）。v30 bindingは次で裁定する:

- `lattice.todo` namespaceの`immutable_digest`は`member_heads`の**`revision_digest`**（plan revision単位で安定。event毎に動く`journal_head_digest`／出力全体の`result_digest`は誤drift検知源になるため禁止）。
- `external_id`は`plan_key/plan_version/task_id`のcanonical合成（例 `factory-master/rev-5878b6b9d54eabb5f3309427/fm-0665`）。
- unreconciled member（`revision_digest`がnull）へのbindingは拒否する。
- plan reviseによるbinding失効の正規回復路は task-cancel-record＋新Taskの再record だけ（bindingの書換コマンドは作らない＝Decision 4を維持）。
- per-task公開digestの不在はfm-0667（Wave 3のLattice契約characterize）への入力事実として引き渡す。

## 実装上の確定事項（refuter指摘から）

- `taskRecord`はmanifest読込前に入力段のclosed key検証を行うため、v30は「入力段では`external_source`をoptional扱い→mutation callback内でmanifest版に応じた存在/不在を強制」の二段構成にする（selector_decision前例と同型）。
- v30はtask shapeが版依存になる最初の版であり、`validateManifest`への版伝搬とdelegation packet payload（schema id `dotagents.delegation-packet.v1`据え置きのままtask形が変わる）まで影響が及ぶ。fixtureは両版のpacket往復を固定する。

## 反証で棄却した設計

- **migration時にadmission_digestを再計算する** — 受入証拠の書換えに等しい。Decision 2の正規化で不要化。
- **キー不在を「pre-v30記録」の意味で恒久許容する** — 版判定がtask個別のreceipt探索になり検証が二重化する。v30では存在必須へ一本化。
- **projectionへretry・cache・fallbackを持たせる** — 失敗の可視性が下がる。呼び出し側（親）が再実行を裁定する。
- **exit code優先のCLI失敗判別** — Latticeはinvalid storeでもenvelope＋exit 1を返すため、`invalid`が`cli_unavailable`へ丸まる（指摘2で棄却）。
- **project_state 5値（missing含む）** — `missing`はLattice CLI契約・実装・履歴のどこにも存在しない幻。plan本文も同時訂正した（指摘3で棄却）。
- **`result_digest`／`journal_head_digest`によるbinding** — 無関係な進捗が全部driftになり、Decision 4と合わさってbound taskが恒久dispatch不能になる（指摘4で棄却）。
