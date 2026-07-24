# 非コアmemory promotion queueの終了裁定

- 日付: 2026-07-21
- 対象: `mq-0017`, `mq-0018`, `mq-0019`, `mq-0039`
- 結論: dotagentsのactive factory queueから終了する。

## 確認結果

- taskが参照する次の端末memory原本は、現在のdotagents worktreeに存在しない。
  - `memory/reference_bellbot_image_npmci_cache_sticky.md`
  - `memory/reference_codex_tokenusage_total_vs_last.md`
  - `memory/project_config_templates_drift_from_deployed.md`
  - `memory/project_ms2_bridge_deploy_topology.md`
- `/Users/kite/Developer`にはbellbot／openclaw／stock-mcpの対象repoが存在しない。
- task本文はLattice source inventoryとarchive ledgerに保持されており、終了しても履歴は消えない。
- 4件はいずれもdotagentsまたは工場コア製品の実装・adapter・互換契約を変更する作業ではない。

対象repo、現行実装、出典原本を確認できない状態でtask本文だけをREADMEへ転記すると、古い運用を
正典化する危険がある。よって推測実装は行わず、dotagentsのactive queueから除外する。

`mq-0047`は工場コアのaiterm-mcpと実機rtk fixtureに関する検証なので、この裁定には含めない。
