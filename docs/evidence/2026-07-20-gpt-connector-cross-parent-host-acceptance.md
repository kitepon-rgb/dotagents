# gpt-connector cross-parent / host acceptance

- 対象: `gpt_connector` MCPのClaude／Codex再読込、4 host rollout、Oracle rollback
- 製品公開版: `gpt-connector 0.4.7`
- 4 host rollout: [ADR 0072](../adr/0072-r2-four-host-rollout-receipt.md)
- rollback / canary: [ADR 0077](../adr/0077-r3-scheduler-rollback-canary-e2e-acceptance.md)

## 現行Macの製品診断

- CLI: `/opt/homebrew/bin/gpt-connector`
- `gpt-connector --version`: `0.4.7`
- native `factory-diagnostics`: schema `gpt-connector.factory-diagnostics.v1`、overall `ready`
- CDP、official origin、auth、runtime bridge、MCP contractはすべて`ready`

## 新規親sessionのread-only実測

| 親 | 新規session入口 | package | result |
|---|---|---:|---|
| Codex | native Codex子セッション | 0.4.7 | `gpt-connector.diagnostics.v1`、ready、official、authenticated、active job 0 |
| Claude | host user settingsを読む`claude -p`新規session | 0.4.7 | `gpt-connector.diagnostics.v1`、ready、official、authenticated、active job 0 |

Claude CLIは許可toolを`mcp__gpt_connector__diagnostics`だけに限定し、Codex子も同じ
read-only diagnosticsだけを1回実行した。Chat送信、添付、login変更、Oracle利用、repo変更はない。

aiterm managed Claudeはisolated settingsのためhost MCPを持たず、tool unavailableだった。
これは[ADR 0076](../adr/0076-r2-host-state-classification-ledger.md)の既知境界どおりであり、
host Claudeの受入には用いていない。実hostの`claude mcp list`では
`gpt_connector: gpt-connector-mcp`がConnectedである。

## 4 hostとrollback

- ADR 0072はMac、main-server、FOX WSL2、FOX Windows nativeで`gpt_connector` enabledを受け入れた。
- ADR 0077は4 hostの固定12製品v2 report、Oracle v1への一時切戻し、Oracle最終
  `not_applicable`、v2復帰、履歴保持、暗黙fallbackなしを実証した。
- 全hostのlatest v2 reportは受理済みで、BugHub readiness green、未送信outboxなしだった。

## 判定

両親の新規sessionは正規`gpt_connector` MCPを公開版0.4.7からread-only利用できる。
4 host rolloutとOracle rollbackも既存の受入証拠で閉じており、親別再読込工程と
全host導入・MCP切替・rollback工程の受入条件を満たす。
