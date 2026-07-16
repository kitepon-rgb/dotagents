# ADR 0053: 取消済みTaskのplanned Consultationを閉鎖要求から除外する

- Status: Accepted
- Date: 2026-07-17
- Parent canon: `docs/plan_factory-master.md`
- 記録元: [ADR 0051](0051-o3-phase-audit-record.md) Phase 3 maintenance queue（O3 Phase監査で発見）
- 種別: maintenance wave裁定＋受入（契約semantics変更のため不変ADRで固定。per-defect Control Task
  は作らない——Phase maintenance規約どおり）

## Context

Consultationには`planned -> dispatched`以外のplanned脱出遷移が無く、`task-cancel-record`後の
planned Consultationはdispatchが`TASK_CANCELLED`で恒久拒否される。その結果、
①Control finalization準備（全Consultation終端要求）②closing receipt容量予約（planned=+2）
③campaign all-terminal判定の3箇所が恒久ブロックされ、Controlがfinalize・archive不能になる。
v25からの既存契約欠陥であり、既存testはこの据置きを正常系として固定していた。

## Decision

- **stateを書き換えない**。取消済みTaskのplanned Consultation（孤児）は`planned`のまま保持し、
  監査可能性を保つ。偽`dispatched`→`failed`での終端（非偽装原則違反）は経路として認めない。
- 上記3箇所だけで孤児を**閉鎖要求から除外**する（`orphanedPlannedConsultation`）。
  `dispatched | running | unknown`のConsultationは取消後も従来どおりterminal回収を必須とする。
- 除外は読み手のsemanticsであり、manifest shapeは両version（v25/v26）で不変。旧manifestは
  そのまま有効で、migrationは発生しない。
- **v27で明示の`cancelled` state（planned→cancelled、親Decision証拠付き）を導入し、本除外を
  廃止する**。state enumの追加はschema version bumpを要するため（ADR 0045 §2の規律）、
  v27設計（O4）へ束ねる。

## Gate（実測）

- focused fixture: 孤児あり（campaign member含む）のControlがcampaign all-terminal→release→
  phase complete→**容量上限ちょうど（253+finalize+archive=256）でfinalize・archive成功**、
  孤児stateは`planned`のまま、dispatch拒否（`TASK_CANCELLED`）維持。未取消Taskのplanned
  Consultationは従来どおり`FINALIZATION_NOT_READY`でブロック。
- orchestration full: **138/138・fail 0・skip 0**。`make lint-js` green。`git diff --check` clean。

## 非目標

- consultationの`cancelled` state導入（v27・O4設計ADRで裁定）。
- worker laneの変更（planned→cancelled経路は既存）。
