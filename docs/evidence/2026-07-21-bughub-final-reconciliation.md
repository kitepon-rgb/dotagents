# BugHub factory integration 最終再照合

- 日付: 2026-07-21
- 対象: `bf-0043`, `bf-0399`, `bf-0401`, `bf-0403`, `bf-0447`, `bf-0497`
- 結論: 現行証拠で満たされたblockと、現行契約に反する旧過剰条件を分離して終了する。

## 現行証拠で満たされた項目

- Codegraph完全撤去とLattice cutover: `docs/evidence/2026-07-20-codegraph-lattice-cutover-acceptance.md`
- gpt-connectorの公開版、cross-parent、4-host、rollback: `docs/evidence/2026-07-20-gpt-connector-cross-parent-host-acceptance.md`
- FOX WSL2の廃止済みcodex-rc hook撤去: `docs/adr/0089-fox-wsl2-codex-rc-hook-retirement-acceptance.md`
- 4-host core E2Eと再現可能rollout: `docs/adr/0095-cf0024-four-host-core-e2e-acceptance.md`,
  `docs/adr/0097-cf0026-four-host-reproducible-rollout-acceptance.md`
- dotagents final report／同期証拠: `docs/evidence/2026-07-21-cf0164-final-report.md`
- 2026-07-21の`make ci`: exit 0。Lattice live source 5件、checkbox 0件を含む全gate green。

これにより`bf-0043`, `bf-0403`, `bf-0447`, `bf-0497`の古いblock理由は解消済みと判断する。

## 旧過剰条件の終了

`bf-0399`が要求する全host×添付有無×全effort×timeout×auth loss×process restartの総当たりは、
変更に直結するfocused testとPhaseごとのfull gate一回という現行規範に反する。auth lossや全host外部送信は
H操作でもあり、coverageのために意図的障害を増やさない。既存の代表fixture、4-host canary、rollback、
privacy negativeを受入境界とする。

`bf-0401`のOracle package／MCP／skill撤去は、Oracleをv1互換・rollback専用として保持する現行契約に反する。
Oracleを通常fallbackには使わず、履歴とrollback入口を保持する。削除作業は実行しない。

この再照合は未検証をgreenへ丸めるものではない。現行正典と既存receiptが満たす項目だけを閉じ、
古い過剰条件による再試験・権限操作・rollback手段の破壊を防ぐ。
