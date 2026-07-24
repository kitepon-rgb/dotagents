# Factory master R3/J1 重複ToDoの所有移管

- 日付: 2026-07-21
- 対象: `fm-0594`, `fm-0595`, `fm-0604`, `fm-0605`, `fm-0607`, `fm-0608`
- 結論: master側の重複完了判定を終了し、子計画のtaskだけを実行正本として残す。

## 対応

| master task | 現行所有task |
|---|---|
| `fm-0594` | Callout/GPT-5.6はarchive済み。Codex残件は`codex-full-support`、統合確認は`of-0477` |
| `fm-0595` | `of-0477` |
| `fm-0604` | `observer-factory-integration` Phase 5/6 |
| `fm-0605` | `of-0478`〜`of-0482` |
| `fm-0607` | `of-0483` |
| `fm-0608` | `of-0545`, `of-0546` |

子taskはLattice上でpendingまたはblockedのまま保持する。したがって、この終了はwire v3、Observer受入、
全host gate、archiveが完了したという主張ではない。masterとchildの二重追跡を止め、実作業と証拠の
所有先を一意にするためのdispositionである。
