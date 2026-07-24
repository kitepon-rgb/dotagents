# Lattice ToDo archive
Plan: aishell-factory-integration
Batch: wire-v5-pm-cutover
Revision: b88d458c1b2df2e7e95d47f46eea1dfca570927831794edd072225f414c0db22

- [ ] Lattice `phaseV3CarrySemantics`を修理する。phaseを持たない先行planを`carry`した時に`phase_id: undefined`を作って素の`TypeError`で落ちる。characterization testを先に置き、typed `REVISION_INVALID`で拒否するか正しくcarryするかを裁定する
- [ ] Lattice `docs/todo-extraction-v1.md`の新規plan authoring入口を実装どおりに直す。既存storeはextraction→`todo migrate`、`plan create`は空store専用であることを明記する
- [ ] Lattice repoへpublish祖先gate（`verify-release-commit.mjs`＋`prepublishOnly`）を導入する。既存裁定「gate未実装の製品は次にそのrepoでrelease作業を行うwaveで同時に導入する」の適用であり、reference実装はAIShell
- [ ] 【H】Lattice repoのfocused / related gateを通し、version bump→publish→global install→公開後smoke→公開証跡記録までを同一waveで閉じる
