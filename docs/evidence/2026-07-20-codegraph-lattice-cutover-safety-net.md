# Codegraph完全撤去／Lattice cutover safety net

- 観測日: 2026-07-20（Asia/Tokyo）
- Lattice focused command:
  `node --test test/no-external-codegraph-runtime.test.mjs test/integration/lattice-mcp-bin.integration.mjs`
- baseline result: 7 test中4 pass / 3 fail（期待どおりred）。

固定した欠陥境界:

1. `codegraph_status`に`provider: lattice`と`sensor_owner: lattice`がない。
2. 公開runtime／正規testがPATH上の`codegraph`を起動する。
3. 同梱sensorが`@colbymchenry/codegraph`名とpublic `codegraph` binを持つ。

実装後は同じfocused commandをgreenにし、外部Codegraph不在のisolated PATHでもsensor fixtureを通す。
