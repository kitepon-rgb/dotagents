# t-docs 台帳・host matrix・文書同期 — 完了証跡

## 何を作ったか

- `docs/factory-product-contracts.md`: タイトル・共通境界の製品数を11→12（自作コア10→11）へ更新し、
  `### peertable`節を新規追加。version入口・diagnostics schema（`peertable.native_factory_diagnostics.v1`）・
  checks集合・現adapter（`lib/factory/v7.mjs`の`projectPeertableFactory`/`peertableProduct`）・
  wire（`V7_PRODUCT_IDS`固定15製品、BugHub enroll/cutoverはH承認待ち）・release gate
  （`scripts/verify-release-commit.mjs`）・表現/禁止を記載。すべてpeertable repo `room/client.mjs`・
  dotagents `lib/factory/v7.mjs`の実物とt-adapter/t-gate完了証跡を読んで実測どおりに書いた。
- `docs/factory-host-product-matrix.md`: 更新日を2026-08-10へ。製品導入matrixへpeertable行
  （Mac=required・実測済み／main-server=required・`deploy/compose.yaml`常駐／FOX WSL2・Windows native=
  optional・未実測）、親別connector matrixへpeertable行（team編成時だけMCP `room` required）を追加し、
  Spotter踏襲の脚注へunverified起点の注記を足した。
- 製品数記載の同期: `AGENTS.md`（計11→12製品）、`PLAN.md`（管理対象11→12製品。push恒久裁定の
  「自作コア10製品」句はcampaign中の一時push裁定と恒久裁定を混同しないため対象外のまま据え置き）、
  `README.md`（自作コア10→11製品の表・工場コア製品変更管理の11→12製品）、
  `docs/01_project-layout.md`（工場コア互換10→11製品）、`docs/plan_factory-master.md`
  （現在の工場・自作コア10→11製品）。
- `docs/03_settings-fragments.md`: コア製品repoアクセス断片の`additionalDirectories`へ
  `<HOME>/Developer/peertable`を追加し、製品数10→11を文言同期。

## どう確認したか

- `grep -rn "11製品\|自作コア10\|コア10\|10製品" --include="*.md" .`（archive/adr/evidence除外）で
  未同期箇所が無いことを確認。残ったのはPLAN.md:14・shared/constitution.md:74（generated先の
  claude/CLAUDE.md・codex/AGENTS.mdも同型）のpush恒久裁定句のみで、これは意図的に対象外とした
  （下記「範囲外として残したもの」）。
- `npx markdownlint-cli2@0.23.0`を編集した全docsへ実行し0 error確認（このrepoの`make lint-md`と
  同一設定・同一版）。
- factory-product-contracts.mdのpeertable節は、peertable repo `room/client.mjs`の`runDiagnostics`
  実装（checks集合・schema名・overall判定）を実際に読み、`lib/factory/v7.mjs`（tsumugi実装・
  commit 9be1e94）の`projectPeertableFactory`/`peertableProduct`を実際に読んで記載内容を突合した
  （設計の言葉ではなく実装済みコードを読んだ記述）。
- host matrixのpeertable行「Mac required・実測済み」は、本campaignがpeertable-onboarding room
  （Mac上・MCP `room`稼働中）で実際に進行していること自体を実測根拠とした。「main-server required」
  は`deploy/compose.yaml`（`192.168.1.2:18860`、`.team/setup-state.json`の`server_url`と一致）を
  実際に読んで確認した。FOX WSL2/Windows nativeは未実測のため`optional`起点とし、`required`へ
  丸めなかった。

## 監査で見てほしい点

- host matrixの`optional（未実測）`起点判断（FOX WSL2/Windows native）が妥当か。
- push恒久裁定句（PLAN.md:14・shared/constitution.md:74・生成物2箇所）を今回のt-docs範囲から
  意図的に除外した判断（「編入完了」の定義がdocs/host-matrix更新までかH承認済み実publishまでか
  campaign設計に明記が無く、恒久裁定は取り消せない重みを持つため、owner裁定なしに自作コア10→11へ
  含めるのは避けた）。

## 範囲外として残したもの

- `shared/constitution.md:74`（push既定認定(b)の「自作コア10製品」）と、その生成物
  `claude/CLAUDE.md:78`・`codex/AGENTS.md:78`、および同型句の`PLAN.md:14`。peertableのpush既定は
  本campaign中はオーナー裁定（2026-08-10、両repoともpush既定）の一時規定（認定基準(c)）で成立して
  おり、campaign完了後にpeertableを恒久裁定(b)の対象へ含めるかはオーナー裁定が要ると判断した。
  含める場合は`node bin/render-global-constitution.mjs --write`での再生成と`make lint-constitution`
  確認が必要になる。t-hpkgのH承認パッケージへ論点として引き継ぐ。

## 追記（2026-08-10・受理後の自己発見）

t-docs受理（room [29]）後、t-adapterの監査中に自分でtest一式を実行したところ、台帳/README総製品数を
リテラル固定していた既存test 2件が本taskのcommit(28d50d8)でfailすることを発見した:
`tests/wire-v6/wire-v6.test.mjs`（`# 工場管理11製品`固定）、`tests/lattice-cutover/wire-v4.test.mjs`
（`自作コア10製品...Lattice`固定）。両testの本来の検証対象（Observer/Lattice個別事実の残存）は総数と
無関係なため、正規表現で数値部分を`\d+`へ汎化し追随可能にした（commit 605d682・.lattice store記録は
d61f862、いずれもpush済み）。`node --test`でwire-v5/v6/v7/lattice-cutover/factory-reporter/constitution
一式38 test全green再確認。t-docs着手時にtest実行を検証手順へ含めていなかったのが原因——次回は
docsだけの変更でも`node --test`を最後に通す。

記録者: koharu
