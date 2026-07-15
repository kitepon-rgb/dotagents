# ADR 0020: Sidecar auditor factory adapter receipt

日付: 2026-07-16

## Status

Accepted corrective receipt。ADR 0019のP1「auditor presetをfactory adapterが名前で検証しない」を閉じる。
ADR 0018のdirect config／caller証拠と本receiptを合わせてlocal integrationを受け入れる。実Codex turn、
4 host rollout、hook trust、factory report送信は受け入れない。

## Source evidence

- implementation commit: `a35e987`
- implementation tree: `dc516b7e595514364dbdebb7533e33fc07625b3d`
- scanner／adapter: `lib/factory/v2.mjs`
- focused fixture: `tests/factory-scan/v2.test.mjs`
- prior config／caller receipt: [ADR 0018](0018-sidecar-auditor-preset-local-receipt.md)
- closure rejection: [ADR 0019](0019-r1-local-closure-refutation.md)

## Accepted contract

- factory v2 scannerは`codex-sidecar factory-diagnostics --project <cwd> --preset auditor`だけを使う。
- Sidecar diagnosticsの`readOnlyDryRun`はexact `{status:"ready", workflow:"auditor"}`を要求する。
- model policyはexact full shape、`status=ready`、`source=explicit`、modelとreasoning effortの双方を
  configuredとして要求し、端末親設定の継承をgreenにしない。
- package、workflow、preset集約、runtime error store、overall／exitの既存fail-closed検証を維持する。
- `auditor`欠落によるnot-ready、reviewへの誤配線、inherited model policyをcompatibleへ丸めない。

## Gate

- `tests/factory-scan/v2.test.mjs`: focused 10 PASS / 0 FAIL / 0 SKIP。
- fixtureはCLI引数`factory-diagnostics --project <cwd> --preset auditor`をexactに要求する。
- review誤配線とinherited model policyのnegative fixtureが`native_diagnostics_schema`へ落ちる。
- 直前のSidecar 0.3.7正規diagnosticsはdotagents configに対して
  `readOnlyDryRun.workflow=auditor`とexplicit model／reasoning policyをreadyで返した。
- `git diff --check` PASS。
- full `make ci`はP1-2収束後のR1 closure gateへ集約し、本TODOでは再実行していない。

## Queue transition

BugHub計画Wave 8 0bのlocal preset／adapter TODOをDONEに戻す。R1のH不要残件は、ADR 0019の
Pi5 bridge/ticker source／fixture receiptへ進む。
