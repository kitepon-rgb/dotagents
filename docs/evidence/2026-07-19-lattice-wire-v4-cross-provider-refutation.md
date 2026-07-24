# Lattice wire v4 cross-provider反証監査

- 日付: 2026-07-19
- Control: `lattice-wire-v4-cutover-20260719`
- Task: `lattice-cutover-cross-refuter`
- Worker: `lattice-cutover-grok-refuter-run`
- Provider / model: xAI Grok / `grok-4.5`
- AITerm session: `lattice-cutover-grok-refuter`
- terminal receipt: `outcome=done`, turn `a50f7758-8520-467b-8b4e-a334d2d9213c`

## 結論

`pass`。確定した実装欠陥は0件だった。監査workerは全工程を読み取り専用で実行し、Latticeと
dotagentsのファイル変更、commit、push、設定変更を行っていない。

## 実読した重点項目

- revision identityの非循環性とdigest binding
- predecessor v1 journal bytesの不変保存
- v2 genesisから後続v1 transitionへのschema連鎖
- pending / in-progress / blocked / done / historical import evidenceのcarry
- reset / source-seeded pending / removed migration
- source path制約、manifest CAS、crash recovery、unsafe path拒否
- successor `revision.json`の永続化とreader binding
- `todo revise`、status v3、verify v2 reconciliation
- dotagents hookのstatus v1/v2/v3 exact shape互換

## 親の再検証

- Lattice `node --test test/todo-revision-writer.test.mjs`: 14/14 pass
- Lattice `npm run ci`: pass
  - root test suite: pass
  - sensor: 147 files pass / 3 skipped、2488 pass / 37 skipped
  - syntax check: pass
- dotagents `make ci`: pass
  - Claude/Codex hookのv1/v2/v3 smoke: pass
  - constitution generation: 5/5 pass
  - orchestrate: 180/180 pass
  - routing verifier: pass

## 非blockerの追加test候補

workerは次を低コストの説明責任強化として挙げた。現契約の欠陥判定ではないため、release blockerには
昇格しない。

- removed対象を`parent_task_id`から参照するrevisionの明示reject
- source inventory / tombstone順序違反の専用case
- successor `revision.json`の直接byte-exact比較
- v2 genesis後の不正schema連鎖専用case
- dotagents hook v3のdigest欠損・state矛盾専用case

removed taskのhistory/evidence不変については監査中に親がfocused testを追加し、Lattice commit
`24d7166`として独立着地済みである。

## AITerm観測

Grok TUIもread-only shell commandごとにpermission UIを出したが、AITermの限定`pty_key`で
`Yes, proceed`を個別承認できた。always-approveは使用していない。最初の600秒waitはpermission待ちで
`timeout`、同じsession/cursorを再武装して最終`done`を回収した。Claude managed sessionでは同じ
限定承認経路がなく中断したため、この差はAITerm maintenance候補として別管理する。
