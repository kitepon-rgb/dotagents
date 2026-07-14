# Elastic Orchestrator v1 Throughline handoff evidence

- 実証日: 2026-07-15（rollout時刻はUTC）
- 旧task: `019f601c-4aae-71e1-b98d-e16d674ba8dc`
- 新task: `019f616f-554d-7702-adf3-4ac07e991c3f`
- Control ID: `elastic-v1-dogfood-20260714`

## bounded相関

Throughline DBのread-only `codex-resume --session codex:<thread-id> --format handoff`は、旧taskと
新taskをそれぞれ独立した`codex:<thread-id>` sessionとして返した。旧taskの閉鎖rolloutには
2026-07-14T16:22:29.692Z、line 7946で、新task ID、Control revision 97、runningのsidecar/native
2 Run、旧task停止を記録した最終応答がある。本文SHA-256は
`c71c479670cafeb572752ce60bca8c90692ec6cd58ffdcdcca6e15969ed43289`。

新taskのroot rolloutには2026-07-14T16:22:19.083Z、line 17で`<codex_delegation>`が注入され、
`source_thread_id`は旧task IDと一致する。本文SHA-256は
`e6e0184a3d4c9345d92a03082008ce8a235a7311b42dc61bfead7e549f4cea7a`。注入本文はControl
revision 97、`run-acceptance-sidecar`のidempotency key、`run-acceptance-native`のstanding
agent pathを保持していた。

## 再開後の不変条件

- 最初の`resume-check`でrevision 97の2 Runをrunningのまま確認し、同一Runを再dispatchしなかった。
- sidecarは同じidempotency keyの`codex_work_result`／`codex_work_recover`、nativeは同じ
  `/root/phase2_adapter_lane`から回収した。
- 両案のbase SHAは`9badf115...`で一致した。strict Worker Reportをimport後、親はnativeをaccept、
  sidecarをrejectし、Controlはrevision 102へ進んだ。
- Control Record、provider handle、report本文をThroughlineへ複製していない。Throughlineが所有するのは
  task間のbounded contextと相関IDで、実行状態の正本は`.git/dotagents/orchestrate/`のControlである。

rollout basename、line、timestamp、本文digestを相関値に限定し、端末固有DBやrolloutをリポジトリへ
コピーしない。この証拠は「Controlを復元できた」だけでなく、「Throughlineの旧sessionから新taskへ
注入された同一IDを使って復元した」ことを手動転記と区別する。
