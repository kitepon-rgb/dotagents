# Elastic Orchestrator writer packet admission decision

Date: 2026-07-15

Status: Accepted

## Context

`delegation-packet`はplanned／admitted Workerの双方を受理してきた。read-only Runではpacket projectionがadmissionで変わらない。一方、fixed-workspace writerはadmission時にbaseline fingerprintと`workspace.head_at_reservation`を確定するため、planned時のpacket digestとactive時のrecovery packet digestが一致しないことをWorker Report skeletonのfocused fixtureで再現した。

実dogfoodは常に`worker-run-record → admit-worker → delegation-packet → dispatch`の順であり被弾していないが、公開APIがstale packetを作れる状態はfail-closed契約に反する。baselineをpacket digestから除外するとwrite受入の相関を弱めるため採用しない。

## Decision

- `write_mode != none`のWorkerは`admitted`後だけ通常Delegation Packetを生成できる。
- planned writerへの`delegation-packet`は`INVALID_TRANSITION`で拒否する。
- read-only Workerはbaseline予約を持たないため、従来どおりplanned／admittedの双方で生成できる。
- active writerの`delegation-packet-recover`はadmissionで固定したpacket digestを維持する。
- `worker-report-skeleton`も同じ順序を要求する。
- standard dispatch順をpacket保存より先にadmissionする形へ文書とfixtureで固定する。

## Consequences

- write Runのpacketはreport importまで同じbaseline identityへ束縛される。
- admission前にpromptを準備したいcallerはTask snapshotを参照できるが、正式packetとして保存・dispatchしてはならない。
- Delegation Packet v1のschemaとdigest algorithmは変更しない。
