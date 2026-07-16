# ADR 0049: O3 Consultation多provider v26実装受入

- Status: Accepted
- Date: 2026-07-17
- Parent canon: `docs/plan_factory-master.md`
- Design decision: [ADR 0045](0045-o3-consultation-multiprovider-schema.md)（本ADRは受入記録であり、0045へ追記しない）
- Control: `observer-factory-20260715` Task `o3-consultation-multiprovider-v26-implementation`

## Context

ADR 0045で裁定したConsultation多provider schema（O3=v26／O4=v27）を実装した。
Control schema v26のtyped `consultation_handle`、v25継続読取・mutation、明示`control-migrate`、
brief/resume-check v7、adapter層のconsult-v1拡張までを一つのfocused gate単位で閉じた。
実model request、login、credential操作、network dispatchは行っていない。

## 受入対象

| 種別 | commit | 内容 |
|---|---|---|
| source/test | `50d79d5` | v26定数・versioned consultation validator・reader dispatch、`control-migrate`（up/rollback）、brief/resume-check v7、consult-v1 catalog entry、failure supportのadapter_id×lane keying、consult request/observation builder、Gate fixture一式 |
| design docs | `f1c7655` | ADR 0045（設計Decision・独立commit・前セッション） |

## ADR 0045 Gateとの照合（focused fixture）

Gate節の全項目をtestで固定した（`tests/orchestrate/control-record.test.mjs`／`executor-adapters.test.mjs`）:

- v25読取＋v25 mutation継続（実v25 Control相当のmanifestで記録・観測・brief継続）
- v26新規作成（init=v26、claude-native／codex-sidecar consultationの記録〜終端）
- v25→v26 migration（slug→handle決定的変換、receiptのfrom/to version、revision+1）
- rollback可（gpt-connectorのみ→v25、migrate receiptは両versionで有効、再migrationまで）／
  rollback不可（非gpt存在→`ROLLBACK_UNSUPPORTED`）
- receipt容量際のmigrate拒否（`CONTROL_CAPACITY_RESERVED`・架空の空きなし）
- 未知connector／handle shape違反（claude-nativeへのslug shape・大文字UUID・gptへのnull）／
  slug詰込み（v25 shapeへの非gpt connector、v26 manifestへのv25 shape）の拒否
- v25 manifestへのtyped handle recordの`SCHEMA_UPGRADE_REQUIRED`
- consultation observation schemaのworker projection拒否（`PROJECTION_UNSUPPORTED`・両方向）
- consult-v1のworker lane登録拒否（`LANE_FORBIDDEN`）と、worker executorとしての
  非operational確認（`ADAPTER_UNKNOWN`）
- brief/resume-check v7の`consultation_handle`投影（v25は`{slug}`正規化、v6 pinの更新）

## 親監査の結果

- `codex_opinion`の実配布物契約（`readonly: true`、required `projectRoot`、
  `modelReasoningEffort` enum `low|medium|high|xhigh`）と生成引数を照合した。request builderは
  write系引数（`allowWork`／`preserveWorktree`／`idempotencyKey`）を生成しない。
- claude-native consult argvはWorker lane（ADR 0043/0044で2.1.211実CLIと照合済み）と同一flag集合の
  範囲内で、tool policyだけを`--tools ""`（全tool無効）へ固定し`--allowedTools`を生成しない。
  禁止flag（`--continue`／`--fallback-model`／`--bare`／`--safe-mode`／`--no-session-persistence`）
  非生成をfixtureで固定した。
- migration/rollbackの決定的変換はmutation transaction内で全manifest再検証と
  global整合検査を通ってから永続化される（既存機構を迂回しない）。
- finalized／archived Controlのmigrate禁止は既存の`CONTROL_FINALIZED`／`RECORD_ARCHIVED`が
  そのまま担保する（新設の抜け道なし）。

## Gate（実測）

- related gate（`control-record.test.mjs`＋`executor-adapters.test.mjs`＋
  `executor-contracts.test.mjs`）: **127/127、fail 0、skip 0**（受入前baseline 117/117に
  本単位のfixture追加分を含む。一回実行）。
- lint（`make lint-js`）: green。`git diff --check`: clean。
- full regressionはPhase O3完了時のPhase gateへ集約し、本単位では実行しない（頻度規約どおり）。

## 契約整合（同時受入）

- `shared/orchestrate/control-record.md`: schema歴へv26、Consultation節のconnector enum＋
  connector別handle shape＋sidecar終端evidence条件、`control-migrate`節（容量際・data-plane限定
  rollback・revert安全性）、receipt operation集合、brief/resume-check v7、CLI・API・error code一覧。
- `shared/orchestrate/executor-adapters.md`: catalog表へconsult-v1の2 entry、consult-系laneの
  fail closed規則、adapter_id×lane failure matrix、claude-native／codex-sidecar consultation
  packet/projection節、Control Record bridgeのlane遮断。
- `docs/02_models.md`: Consultation多provider化の入口1行（projection-only・live H gate前）。

## 未実施（本単位の非目標）

- 実model request、login、credential、network dispatch、push、publish、deploy、意図的障害試験。
- `--tools ""`＋`-p`のlive挙動実測（ADR 0045どおり後続live H gateへ残置）。
- `observer-factory-20260715`自体のv25→v26 migration（ADR 0045 §5どおり、多provider consultationを
  実際に記録する直前まで行わない）。
- O4 selector decision（v27）とaiterm consultation lane。

## 運用上の再確認（ADR 0045 §6）

v26 manifestまたはmigrate receiptが1件でも生まれた後は、本実装コミットのrevertは安全でない。
後退はdata-plane rollback（`control-migrate`のv25方向）＋前方修正で行う。本受入時点で
実storeにv26 manifestは存在しない（新規initが発生した時点から上記制約が効く）。
