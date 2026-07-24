# wv5-0810 受入証拠 — Phase無し先行planからのcarryをtyped拒否へ直す

- 日付: 2026-07-25
- 所有repo: Lattice
- commit: `ca2e281`

## 欠陥

`phase_todo_revision.v3` を、Phaseを持たない先行plan（`lattice.todo_plan.v3`）へ
`state_policy: carry` で適用すると、`phaseV3CarrySemantics` が先行taskをspreadして
`phase_id: undefined` を作り、`canonicalizeTodoArtifact` が素の
`TypeError: todo artifact is not a JSON tree` を投げていた。CLIには
`CONTRACT_VIOLATION` としてしか現れず、原因が読めない。

本waveのwire v5 plan作成時に実際に踏んだ。

## 裁定

Phase割当ての獲得は意味変化であり、carryは通してはならない。`phase_id` を `null` へ
正規化してcarry比較へ渡し、既存の `carry_semantics_changed` で拒否させる。
世代昇格が必要なら `reset_pending` を使う。

## 実測

- characterization test 2本を本体変更前に置き、修理前は `TypeError` で赤になることを確認した
- 修理後 `node --test test/todo-phase-revision-v3.test.mjs` = 30/30 pass
- Lattice `npm test`（product tests）= exit 0
