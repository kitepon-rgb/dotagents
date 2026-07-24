# Lattice run運用面cutover evidence

- Date: 2026-07-20
- Lattice: `@quolu/lattice@0.8.0`
- Lattice implementation commit: `1f79182265640bf9dc1a58a4ac9f3426fb99cc10`
- npm shasum: `e44d53068a19420923dbb6df53d4ae2dd2c78ae2`

## dotagents integration

- `.lattice/runs/`をproject-local runtime stateとしてgitignoreへ追加
- Orchestrate SessionStart advisoryがglobal Latticeの`run list --json`をbounded・exact schemaで検証し、active run idだけを表示
- provider、repo内の偽CLI、親`PATH`／`NODE_OPTIONS`／`PYTHONPATH`を実行経路へ混ぜない既存境界を維持
- WIPはproject別で増枠せず、同じオーナー依頼を扱うactive thread全体で「本筋1＋緊急割込み1」と明文化

## Verification

- hook smoke: all pass（active Lattice run表示、empty、failure、timeout、flood、cache symlinkを含む）
- `make lint`: exit 0
- `make ci`: exit 0
- 実repo smoke: `lattice-run-ops-smoke-20260720`を開始し、advisory表示、resume、明示abandon、event verifyを確認
- final `lattice run list --json`: `active_runs: []`

Lattice storeの別作業中変更と`docs/evidence/fixtures/`は本waveへ含めていない。
