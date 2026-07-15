# Cancelled Task finalization契約の修復記録

日付: 2026-07-15

Status: Accepted / Immutable evidence

## Reproduction

Observer Control `observer-independent-foundation-20260714`で`task-cancel-record`を正規実行後、revision 60の
`control-finalize`が`FINALIZATION_NOT_READY`を返した。`taskFinalizeRecord`はcancelled Taskを
`INVALID_TRANSITION`で拒否する一方、`assertControlReadyForFinalization`は全Taskへfinalizationを要求していた。
したがってTaskを一件でもcancelしたControlは閉鎖不能だった。

## Decision

- Control閉鎖上のTask terminal条件を`task_finalizationまたはtask_cancellation`にする。
- 同じ集合を`status --brief`のunresolved Taskと、閉鎖用receipt容量予約へ共用する。
- cancelled Taskへの`task-finalize`拒否、cancel Decision証拠、cancelled依存をreadyへしない規則は維持する。
- manifest schemaは変更しない。既存v25 manifestの意味矛盾を修正する互換的なlifecycle訂正とする。

## Evidence

- 変更: `lib/orchestrate/control-record.mjs`
- 契約: `shared/orchestrate/control-record.md`
- 回帰: `tests/orchestrate/control-record.test.mjs`
- 正本TODO: `docs/plan_observer-factory-integration.md`
- focused gate:
  `node --test --test-name-pattern='Task.cancel|control.finalization' tests/orchestrate/control-record.test.mjs`
  — 5/5 PASS
- whitespace gate: 対象差分の`git diff --check` PASS

追加fixtureはcancelled Taskをbriefのunresolvedから除外し、phase gate完了後、receiptをrevision 253まで
詰めたControlがfinalize revision 254、archive revision 255へ進めることを確認する。初期receiptを含む
総数256件の上限内で、不可能なTask finalization枠を予約しない境界も同時に固定した。

## Friction check

manual normalization、reconstructed evidence、alternate recoveryは使用していない。Observer manifestの直接編集や
成功への読み替えも行っていない。
