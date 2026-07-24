# ADR 0075: R2新規session・routing・connector・Spotter実火受入記録

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `codex-full-support/cf-0147`、`codex-full-support/cf-0148`、`gpt56-rewiring/gw-0103`、`factory-master/fm-0585`
- Prior receipts: [ADR 0073](0073-r2-sidecar-and-windows-distribution-receipt.md)、[ADR 0074](0074-codex-hook-cross-host-acceptance.md)

## Decision

Mac、main-server、FOX WSL2、FOX Windows nativeの新規Codex sessionで3 role routingを実測し、親側verifierをgreenにした。新規Claude sessionから`gpt_connector`の既存consult結果を回収し、Codex thread handoffとSpotter project hookの実発火も確認したため、R2の新規session統合smokeを受け入れる。

入口ごとの実施結果は下表で分離し、未実施を他入口の共有証拠で代用しない。`cf-0146`、`cf-0149`、`cf-0150`、`cf-0216`の広い受入条件は本ADRでは完了扱いにしない。

## 3 role routing

| host / entry | schema / model条件 | implementer | refuter | sorter | verifier |
|---|---|---|---|---|---|
| Mac Codex | V2 | `gpt-5.6-terra / medium` | `gpt-5.6-sol / high` | `gpt-5.6-luna / low` | 3件green |
| main-server Codex | V2 | `gpt-5.6-terra / medium` | `gpt-5.6-sol / high` | `gpt-5.6-luna / low` | 3件green |
| FOX Windows native Codex | V2 | `gpt-5.6-terra / medium` | `gpt-5.6-sol / high` | `gpt-5.6-luna / low` | 3件green |
| FOX WSL2 Codex | `--model gpt-5.6-sol`でV2 | `gpt-5.6-terra / medium` | `gpt-5.6-sol / high` | `gpt-5.6-luna / low` | 3件green |

各roleは`/root/<role>_smoke`（WSL2 V2再実行は`/root/<role>_smoke_v2`）として実spawnした。FOX WSL2の端末既定`gpt-5.5`は旧`multi_agent_v1` schemaを読み、`task_name` / `fork_turns`とcanonical agent pathを提供しなかった。オーナー領分の既定modelは変更せず、V2受入だけを明示modelで行った。

Windows nativeで親verifierがGit Bashの`/c/...`をWindows Pythonへ渡す際、MSYSがcanonical agent path `/root/...`を引数変換していた。`bin/verify-codex-agent-routing.sh`でrole/sessionのfilesystem pathだけを`cygpath -w`へ変換し、Python起動時は`MSYS2_ARG_CONV_EXCL='*'`でagent pathを保持した。focused testはgreen、修正は`d200f50`としてpush済みである。

## gpt_connector

caller既知slug `fm0585-20260720-gpt-connector-e2e`について、送信前の`sessions`は`JOB_NOT_FOUND`だった。次の1回だけconsultを実行した。

- model: `gpt-5-6-thinking`
- effort: `min`
- result: `state=succeeded`、`text=GPT_CONNECTOR_E2E_OK`
- attachment: 0、read-back confirmed
- lifecycle: `archived=true`、`error=null`

通常ユーザー設定を読む新規Claude TUIを`claude-sonnet-4-6`明示で起動し、再consultせず同slugを`gpt_connector.sessions`で回収した。Claude側も`state=succeeded`、`result.text=GPT_CONNECTOR_E2E_OK`を確認した。aitermのmanaged Claude launcherはisolated settingsのため`gpt_connector`を見せず、これはhost connector不通の証拠には採用していない。

## session handoff

`codex-thread-handoff-smoke`のdry-runで旧thread `019f78e5-cdf6-7bc0-a059-436b2e8a2aba`を自動検出した。VS Codeの新規thread `019f7b6e-ffdb-7e11-a1e9-6ea951f2a920`を作成し、最初のmessageに旧thread IDが入り、deep linkが開くことを確認した。

## Spotter project hook

`spotter doctor`はwarning 0、Claude/Codexのproject-local tool DBとThroughline contextを認識した。`spotter diagnostics logs --json`が返したproject ledgerは次のとおり。

- schema: `spotter.hook_events_summary.v1`
- project root: `/Users/kite/Developer/dotagents`
- parse errors: 0
- 新規Claude session: `SessionStart / spawned`（2026-07-19T17:42:39.170Z、109 ms）
- connector回収turn: `PreToolUse / recorded`
- turn終了: `Stop / pass=true`（missingTools 0）
- 前session正常終了: `SessionEnd / shutdown`

これによりmarkerの存在確認だけでなく、project hook eventの実記録まで受け入れた。

## 分離したmaintenance

- `fm-0646`: FOX WSL2の外部stale Codex hookが返す`MODULE_NOT_FOUND`。
- `fm-0647`: Spotter ledgerで別のClaude終了経路が返した`SessionEnd / E_UNREACHABLE`。本受入の`SessionStart`、`PreToolUse`、`Stop pass`とは分離して根本診断する。
- `fm-0648`: このMacの通常Claude TUIが端末既定で存在しない`gpt-5.6-sol`を選びturnを拒否した設定不整合。受入では`claude-sonnet-4-6`をsession限定で明示し、恒久設定は変更していない。

3件はMarkdown live ToDoへ戻さず、ToDo単位のLattice authoring revisionでmaintenance laneへ登録した。

## 検証

- `tests/orchestrate/agent-routing-verifier.sh`: green
- 4 host × 3 role parent verifier: green（WSL2はV2明示model session）
- `gpt_connector.consult` / Claude `gpt_connector.sessions`: green
- Codex thread handoff: green
- Spotter project hook ledger: parse error 0、実event確認
- `lattice todo verify`: state event反映後に再実行して閉じる
