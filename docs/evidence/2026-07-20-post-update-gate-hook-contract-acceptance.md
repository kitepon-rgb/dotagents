# 更新後gateのCodex hook契約追従

- 対象: 更新後contract gateと定期read-only gate
- 実施日: 2026-07-20
- 関連する全host受入: [ADR 0072](../adr/0072-r2-four-host-rollout-receipt.md)、
  [ADR 0074](../adr/0074-codex-hook-cross-host-acceptance.md)、
  [ADR 0077](../adr/0077-r3-scheduler-rollback-canary-e2e-acceptance.md)

## 原因

Macの正規Codex hookは`apply-codex-config`と`verify-install`が要求する
`/usr/bin/env python3 .../codex-callout-hook <event>`形式だった。一方、factory v2 scannerだけが
旧script直呼び形式を期待していたため、実設定が正しいのに`required_hooks_missing`へ誤投影した。

ADR 0074でFOX WSL2を含む4 hostの正規hookと実発火は受入済みであり、今回の失敗原因は
WSLの安全blockではなかった。Throughlineもgateの許容済み診断状態で、blocking failureではない。

## 修正

- Unixは`/usr/bin/env python3`、Windowsは絶対pathの`python*.exe`とPowerShell call operatorを
  含む正規commandだけを受理する。
- hook path、subcommand、timeout、同期実行、status field、単独entryを引き続き厳密検証する。
- 旧script直呼び、matcher付き、重複entryはgreenへ通さない。

## 検証

- `make lint`: green
- `node --test tests/factory-scan/*.test.mjs tests/factory-reporter-v2/*.test.mjs`:
  95 pass / 0 fail
- `node --test tests/factory-scan/v2.test.mjs`: 12 pass / 0 fail
- `agents-update`: `update=success report=success`、exit 0
- post-update report: `284b2362-5e48-4bee-b8b5-2a9173283540`、gate `success`
- final report: `fa803d6d-8f8b-4ead-a6fd-133d7957ee48`、BugHub送信1件成功、
  retained / dead-letter / ack failure / outboxはいずれも0
- final reportのCodex `config_parser`、`native_routing`、`required_hooks`、`last_update`はすべてpass
- Claude Code 2.1.215、Codex CLI 0.144.6、Grok Build 0.2.106は導入版とlatestが一致し、
  各`last_update`もpass

## 判定

正規hookを誤って欠落扱いしたadapter driftは解消した。更新後gateは失敗時に製品・host・
検査項目をローカルreportへ保持し、修正後は同じ正規経路でgreenとなってBugHubへ受理された。
既存の4 host定期gate・rollback・canary証拠と合わせ、当該受入条件を満たす。
