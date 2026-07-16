# ADR 0041: Observer queue 19eのCodex process残留受入れを訂正する

日付: 2026-07-16

## Status

Accepted correction。Observer P5-1b5b-r15とpost-spawn/pre-ready recovery修理、Phase O2 closureは未完了。

## Context

[ADR 0039](0039-observer-dual-host-live-acceptance.md)は、Claude r12／Codex r11の通常系liveで
parent callerとprovider leaderがterminalになったことを根拠に、managed process残留なしとして
queue 19eを完了扱いにした。その後、campaign root削除前のopen-file検査で、終了済みCodex
app-server二attemptが起動したMCP process群16件が同rootを`cwd`にしたまま残留していた。

Observerはapp-serverを`detached: true`で固有process groupへ隔離する一方、終了時は
`child.kill(signal)`でleader PIDだけへsignalを送っていた。leaderの`close`とapp-server leader件数0は、
process group全体の消滅証拠ではない。既存16件はcampaign所有PIDへの通常SIGTERMで全件終了し、
campaign rootは削除済みである。製品側の設計DecisionはObserver commit `b089448`と
Observer `docs/adr/0140-codex-process-group-cleanup-correction.md`を正とする。

## Decision

1. queue 19eを`CORRECTION`として再openし、Observer P5-1b5／P5-1b5bを未完了へ戻す。
2. ADR 0039とObserver ADR 0139のうち、Codexのleader terminalをprocess全体の終了へ読み替えた証拠だけを失効させる。
3. Claude／Codexの親completed feed 2件、同一Observer generationのcompleted cycle 2件、初回cycle後65秒超、
   pending stateなし、caller cancel、設定のdigest／mode／owner一致rollbackは維持する。
4. Observer P5-1b5b-r15でprocess group全体のSIGTERM→SIGKILL、leader closeとgroup不在の両確認、
   `E_CODEX_PROCESS_TERMINATION_UNKNOWN`のfail-loud契約を独立gate／commitで閉じる。
5. post-spawn/pre-ready failureのwatch cleanup欠陥をr15と混ぜず、独立再現、独立gate、独立commitで閉じる。
6. 二欠陥の修理後HEADでrelated gate、Phase full regression、独立重監査、knowledge return、Control finalization、
   cross-repo receiptを閉じるまでO2を完了せず、O3を開始しない。

## Preserved boundaries

- Observerは親と同providerの利用者可視な永続AI sessionであり、completed turnごとのfresh evaluatorを作らない。
- Throughline L2はcompleted-turn証拠であってObserver cognitionの代替ではない。
- Supervisorは非AIのdelivery、exact-once、recovery、CAS、停止、Mailbox制御だけを担う。
- intentional fault、追加の実model live、push、publish、deploy、login、credential操作は本訂正に含めない。
- Latticeを閲覧、編集、研究、正典還流しない。

## Rollback

本ADRと親子計画の訂正commitだけをrevertする。Observer、Throughline、Aitermの既存製品修理と
live証拠は独立履歴として維持する。r15未完了のままADR 0039のCodex process残留0を復活させない。
