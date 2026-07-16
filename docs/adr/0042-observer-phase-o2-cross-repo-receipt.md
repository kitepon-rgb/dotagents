# ADR 0042: Observer Phase O2のcross-repo receiptを受け入れる

日付: 2026-07-16

## Status

Accepted。この文書はObserver Phase O2のimmutable cross-repo receiptであり、使用後は変更しない。

## Receipt

- Observer closure HEAD: `1493b35`。
- process-group source／test: `c936cfd`、corrective `8056405`、fixture `2b94392`。
- pre-ready recovery source／test: `4bde91c`。
- Observer Decision: ADR 0140〜0144。最終acceptance matrixはADR 0144。
- gate: focused 16/16、related 68/68、full 412/412、fail 0、skip 0。
- 独立重監査: 初回P1一件を採用して修理し、最終HEADの限定再確認でP0 0件、P1 0件。
- Control: `observer-p5-1b5-dual-host-live-20260716` revision 26、finalize後archive。

## Decision

1. queue 19eのClaude r12／Codex r11によるcycle、65秒超、pendingなし、terminal、設定rollback証拠を
   維持する。leader terminalをprocess全体の終了へ読み替えた証拠だけはADR 0041で失効したままにする。
2. Codex固有process groupのTERM→KILL、leader closeとgroup不在のAND、終了不明のfail loudを
   Observer修理後HEADの新しい根拠として受け入れる。
3. Codex／Claudeのpost-spawn／pre-ready失敗を同一watch identity／handleのterminal→faultへ閉じる。
   別watch、handle推測、暗黙restartへfallbackしない。
4. Observerは同providerの利用者可視な永続AI sessionであり、Throughline L2をcognitionの代替にしない。
   Supervisorは非AIのdelivery、exact-once、recovery、CAS、停止、Mailbox制御へ限定する。
5. queue 19e-r15、19f、19gとPhase O2を完了にする。親正本の次ready TODOはO3 Elastic
   provider対称化であり、本receipt受入れ前にO3を先行していない。

## Excluded operations

intentional fault、追加の実model request、network、credential、login、push、publish、deployは実施していない。
fixtureをlive成功へ丸めず、既存live証拠と非H修理gateを分離して保持する。

## Rollback

Observer ADR 0144またはcommit `1493b35`の受入れが失効した場合、本ADRを失効させ、queue 19e／19gと
Phase O2を再openする。ADR 0039の失効済みprocess残留0主張へ戻さない。
