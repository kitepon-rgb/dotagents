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

## Codex Sidecar durable work projection

`codexSidecarStartRequest`、`codexSidecarResultRequest`、`codexSidecarCancelRequest`、
`codexSidecarRecoveryInspectionRequest`、`codexSidecarQuarantineRequest`は、host tool invocation
requestを返す純粋関数である。start requestはsource workspaceを`projectRoot`へ渡し、
caller固定の22〜128文字base64urlまたはUUIDの`idempotencyKey`、commit SHAの`baseRef`、
Task scope由来の`allowedPaths / denyPaths`、`allowWork=true`、`preserveWorktree=true`を必須にする。
sidecar固有のstructured resultを架空のWorker Report schemaで上書きせず、親がterminal projectionと
Controlのstrict Worker Report importを相関する。これらの関数はMCPを呼ばず、Control Recordの
worktree bindも行わない。result／cancel／recoverは製品契約どおり毎回
`projectRoot + idempotencyKey`で同じdurable Runを参照する。

`projectCodexSidecarObservation`はboundedなprovider observationをControlに渡せる形へ投影する。
caller所有のidempotency keyと、実provider unionの`run_handle`、`run_pending`、`run_terminal`、
`run_interrupted`、`run_error`を相関し、run ID、terminal worktree path、changed files、canonical result
digestだけをbounded projectionへ残す。`interrupted / orphaned / run_error`は`unknown`、resultの
`partial / failed / refused / dry-run`は`failed`であり、`completed`へ昇格しない。成功は
`run_terminal.state=completed`、`result.status=ok`、`worktreePreserved=true`、worktree path有りを
すべて必須とする。recoverはactionを省略したread-only inspection、quarantineは
`action=quarantine`と明示`confirmNoRunningProcesses=true`を別requestとして要求する。

## Codex native host-tool packet / projection

`codexNativeSpawnRequest`、`codexNativeFollowupRequest`、`codexNativeInterruptRequest`は、parentが
host toolへ渡す invocation packet を返す純粋関数である。Node CLIは`spawn_agent`、`followup_task`、
`interrupt_agent`を呼ばない。`gpt-connector`やaitermなど別laneへ変換することもない。

spawn packetは`agent_type`を必須にし、`fork_turns="none"`と固定のhandshake-only messageを使う。
このmessageは本作業を含めず、agent path・role認識・待機可否の報告だけを求める。followup packetは
既存の`agent_path`とtaskだけを渡すが、その生成前にrouting verificationの`expected`と`observed`が
`agent_path / agent_role / model / effort / developer_instructions`の全項目で一致し、`status="green"`で
あること、およびfollow-up対象がその`agent_path`と一致することを厳密に確認する。host tool引数は
実schemaどおり`target`へ同じpathを渡す。interrupt packetも既存の`agent_path`を`target`にする。

`projectCodexNativeObservation`はagent path、状態（`created`、`running`、`completed`、`failed`、`unknown`、
`interrupted`）、green routing verification、report参照、evidence参照だけをboundedに投影する。raw prompt、
raw log、shell commandやhost tool実行結果の任意payloadはschema外として拒否する。

## aiterm interactive-session packet / projection

配布済みaitermの一次source（`dist/index.js`）に従い、`aitermAgentStartRequest`は
`codex_agent`、`grok_agent`、`composer_agent`の実schemaへ、prompt、`cwd`、`session_name`、model、
`agent_done`を投影する。Codexだけが対話TUIで`reasoning_effort`を受け、Grok/Composerは同値を
起動前エラーにする実装のため、adapterも拒否する。起動後の`session_id / agent_kind / workspace_cwd`は
opaque handleとして相関し、別sessionへfollow-upしない。

`aitermFollowupRequest`は同じhandleの`session_id`へ`pty_send`を作り、`wait="agent_done"`、
`enter=true`、`screen=true`、`raw=false`を固定する。timeout後の`aitermTimeoutRecoveryRequest`は同じ
sessionの`pty_read(screen=true, wait=false)`を返すだけで、timeoutをfailedやcompletedへ昇格しない。
`aitermKeyRequest`、`aitermCloseRequest`、`aitermListRequest`も同様に純粋なrequestである。

`projectAitermLaunchObservation`はsession作成を`running`としてだけ表し、agent起動・batch exit status・
terminal成功を捏造しない。`projectAitermObservation`はhandle、`running / completed / failed / unknown /
interrupted`、report/evidence参照だけをboundedに保持する。raw terminal、log、secret、任意のhost resultは
schema外として拒否する。adapterはPTY/MCPを実行せず、aitermが保証しないread-only強制やworktree隔離も
主張しない。

## gpt-connector consultation packet / projection

配布済み`gpt-connector`の一次source（`dist/src/contract.js`、`dist/src/mcp-server.js`）に従い、
`gptConnectorConsultRequest`はstrictな`consult` schemaへprompt、caller既知のslug、model、effort、
`keepOpen=false`、`dryRun=false`を投影する。製品schemaではmodel/effortはoptionalだが、このadapterは
オーナー契約どおり両方を必須にする。files／workspaceRootを受け付けないため、添付やworkspace読取を
暗黙に開始しない。未知slugの推測・置換、Oracle／OpenAI API／prompt再送へのfallbackは持たない。

`gptConnectorSessionsRequest`と`gptConnectorTimeoutRecoveryRequest`は、ともに同じcaller既知slugだけを
`sessions`へ渡す純粋requestである。caller timeoutは`projectGptConnectorTimeoutObservation`で`unknown`
として保持し、failedへ昇格しない。MCPの実呼出し、login、送信、添付、MCP登録をこのadapterは行わない。

`projectGptConnectorObservation`の入力は実 `ConsultSnapshot` のstrict shape、すなわち
`slug / state / createdAt / updatedAt / result / error`をそのまま検証する。成功resultは
`text / status / endTurn=true / resolvedModel / resolvedEffort / sessionId? / attachments / archived`、
failureは`code / message / retry / partialUpload?`の実shapeを要求する。成功時はresolved model／effort、
session ID、archive状態だけを残し、回答本文・attachment names・MIME typeを捨てる。失敗時もcodeとretry
だけを残し、error message、raw prompt、raw log、secretはprojectionに残さない。これはConsultationであり、
Worker capacity、実行票、worker reportには変換しない。
