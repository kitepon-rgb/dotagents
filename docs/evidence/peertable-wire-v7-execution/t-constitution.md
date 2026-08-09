# t-constitution 正典4箇所の自作コア製品数を11へ更新 — 完了証跡

## 何を作ったか

- `PLAN.md:14`・`shared/constitution.md:74`のpush恒久裁定句「自作コア10製品」を「自作コア11製品」へ更新
  （H承認[45]④・オーナー2026-08-10「全部承認」）。peertable-onboarding plan（t-docs）で意図的に
  スコープ外送りしていた論点の実施。
- `node bin/render-global-constitution.mjs --write`で`claude/CLAUDE.md`・`codex/AGENTS.md`を再生成し、
  「自作コア11製品」が両生成物へ正しく伝播したことを確認。
- `docs/canon-migration-manifest.json`のentries[11]・entries[24]（`docs/factory-product-contracts.md`
  「共通境界」節への旧migration記録、`receiver_text`にAGENTS.md/PLAN.mdの旧文言を凍結保持）を、
  factory-product-contracts.mdの現行文（t-docsで既に11製品化済み）へ更新——放置すると
  `make lint`の`lint-canon-migration`が「現行規範全文が逐語で含まれない」でfailし続けるため。

## 副産物: `make lint`実行で見つけた既存の破損3件を修理した

t-constitution着手中に初めて`make lint`をフルで回したところ、**t-docs（このplanと無関係の先行work）が
数時間前に割っていた3件の破損**を発見した。いずれもt-docs時点では対象範囲外だった検証コマンドで
気づかれていなかったもの:

1. `tests/constitution/generation.test.mjs`が`common`（生成後のclaude/CLAUDE.md本文）に対し
   push既定認定文の全文リテラルmatchを持っており、「自作コア10製品」のまま固定されていた
   ——今回の意図的な変更で当然failするので、`11製品`へ更新。
2. `tests/skills/smoke.sh`が`PLAN.md`の同文言をリテラル`contains`していた——同様に更新。
3. `docs/canon-migration-manifest.json`のentries[11]/[24]（上記）。

1・2は今回自分の変更が割ったもの、3はt-docsの時点で既に割れていたが誰も気づいていなかったもの
（t-docsはこの文を意図的にスコープ外にしていたので当時は無関係に見えたが、実際は
factory-product-contracts.mdの共通境界文をt-docsが書き換えた時点で3は既に破損していた）。

## どう確認したか

- `make lint-constitution`: OK（正本＋deltaと生成物の完全一致）。
- `make test-constitution`: `node --test tests/constitution/generation.test.mjs` 5 test全green。
- `bash tests/skills/smoke.sh`: OK。
- `node scripts/verify-canon-migration.mjs`: OK（56 entries）。
- `make lint`: 全ゲート（shellcheck・py-syntax・markdownlint・constitution parity・
  canon-migration・skills・hooks smoke）ALL PASS（exit 0）。

## markdownlint例外を1件追加した

`docs/evidence/**`を`.markdownlint-cli2.jsonc`の`ignores`へ追加（`docs/04_ci.md`にも理由を記載）。
tsumugiのt-docs監査時証跡`docs/evidence/peertable-onboarding/terminal-audit.md`が
`room発言引用[42][43]`をMD052（reference-link）に誤検知されてlint failしていたが、この
fileはLattice `phase_accept`イベントの`decision_evidence`としてgit_blob_oid/content_digestが
既に束縛されており、**内容を書き換えて直すと証跡のdigestと食い違う**（実際に一度誤って
編集してしまい、digest不整合に気づいてrevertした）。archiveと同じ「凍結記録」区分として除外した。

## 範囲外

- ①npm publish（tsumugi・t-publish完了済み）②ServerManager wire v7 enroll+4host cutover
  ③公開後smoke——t-constitutionはこれらと独立（依存なし）。

記録者: koharu
