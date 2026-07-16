# ADR-0040: 統制を通常レーンと統括レーンへ分離する

- 日付: 2026-07-16
- 状態: accepted
- 裁定者: オーナー

## Decision

単一repo・単一担当・単一責務で可逆かつ低リスクな作業は通常レーンとし、短い成功条件、focused test、対象限定commitで閉じる。docs plan、形式的F/A/H、既定委譲、routing smoke、Control、ADR、独立監査、receiptを要求しない。

複数repo・Executor・Phase、長時間resume、campaign、H操作、高リスク契約、workspace競合、durable recoveryのいずれかを含む作業は統括レーンとする。統括レーンでは既存Elastic Control lifecycle、F/A/H、Packet/Report、受入・回収契約を完全適用する。通常から統括への昇格は許すが、active Controlを通常へ降格しない。

コア製品のP0/P1は即時修理する。P2/P3は最小再現・影響・所有repoをPhase maintenance queueへ一度記録し、通常TODO後かつfull regression／Phase監査前のmaintenance wave一回でrepo別に修理する。H、credential、第三者、本番待ちは理由と必要条件を残してcarry overする。

active WIPは本筋一件と緊急割込み一件まで、1スレッドは1成果または1 Phaseまでとする。context compaction後は原子的作業を閉じてhandoffを作り、新Phaseへ進まない。

## Preserved contracts

Control Recordのsource、schema、CLI、wire、fixture、adapter、lifecycleは変更しない。P0/P1、本番、credential、認可、データ、公開契約、履歴安全のgateも弱めない。

## Rejected

- 全実装でdocs plan、F/A/H、既定委譲、routing smokeを要求する方式。準備・受入コストが小径作業の実装コストを上回るため。
- Elastic orchestration自体を簡略化する方式。複雑・高リスク作業の回収性と証拠契約を損なうため。
- 非クリティカル欠陥を発見ごとに割込み修理する方式。Phaseの本筋とgateを分断し、WIPを増殖させるため。
