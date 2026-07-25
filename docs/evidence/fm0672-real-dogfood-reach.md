# fm-0672 実dogfood: 公開面がどこまで届くか

- 実測日: 2026-07-25
- 実測version: Lattice CLI **0.12.24**（本文）→ **0.12.25**（末尾の追記）。いずれもpublish済み・global install済み
- 手法: 隔離した一時repo（`git init`済み・`.lattice/runs/` gitignore済み）で公開CLIだけを使う。
  実Lattice CLIを実際に実行した実測であり、fixtureではない。
- 判定: 0.12.24時点では**実dispatchへ届かなかった**（本文）。参照controllerを配布した
  0.12.25で実dispatchへ到達し（追記1）、**複数writerの実dispatchと子別Control受入まで
  到達して`fm-0672`の受入文を満たした**（追記2）。
- 読み方: 本文＝0.12.24時点の到達限界と原因、追記1＝0.12.25での実dispatch到達、
  追記2＝複数writerと子別Control受入。**最終状態は追記2**である。

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

## 追記2: 複数writerの実dispatchと子別Control受入まで到達（Lattice 0.12.25）

新規の隔離repoで、writer 2件（`src/alpha.mjs` / `src/beta.mjs`）を公開CLIと配布binだけで
端から端まで通した。`.lattice/`をgitignoreして作業ツリーをcleanに保ち、
run作成後にHEADを動かさない手順にしている。

| 段 | 結果 |
|---|---|
| `plan compile` | `nodes: ["T1","T2"]`・`conflicts: 0` |
| `run start` / `run adapter register` | `run_id: twowriters`・`outcome: created` |
| **`run activate`** | `outcome: "activated"` |
| **`run status`** | **`accepted: ["T1","T2"]`**・`running: []`・`dispatchable: []` |
| `run observe` | `accepted: ["T1","T2"]`・`terminal: ["T1","T2"]`・`conflict_count: 0` |
| **実write** | **`src/alpha.mjs`と`src/beta.mjs`の両方が変更された** |
| `event verify` | `valid: true`・`checks_total: 14`・`failed_conditions: []` |
| **`run resume`** | `outcome: "resumable"` |
| **`run close`** | **`outcome: "closed"`**・`event_count: 12` |

同一repoの複数writerが単一runで並行dispatchされ、両方のreceiptが受理され、
resumeとcloseまで閉じた。

### 子別Control受入（実receiptで検証）

run storeから実`lattice.executor_receipt.v1` 2件、実`lattice.executor_packet.v1` 2件、
`executor_dispatched` eventのdispatch記録を取り出し、
`lib/orchestrate/lattice-receipt-projection.mjs`（fm-0668）へ通した。
**fixtureではなく実dispatchが生成した本物のartifactである。**

```text
status: success / succeeded: 2 / failed: 0
  T1 → changed_paths: ["src/alpha.mjs"] / result_digest: 8813fc75…
  T2 → changed_paths: ["src/beta.mjs"]  / result_digest: 0ee78013…
```

受理できることだけでは受入にならないため、同じ実artifactで敵対ケースも通した。

| 攻撃 | 結果 |
|---|---|
| scope逸脱（T1のreceiptをT2のscopeで受ける） | `failure` / `SCOPE_VIOLATION` |
| packet付け替え（T1のreceiptにT2のpacket） | `failure` / `PACKET_DIGEST_MISMATCH`＋`PACKET_CORRELATION_MISMATCH` |
| dispatch ownerなりすまし（別のhandleを主張） | `failure` / `DISPATCH_OWNER_MISMATCH` |
| partial（1件正常・1件scope逸脱） | `partial_failure` / 成功1・失敗1に分離 |

4件すべてfail closedし、partial failureは成功分を捨てず失敗分を成功扱いにもしなかった。

### 判定

`fm-0672`の受入文「同一repo複数writerの実dogfoodでcompile、Lattice単一dispatch、
子別Control受入、Lattice完了反映、resume/close」を、実CLIと実artifactで満たした。
