# Executor Adapter Optional Interface Catalog

`lib/orchestrate/executor-adapters.mjs` は、Executorを共通の一枚岩lifecycleへ押し込まないための、
versionedかつ純粋なcatalogである。schemaは`dotagents.executor-adapter.v1`で、descriptorは
`adapter_id / contract_version / lane / interfaces / restrictions`だけを持つ。

## 所有境界

- catalogとlookupはdescriptorを検証・解決するだけで、filesystem、process、network、MCP、host toolを
  実行しない。
- `codex-native`の`spawn_agent`、`followup_task`、`interrupt_agent`はparent host toolであり、Node CLIが
  実行するinterfaceではない。
- adapter製品はsession/job/credential/retry/cancelの正本を所有する。Control Recordはopaque handleと観測を
  相関するだけである。

## Optional interfaces

各interfaceは製品固有のoperation集合を持つ。全adapterに必須のoperationやlifecycleは存在しない。

| Adapter | Lane | Interface | Operations |
| --- | --- | --- | --- |
| `codex-sidecar@v1` | worker | `durable-work` | start、result、cancel、read-only recovery inspection、明示確認付きquarantine |
| `codex-native@v1` | worker | `native-agent` | `spawn_agent`, `followup_task`, `interrupt_agent` |
| `aiterm@v1` | worker | `interactive-session` | `codex_agent`, `grok_agent`, `composer_agent`, `pty_read`, `pty_send`, `pty_key`, `pty_close`, `pty_list` |
| `gpt-connector@v1` | consultation | `consultation-job` | `consult`, `sessions` |
| `claude-internal@v1` | host-projection | `appendix-projection` | observation projection only |

`gpt-connector`はWorker laneへ登録できない。`claude-internal`はCodexからdispatchできるinterfaceを持たず、
appendix由来の観測projectionだけを表す。未知adapter/interface/operationはtyped errorでfail closedにする。
sidecar recoveryは同じ`codex_work_recover` toolでも、既定のread-only inspectionと
`confirmNoRunningProcesses=true`を要するquarantine mutationを別operationとして扱う。
