# Factory O4 重複ToDoの所有移管確認

- 日付: 2026-07-21
- 対象: `factory-master` の `fm-0542`, `fm-0546`, `fm-0547`, `fm-0548`, `fm-0549`
- 裁定: 旧マスター側の実装waveを再実装せず、現在の正本である
  `observer-factory-integration` Phase 4へ所有を一本化する。

## 根拠

- `docs/plan_observer-factory-integration.md` 431–438行が、rate-aware schedulerの設計正本を
  ADR 0054、実装ToDoをObserver Phase 4と定めている。
- 同440–470行はquota adapter、selector、reservation、Control schema v27、migration、rollbackの
  実装と受入ADRを記録済みである。
- `of-0463`相当のselector decision束縛はADR 0056で受入済み。
- `of-0471`「実消費と選択結果を週次で評価する」はLatticeでpendingのまま保持されている。
  したがってdogfoodを完了済み扱いせず、現行所有taskだけに残す。
- Delegation Packet／Worker Reportの相関契約は
  `shared/orchestrate/delegation-contract.md` と
  `shared/orchestrate/executor-adapters.md` が正本であり、旧Factory O4 waveを別実装しない。

## task別の終了理由

| task | 終了理由 | 現行所有 |
|---|---|---|
| `fm-0542` | schema束縛は受入済み、dogfoodだけを分離して継続 | `of-0471` |
| `fm-0546` | schema／migration／reader／rollbackはADR 0056で受入済み | Observer Phase 4 |
| `fm-0547` | adapterと失敗境界はADR 0057–0059で受入済み | Observer Phase 4 |
| `fm-0548` | Packet／Report相関は共有orchestrate契約へ正本化済み | 共有orchestrate契約 |
| `fm-0549` | 同一dogfoodを二重管理せず、未完のまま移管 | `of-0471` |

この終了は機能の撤回ではない。旧マスター側の重複完了判定だけを閉じ、未完作業は
`observer-factory-integration`に一件だけ残す。
