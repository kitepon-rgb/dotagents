# peertable-onboarding 終端監査（terminal-audit phase）決定証跡

## 対象

plan `peertable-onboarding`（s1・t-diag・t-adapter・t-gate・t-docs・t-hpkg 全task done）の
terminal-audit phase gate。個別task監査はすべて別席の独立監査で既に受理済み
（s1/t-diag: room [15] hinata軽監査、t-adapter: room [31] koharu監査・bell受理、
t-gate: room [17] koharu監査・[21] bell受理、t-docs: room [27]・[34] tsumugi監査・[29]・[36] bell受理）。
終端監査はplan全体としての受入条件充足を、個別task監査結果に加えて自分の環境で独立に再実測した。

## 受入条件（docs/plan_peertable-onboarding.md「受入条件」節）と実測

### ①peertableがnative diagnostics（read-only JSON・schema付き）とrelease gate（publish対象は既定ブランチ祖先だけ）を自身のrepoに持つ

- `peertable/room/client.mjs`の`runDiagnostics`を読解。schema `peertable.native_factory_diagnostics.v1`、
  checks（version_consistency/bin_integrity/node_runtime/skill_bundle/room_reachability）、
  overall（ready/not_ready/unverified）判定を確認。
- `cd peertable && npm run verify:release-commit` を自分で実行し
  `release commit 3f8b5af83c5a is landed on origin/main.` でexit 0を確認（既定ブランチ祖先gateが実働）。

### ②dotagentsがwire v7 client（adapter・contract・tests・privacy fixture）と文書整合（契約台帳・host matrix・製品数表記・settings断片）を持つ

- `lib/factory/v7.mjs`・`lib/factory/contract.mjs`（`V7_PRODUCT_IDS`・`validateReportV7`・
  `SAFE_CONTEXT_ALLOWLIST`のpeertable空allowlist）を読解。
- `node --test tests/wire-v5 tests/wire-v6 tests/wire-v7 tests/lattice-cutover/wire-v4.test.mjs
  tests/factory-reporter/v2-contract.test.mjs tests/constitution/generation.test.mjs`
  を自分の環境で実行し38 test全green確認（t-docsが割った2 testの修正・t-hpkg着地後の再実行を含む）。
- `docs/factory-product-contracts.md`・`docs/factory-host-product-matrix.md`・`AGENTS.md`・`PLAN.md`・
  `README.md`・`docs/01_project-layout.md`・`docs/plan_factory-master.md`・
  `docs/03_settings-fragments.md`のpeertable関連記述を確認。
  `grep -rn "11製品\|自作コア10\|コア10\|10製品" --include="*.md" .`（archive/adr/evidence除外）で
  残るのは意図的にt-hpkgへスコープ外送りしたpush恒久裁定4箇所（PLAN.md:14・shared/constitution.md:74・
  claude/CLAUDE.md:78・codex/AGENTS.md:78）だけであることを確認。

### ③npm publish・BugHub/ServerManager wire v7 enroll・4host cutoverはH承認待ちとして承認要求文書に整理され、実行されていない

- `npm view peertable version` → `0.3.5`（`peertable/package.json`の`version`も`0.3.5`一致。
  0.3.6化していない＝publish未実行）。
- ServerManager repoを`grep -rn "peertable\|wire.v7\|wire_v7"`で検索。
  `docs/archive/plan_bughub_version_aware_lifecycle.md`の仮定的言及1件のみで、
  live enrollment/config実体は無し。
- `docs/evidence/2026-08-10-peertable-wire-v7-H-approval.md`・
  `docs/evidence/peertable-onboarding/t-hpkg.md`を読み、npm publish・wire v7 enroll・4host cutoverの
  3 Operationが未実行のまま承認要求として整理され、push恒久裁定4箇所の引き継ぎも明記されていることを確認。

## 結論

3項とも欠陥なし。新規欠陥探索ではなく、個別task監査で確認済みの実装・文書に対する
plan全体としての受入条件突合として十分と判断する。room [42]・[43]・[44]（koharu所見・tsumugi同意・
bell受理）を意思決定の記録として残す。

記録者: koharu
