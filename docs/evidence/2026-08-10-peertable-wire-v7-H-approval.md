# peertable公開・wire v7 enroll・cutover H承認要求

- Date: 2026-08-10
- Requested by: tsumugi（peertable-onboarding campaign、Lattice task `t-hpkg`）
- Decision owner: クオ
- Decision: **承認済み（4件すべて・2026-08-10）**

peertable編入campaignの実装（s1・t-diag・t-adapter・t-gate・t-docs）は全task受理済み。
残るのはオーナー承認が要る3件の実行だけであり、本書はその承認要求パッケージである。
**本書の作成自体はH操作ではない——ここに書かれた3件はいずれも未実行。**

## 承認を求める対象（3件、個別承認可）

### 1. peertable npm publish（version bump）

- 目的: t-gateで導入したrelease gate（`scripts/verify-release-commit.mjs`＋`prepublishOnly`連結、
  peertable repo commit `3f8b5af`）を公開版へ届ける。現在npm registryの最新は`0.3.5`のまま
  （2026-08-10実測、`npm view peertable version`）で、`3f8b5af`は未publishのgit commitとして
  ローカルに残っている。
- 影響: `kitepon-rgb/peertable`のnpm公開版が`0.3.5`→`0.3.6`（patch。API/診断契約に変更なし、
  release gateというdev tooling追加のみ）になる。global installを更新すると
  `npm publish`実行時にrelease gateが機械的に効くようになる。
- Operation contract:
  `{"operation":"peertable-npm-publish","repo":"kitepon-rgb/peertable","from_version":"0.3.5","to_version":"0.3.6","changes":["scripts/verify-release-commit.mjs導入(3f8b5af)","package.json prepublishOnly連結"],"tag":"v0.3.6"}`
- Operation digest:
  `e3901b8942c5babac0dad8570a73bfe2c534e6d8979cce6f3ae4c61aecad0ea4`
- rollback: npmはunpublishせず`0.3.6`をdeprecateし、global installを`0.3.5`へ戻す
  （decision45契約自体は`0.3.5`で既に実装済みのため、rollbackしても診断契約は失われない）。

### 2. BugHub/ServerManager wire v7 enroll + 4host cutover

- 目的: `lib/factory/v7.mjs`（dotagents側、commit `9be1e94`）が実装済みのwire v7固定15製品
  （`peertable`をwire product idとして追加）を、実際のfactory report経路へ乗せる。
- 影響: `docs/wire-v7-design.md`の§7 server-first migrationに従い、ServerManagerへv7 schema・
  固定15製品・expectation・fixture・endpoint（`POST /api/factory/v7/reports`）を追加し、
  `FACTORY_V7_INGEST_ENABLED=false`を既定にした上でserver側先行deployする。検証後、
  dotagents側へ`bin/factory-reporter-v7.mjs`等の配信CLIを追加し（本campaignのt-adapterでは
  未実装。§「範囲外」参照）、canary host（Mac）からv6/v7 dual-runを開始し、host別に段階cutoverする。
  一括不可逆cutoverはしない（factory-reporter-runbook.md §4a・§6の既存rollback手順をv7へ適用）。
- Operation contract:
  `{"operation":"peertable-wire-v7-enroll-cutover","server":"main-server","hosts":["mac-kite","main-server","fox-wsl","windows-workstation"],"feature_flag":"FACTORY_V7_INGEST_ENABLED=true","wire_product_count":15,"server_first":true,"dual_run":true}`
- Operation digest:
  `4d8434863aeb1a4ff1b52e6449c744379dcf0bac30efa54976d3f9447350fe94`
- rollback: 全hostをv6 reporterへ戻し、server側`FACTORY_V7_INGEST_ENABLED=false`で受付停止。
  v6 endpoint・固定14製品契約・BugHub issue historyは維持する（v6→v5の既存rollback手順と同型）。

### 3. 公開後smoke

- 目的: 1・2が実行された後、実機で契約が生きていることを確認する。
- 内容: `npm install -g peertable@0.3.6`後の`peertable-client diagnostics --json`が
  `overall: ready`を返すこと、wire v7 reporterのdry-runがv6 baselineと非回帰であることを
  対象hostで確認する。
- Operation contract:
  `{"operation":"peertable-post-publish-smoke","targets":["npm install -g peertable@0.3.6","peertable-client diagnostics --json overall==ready","wire v7 reporter dry-run against v6 baseline"],"rollback_verified":true}`
- Operation digest:
  `07a207711eb5a91ec7c5eaf34861a77bb530e135a493890f82b9f95bae992a00`
- rollback: 対象なし（読み取り検証のみ。smoke失敗時は1・2のrollback手順を発動する）。

## 目的・影響・rollback（campaign共通）

- 目的: peertableをdotagents工場管理12製品目（自作コア11製品目）として編入する。標準の追加wave
  1本で行い、特別扱いの新設計をしない（オーナー裁定 2026-08-08）。
- 影響: 上記3件はいずれも公開契約・本番設備・4hostの運用状態を変える。3件は独立に承認可能だが、
  2は1の完了（release gate入り版の公開）を前提とし、3は1・2の完了を前提とする
  （plan依存: `{t-adapter, t-docs, t-gate} → t-hpkg`のとおり、本書はH承認待ちとして
  「承認要求文書に整理され、実行されていない」ことが受入条件——plan_peertable-onboarding.md）。
- rollback: 各項目のrollbackは独立して発動できる。3件とも実行前の状態（npm `0.3.5`、
  wire v6運用、cutover未実施）へ戻せる。公開済みversionの履歴改変・unpublishはしない
  （既存H承認文書と同じ規律、AIShell/Observer前例踏襲）。

## 不可侵原則（実行時も維持すること）

- `skill/`はpeertable repoが所有しnpm同梱で配る。dotagentsの`claude/skills/`や`install.sh`へ
  複製・移設しない。
- adapter（`lib/factory/v7.mjs`）はread-onlyでroom DB・member state・message本文を解釈しない。
- peertable repoの変更はpeertable repoの独立commit・releaseで閉じる。
- push既定は両repoとも工場管理repoの恒久裁定で有効（本campaign中の一時裁定ではなく、
  [製品契約台帳](../factory-product-contracts.md)の共通境界に従う通常運用）。

## 範囲外として本書に含めないもの

- push恒久裁定の「自作コア10製品」句（PLAN.md:14・shared/constitution.md:74・生成物
  `claude/CLAUDE.md`・`codex/AGENTS.md`）を自作コア11製品へ更新するかは、
  t-docs（commit `28d50d8`）が別論点としてこの承認要求へ引き継いだ。グローバル正典の
  恒久裁定書換えは`node bin/render-global-constitution.mjs --write`と`make lint-constitution`
  を伴う別種の操作であり、上記3件のOperation digestには含めていない。承認する場合は
  別途の一言で構わない（例:「4件とも承認する」）。

## 承認欄（オーナー記入）

- owner statement: 「全部承認」（bell経由セッションでの直接発言。bellが転記）
- approved at: 2026-08-10
- 承認範囲（3件のうちどれを承認するか。上記「自作コア11製品」句の更新可否も併記可）: 4件すべて——①npm publish 0.3.5→0.3.6 ②wire v7 enroll＋4host cutover ③公開後smoke ④push恒久裁定「自作コア10製品」→11製品への正典更新（4箇所＋render＋lint）
