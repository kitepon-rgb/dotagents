# ADR 0114: typed lane admissionの公開契約を固定する

- Status: accepted
- Date: 2026-07-24
- 裁定者: オーナー裁定（保存形の二案から「Controlが証跡を持つ」案を選択）＋統括レーンの親（bell-claude）が
  Fとして固定＋Codex旗艦(`gpt-5.6-sol`)×high refuter 3レンズによる反証1回
- 関連: [ADR 0061](0061-lane-activation-functional-or.md)（4条件・不変）、
  [ADR 0113](0113-composable-orchestration-invariants.md)（4不変Decision）、
  [計画](../archive/plan_composable-orchestration.md)
- 工程: Lattice `dotagents` / plan `factory-master` / task `fm-0663`（Wave 1）

## Context

ADR 0061の4条件は現在、散文の規範とhookのINFO文言だけで表現され、機械的に検査するコードは存在しない。
Wave 1は、この裁定を親が宣言する構造事実としてclosedに正規化し、Control初期化へ束縛する。

保存形には二案があった。①Controlが裁定の証跡を持つ（manifest schemaを上げる）②検証だけしてControlは
何も保存しない（schema不変）。オーナーは①を裁定した。ADR 0061条件④「裁定の検証可能な証跡が必要」で
作られたControlが、その根拠を自身で検証できないのは自己矛盾であるため。

## Decision

### 1. declaration・評価結果・保存projectionを別schemaにする

一つのschemaで入力・評価・保存を兼ねない。

- **declaration**（`init`の入力）: `contract_version`、4条件の`conditions`、判断理由docsへの
  `type=decision` evidence だけを持つ。
- **評価結果**（純関数とCLIの返却）: `lane: normal | orchestrated` と `conditions` を持ち、保存しない。
- **保存projection**（manifest）: `conditions`、decision evidence、`declared_by`、`declared_at` を持ち、
  `lane` fieldを持たない。Controlが存在すること自体が`orchestrated`の意味である。

`lane: "orchestrated"`固定のschemaで`normal`評価を返そうとする設計を採らない。

### 2. lane決定は4 booleanだけの純関数とする

lane決定関数の入力型は4つのbooleanからなるexact recordだけとし、`objective_ref`・title・
`document_refs`・環境変数を含むいかなる文字列も受け取らない。非classifier性はテストではなく
**API境界の型**で保証する。文字列を受け取る上位関数でlaneを決めない。

条件名はADR 0061の4条件と1対1で対応させ、増減させない
（`planned_interruption` / `chained_acceptance` / `multi_repo_write_coordination` /
`decision_evidence_required`）。

4条件すべてが偽の宣言は`LANE_ADMISSION_NOT_ORCHESTRATED`で拒否し、Controlを作らない。

### 3. Controlは判断理由を保存せず、closed projectionと参照だけを持つ

判断理由の正本は[ADR 0113](0113-composable-orchestration-invariants.md) Decision 3のとおりdocs／gitである。
Controlが保存するのは、closedな条件結果と、判断理由docsへのimmutableな`type=decision` evidence
（repo相対path＋内容digest）だけとする。自由形式の理由文をmanifestへ保存しない。

`declared_by`は`input.actor_id`と一致することを必須とし、`declared_at`はlibraryが生成するか、
initial receipt時刻以前かつ許容skew内であることを検証する。actorと無相関な宣言をvalidにしない。

digestは用途ごとに分ける。`{contract_version, lane, conditions}`だけを拘束する文言非依存digestと、
保存admission全体を拘束するdigestを同一視しない。

### 4. manifest shapeはversion-awareにする

新しいtop-level keyの導入に「既存版はnullを持つ」という論理モデルを使わない。実在するv25〜v28 manifestは
当該keyを持たないため、一律requiredにすると既存Controlが`control-migrate`へ到達する前に読めなくなる。

