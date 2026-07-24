# composable-orchestration-v1 完了証拠（受入matrix・gate実績・知識還流）

## 受入matrix（Task別）

| Task | 実施 | 受入 | finalization |
|---|---|---|---|
| wave0-invariant-decisions | レーン直交・正本境界・single dispatch ownerの不変Decision | 親（ADR 0113） | task-finalize済み |
| wave0-consumer-drift-repair | Lattice consumer drift修復・typed discovery・fail-visible化 | 親（diff実読＋focused test） | task-finalize済み |
| wave0-lattice-run-store-diagnosis | INVALID_RUN_STORE診断・退役・罠DB記録 | 親（run list復旧を実測） | task-finalize済み |
| wave1-typed-lane-admission | fm-0663: lane admission v29・公開契約v2・migration単調化 | 親（ADR 0114・全数実測） | task-finalize済み |

（fm-0664 固定Recipe契約は wave1 タスクの受入範囲内で ADR 0115 として finalize 済み）

## regression / gate 実績（Wave 1 完了時点）

- `make lint` green
- orchestrate 関連 focused/related test: 195 pass / 0 fail
- `tests/hooks` install smoke OK・配布 symlink 追従確認済み
- 既存 v25〜v28 Control 全件（当時23件）の読取互換を全数実測

## 知識還流

- docs/evidence/2026-07-24-wave1-discovery-and-refutation.md（discovery と反証17件の記録）
- caveat DB: printf|grep -q SIGPIPE/pipefail の一般罠（public）、run store キードリフト退役手順、evidence 記録手順の罠
- ADR 0113/0114/0115 正典化・shared/orchestrate/recipes.md 新設・CI conformance gate 追加

## 残欠陥（後継 v2 へ移管）

- v1 init の budget null 上限により Worker Run 追加不能（ADR 0117 が正規回復路を裁定）
