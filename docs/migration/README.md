# Lattice migration artifacts

このディレクトリのJSONは、Markdown TODOをLattice storeへ初回登録またはsuccessor revisionするための
入力artifactである。実行後の進捗正本は`.lattice/todo/`であり、Markdown checkboxへ戻さない。

## 2026-07-19 wire v4 cutover

6子計画のartifactはsource commit
`53572f7c1f2872462c5facfeaade95c331875cbc`のGit blobへ固定した。コードフェンス外のGFM checkboxを
全数抽出し、次の規則で校正した。

- checked → `register_done` / `historical_import`
- unchecked → `register_pending`
- title、source line、heading path、Markdown親子はinventoryのexact値を使用
- laneはPhase、Wave、Lattice lane、queueの正規headingから機械的に決定
- 6子計画は詳細受入台帳であり、工場の実行順は`factory-master`が所有する。このため、Markdownに
  machine-reliableな明示edgeがない子計画へhard dependencyを推測追加しない
- `unknown_requires_evidence`を残したartifactはmigrateしない

各artifactの`extraction_digest`、件数、公開CLIによる受入結果は
[`2026-07-19-lattice-child-plan-calibration.md`](../evidence/2026-07-19-lattice-child-plan-calibration.md)を正とする。

cutover完了後は、アーカイブしたreconciliation plan自身の52 checkboxesもsource commit
`56b342954cfa267abb0222e97efb17b0167eb229`へ固定し、
[`lattice-todo-reconciliation.json`](lattice-todo-reconciliation.json)でhistorical doneとして登録した。
source順を51 hard dependenciesで保持し、
[`revisions/lattice-todo-reconciliation.json`](revisions/lattice-todo-reconciliation.json)で
`lattice.todo_plan.v3` successorへ校正している。最終件数とdigestは
[`2026-07-19-lattice-wire-v4-cutover.md`](../evidence/2026-07-19-lattice-wire-v4-cutover.md)を正とする。
