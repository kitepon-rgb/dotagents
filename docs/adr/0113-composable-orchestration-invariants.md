# ADR 0113: Composable Orchestrationの4不変Decisionを固定する

- Status: accepted
- Date: 2026-07-24
- 裁定者: オーナー承認済み計画 [plan_composable-orchestration.md](../archive/plan_composable-orchestration.md)
  に基づき、統括レーンの親（bell-claude）がFとして固定＋fable refuter監査1回
- 関連: [ADR 0061](0061-lane-activation-functional-or.md)（レーン発動条件・不変）、
  [統括の共通契約](../../shared/orchestrate/contract.md)、[委譲契約](../../shared/orchestrate/delegation-contract.md)
- 工程: Lattice `dotagents` / plan `factory-master` / task `fm-0660`（Wave 0）

## Context

dotagentsのオーケストレーションは、固定Recipe・Control・Lattice・親dispatchという強い部品が
並んでいるが、これらを「一続きの運用契約」へ合成する時に、単体成立とowner境界を同時に失う設計事故が
起きやすい。事故形は既知である——state machineを一つに畳む／ControlとLatticeの両方がTask・Phaseを
持つため参照とcopyを混同する／Lattice runを一個のWorkerへ畳む／固定Recipeを第三のworkflow engineへ
育てる。これらを防ぐ土台として、実装前に4つの構造制約を不変Decisionとして固定する。

本ADRはこの4制約だけを所有する。目的・設計思想・適用方針・受入条件・非目標の正本は計画docへ、
Task・依存・状態・完了証拠の正本はLattice storeへ置き、本ADRへ複製しない。

## Decision

### 1. 各コア製品は単体で完全に成立する（最上位制約）

各コア製品は、他製品が未導入・停止・非互換でも、単独製品として自身の公開契約を完結させる。

- Latticeはdotagents／Controlなしで、plan・compile・run・observe・resume・close・abandonを完結する。
- ControlはLatticeなしで、manual Task・placement・direct dispatch相関・accept/reject・archiveを完結する。
- 固定RecipeはLattice／Controlなしで、hostの正規入口から実行できる。
- 連携障害は連携による増幅能力だけを止め、無関係な単独機能を止めない。
- adapterは相手製品の公開CLIとversioned schemaだけを使い、相手のDB・管理directory・内部moduleを
  直接読み書きしない。

この制約は他の3 Decisionに優先する。連携の利便のために単体成立を犠牲にする実装を認めない。

単体成立を守る帰結として、ControlとLatticeのstoreを同時にcommitする単一transaction（cross-store原子性）は作らない。連携整合はidempotencyとrecoveryだけで達成する——親がdurable intent・immutable digest・idempotency keyで公開操作を順に実行し、各段階を再読してから次へ進み、途中失敗を成功へ丸めず同じhandle／request digestで回収する。cross-store原子性を求めると製品が相互必須になり単体成立を失うため、必要なのは原子性ではなくidempotencyとrecoveryである。

### 2. レーンと実行形を直交させる

レーンは `normal | orchestrated` の二つだけとし、発動条件は[ADR 0061](0061-lane-activation-functional-or.md)の
4条件ORから増減させない。

実行形（原子的作業／固定Recipe／計画グラフ）は作業の表現を説明する補助軸だけであり、第三レーンにも
新しい永続stateにもしない。固定Recipeに複数agentが含まれること、Task数・repo数が多いこと、長くなりそうな
ことだけでは統括レーンへ上げない。統括レーンへ入るのは、ADR 0061の4条件のどれかが着手時点の事実として
確定した時だけとする。

typed admissionは親が宣言した構造事実を検証・正規化するpureな境界に留め、件数や文言から意味を推測して
自動昇格するclassifierにはしない。

### 3. 一つの意味に一つの正本を置く

各「意味」の正本は次の一つだけとし、他の面はそれを参照だけして複製しない。

| 意味 | 唯一の正本 |
|---|---|
| 目的・判断理由・非目標・受入条件・不変Decision | docs／git |
| Task・依存・Phase・ready・工程状態・完了証拠 | Lattice TODO store |
| boundary・compiled plan・worktree・Lattice子dispatch・run lifecycle | Lattice run store |
| F/A/H・placement・reservation・Worker相関・親accept/reject・Control finalization | Control |
| session/job・credential・provider retry/cancel・製品固有handle | 各Executor製品 |
| H承認の真正性 | オーナーとの会話 |

ControlはLatticeのDAG・Phase・ready・run stateを複製しない。LatticeはControlのplacement・
Executor state・親accept/reject・H承認を複製しない。連携時にControlが持つ外部Task相関は、少なくとも
`namespace / contract_version / external_id / immutable_digest` からなるclosed tupleに限り、外部の
自由形式metadata・label・state・依存のcopyを含めない。Markdown checkbox・Control Task・Lattice Taskの
常時双方向同期を存在させない。ID文字列の偶然一致を相関の根拠にしない。

### 4. dispatch ownerは常に一つ（single dispatch owner）

一つの子Taskに対する実dispatch ownerは常に一つだけとする。

- Lattice runを使う場合、子dispatchを所有するのはLatticeだけであり、親／Controlは同じ子を再dispatchしない。
- Lattice runを使わない場合、dispatch ownerは親であり、親がExecutor固有入口で明示実行する。
- hook・adapter・catalog・Lattice frontierは候補・観測・検証材料を返すだけで、自動起動しない。
- Lattice run全体を一個のopaque Workerとして一括acceptするcompound state machineを作らない。子ごとの
  scope・result digest・terminal/partial failureを検証可能に保つ。

**fail-closed時の直列化はこのDecisionの一部である**: Latticeが利用不能またはfail closed（例:
`INVALID_RUN_STORE`）の時、同一repoへの複数writer並列は明示的に断念して直列化する。これは暗黙の
fallbackではなく、機能と安全性を明示したsupported degraded modeであり、理由をControl記録またはplanへ
残す。自前のscope交差推測による並列強行を回避策にしない。

## 適用範囲

本ADRは上記4制約だけを不変Decisionとして固定する。それ以外（何をやらないか＝非目標、目的、適用方針、受入条件）の正本は計画doc [plan_composable-orchestration.md](../archive/plan_composable-orchestration.md) の各節であり、本ADRへ複製しない。saga／recovery機構の実装方式は計画の「実装前Decision gate」とWave 3で扱う。

## Consequences

- Wave 1以降の型付け・連携実装は、この4制約の下でだけ設計・受入される。制約に反する実装案は、
  最小投影が原理的に不可能だと証明された場合にだけ別ADRとして再提案し、本計画から暗黙導入しない。
- 単体成立が最上位制約であるため、連携機能のdisable／rollback後も各製品の従来公開入口が維持される。
- degraded直列化がDecisionの一部として明文化されるため、fail-closed時の直列化は契約遵守であって
  品質低下ではない。
