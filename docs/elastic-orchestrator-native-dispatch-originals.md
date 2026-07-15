# Elastic Orchestrator native dispatch原本path契約

日付: 2026-07-15

Status: Accepted

## Context

ObserverのCodex host設計をrefuterへ正式dispatchした際、親は`delegation-packet`と
`worker-report-skeleton`をdispatch前に保存したが、native `followup_task`本文では両pathを示さず、
schemaの要点だけを転記した。refuterの所見は有効だった一方、返却reportの
`validation_results`がstrict `dotagents.worker-report.v1`と異なり、そのままimportできなかった。

既存契約とskeleton生成器は正しく、原因はnative dispatch appendixが原本pathの受渡しを明示して
いなかったことである。親がreportを手補正する運用へ戻したり、新しい自動dispatch schemaを追加する
必要はない。

## Decision

1. Codex nativeへ実作業をfollow-upする前に、Delegation PacketとWorker Report skeletonをそれぞれ
   安全な一意pathへ保存する。
2. follow-up本文で両方の実pathを明示し、子へ原本を読ませる。親によるschema要約、field一覧、
   prompt内の再定義を原本の代用にしない。
3. pathを渡せない場合はdispatchしない。同じRunを再dispatchせず、保存済みartifactを回収する。
4. 子の初回reportが不正な場合は、親がnormalizationせず、同じexecutor handleへ原本pathを渡して
   exact skeletonで再提出させる。
5. 新しいschema、自動dispatch engine、個別test、Delegation Packet digest変更は追加しない。

## Verification

- Codex `orchestrate` appendixへ原本path必須、要約転記禁止、pathなしdispatch禁止を追加した。
- 同じrefuterへ保存済みpacket／skeleton pathを渡した再提出は、strict Worker Reportとして
  `worker-report-import`へそのまま成功した。
- `git diff --check -- codex/skills/orchestrate/SKILL.md docs/plan_observer-factory-integration.md
  docs/elastic-orchestrator-native-dispatch-originals.md`を通す。

## Friction check

初回返却はimportしておらず、親によるmanual normalization、reconstructed evidence、alternate recoveryを
使用していない。同じRun／同じagent handleへ原本を渡して再提出させた。
