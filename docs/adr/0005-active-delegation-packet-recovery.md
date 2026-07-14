# ADR 0005: active Delegation Packetを専用read-only入口から回収する

日付: 2026-07-15

## Context

Observer統合のdogfood中、親が`delegation-packet`の出力をdispatch前に保存し忘れた。
公開CLIの`delegation-packet`は`planned | admitted`だけを受理する一方、
`worker-report-import`は`dispatched | running | unknown`のRunから同じpacket digestを内部再計算する。
そのため親はreport相関に必要なdigestを公開入口から回収できず、内部計算と同じprojectionを
手作業で再構成する必要があった。

また、Control receiptのDecision証拠に追記可能な計画書を使うと、後続追記で過去digestが失効する。
この問題は既知罠
`orchestration-mutable-decision-path-invalidates-evidence-digest`として再現・対処済みであり、
本ADR自身も追記更新する進捗台帳ではなく、この修理wave専用の不変Decisionとする。

## Decision

1. 既存`delegation-packet`はdispatch前の生成入口として`planned | admitted`限定を維持する。
2. 公開CLIとlibraryへ`delegation-packet-recover` /
   `recoverDelegationPacketForWorker`を追加する。
3. 回収入口は`dispatched | running | unknown`だけを受理し、dispatch、network、process起動、
   Control mutationを一切行わない。
4. 回収packetはreport importと同じprojectionを使う。`record_revision`と`worker.state`は出力上の
   現在値を示すがdigest対象外なので、dispatch前packetと同じ`packet_digest`を返す。
5. 取消済みTaskでも、既にactiveなRunのterminal report相関に限って回収を許す。
   `planned | admitted`、terminal Run、未知／forbidden Executor、archived Controlはfail closedにする。
6. ControlのDecision証拠にはwaveごとの不変ADRを使う。追記可能なplan/TODOは進捗管理に限定し、
   finalization evidenceへ使わない。

## Consequences

- packet保存忘れがあっても、親は同じRunを再dispatchせず公開入口から相関digestを回収できる。
- dispatch前生成とdispatch後回収の意味がCLI名で区別され、既存入口の状態契約を壊さない。
- report import内部と回収入口が同じpacket builderを共有し、相関projectionの二重実装を避ける。
- 可変TODOへ本ADRの完了状況を追記しても、過去Control receiptのDecision digestは失効しない。
