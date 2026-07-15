# ADR 0018: Sidecar auditor presetローカルreceipt

日付: 2026-07-16

## Status

Accepted local integration receipt。dotagentsの`auditor` preset、Spotter caller、Codex Sidecar v0.3.7の
設定解釈、factory v2 adapterのローカル契約だけを受け入れる。実Codex turn、hook trust、4 host rollout、
factory report送信は本receiptから推測しない。

## Source evidence

- dotagents preset commit: `1497ef8`
- preset commit tree: `cc7fc9d9e9b08201a87da5008100bb59458d45fa`
- current config: `.codex-sidecar.yml`
- current config git blob: `8c7999994e1fbdd614d67b1253d9e9a7c293382f`
- current config SHA-256: `ad8e7790fee7960aa34ba6713eb36c60c4d922a0fd03e1ba366b15c36e70824a`
- Spotter caller: `/Users/kite/Developer/Spotter/src/core/codex-sidecar-auditor-backend.mjs`
- Codex Sidecar public CLI: `codex-sidecar 0.3.7`

## Accepted contract

- dotagentsは`presets.auditor.workflow=auditor`かつ`readonly=true`を明示する。
- Spotter callerは`codex-sidecar auditor --project <repo> --preset auditor --json --context-file <file>`を使い、
  `pass`／`missingTools`の構造化結果を要求する。
- dotagentsのdefault model policyは`gpt-5.6-terra`／`medium`を明示し、端末親設定の継承を遮断する。
- factory v2 adapterはSidecar diagnosticsのexact schema、3 package version一致、workflow／preset集約、
  model policy、read-only dry-run、runtime error storeをfail-closedに検証する。

## Gate

- Spotter側caller／schema focusedはADR 0016の131 PASSに含まれる。
- 隔離`XDG_STATE_HOME`と不存在reporter configでSidecar 0.3.7正規`factory-diagnostics`を実行し、
  overall、3 package、auditor workflow、preset集約、explicit model policy、
  `readOnlyDryRun.workflow=auditor`、runtime error storeがすべてreadyだった。
- dotagents `tests/factory-scan/v2.test.mjs`: 10 PASS / 0 FAIL / 0 SKIP。
- `git diff --check` PASS。
- 実Codex turn、credential/login、hook trust、host apply、report送信、push、publishは未実行。

## Queue transition

BugHub計画Wave 8 0bのlocal preset／adapter項目をDONEにする。4 hostのinstall、doctor、実Codex auditor、
Sidecar diagnostics、factory reportは一回のR2 host campaignへ残す。
