# ADR 0014: Windows factory ACLローカル修正receipt

日付: 2026-07-16

## Status

Accepted local receipt。toolchain ledger、v2 schedule runner、Task Scheduler control artifactの
ACL実装修正とfixtureだけを受け入れる。FOX Windows native実機での適用・送信成功は未受入のまま残す。

## Source evidence

- implementation commit: `39fba73`
- implementation tree: `bb15c4d29dd5d22dc9b753c36db1881eef516d25`
- owned entries: `bin/factory-toolchain-ledger.mjs`、`bin/factory-reporter-v2-schedule-runner.mjs`、
  `bin/factory-reporter-scheduler.mjs`
- characterization: `tests/update/toolchain-ledger.test.mjs`、`tests/factory-reporter/scheduler.test.mjs`

## Accepted contract

- 3入口ともcurrent SIDだけへFullControlを付与し、継承を遮断する。
- pathは環境変数で明示注入し、`Set-Acl -LiteralPath`だけを使う。旧
  `[IO.Directory]::SetAccessControl`／`[IO.File]::SetAccessControl`へfallbackしない。
- PowerShell timeout／process failure／apply failureを固定reasonでfail loudにし、生stderrや絶対pathを
  公開結果へ混ぜない。
- ledgerはACL済みtemporaryをrenameし、rename後の重複ACL再適用で「更新済みなのに非0」となる窓を作らない。

## Gate

- focused 31 PASS / 0 FAIL / 0 SKIP。
- `git diff --check` PASS。
- Windows実機、scheduler apply、scan／enqueue／flush、credential、network、pushは未実行。

## Queue transition

BugHub計画1pをローカル修正とFOX Windows実機receiptへ分割する。前者だけDONE、後者はH/R2へ残す。
