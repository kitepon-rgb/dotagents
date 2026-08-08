# plan_peertable-onboarding — peertableを工場管理12製品目へ編入する

status: **suspended**（2026-08-08 開始、同日中断。オーナー裁定: peertableをLatticeへ内蔵する可能性が浮上し、独立製品としての編入前提が保留）。ToDoの正本はLattice store（plan `peertable-onboarding`）であり、本書は目的・思想・受入条件・導線だけを所有する。

中断時点の現在地: s1（診断契約）は円卓全員合意まで到達し、契約はpeertable repo `docs/plan.md` 決定45としてcommit済み（push未・オーナー明示指示待ち）。t-adapter以降は未着手。詳細はLattice s1のnoteを参照。再開はLattice内蔵可否のオーナー裁定後。

## 目的

peertable（`kitepon-rgb/peertable`、npm `peertable@0.1.0`）をdotagents工場管理の12製品目（自作コア11製品目）として編入する。標準の追加wave 1本で行い、特別扱いの新設計をしない。

## 思想（オーナー裁定 2026-08-08）

- **peertableは意図的に独立した製品である**。dotagentsが無くてもユーザーに届く（npm配布・skill同梱）。編入はdotagentsが統合契約だけを持つことであり、融合ではない。
- 不可侵原則: `skill/`はpeertable repoが所有しnpm同梱で配る（dotagentsの`claude/skills/`や`install.sh`へ移さない）。診断は製品機能として作り工場語彙を混ぜない。adapterはread-onlyでroom DB・member state・message本文を解釈しない。peertable側の変更はpeertable repoの独立commit・releaseで閉じる。
- room server到達性はServerManagerのserver profile / Observerの`not_applicable`という既存パターンを踏襲する（常駐面はSpotter hub・Lattice MCP等で既出であり、peertableだけの新規論点ではない）。

## 受入条件

- peertableがnative diagnostics（read-only JSON・schema付き）とrelease gate（publish対象は既定ブランチ祖先だけ）を自身のrepoに持つ。
- dotagentsがwire v7 client（adapter・contract・tests・privacy fixture）と文書整合（契約台帳・host matrix・製品数表記・settings断片）を持つ。
- npm publish・BugHub/ServerManager wire v7 enroll・4host cutoverはH承認待ちとして承認要求文書に整理され、実行されていない。

## タスク（正本はLattice。本書からmigrate済み）

### s1 診断契約の設計とroom合意

peertable native diagnosticsの契約（入口コマンド・schema名・check集合・server/client分離）を設計しroomで合意する。

### t-adapter dotagents adapter＋wire v7 client実装

`lib/factory/v7.mjs`・contract配線・tests・privacy fixture・`docs/wire-v7-design.md`。

### t-diag peertable native diagnostics実装

s1合意契約をpeertable repoへ実装（テスト・README追記含む）。

### t-docs 台帳・host matrix・文書同期

契約台帳peertable節・製品数11→12・host matrix行・settings断片・他文書のrg同期。

### t-gate peertable release gate導入

aishell `verify-release-commit.mjs`参照の機械gate＋`prepublishOnly`。

### t-hpkg H承認パッケージ準備

publish・wire v7 enroll・cutover・公開後smokeの承認要求文書（実行しない）。

## 依存

s1 → {t-adapter, t-diag, t-docs}、t-diag → t-gate、{t-adapter, t-docs, t-gate} → t-hpkg。

## 導線

- 進行はPeertable円卓（room `peertable-onboarding`・メンバー3・親bell）。運用はpeertable skill正典に従う。
- 製品追加手順の正典は[README.md](../README.md)「工場コア製品の変更管理」、契約の置き場は[factory-product-contracts.md](factory-product-contracts.md)。
