# Lattice wire v4 cutover receipt

- observed: 2026-07-19 JST
- source commit: `53572f7c1f2872462c5facfeaade95c331875cbc`
- pre-write inventory digest: `28422ec39eb9bc9a9bbca959b841e2aacac2a58bbdd051e461de9f7f9c1e8cf3`
- source inventory: 656 total / 505 checked / 151 unchecked
- accepted release: `@quolu/lattice@0.6.3`
- accepted global install: `lattice` 0.6.3

## Release corrections

1. `0.6.0`は未追跡のstale `sensor/dist`をpackし、Node 26で起動不能だったため不採用。
2. `0.6.1`で`prepack`時のsensor buildを必須化し、公開tarballを修正。
3. `0.6.2`でsuccessor revisionに`carry_reconciled_metadata`を明示した。
4. cutover実データが`0a. [x]` / `6A. [ ]`形式の検証漏れを発見したため、`0.6.3`で修正して再公開・global installした。

`0.6.3` registry integrityは
`sha512-sbeimRVc47Vjped1gXdwak99aqQKl4iAKIJyfM/ndXdjJjh4f4Oy26Na+OOyUVf+Bdhm9LIbB2wJfQ2gL05TSA==`、
shasumは`fdc9231d27db4d2877c89dbb186d87778dcba877`、候補tarball SHA-256は
`8763ffac3ae9fbf3dddd8b62f5d69b48a4c41af4013e94d24e52b9b4e2c853be`である。

## Canonical store

| plan key | active tasks | hard dependencies | done | pending | in-progress |
|---|---:|---:|---:|---:|---:|
| `bughub-factory-integration` | 203 | 0 | 175 | 28 | 0 |
| `codex-full-support` | 79 | 0 | 39 | 40 | 0 |
| `factory-master` | 116 | 72 | 83 | 30 | 3 |
| `gpt56-rewiring` | 38 | 0 | 32 | 6 | 0 |
| `lattice-factory-integration` | 82 | 0 | 61 | 21 | 0 |
| `memory-promotion-queue` | 17 | 0 | 12 | 5 | 0 |
| `observer-factory-integration` | 118 | 0 | 101 | 17 | 0 |

- active total: 653 = 503 done + 147 pending + 3 in-progress
- excluded tombstones: 3 = 2 checked + 1 unchecked
- source equality: 653 active + 3 excluded = 656 source checkboxes
- checked equality: 503 active done + 2 excluded checked = 505 source checked
- unchecked equality: 147 pending + 3 in-progress + 1 excluded unchecked = 151 source unchecked
- duplicate: 0
- unresolved: 0
- all 7 heads: `reconciled`

`factory-master` successorは`rev-0e670efc8c658075ba983921`、revision digestは
`307686259c8f6abd2bf7c562e5098d6929a14a392f1aa90e4caef7da0aeb1ab7`。
既存110 tasksに6 tasksと5 hard dependenciesを追加し、active 116 / dependencies 72とした。

## Machine verification

- `lattice.todo_status_result.v3`
  - active set: 3
  - next ready: 133
  - blocked: 0
  - result digest: `ba44c8a3615cedfba8d722a0d36cb018890f9a56e43e6ace7277ef89e1082325`
- `lattice.todo_verify_result.v2`
  - verified members: 7
  - `snapshot_stale=false`
  - result digest: `53eb14e75504de4fb91a54ca581cd3a8af20348c56ff606a0cdf59890b23bfcb`

## Gantt

- schema: `lattice.todo_gantt_result.v1`
- renderer: `lattice.todo_gantt_renderer.v7`
- manifest digest: `c0b2ff8885ddde719d15f195e2167913bb627a9d013dc3db19d46ffdcccb9195`
- narrative bindings digest: `d26d77dcdfbee2a4629adc68fc1c90bdaef5538c688d241ffbedd2ef73f1120c`
- chain digest: `fe71130649e7f5c7140473cf7217521248d1695b4afc3a71be0133ac9a893575`
- layout digest: `b8133c79ed74187dcf1913b62e254018c3c0c37b2156f137d52d972c2e72012a`
- HTML digest: `a4f117d9b7079e953def3498dc1d2fabff6de02cd5f1af26dd8afc3073c11a17`
- result digest: `89490e8aed06d5c353225600aa41293708bcdcc6cfb0173e8e33968577a5bad8`

Browser skillによるローカル`file://`表示はbrowser URL policyにより拒否されたため、迂回していない。
視覚受入はオーナーの「工程表の見え方はまぁOK」を根拠とし、生成物は上記digestと機械検証で固定した。

## AITerm acceptance

修理後のglobal `aiterm-mcp@0.19.1`を新規PTYで確認し、同一send内の2コマンドが
`line-one` / `line-two`を欠落なく出力した。以後のcutover shell操作はこのPTYを使用した。