- v25〜v28は`lane_admission` keyの**不在**を正規形とする。
- v29だけkeyを必須とする。
- v28→v29 migrationで初めて`lane_admission: null`を物理追加する。
- v29→v28は`lane_admission === null`のときだけkeyを削除して許可し、non-nullなら`ROLLBACK_UNSUPPORTED`。
- 欠落をread時に`null`へ暗黙補完して保存しない。

`controlMigrate`はv28↔v29を明示分岐として実装する。既定分岐へ落として旧版rollbackとして扱わない。

### 5. capability predicateは単調にする

manifest版に依存する能力判定は、単一版との等値ではなく単調なpredicateで書く。新しい版を足すたびに
既存能力を失う構造を残さない。

`supportsExplicitConsultationCancel` / `supportsSelectorDecision` / `supportsArtifactGeneration` を
単調なpredicateとして定義し、v29を含める。artifact generationの単一版等値判定もこれへ置換する。

これは`lib/orchestrate/control-record.mjs`の版判定コメントが既に記録している罠
（単一版との等値判定は新しい版を黙って旧版扱いする）の再発防止であり、lane admissionに固有の要件ではない。
記録があるにもかかわらずartifact generationでは等値判定が残っているため、本Decisionで解消する。

### 6. rollbackはbehavior rollbackとし、binary rollbackの窓を明示する

migration receiptは恒久追記であり、旧版readerのclosed schema setは新版名を知らないため、
新版receiptを持つmanifestを旧binaryで読めない。finalized／archived Controlはmigrateもできない。

- binary rollbackが可能なのは、最初のv29 manifestまたはmigration receiptを生成する前だけとする。
- それ以降のrollbackは「v29 readerを残したまま新規利用を止めるbehavior rollback」とする。
- v29で新規initしたControlはv28へrollbackできない。

「双方向edgeを張れば旧binaryへ戻せる」という理解を残さない。

### 7. 公開契約versionを上げる

`init`の必須入力を増やす変更は公開契約の破壊である。`dotagents.orchestrate.control-record.v1`を
v2へ上げ、CLIのcontract_version、[Control Record契約](../../shared/orchestrate/control-record.md)、
help smoke、repo内の全init caller・fixtureを同一waveで更新する。

v1形式の入力を受けたときはadmissionを捏造せず、versioned errorで明示拒否する。暗黙defaultで補わない。

### 8. 評価CLIは任意の診断に留める

read-onlyの評価コマンドは、filesystemへ書かないことに加え、**通常レーンの開始前手順として必須化しない**。
hook・skill・規範文書からnormativeな呼び出し義務を作らない。通常レーンに新しい儀式を持ち込まない。

## 反証で棄却した設計

以下は初案に含まれ、実ファイル検証で棄却された。同じ形を再提案しない。

- 自由文`basis.statement`をmanifestへ保存する案（判断理由の二重正本＝ADR 0113 Decision 3違反）。
- 「既存Controlは`lane_admission: null`を持つ」という前提（実在manifestにfieldが無く、exact readerが拒否する）。
- 「`phase_gate`のnull方式に倣う」という論拠（`phase_gate`はv25 fixtureの時点でtop-level keyとして
  存在し、新規key導入の前例ではない）。
- v28↔v29の双方向edge追加だけでbinary rollbackが成立するという理解。
- `basis.statement`の文言だけを変えたテストで非classifier性を証明する案（他の文字列入力経路を観測しない）。
- Control state rootの不在だけを検査して永続物非生成を証明する案（hook cacheとexternal state rootを観測しない）。

## Consequences

- 既存の全Control（他repoを含む）はv28のまま読み書きを継続でき、単体成立を破らない。
- v29 Controlを作った時点でbinary rollbackの窓は閉じる。rollback要求がある期間はcutoverを遅らせる。
- 版追加のたびに能力が後退する既存構造がDecision 5で解消され、以後の版追加が安全になる。
- 非classifier性がAPI境界の型で保証されるため、実装が意味推測へ退化する経路が塞がれる。
