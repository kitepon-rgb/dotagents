# Observerの反復運用規則をproject ToDoから終了

- 日付: 2026-07-21
- 対象: `of-0471`, `of-0489`, `of-0490`, `of-0491`, `of-0492`, `of-0543`, `of-0544`
- 結論: 一回限りのproject ToDoとして終了し、現行の運用正典を所有先とする。

## 理由

- `shared/orchestrate/contract.md`はrole分離、適格候補内の配置、架空quota／暗黙fallback禁止を規定する。
- `shared/orchestrate/delegation-contract.md`はTask、Packet、Worker Report、同一handle回収、親受入を規定する。
- `shared/orchestrate/executor-adapters.md`はadapter identityとstrict report相関を機械契約化している。
- 工場欠陥のPhase処理はproject `AGENTS.md`の恒久裁定であり、委譲ごとの未完ToDoではない。

`of-0471`の週次dogfoodは、適格な一般Worker実需がある時だけ実測可能である。現在の作業で架空quota、
合成消費、不要な委譲を作って達成しない。実需時のselector decisionと消費記録は通常のControl receiptへ残す。

これらを閉じても規則は撤回されない。反復運用を「いつまでも未完のproject task」として二重管理する状態だけを終える。
