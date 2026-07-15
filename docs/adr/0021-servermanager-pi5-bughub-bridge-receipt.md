# ADR 0021: ServerManager Pi5 BugHub bridge source receipt

日付: 2026-07-16

## Status

Accepted corrective receipt。ADR 0019のP1「Pi5 bridge/tickerのversioned source／fixture証拠が
dotagentsから追跡できない」を閉じる。製品実装の欠落ではなくcross-repo受入証拠の欠落だった。
意図的障害、実Discord配送、実BugHub open／resolve、outbox停止復旧は受け入れず、R3のH gateへ残す。

## Source evidence

- owning repository: `/Users/kite/Developer/ServerManager`
- introduction commit: `74c315b6031468c4b285a615706fbd739f1e8b0a`
- suppression／ticker corrective commit: `b3ac6dac360f7201bd759c59321089bdbd9925bd`
- inspected repository HEAD: `2627391597700d5466cddab2589b35f50e9e7f96`
- `b3ac6da..2627391`で下記5 pathに差分なし。
- source paths and SHA-256:
  - `pi5/bughub-bridge.js`: `eb58606c07ebb7feaec7630dd00144f0d83fff21f04ea3d4895f190b5eea1e03`
  - `pi5/monitor.js`: `5e3776f5acc422dd59d19704b6d22d991fa90c643ab149e2de6be48285a238d0`
  - `pi5/__tests__/bughub-bridge.test.js`: `fcb24c349155849e1e967444a61da388ed41960a961b86a17978934bfbe7b27d`
  - `pi5/__tests__/monitor-bughub-bridge.test.js`: `b2fc257cbbf7680a7fa358b8ae32b5e2fe97c3d41449302dc8953c2164d4f068`
  - `pi5/README.md`: `4a07a98dd5ddd7595c6bb746588c37d3501994ac6745e97ba36b65a5a0d087e0`

## Accepted contract

- ServerManagerがPi5のversioned source、monitor ticker、fixture、READMEを所有する。
- `/readyz`の固定6 checkを検証し、未知schema／transport failureは
  `servermanager/availability/unreachable`へfail closedに正規化する。
- `sha256(servermanager:<check>:<reason>)`をfingerprintとし、2回連続failure後だけopenする。
- 60秒tickerとsingle-flightはLayer 1〜5から独立し、bridge失敗で監視やLayer 3復旧を止めない。
- 抑止中は未trigger観測窓だけを破棄し、trigger済みdurable eventを保持する。
- Discordとexternal connectorのACKを独立保持し、open ACK前にresolveせず、resolve ACKとDiscord成功後だけ
  stateを削除する。bridge自身はrestartを行わない。
- stateは0600 atomic writeとし、symlink、tamper、余分fieldを拒否する。
- 公開`run(deps)`と`resetObservationWindow(deps)`により、秘密・本番state・実配送なしで契約をfixture化できる。

## Gate

- `node pi5/__tests__/bughub-bridge.test.js`: focused 12 PASS / 0 FAIL / 0 SKIP。
- `node pi5/__tests__/monitor-bughub-bridge.test.js`: focused 4 PASS / 0 FAIL / 0 SKIP。
- `git diff --check`: PASS。
- ServerManager worktreeは検証前後ともclean、`main...origin/main`は0 ahead / 0 behind、stashは空。
- 本receiptのためにServerManager source、履歴、host設定は変更していない。

## Queue transition

ADR 0019のPi5 P1を閉じ、BugHub計画Wave 7のsource／fixture TODOをDONEにする。残るPi5／outbox作業は
明示承認が必要な意図的canaryと実配送だけなのでR3へ分離する。R1 local closureはdotagents full gateで確定する。
