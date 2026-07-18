# ADR 0061: 統括レーン発動条件を機能ORへ改訂し比例原則と技法分離を明文化する

- Status: accepted
- Date: 2026-07-18
- 裁定者: オーナー（本日の対話裁定）＋fable refuter監査1回（初案「複数Executor＝昇格」は差し戻し・
  本形はその対案に基づく）
- Supersedes: [ADR 0048](0048-control-scope-lane-guardrails.md)のレーン定義（3条件AND）および
  [ADR 0040](0040-elastic-control-lifecycle.md)のレーン定義記述。**両ADRの他のDecisionは不変**。
  以後のレーン定義は本ADRと`shared/constitution.md`「作業レーンと統制」だけを正とする

## Context

旧定義は「複数repo・複数Executor・複数Phaseが実際に揃う戦役だけ」（AND）。オーナー裁定: repo数と
Phase数を必要条件にするのは厳しすぎ、また調査研究・監査の多エージェントfan-outがオーケストレーションの
型から排除されている。中間案「複数Executorの実展開で発動」はrefuterが差し戻し——read-only並列や
Workflow内蔵fan-outまで重装備化する過剰包摂・「跨ぎそう」という予測ベース発火・retry Runによる
遡及昇格の構造矛盾のため。

## Decision

### 1. 発動条件（機能OR・着手時判定・予測ゼロ）

次のいずれか1つでも**着手時点の作業構造として確定**しているなら統括レーンで着手する:

1. **計画に中断が組み込まれている**（承認待ち・外部完了待ち・複数波の波間停止が工程上確定）
2. **受入が多段に連鎖する**（Aの受入がBの前提になる連鎖が複数段ある）
3. **複数repoの書込みを調整する**
4. **裁定の検証可能な証跡が必要**（不変Decision記録を要する判断を含む）

頭数（Executor数）・repo数・Phase数・「長くなりそう」という予測は発動条件にしない。
予定外にセッションが途切れた通常レーン作業は遡って統括化せず、handoff（planへ現在地1行＋バトン）で
閉じる（Controlは着手前にしか正しく作れないため遡及構成を禁止する既存規則の帰結）。

### 2. 比例原則（統括レーン内）

重装備文書（Packet/Report・Control記録）が必須なのは**4つの関節だけ**——戦役Taskのwriter委譲・
受入裁定・Phase gate・H操作。統括自身の直接処理、read-only補助呼び出し（反証・調査・レビュー）、
queueで束ねた小粒消化には課さない。証跡はgate evidenceとdocsで足りる（maintenance wave裁定の一般化）。

### 3. 技法と儀式の分離

orchestrateの技法（並列fan-out・重複統合・反証・網羅性Critic・Workflow雛形）は通常レーンでも
自由に参照・使用してよい。統括レーン専用なのはControl儀式（Elastic Control lifecycle・
Packet/Report・受入・回収契約）だけ。調査研究・監査はこれにより通常レーンのままorchestrateの型を使える。

## 反映箇所（同一waveで全数更新済み）

`shared/constitution.md`（発動条件・比例原則・技法分離・正本化ゲートの参照修正）→generator再生成、
`shared/orchestrate/contract.md`冒頭、Claude/Codex両orchestrate SKILL description、
hook注入文言3箇所（onset-gate／codex-callout／plan-gate）。

## Consequences

- 単一repo・単一Phaseでも、承認待ちを挟む戦役や証跡必須の判断はControlを持てる（旧ANDでは不可能だった）
- 多エージェント調査・監査が正典の型を参照できるようになり、無法地帯が解消される
- 「該当したら全呼び出しが重装備」にはならないことが条文で保証される（比例原則）
