# ADR 0079: Codex既存証拠による工程回収

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `codex-full-support`
- Inputs: ADR 0072〜0077、`README.md`、`PLAN.md`、`docs/04_ci.md`、`docs/05_codex-fragments.md`、Lattice完了state

## Decision

`codex-full-support`のpending 36件を現在の正本と実証済みreceiptに照らして再監査した。既存証拠だけで文言どおりの受入条件を満たす次の11件を完了へ移す。

| task | 完了根拠 | 完了範囲 |
|---|---|---|
| `cf-0020` | `README.md`の9面裁定、現行plan、関連Lattice完了state | PLUGINSの非採用を含む9面の裁定。全host E2Eは含めない |
| `cf-0022` | official skill面の配布契約、ADR 0072のofficial verify | `$HOME/.agents/skills`からの利用可能性。全skill実呼出しは含めない |
| `cf-0025` | `PLAN.md`、`README.md`、BugHub統合receipt、ADR 0077 | ServerManager管理階層とBugHub再利用の裁定 |
| `cf-0028` | source cutover ledger、`cf-0153`、`cf-0155`、ADR 0074・0075 | 重複ToDoの移管・分離。独立した上流問題は閉じない |
| `cf-0088` | ADR 0075・0076 | 4現役host/entryのaccepted ledger |
| `cf-0127` | `docs/04_ci.md`、clean HOME・所有境界fixtureの完了state | fixtureと所有境界。実host rolloutの代用にはしない |
| `cf-0128` | `README.md`、BugHub統合receipt、関連完了state | updaterの続行・最終非0・CI接続契約 |
| `cf-0151` | `docs/05_codex-fragments.md`、ADR 0076 | optional/unsupported/WARN/H手順の分類。OAuth実施は要求しない |
| `cf-0154` | ADR 0075、Lattice `gpt56-rewiring/gw-0075=blocked` | 上流問題をnon-blocking独立追跡へ分離した事実 |
| `cf-0158` | rollback/backup境界の既存受入記録 | 問題hostだけを戻す手順。実rollbackの再実行はしない |
| `cf-0280` | ADR 0072・0074・0076とオーナー承認 | 今回campaignのhost/config/hook rollout承認。将来の別H操作を包括しない |

## Over-closure guard

同じ監査で、追加read-only smokeが必要な10件、実装またはhost操作が必要な14件、外部block 1件を分離した。特にADR 0075が未完了と明記する`cf-0146`、`cf-0149`、`cf-0150`、`cf-0216`は、部分的なrouting・hook・Spotter証拠から完了へ拡張しない。

`cf-0023`、`cf-0026`、`cf-0092`も全入口条件が残る。`cf-0125`はcapture/handoff成功に対しrestoreが`app-server-restart-mismatch`であり、要求を変更しない限りblocked候補として残す。最終CI、報告、archive、pushを含む`cf-0029`、`cf-0163`〜`cf-0166`も閉じない。

この裁定は、Latticeの各taskを個別に`start`→`done`し、本ADRを共通evidenceとして関連づける。一括処理しても、各ToDoの独立したstate transitionと証拠参照を維持する。
