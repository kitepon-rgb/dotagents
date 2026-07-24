# Lattice ToDo archive
Plan: aishell-factory-integration
Batch: wire-v5-pm2-cutover
Revision: 819024310bb8a2eeb9028a17b1b24078b65baf47b6a0bbffdf35ef705441a00d

- [ ] 退役済みCodegraphのexpectation issueが4 host（mac-kite / main-server / fox-wsl / windows-workstation）で開いたまま残るのを解消する。`state`は`recurred`／`ongoing`、最終更新は2026-07-20のCodegraph退役日。v4／v5のproduct setに`codegraph`は無いため以後どのreportでも評価されず、自動では永久に解決しない。退役時に既存expectation issueを明示resolveする経路を入れるか、既存issueを一度だけ解決する管理コマンドを用意する
- [ ] `contract_version`の意味を製品間で揃える。main-serverの`servermanager`だけ`1.0`を返し、他製品はwire contract版（`5.0`）を返す。`serverManagerNative`が製品自身の契約版を返すためで、v4時点でも同じ値だったv5非回帰の既存不整合。wire contract版を返すか、製品固有版は`state_schema_version`へ寄せるかを裁定して統一する
