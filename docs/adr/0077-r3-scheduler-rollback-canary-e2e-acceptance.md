# ADR 0077: R3 scheduler・rollback・canary・全host E2E受入記録

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `factory-master/fm-0593`
- Inputs: Lattice `bughub-factory-integration/bf-0280`、`bf-0415`、`bf-0423`、`bf-0476`、`bf-0478`〜`bf-0480`、`bf-0482`、`bf-0484`

## Decision

既に分離実証済みのscheduler 4環境、Oracle rollback、BugHub canary、outbox停止復旧、全host v2 E2EをLatticeの完了stateから集約し、2026-07-20時点のread-only healthを再確認した。意図的障害とrollbackを重複実行せず、現在のscheduler登録、最新12製品report、BugHub readinessが維持されているためR3を受け入れる。

## schedulerの現在値

| host | scheduler | latest result | latest v2 report | state |
|---|---|---|---|---|
| Mac `mac-kite` | launchd `com.kite.factory-reporter`、毎時17分 | runs 40、last exit 0 | `df18a8c5-e85c-4ba3-9e67-f4d54c839a23`、2026-07-19T17:17:11.586Z、12製品 | `latest-report.json` / `latest-acks.json`、outboxなし |
| main-server | cron、毎時17分 | entry登録済み | `13dc9a82-c54d-478f-8c5e-1f869445c291`、2026-07-19T17:17:04.098Z、12製品 | `latest-report.json` / `latest-acks.json`、outboxなし |
| FOX WSL2 `fox-wsl` | cron、毎時17分 | entry登録済み | `e62b3b07-4b4d-4249-94ab-053264ef4efe`、2026-07-19T17:17:04.173Z、12製品 | latest / manual receipt、outboxなし |
| FOX Windows native `windows-workstation` | Task Scheduler `dotagents-factory-reporter` | Ready、2026-07-20T02:17:02+09:00、LastTaskResult 0、次回03:17 | `1c941e19-2dc9-4fe2-9ccd-bee606d27af2`、2026-07-19T17:17:09.326Z、12製品 | `latest-report.json` / `latest-acks.json`、outboxなし |

4 hostは同じv2 endpoint `http://192.168.1.2:39310/api/factory/v2/reports`を使い、host idをMac / main-server / WSL / Windows nativeで混同していない。credential内容は表示していない。

## Oracle rollback drill

`bf-0476`で次の順序を実証済みである。

1. v2 schedulerをoutbox 0のままuninstall。
2. configをv1へ戻し、`restore-oracle`後にv1 schedulerを登録。
3. launchd実contextからOracle観測込みv1 full scanを送信受理。
4. `retire-oracle`と`--oracle-retired`最終snapshot（report `75e82296`）を受理。
5. configをv2へ戻し、v1 schedulerを撤去、v2 schedulerを再登録してscheduled runを受理。

Oracle v1履歴8件は保持され、Oracle open issue 0、v2 current missing 0である。rollbackは一時切戻しであり、Oracleを恒久コアへ戻したり暗黙fallbackを追加したりしていない。

## BugHub canaryとoutbox復旧

- `bf-0415` / `bf-0482`: 本番BugHubを事前申告のうえ33秒停止。停止中flushは非0、outbox retained 1、dead-letter 0。復旧後flushはsent 1で、`/readyz`は全check readyへ戻った。
- `bf-0423` / `bf-0484`: 隔離stateでsynthetic transport failure 2回からDiscord alert、BugHub issue open、復旧後success、resolve、ack 2、bridge state消去まで実証。canary fingerprintは本番storeに残していない。
- 2026-07-20 read-only確認: BugHub `/readyz`は`status=ready`。database、schema、pull_poll、factory_ingest、delivery、revision attestationを含む全checkがpassである。

## 全host E2E

- Mac: v1 rollback往復とv2 scheduled reportを受理。
- main-server: token/config opt-in、12製品manual v2受理、cron apply、scheduled runを確認（`bf-0478`）。
- FOX WSL2: preview / enqueue / flush / retry、cron apply・実火・uninstall・state権限を確認（`bf-0479`）。
- FOX Windows native: manual 12製品scan / enqueue / flush、Task Scheduler apply・実火・uninstall・再apply、LastTaskResult 0を確認（`bf-0480`）。

現時点の再確認でも全hostのlatest reportは12製品で、scheduler stateに未送信outboxはない。

## 分離した後続

本受入は、既に意図的canaryを含め完了したR3の集約である。`bf-0497`の全repo full gate・最終反証、`fm-0608`のJ1、Windows hook / MCP / models cache等の`fm-0649`〜`fm-0653`は後続であり、本ADRへ混ぜない。

## 検証

- Latticeの構成task 9件: すべてdone
- 4 host scheduler: 登録維持
- 4 host latest report: schema 2.0、12製品
- BugHub `/readyz`: ready / 全check pass
- state directory: 未送信outboxなし
- `lattice todo verify`: state event反映後に再実行して閉じる
