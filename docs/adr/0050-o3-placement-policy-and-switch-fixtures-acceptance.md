# ADR 0050: O3 Phase 3残TODO（配置原則・placement policy・非偽装切替fixture）受入

- Status: Accepted
- Date: 2026-07-17
- Parent canon: `docs/plan_factory-master.md`
- Design decision: [ADR 0045](0045-o3-consultation-multiprovider-schema.md) §2（相談役異社原則・
  02_models単独解決）、[ADR 0043](0043-o3-claude-provider-adapter-boundary.md) §5（Observer票除外）
- Control: `observer-factory-20260715` Task `o3-placement-policy-and-switch-fixtures`

## Context

Phase 3「Elasticのprovider対称化」の残TODO 3件を一つのfocused gate単位で閉じた。
実model request、login、credential操作、network dispatchは行っていない。

## 受入対象

| 種別 | commit | 内容 |
|---|---|---|
| source/test | `209e2df` | `placement-policy.mjs`（role→provider配置関係・connector family分類・fail-closed純関数）、三者一致fixture、provider障害切替の非偽装fixture、`CONSULTATION_CONNECTORS_V26` export |
| docs | 本ADRと同一commit | `shared/orchestrate/contract.md`「知能の配置原則（provider対称）」節、親・子plan完了化 |

## Decisionの要点（実装形の裁定）

- **配置原則は「関係」だけを契約化する**: observer=同provider family、consultant=異provider第一候補、
  worker=適格集合内の適応配置。役割→モデルの解決は`docs/02_models.md`のみで行い、
  契約にもコードにもモデル名を焼き込まない（ADR 0045 §2、PLAN原則9）。
- **相談役異社は第一候補原則であり強制拒否ではない**: policyはconnectorをcross/sameへ分類して返し、
  同family connector（例: Codex親からのgpt-connector＝ChatGPT相談）の利用を壊さない。
  hard validatorによる拒否は採らない（既存の正当な同社相談laneを破壊するため）。
- **三者一致fixture**: policyのconnector集合＝Control schema v26のconnector closed enum＝
  adapter catalogのconsultation lane adapter集合を単一fixtureで結線し、片側だけの追加・削除を
  test failureとして露出させる。
- **切替の非偽装は既存validatorの実fixture化**: 同一assignmentの再相談はfailed終端後のみ
  （`ASSIGNMENT_ACTIVE`）、元recordのstate・handle・terminal_evidence不変、consultation ID再利用は
  `DUPLICATE_ID`。Worker側のfallback宣言（v20/v21のfallback参照とreceipt束縛）は既存契約のまま。

## Gate（実測）

- related gate（`control-record.test.mjs`＋`executor-adapters.test.mjs`＋`executor-contracts.test.mjs`＋
  `placement-policy.test.mjs`）: **132/132、fail 0、skip 0**（一回実行）。
- lint（`make lint-js`）: green。`git diff --check`: clean。
- full regressionはPhase O3完了時のPhase gateへ集約（本単位では未実施）。

## 未実施（本単位の非目標）

- 実model request・login・credential・network dispatch（live smokeは後続live H gate）。
- rate-aware selector（O4・v27）と残quota入力による一般Worker自動配置。
- aiterm（Grok/Composer）のconsultation lane（xAI familyはconsultation policy対象外のまま、
  fail-closedで`PROVIDER_FAMILY_UNKNOWN`）。
