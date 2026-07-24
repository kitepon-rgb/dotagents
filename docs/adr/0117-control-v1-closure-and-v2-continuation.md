# ADR 0117: composable-orchestration-v1の完了と後継v2への継続

- Status: accepted
- Date: 2026-07-24
- 対象: Control `composable-orchestration-v1` の finalize／archive と、後継 `composable-orchestration-v2` の init

## 事実

- v1 は Wave 0（fm-0660/0661/0662）と Wave 1（fm-0663/0664）の実体作業を完了し、4 Task 全てが不変ADR（0113/0114/0115）で task-finalize 済み。Worker Run・Consultation・Campaign は未使用、未回収ゼロ。
- v1 の init は Budget Envelope の `max_wall_time_seconds` と `max_cost_microusd` を `null=unknown` で宣言した。Budget 契約は「Control上限が unknown のまま Run/Consultation を追加する mutation は `BUDGET_UNKNOWN` で拒否」と定めるため、**v1 には Worker Run を1件も追加できない**。Wave 1 は全作業が親直轄だったため顕在化せず、Wave 2 の最初の委譲配置（fm-0666）で顕在化した。

## Decision

1. **budget を書き換える闇経路を作らない**。Budget Envelope は init 宣言の不変部であり、amendment mutation の追加は「null を無制限へ丸めない」設計の弱化になるため棄却する。
2. **正規回復路は Control continuation**。契約どおり「archive 済み Control だけを predecessor に後継 init 可」に従い、(a) Wave 2 の未着手 Task 2件（wave2-external-source-binding / wave2-lattice-readonly-projection）を v1 から cancel、(b) v1 の phase gate を Wave 1 の実績 evidence で complete まで進めて finalize、(c) archive、(d) `composable-orchestration-v2` を `predecessor_control_id=composable-orchestration-v1`・既知 budget 上限で init し、Wave 2 Task を再 record する。
3. v1 の完了範囲は Wave 0〜1 だけであり、Wave 2 以降の受入は v2 が所有する。cancel は成果の否定ではなく後継への移管である。
4. **lane admission（v2 init 宣言）**: planned_interruption=true（波間停止・H 承認待ちが計画に組込済み）／chained_acceptance=true（子受入→Phase 受入→campaign 受入の多段連鎖）／multi_repo_write_coordination=false（着手時点で確定しているのは dotagents 単独。Wave 3 の Lattice 製品拡張は「不足時だけ」の条件付きで未確定）／decision_evidence_required=true（本 ADR 群が証跡）。
5. 再発防止: Control init 時の budget は、委譲を予定する Control では wall time / cost 上限を既知値で宣言する。この罠は caveat DB へも記録する。

## 受入条件

- v1 が finalized→archived、v2 が active・predecessor 連結・既知 budget で成立している。
- v2 上で Wave 2 Task の placement dry-run が budget-unknown を返さない。
