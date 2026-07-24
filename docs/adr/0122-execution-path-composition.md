# ADR 0122: 四つの実行経路を一つの適用方針へ接続する

- Status: accepted
- Date: 2026-07-25
- 裁定者: 通常レーンの親（bell-claude）がFとして固定。着手時点でADR 0061の①中断②受入連鎖③複数repo書込調整の
  どれも確定しておらず、④裁定証跡の要求は本ADR自身が満たすため、Controlを作らず不変Decisionで閉じる
- 関連: [ADR 0061](0061-lane-activation-functional-or.md)（レーン発動条件・不変）、
  [ADR 0113](0113-composable-orchestration-invariants.md)（4不変Decision）、
  [ADR 0114](0114-typed-lane-admission-contract.md)（typed admission）、
  [ADR 0115](0115-fixed-recipe-shared-contract.md)（固定Recipe契約）
- 工程: Lattice `dotagents` / plan `factory-master` / task `fm-0670`（Wave 1）

## Context

Wave 1は`fm-0663`でレーン裁定を、`fm-0664`で固定Recipe二型の意味を型にした。残る切れ目は、通常レーンの
固定Recipe・Control direct・Lattice standalone・Lattice不能時の明示直列化という四つの実行経路が、同じ
適用方針から導かれていないことである。実測した具体的な破れは三つ。

1. **適用方針の運用正本が無い**。「いつ何を付加するか」は計画doc（完了後に`docs/archive/`へ退避する文書）
   だけが持ち、`shared/orchestrate/`には経路横断の正本が存在しなかった。
2. **同じ規則の正本が二重化し、強度が食い違っていた**。同一repo writerの直列化は
   `recipes.md`（「決定的に直列化する」）と`delegation-contract.md`（「不変条件への硬化はL7 waveで裁定する」）
   の両方にあり、Claude SKILLは後者を、Codex SKILLは前者を正本として指していた。後者の留保はADR 0113
   Decision 4（2026-07-24）が硬化を裁定した時点でstaleになっていたが、文面が更新されていなかった。
3. **判定の実体が固定Recipe型の内側にしかなかった**。Control direct pathと通常レーンの直接委譲には、同じ
   判定を適用する接続点が無かった。

## Decision

### 1. 適用方針の正本を`shared/orchestrate/composition.md`に一つだけ置く

四つの実行経路の単体成立、能力の付加、同一repo writerの直列化、切替とrollbackを同書が所有する。各経路の
内側の意味（固定Recipe二型＝`recipes.md`、Control儀式＝`contract.md`、委譲の最低安全契約＝
`delegation-contract.md`、Lattice本体＝製品repo）は所有せず、複製もしない。

レーン裁定はADR 0061の4条件ORだけが決め、本書は変えない。実行経路はレーンと直交する補助軸であり、
第三のレーンにも新しい永続stateにもしない。

### 2. 直列化規則を全経路共通の一つの規則へ統一する

規則は次のとおりで、経路によって変わらない。

- read-onlyのfan-outは本数制限を受けない。
- 同一repoへ書込むwriterが2つ以上あり、Latticeが選択されていない実行は決定的に直列化する。
- Latticeが利用不能またはfail closedの時も同じ規則で直列化する（ADR 0113 Decision 4のsupported
  degraded mode）。断念した事実と理由は、統括レーンならControl記録、通常レーンならplanまたは工程正本へ
  一度残す。
- Latticeが選択されている場合だけ同一repoの複数writerを並列投入でき、交差判定は`plan compile`の競合検出が
  所有する。

`delegation-contract.md`の「L7 waveで硬化を裁定する」という留保は、ADR 0113 Decision 4で失効済みである
ことを明記して解消する。`recipes.md`・両host SKILL・workflow雛形は規則を再定義せず`composition.md`を指す。

### 3. `repo_root: null`のwriterが2つ以上あれば直列化する

repo identityを持たない対象同士は交差の有無を判定できない。判定不能を「交差しない」へ丸めず、Latticeの
選択有無に関わらず直列化する。Latticeもrepo外対象の競合は検出できないため、この一点だけはLattice選択時も
直列化が残る。これは安全側への確定であり、暗黙fallbackではない。

### 4. 判定コードはLatticeを型で必須にしない

正本は`lib/orchestrate/execution-path.mjs`（`dotagents.execution-path.v1`）とする。

- 入力は`{ writers: [{ id, repo_root, effect }], lattice_selected: boolean }`のclosed recordだけ。title・
  prompt・任意metadataのような文字列は一切読まない（意味推測の余地を型で消す）。
- **Lattice読取module（`lattice-projection.mjs`）をimportしない**。Latticeの状態は`lattice_selected`の
  boolean一つとしてだけ受け取る。単体成立はテストではなくAPI境界の型が保証する（ADR 0114 Decision 2と
  同型の設計）。import制約自体をCI gateで固定する。
- 同じ入力は同じ`decision_digest`を返す。digestは決定の同一性であり、保存を強制しない。

## 受入条件

- focused gate: `tests/orchestrate/execution-path.test.mjs`が全green。
- 直列化規則の正本が`composition.md`ただ一つで、`recipes.md`・`delegation-contract.md`・両host SKILL・
  workflow雛形が規則を再定義せず参照だけを持つ。
- 判定moduleのimportが`node:crypto`と`./canonical-json.mjs`だけであることをテストが固定する。

## 非目標

- 経路を自動選択するclassifier、汎用workflow engine、DSL、durable state machine。
- Control／Latticeのstore統合、bridge DB、第三の永続state。
- 固定Recipeへの第三の型の追加。
- 通常レーンの全作業への永続receipt。

## Consequences

- 直列化の判定は四経路で同一のコードとなり、host adapterは実行入口だけを持つ。
- `delegation-contract.md`のstaleな留保が解消され、ADR 0113 Decision 4との食い違いが消える。
- repo外writerの扱いが安全側に確定するため、repo外対象を並列で書かせたい場合は、対象へrepo identityを
  与えるか直列で実行するかの二択になる。
