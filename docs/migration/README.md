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
