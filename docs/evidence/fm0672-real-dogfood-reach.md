# fm-0672 実dogfood: 公開面がどこまで届くか

- 実測日: 2026-07-25
- 実測version: Lattice CLI **0.12.24**（publish済み・global install済み）
- 手法: 隔離した一時repo（`git init`済み・`.lattice/runs/` gitignore済み・writer 2件）で
  公開CLIだけを使う。実Lattice CLIを実際に実行した実測であり、fixtureではない。
- 判定: **端から端までは届かない。** 実dispatchに必要なexecutor adapter controllerの実装が
  配布物に存在しないため、`fm-0672`は未完了とする。

## 実際に通った段

| 段 | 結果 | 証拠 |
|---|---|---|
| `sensor init` / `sync` | 成功 | `lattice.sensor_command_result.v1` `status: ok` |
| `plan compile` | **成功** | `lattice.plan_compile_result.v1`・`nodes: [T1, T2]`・`conflicts: []`・`capacity.executors: 2` |
| `run start --executor` | 成功 | `lattice.run_start_result.v1`・`run_dir: .lattice/runs/dogfood-1` |
| `run list` | 成功 | active runを1件返す |
| `run observe` / `run status` | 成功 | `dispatchable: ["T1","T2"]`（同一repoの複数writerが両方dispatch可能） |
| `run adapter register` / `list` | 成功 | `lattice.runtime_adapter_register_result.v1` `outcome: created` |
| `run abandon` | 成功 | typed退役 |
| **`run activate`（実dispatch）** | **未到達** | 下記 |
| 子別Control受入・完了反映・`resume`/`close` | **未到達** | activate未達のため |

## compileを塞いでいた原因（解消済み）

最初の試行は`BOUNDARY_UNKNOWN`で止まった。原因は**作業ツリーに未追跡ファイルがあると
sensor statusが`stale`になる**ことだった（`pendingChanges > 0`）。
staleなwitnessが未解決unknownへ落ち、`dynamic` resourceとして再び現れる。
scaffoldをcommitして作業ツリーをcleanにしたところ、同じrequestがそのままcompileを通った。

実dogfoodを回す側の作法として、**compile前に作業ツリーをcleanにする**必要がある。

## activateが届かない理由

1. `run activate`は`.lattice/runtime/adapter-registry/registry.json`を要求するが、
   0.12.23時点では**それを作る公開CLIが存在しなかった**。`scripted`・`isolated-worktree`・
   `actual-agent`の3つともactivate不能だった。
   → **0.12.24で解消**（[ADR 0125](https://github.com/kitepon-rgb/Lattice/blob/main/docs/adr/0125-public-runtime-adapter-registry-cli.md)。
   `run adapter register` / `list`を公開面として追加）。実測で`ADAPTER_NOT_REGISTERED`が消え、
   endpointのsocketが存在しないという正しい理由（`ENOENT`）まで進むことを確認した。
2. その先で必要なのは**実際にlistenしているadapter controllerプロセス**である。
   配布物の`bin/`は`lattice`・`lattice-mcp`・`lattice-dashboard`・`lattice-bridge`の4本だけで、
   **executor adapter controllerの実装を含まない**。
   controller protocol（`lattice.adapter_controller_bootstrap.v1`・handshake・nonce challenge）は
   定義されているが、それを話すプロセスは第三者が自分で実装する必要がある。

したがって、公開製品だけで実dispatchへ到達する経路は現時点で存在しない。

## 副次発見（0.12.24で修理済み）

`run adapter register`が相対pathのendpointを受理する一方、`run activate`は絶対pathを
要求していた（`ADAPTER_LAUNCH_INVALID: existing endpoint pathがcanonical absoluteでない`）。
**登録できたのにactivateできないdescriptorを作れる契約分裂**であり、登録時点で確定する条件を
registerへ揃えた（`endpoint_must_be_absolute`）。親directoryがcanonicalかは
activate時にしか判定できないため動的検査へ残している。

## 未完了として残す部分

`fm-0672`の受入文（「Lattice単一dispatch、子別Control受入、Lattice完了反映、resume/close」）は、
参照実装のadapter controllerを配布するか否かの製品裁定が済むまで達成できない。
これは実装の不足ではなく製品scopeの決定事項であり、推測で埋めない。
