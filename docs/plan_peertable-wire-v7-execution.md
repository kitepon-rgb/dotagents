# plan_peertable-wire-v7-execution — peertable H承認4件の実行

status: **completed**（2026-08-10 開始・同日完走。全task done・終端監査accepted。carry over: main-server自身のhost分cutover・FOX WSL2/Windows native 2host分——次に各端末を触るwaveで実施、手順はdocs/evidence/2026-08-10-peertable-wire-v7-H-approval.mdと各証跡が正）。ToDoの正本はLattice store（plan `peertable-wire-v7-execution`）であり、本書は目的・受入条件・導線だけを所有する。

親plan [plan_peertable-onboarding.md](plan_peertable-onboarding.md)は全task done・終端監査acceptedで完全closeした。本waveはそのplanのt-hpkgが整理した[H承認要求文書](evidence/2026-08-10-peertable-wire-v7-H-approval.md)4件のうち、オーナーが2026-08-10「全部承認」と裁定した実行フェーズを持つ（room `peertable-onboarding` log [45]）。

## 目的

H承認済みの4件を実行する。①npm publish（0.3.5→0.3.6）②ServerManager wire v7 enroll＋4host段階cutover③公開後smoke④正典4箇所の自作コア製品数更新。①→②→③は逐次（rollback手順の再読・実行コマンドの突合を経て次工程へ進む）、④は独立。

## 受入条件

- peertable npm registryの最新versionが`0.3.6`になり、release gateを通した公開である。
- ServerManagerがwire v7固定15製品を`FACTORY_V7_INGEST_ENABLED`のserver-first段階で受理し、到達可能なhost（Mac canary、必要なら段階的に他host）でdual-runまたはcutoverが実測される。到達不能なhost（FOX WSL2/Windows native）は残作業として明示する。
- 公開後smokeで`peertable-client diagnostics --json`の`overall: ready`とwire v7 reporterの非回帰が実測される。
- 正典（PLAN.md・shared/constitution.md・生成物claude/CLAUDE.md・codex/AGENTS.md）の「自作コア10製品」句が11製品へ更新され、`render-global-constitution.mjs`と`lint-constitution`が通る。

## タスク（正本はLattice。本書からextract）

### t-publish peertable npm publish（0.3.5→0.3.6）

H承認[45]①・[H承認要求文書](evidence/2026-08-10-peertable-wire-v7-H-approval.md)対象1。release gate（`scripts/verify-release-commit.mjs`、`prepublishOnly`連結）を実戦で通し、0.3.5→0.3.6（patch、API/診断契約変更なし）をnpm publish、tag v0.3.6。実行前に目的・影響・rollback（unpublishせずdeprecateしglobal installを0.3.5へ戻す）をroomで一言確認してから実行する。

### t-enroll-cutover ServerManager wire v7 enroll + 4host段階cutover

H承認[45]②のうちコード実装部分（part A・B）。`docs/wire-v7-design.md` §7 server-first migrationに従う: ServerManagerへv7 schema・固定15製品・endpoint追加（`FACTORY_V7_INGEST_ENABLED=false`既定）＋dotagentsへ配信CLI（`bin/factory-reporter-v7.mjs`等）追加。flag既定falseのため本番挙動は変えない。**実deploy・flag有効化・cutoverはt-cutover-deployへ分割**（room `peertable-onboarding` [69]・[74]、調査の結果リスク粒度が異なると判明したため）。

### t-cutover-deploy 実deploy＋flag有効化＋Mac canary dual-run＋host別段階cutover

H承認[45]②の残り（part C）。t-enroll-cutoverが実装したServerManager wire v7を実際にserver-first deployし、`FACTORY_V7_INGEST_ENABLED=true`へ有効化、Mac canaryでv6/v7 dual-runを実測し、到達可能hostから段階cutoverする。一括不可逆cutoverはしない。FOX WSL2/Windows nativeはこのセッションから到達不能なため、carry over対象として明示する（bell[45]了承済み）。実行前にt-enroll-cutoverの完了とrollback手順の再読・実行コマンドの突合をroomで確認する。Lattice上は`todo migrate`が既存plan_keyへの追記に対応しない実測制約（`plan_key_already_exists`）のため、姉妹plan `peertable-wire-v7-cutover-deploy`として登録する。

### t-smoke 公開後smoke

H承認[45]③。`npm install -g peertable@0.3.6`後に`peertable-client diagnostics --json`が`overall: ready`を返すこと、wire v7 reporterのdry-runがv6 baselineと非回帰であることを対象hostで確認する。

### t-constitution 正典4箇所の自作コア製品数を11へ更新

`PLAN.md:14`・`shared/constitution.md:74`の「自作コア10製品」句をH承認[45]④どおり11製品へ更新し、`node bin/render-global-constitution.mjs --write`で`claude/CLAUDE.md`・`codex/AGENTS.md`を再生成、`make lint-constitution`で正本＋deltaと生成物の完全一致を確認する。①②③とは独立で依存なし。

## 依存

t-publish → t-enroll-cutover → t-cutover-deploy（姉妹plan） → t-smoke。t-constitutionは独立。

## 導線

進行はPeertable円卓（room `peertable-onboarding`・メンバー2・親bell）。運用はpeertable skill正典に従う。フェーズゲート（実publish前・実cutover前の相互確認）は正式なLattice Phase機構ではなく、room上の明示的な確認発言（rollback手順の再読・実行コマンドの突合の記録）で代替する——`todo migrate`（既存store併合用）はphase構造を持たないため（`lattice.todo_extraction.v3`にphases欄が無いことを実測確認済み）。
