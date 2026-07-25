# fm-0672 実dogfood: 公開面がどこまで届くか

- 実測日: 2026-07-25
- 実測version: Lattice CLI **0.12.24**（本文）→ **0.12.25**（末尾の追記）。いずれもpublish済み・global install済み
- 手法: 隔離した一時repo（`git init`済み・`.lattice/runs/` gitignore済み）で公開CLIだけを使う。
  実Lattice CLIを実際に実行した実測であり、fixtureではない。
- 判定: 0.12.24時点では**実dispatchへ届かなかった**（本文）。参照controllerを配布した
  **0.12.25で実dispatch・実write・receipt受理・event chain検証まで到達した**（末尾の追記）。
  `fm-0672`は複数writerの実dispatchと子別Control受入が未実測のため、引き続き未完了とする。

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

## 追記: Lattice 0.12.25で実dispatchへ到達した（2026-07-25）

オーナー裁定により参照scripted adapter controllerを配布した
（[ADR 0126](https://github.com/kitepon-rgb/Lattice/blob/main/docs/adr/0126-distribute-scripted-adapter-controller.md)）。
0.12.25をglobal installし、**公開CLIと配布binだけを使って**新規の隔離repoで実測した。

| 段 | 結果 |
|---|---|
| `plan compile` | 成功（`lattice.plan_compile_result.v1`） |
| `run start --executor scripted` | 成功 |
| `run adapter register`（配布controllerを指す） | 成功（`outcome: created`） |
| **`run activate`** | **成功（`outcome: "activated"`）** |
| `run status` | `accepted: ["T1"]`・`dispatchable: []`・`event_count: 7` |
| `run observe` | `accepted: ["T1"]`・`terminal: ["T1"]` |
| **実write** | **`src/alpha.mjs`が実際に変更された**（`git diff`で確認） |
| `event verify` | `valid: true`・`checks_total: 14`・`failed_conditions: []` |
| `run close` | `STALE_BASE`で拒否 |

`run close`の拒否は**正しい挙動**である。実測手順の途中でadapter configをcommitして
repo HEADを動かしたため、保存requestの`base_sha`と一致しなくなった。
製品契約（「`resume`と正常`close`は保存requestのbase SHAへbindし、stale baseを拒否する」）
どおりにfail closedしている。

### 登録で踏んだ入力の作法（いずれもdetailが正確に指した）

- `binary_path`はregular fileでなければならない。`/opt/homebrew/bin/node`はsymlinkのため
  `binary_must_be_executable_regular_file`で拒否される。realpathを渡す。
- `config_ref`は実在して読める必要がある（`config_unreadable`）。

どちらも`lattice.cli_error.v2`の`detail`が`reason`と`path`を返したため、
推測なしで次の一手が決まった。0.12.21で入れたdiagnosability規律が実際に効いている。

### fm-0672に残る部分

- 本実測はwriter 1件（T1）である。複数writerの実dispatchは未実測
  （compile・`run start`・`dispatchable: ["T1","T2"]`までは0.12.24時点で確認済み）。
- 子別Control受入は`lib/orchestrate/lattice-receipt-projection.mjs`を通す段であり、本実測に含まない。

実dispatchが不可能という**blockerは解消した**ため、`fm-0672`のblockを解除する。
