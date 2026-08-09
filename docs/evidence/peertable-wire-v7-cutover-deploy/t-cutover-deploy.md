# t-cutover-deploy 実deploy＋flag有効化＋Mac canary dual-run＋host別段階cutover — 完了証跡

H承認[45]②の残り（part C。t-enroll-cutoverからの分割）。room `peertable-onboarding` [80]-[93]の実行前確認を経て4段階で実施した。

## Step1: server-first deploy（flag OFFのまま）

- `ServerManager/bughub/deploy.sh --apply`実行（commit `0f196d3`）。DB backup→candidate image build→revision label確認→atomic activation gate→readiness probeの順で完走。
- 実測: `/readyz`→`status: ready`・`source_revision: 0f196d31bafb...`一致。`/api/factory/v7/reports`→404（flag未有効化）。`/api/factory/v6/reports`→415（生存確認、404でない）。既存v6運用に影響なし。

## Step2: FACTORY_V7_INGEST_ENABLED=true有効化

- main-server `.env`へ1行追記→`docker compose up -d --force-recreate`（image不変、env反映のみ）。
- 実測: `/readyz`→ready・source_revision不変。`/api/factory/v7/reports`→401（404から生存確認、認証拒否は想定どおり）。`/api/factory/v6/reports`→401（変化なし）。

## Step3: Mac canary dual-run

- `bin/factory-scan-v7.mjs`で実v7 report生成→独立config/state（既存v6本番scheduler・configに一切触れない）で`bin/factory-reporter-v7.mjs` enqueue→flush→server実受理。
- 実測: `/api/factory/v2/matrix`でmac-kite全15製品がcontract_version 7.0で反映。peertable行: `repair_repository: kitepon-rgb/peertable`・`compatibility_status: compatible`・`presence_status: installed`。`/api/issues`でpeertable関連issue 0件（required×installed整合、期待どおり無発生）。

## Step4: mac-kite正式cutover（v6→v7）

- room合意（bell[87]・koharu[88]）: main-server自身のhost分・FOX 2hostは今回やらず「host別段階」でmac-kiteだけ対象にする。
- 手順: configをbackup（`~/.config/dotagents/factory-reporter.json.bak-v6-20260809T210924Z`）→`reporting.endpoint`を`/api/factory/v7/reports`へ書き換え→`bin/factory-reporter-scheduler.mjs install --dry-run --wire-major v7`確認→`--apply`。launchd label`com.kite.factory-reporter`（version非依存の固定label）が`factory-reporter-v7-schedule-runner`を指すよう更新された。
- **罠**: `launchctl kickstart -k`で即時実行したところ`Cannot find module '.../factory-reporter-v7-schedule-runner'`で失敗。原因は`~/.local/bin/`のsymlinkがinstall.sh未再実行のため存在しなかったこと（dotagentsの`bin/*.mjs`は`install.sh`が`~/.local/bin/`へ配布する設計で、repoへ追加しただけでは自動配布されない）。`./install.sh`実行（冪等・SKIPなし全symlink再link）で解消。caveat
  `dotagents-bin-mjs-launchd-cron-install-sh-local-bin-symlink-module-not-found`へ記録、
  `docs/factory-reporter-runbook.md`のwire major migration手順へ注記追加（commit `a80c3d5`）。
  根本原因（scheduler installがrunner bin解決可能性を検証しない）はscope外として
  `lattice todo note`（commit `8ca1b39`）で申し送り済み（bell[92]裁定）。
- 実測: 再kickstart後、production job本体でscan→enqueue→flush→`post_gate_status: success`。
  server側`/api/factory/v2/matrix`のmac-kite/peertable行が本番job送信（`received_at:
  2026-08-09T21:11:04.735Z`）で更新されたことを確認。v6 state dir
  （`~/.local/state/dotagents/factory-reporter-v6/`）は無傷（cutover前の最終更新のまま）
  ——rollback即再開可能。

## rollback手順（記録のみ、実行していない）

1. `cp ~/.config/dotagents/factory-reporter.json.bak-v6-20260809T210924Z ~/.config/dotagents/factory-reporter.json`
2. `node bin/factory-reporter-scheduler.mjs install --apply --platform darwin --wire-major v6 --config ~/.config/dotagents/factory-reporter.json`
3. サーバー側は`.env`から`FACTORY_V7_INGEST_ENABLED=true`を削除して`docker compose up -d --force-recreate`（v6/v5/v4以前のflag・historyは無変更のため即rollback可能）。

## carry over（未実施・明示）

- main-server自身のhost分（server profileとしての自己報告）のv7 cutover。
- FOX WSL2・FOX Windows nativeのv7 cutover（このセッションから到達不能）。

いずれもH承認[45]②の範囲内で追加H確認は不要（bell[87]）。次のwaveで「host別段階」の続きとして進める。

記録者: tsumugi
