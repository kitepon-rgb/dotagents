# peertable-wire-v7-cutover-deploy 終端監査 決定証跡

## 対象

plan `peertable-wire-v7-cutover-deploy`（t-cutover-deploy 1task done）のterminal-audit phase gate。
実装者tsumugi以外の独立席として、自分の環境から実際にmain-serverへ到達し再実測した。

## 実測

- `curl http://192.168.1.2:39310/readyz` → `status: ready`、`source_revision:
  0f196d31bafb1c253b8acb383f7bb8289da9211b`（ServerManager commit `0f196d3`と一致）、
  6 check（database/schema/pull_poll/factory_ingest/factory_delivery/source_revision）全`pass`、
  `factory_ingest`の`observed_at: 2026-08-09T21:11:04.735Z`はt-cutover-deploy証跡記載の
  mac-kite本番job送信時刻と一致。
- `curl http://192.168.1.2:39310/api/factory/v2/matrix` → mac-kite/peertable行が
  `contract_version: 7.0`・`compatibility_status: compatible`・`presence_status: installed`
  （証跡記載どおり）。
- `curl http://192.168.1.2:39310/api/issues` → peertable関連issue 0件（実測、証跡記載と一致）。
- 手順・rollback手順（config backup→v6 endpointへ戻す→scheduler `--wire-major v6`再install。
  server側は`.env`から`FACTORY_V7_INGEST_ENABLED=true`削除）は記載どおりで、v6 state/outboxへの
  非破壊性（backup経由・DBやhistory非削除）も各stepの実測ログと整合。
- 罠の記録（install.sh再実行漏れ・scheduler installのfail-open）は
  `docs/factory-reporter-runbook.md`（commit `a80c3d5`）・`lattice todo note`（commit `8ca1b39`）・
  `docs/plan_factory-master.md`maintenance queue（commit `3cd1b67`）の3箇所へ適切に配置されている
  ことを確認（重複はあるが害はない）。

## 結論

欠陥なし。carry over（main-server自身のhost分・FOX 2host）はH承認[45]②の範囲内で
明示未実施として記録されており、受入条件（server-first deploy・flag有効化・Mac canary
dual-run・mac-kite正式cutover）を満たす。

記録者: koharu
