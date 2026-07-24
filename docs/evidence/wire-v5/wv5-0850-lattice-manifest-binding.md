# wv5-0850 受入証拠 — v1/v2 phase revisionのmanifest binding追従

- 日付: 2026-07-25
- 所有repo: Lattice
- commit: `a94eb4e`

## 欠陥

`lattice.todo_manifest.v2` は読み取り時に `active_revision_digest` がgenesisの
`revision_digest` と一致することを要求する。しかし `applyPhaseTodoRevision` の
v1/v2経路はmanifest descriptorを更新する際にこのkeyを書いていなかった。

v3 revisionがmanifestをv2へ昇格させた後にv2 revisionを当てると、**書込みは成功したように
見えるのに以後のreadが全て** `STORE_INCONSISTENT: manifest_revision_binding_mismatch`
**で落ち、storeが読めなくなる**。

`initializeTodoStore` はmanifest v1を作るため、既存testはv1上でしかv1/v2 revisionを
試しておらず、この経路が露出していなかった。

## 当初の見立ての訂正

本欠陥を工程表へ登録した時点では「v3で reconciled なmemberへv2を当てる世代降格」が
原因だと記述したが、実装を読んで**誤りと判明した**。真因はschema世代の組合せではなく、
v1/v2活性化における `active_revision_digest` の書き漏れである。世代降格でなくても、
manifestがv2のstoreへv1/v2 revisionを当てれば同じ破壊が起きる。

## 実測

- 再現test（v3適用でmanifest v2昇格 → v2 revision適用 → read）を先に置き、修理前は
  `manifest_revision_binding_mismatch` で赤になることを確認した
- 修理後 `node --test test/todo-phase-revision-v3.test.mjs` = 30/30 pass
- Lattice `npm test` = exit 0
- 実運用でも同一症状からgitで復旧済み（dotagents `.lattice/todo` を直前commitへ戻した）
