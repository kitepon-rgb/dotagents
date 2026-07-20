# Codegraph完全撤去／Lattice cutover baseline

- 観測日: 2026-07-20（Asia/Tokyo）
- Control: `codegraph-lattice-cutover-20260720`
- dotagents HEAD / origin/main: `4e6717e369102fe65632a8a2c23a7615c39abb89` / 同一
- Lattice HEAD / origin/main: `7579fc32fea650b0abdda06da3a45622e8bb87ad` / 同一
- dotagents Lattice state: `ready`。直前工程 `bf-0043` はオーナー割込み理由付きで `blocked`。
- Lattice repo Lattice state: `uninitialized`、active runなし。
- dirty境界: dotagentsには直前工程の `.lattice/todo` 3ファイルと未追跡fixture 2件が存在。Lattice repoはclean。

## Baseline gate

- dotagents: `make lint` exit 0。
- Lattice: `npm run ci` exit 0。
  - Lattice本体test green。
  - sensor test: 2488 passed / 37 skipped。
  - syntax check green。

このbaseline以後、旧工程のdirty変更を破棄・上書き・成果commitへ混入させない。
