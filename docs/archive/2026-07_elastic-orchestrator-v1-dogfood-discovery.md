# Elastic Orchestrator v1 dogfood discovery snapshot

- Control ID: `elastic-v1-dogfood-20260714`
- Source revision after discovery import: `76`
- Recorded: 2026-07-14
- Scope: Phase 7 read-only fan-outのimmutable input snapshot。最終裁定・knowledge returnは別文書が所有する。

## Run result index

| Run | Executor | lineage / focus | terminal | parent report verdict |
|---|---|---|---|---|
| `run-native-core-a` | Codex native | core state machine | completed | accepted |
| `run-native-docs-a` | Codex native | shared contract | completed | accepted |
| `run-native-refute-a` | Codex native | acceptance refutation | completed | accepted |
| `run-native-tests-b` | Codex native | integration tests | completed | accepted |
| `run-native-install-b` | Codex native | installer / hooks | completed | accepted |
| `run-native-finalize-b` | Codex native | finalization refutation | completed | accepted |
| `run-sidecar-explore` | codex-sidecar explore | registry / resume | completed | accepted |
| `run-sidecar-review` | codex-sidecar review | Phase 1–6 | completed | accepted |
| `run-sidecar-risk` | codex-sidecar risk-check | hook / state risk | completed | accepted |
| `run-aiterm-codex` | aiterm Codex | CLI lifecycle | completed | accepted |
| `run-aiterm-grok` | aiterm Grok | schema boundary | failed | login required; H操作をせずsession終了 |
| `run-aiterm-composer` | aiterm Composer | operator usability | failed | login required; H操作をせずsession終了 |

全completed RunはDelegation Packetとstrict Worker Reportを相関し、report import後に親が別revisionで
acceptした。failed 2件はdiagnostic-readyをexecution-verifiedへ昇格せず、実対話起動のbrowser login要求と
session終了をterminal evidenceとして保持した。gpt-connectorはWorker件数へ含めず、
`consultation-gpt-blindspots`として別管理した。

## Dedup input clusters

### F1 — finalization integrity

- `run-native-core-a`と`run-native-tests-b`が、active childを残したTask finalizationから依存Taskを
  解禁できる同一根因を独立に報告した。
- `run-native-finalize-b`はTask／Control finalizationとreceiptの未拘束、架空のmatrix／audit／
  knowledge参照、acceptance前Campaign releaseを同じfinalization境界の欠陥群として報告した。
- 主な参照: `lib/orchestrate/control-record.mjs:903,1153,1333,2608,2800,3252,3269,3297`、
  `tests/orchestrate/control-record.test.mjs:1550,1564`。

### F2 — aiterm terminal evidence

- `run-aiterm-codex`はcaller supplied `completed`をprovider由来report/evidenceなしに投影できる候補を報告。
- 主な参照: `lib/orchestrate/executor-adapters.mjs:451,561`、
  `tests/orchestrate/executor-adapters.test.mjs:103`、`shared/orchestrate/executor-adapters.md:110`。

### F3 — registry / resume coupling

- `run-sidecar-explore`はcontract registryとadapter catalogの命名差、resumeのtyped recovery plan不足、
  sidecar recovery結果のControl永続化不足を報告した。
- 主な参照: `lib/orchestrate/control-record.mjs:65,2120,2972`、
  `lib/orchestrate/executor-adapters.mjs:154,661`。

### F4 — hook session input

- `run-sidecar-risk`はhook `session_id`がcache pathへ直接入る候補を報告した。
- `run-native-install-b`は`bin/`入口でP0/P1なしとし、実処理本体
  `lib/orchestrate/advisory-hook.py`は読取範囲外と明示した。
- 主な参照: `bin/codex-callout-hook.sh`、`bin/todo-gate-hook.sh`、
  `bin/onset-gate-hook.sh`、`bin/delegation-gate-hook.sh`。

### F5 — expected incomplete work

- `run-native-refute-a`のPhase 7 TODO／matrix未完了指摘は正しい現在地だが、実装欠陥ではない。
- `run-sidecar-risk`のfactory reporter credential／Windows PATH指摘は今回のOrchestrator Task範囲外。

## Consultation input

gpt-connector consultationは独立Worker票ではなく親の相談材料として、matrix 29項目の個別証拠対応、
provider実時間の重複、同期sidecarをresume証拠へ混ぜないこと、receipt閉鎖余力、plan archive後の参照存続を
確認するよう助言した。既知slugは`elastic-v1-dogfood-blindspots-20260714`、terminal stateは`succeeded`。

## 未検証範囲

- このsnapshot自体はFindingの採否を決めない。`task-dedup-refutation`と親Decisionが所有する。
- Grok／Composerは追加loginを行っていないため、execution-verifiedではない。
- writer競合案、Throughline session再開、中規模実装縦切り、Phase 7最終監査はこの時点では未実施。
