# Observer wire v6 rollout・rollback受入証拠

- Date: 2026-07-25
- Scope: BugHub server-first有効化、4 active host cutover、host別rollback、maintenance wave
- H approval: [2026-07-25-observer-H-approval.md](2026-07-25-observer-H-approval.md)

## Server-first

- ServerManager / BugHubはv6 endpointをfeature flag既定OFFのまま先行配備した。
- `/home/kite/bughub/.env`を
  `.env.pre-v6-20260725T143035Z`へ退避してから
  `FACTORY_V6_INGEST_ENABLED=true`を1行だけ設定し、containerを再生成した。
- v5 endpointを停止せず、v5 13製品reportとv6 14製品reportを同一Macから連続送信した。
- dual-run:
  - v5 `fd107166-62c8-4e38-9a68-bad5eb47fb55`
  - v6 `4584edcf-46a1-41d5-9a10-7325a5ee4864`
  - いずれも `sent=1 / retained=0 / dead_lettered=0 / ack_failed=0`
- v6 current viewはMacで14製品、Observer 0.1.0、
  `installed / compatible / contract_version=6.0`になった。

## 4 active host cutover

各hostを直列に、config backup → scheduler dry-run → v6 apply → scan →
enqueue → flushの順で切り替えた。Windows nativeはWSL shellを使わず、
PowerShell `-EncodedCommand`でnative repo・config・Task Schedulerだけを操作した。

| host | profile | 初回v6 | 最終v6 | Observer |
|---|---|---|---|---|
| mac-kite | mac | `616f8045-91f1-4738-9807-af0759dee703` | `d49ae04b-5d31-4aef-8040-fe25ff55427c` | `installed / compatible / 0.1.0` |
| main-server | server | `4052ca5f-3dd8-4f8e-bc45-253b4ac9b577` | `a594ac1a-2bb3-4338-8335-759d84604a7f` | `not_applicable / unsupported` |
| fox-wsl | wsl | `1a0f87ce-5785-4c4f-be93-940cba25168f` | `74de51f8-3051-4910-9c8b-249f62a353be` | `not_applicable / unsupported` |
| windows-workstation | windows-native | `fca1e2bb-e962-4281-8648-d1e89cc9d7b1` | `dcfc8660-c1e5-4bc5-b2ef-8e2231212694` | `not_applicable / unsupported` |

全hostの最終current viewは14製品で、全送信が
`sent=1 / retained=0 / dead_lettered=0 / ack_failed=0`だった。
Observer historyはMac 3件、他3host各2件を保持している。

## host別rollback実測

backupしたv5 configを復元し、schedulerをv5へ戻し、v5 scan/reportを送信した後、
同じhostをv6へ再cutoverした。

| host | rollback v5 report | 最終scheduler |
|---|---|---|
| mac-kite | `a521f6e3-82e0-4b19-b308-49098a5b67e7` | `factory-reporter-v6-schedule-runner` |
| main-server | `c2070352-f4a5-46c1-9303-349537b34c45` | `factory-reporter-v6-schedule-runner` |
| fox-wsl | `82cb601b-0f1e-4c6d-bf0d-3990a6fe9765` | `factory-reporter-v6-schedule-runner` |
| windows-workstation | `240449cb-86b7-4a44-8e93-677065260ba7` | `factory-reporter-v6-schedule-runner` |

v5へ戻してもObserverのv6 historyは削除されず、再cutover後も同じ
`host + product` viewへ継続した。公開済みObserver releaseにも変更を加えていない。

## Maintenance wave

rollout中に見つけたServerManager所有の非クリティカル欠陥を同じmaintenance waveで修理した。

- deploy dry-runへ`.DS_Store`が混ざる
  - `--exclude '.DS_Store'`とdeploy testを追加
- readinessのfactory ingest有効判定がv5/v6 flagを数えない
  - 全現役wire flagを単一関数で評価し、各flag単独ONのtestを追加
- modern image rollback時に旧`BUGHUB_SOURCE_REVISION`をcomposeへ渡さない
  - 旧image labelをruntime envとactivation probeへ同じ値で復元
  - legacy rollbackは明示空値、通常のcompose操作も空値を明示して警告を除去

ServerManager:

- `5c743bc` — v6 readinessと配備衛生
- `0f12d05` — modern rollbackの旧revision復元
- BugHub test: 98/98 green
- deploy test: green
- final deploy: `0f12d05`、container `running / healthy`、readiness全項目pass

## 結論

server-first、v5/v6 dual-run、4 hostのv6 current view、host別rollback、
再cutover、履歴保持、非対応hostの構造化`unsupported`を実環境で受け入れた。
wire v5は停止・改変しておらず、hostごとのv5復帰経路も残っている。
