# Lattice wire v4 cutover receipt

- observed: 2026-07-19 JST
- source commit: `53572f7c1f2872462c5facfeaade95c331875cbc`
- self-closure source commit: `56b342954cfa267abb0222e97efb17b0167eb229`
- pre-write inventory digest: `28422ec39eb9bc9a9bbca959b841e2aacac2a58bbdd051e461de9f7f9c1e8cf3`
- source inventory: 656 total / 505 checked / 151 unchecked
- accepted release: `@quolu/lattice@0.6.4`
- accepted global install: `lattice` 0.6.4

## Release corrections

1. `0.6.0`は未追跡のstale `sensor/dist`をpackし、Node 26で起動不能だったため不採用。
2. `0.6.1`で`prepack`時のsensor buildを必須化し、公開tarballを修正。
3. `0.6.2`でsuccessor revisionに`carry_reconciled_metadata`を明示した。
4. cutover実データが`0a. [x]` / `6A. [ ]`形式の検証漏れを発見したため、`0.6.3`で修正して再公開・global installした。
5. 653-task実storeで`todo status`が8.41秒かかりhookの内部5秒timeoutを超えたため、pinned source検証をread内でmemoizeした`0.6.4`を再公開・global installした。registry版は0.26秒で完了した。

`0.6.3` registry integrityは
`sha512-sbeimRVc47Vjped1gXdwak99aqQKl4iAKIJyfM/ndXdjJjh4f4Oy26Na+OOyUVf+Bdhm9LIbB2wJfQ2gL05TSA==`、
shasumは`fdc9231d27db4d2877c89dbb186d87778dcba877`、候補tarball SHA-256は
`8763ffac3ae9fbf3dddd8b62f5d69b48a4c41af4013e94d24e52b9b4e2c853be`である。

最終採用した`0.6.4` registry integrityは
`sha512-ELlcDN6FPKJ8XOQ3+Y0ybX/OirhKgkSydpYeX92IT+rEg8EsZevGVPTP6AOnw+EnAWrSxNOkAoWKaoeZS4Xjyg==`、
shasumは`ae678ca0537bc2ebd06b8b9984f1da8fe8b3b782`である。

## Canonical store

| plan key | active tasks | hard dependencies | done | pending | in-progress |
|---|---:|---:|---:|---:|---:|
| `bughub-factory-integration` | 203 | 0 | 175 | 28 | 0 |
| `codex-full-support` | 79 | 0 | 39 | 40 | 0 |
| `factory-master` | 116 | 72 | 83 | 30 | 3 |
| `gpt56-rewiring` | 38 | 0 | 32 | 6 | 0 |
| `lattice-factory-integration` | 82 | 0 | 61 | 21 | 0 |
| `lattice-todo-reconciliation` | 52 | 51 | 52 | 0 | 0 |
| `memory-promotion-queue` | 17 | 0 | 12 | 5 | 0 |
| `observer-factory-integration` | 118 | 0 | 101 | 17 | 0 |

- active total: 705 = 555 done + 147 pending + 3 in-progress
- excluded tombstones: 3 = 2 checked + 1 unchecked
- source equality: 705 active + 3 excluded = 708 source checkboxes（開始母集団656件 + 自己閉包52件）
- checked equality: 555 active done + 2 excluded checked = 557 source checked
- unchecked equality: 147 pending + 3 in-progress + 1 excluded unchecked = 151 source unchecked
- duplicate: 0
- unresolved: 0
- all 8 heads: `reconciled`

`factory-master` successorは`rev-0e670efc8c658075ba983921`、revision digestは
`307686259c8f6abd2bf7c562e5098d6929a14a392f1aa90e4caef7da0aeb1ab7`。
既存110 tasksに6 tasksと5 hard dependenciesを追加し、active 116 / dependencies 72とした。

完了済みの本reconciliation plan自身も、固定commitの52 checkboxesを
`lattice-todo-reconciliation`としてimportした。全52件をhistorical done、source順の51 hard dependenciesで
拘束し、successor `rev-80418e3688a6fe9556a8fefc`へ
`carry_reconciled_metadata`して自己閉包した。revision digestは
`3fe3ec1167fcdb4f3d0534e4ca707b0e9753e3654d1053eb9165429b267483b6`である。

## Machine verification

- `lattice.todo_status_result.v3`
  - active set: 3
  - next ready: 133
  - blocked: 0
  - result digest: `008ca579149570e8b533de8a8d73dae0f7d721785c349e419a971694d8576047`
- `lattice.todo_verify_result.v2`
  - verified members: 8
  - `snapshot_stale=false`
  - result digest: `ec137767fcf50cd7141079e960a36d5cd4a78ea2e1d52b8130aac7b4d62a14d9`

## Gantt

- schema: `lattice.todo_gantt_result.v1`
- renderer: `lattice.todo_gantt_renderer.v7`
- manifest digest: `83ab534ddff48ab3b3ede834905519beedbedb6f53b688388a96e26538ba1451`
- narrative bindings digest: `21e3198de48c7eeabb3b464543e20cddabbdcbd61ef0a8a7411576e93fb35146`
- chain digest: `b7c77c6e7252ee1b74b19d69e192cc1e7df3b739789685e009beef0f4219930a`
- layout digest: `2e87c3873e6e7294964de7114a99fa0de7a7d83e92eb446bb1b39c691e070fe3`
- HTML digest: `4dfcb06757eca5332720d6c98f74a484418c89c475ed2a982f7ecdb41c5c3ae8`
- result digest: `f58aa5f9cb9023a64dbc89d858bc23c89d0194eb6674279519a6ffe4cff862b5`

Browser skillによるローカル`file://`表示はbrowser URL policyにより拒否されたため、迂回していない。
視覚受入はオーナーの「工程表の見え方はまぁOK」を根拠とし、生成物は上記digestと機械検証で固定した。

## AITerm acceptance

修理後のglobal `aiterm-mcp@0.19.1`を新規PTYで確認し、同一send内の2コマンドが
`line-one` / `line-two`を欠落なく出力した。以後のcutover shell操作はこのPTYを使用した。

## Host hook acceptance

- `./install.sh --profile official`: `lattice-todo-inventory`を含む配布symlinkを再同期
- Claude SessionStart: canonical command 1件 / timeout 6
- Codex SessionStart: canonical command 1件 / timeoutSec 6
- `verify-install --profile official`: green
- Claude実hook: Gantt URL、active、next-ready、依存、`reconciled=8`をplain INFOで出力
- Codex実hook: 同じ案内を`hookSpecificOutput.additionalContext`へ出力
- 両hook: registry版`0.6.4`でexit 0、内部5秒timeout以内
- rollback:
  - Claude: `/Users/kite/Archives/dotagents-claude-settings-20260719T114606Z.tar.gz`
  - Codex: `/Users/kite/Archives/dotagents-codex-config-20260719T114606Z.tar.gz`
