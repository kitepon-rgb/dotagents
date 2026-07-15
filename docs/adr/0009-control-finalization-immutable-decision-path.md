# ADR 0009: Control finalizationのDecision証拠を`docs/adr/`へ限定する

日付: 2026-07-15

## Status

Accepted

## Context

工場正典は、追記可能なplan/TODOをaccept、reject、finalizationのDecision証拠へ使わず、waveごとの
不変ADRを使う。ところがControl Recordの`task-finalize-record`は、regular fileであれば
`docs/plan_observer.md`も`type=decision`として受理した。`control-finalize`の`parent_decision`も
同じ制約を持たず、可変な進捗文書を最終Decisionへ固定できる。

同一path・同一blobのgit履歴保持は、証拠の消失を防ぐ契約であって、可変文書を不変Decisionへ
昇格させる契約ではない。

## Decision

1. 新しいTask finalizationの`finalization_ref`は、repo相対の`docs/adr/<file>.md`だけを受理する。
2. 新しいControl finalizationの`parent_decision.ref`も同じpath契約を必須にする。
3. 違反は`DECISION_EVIDENCE_NOT_IMMUTABLE`でfail closedにし、`INVALID_SCHEMA`や成功へ丸めない。
4. 既存Control manifestと過去receiptはread、retention検証、archive互換のためそのまま受理する。
   制約は新しいfinalization mutationの入口に適用し、過去証拠を暗黙migrationしない。
5. 現在fileのSHA-256確認、同一repoの同一path・regular blob・完全一致SHA-256だけを認める
   git履歴保持契約は変更しない。

## Consequences

- 可変plan/TODOを新しいfinalization Decisionへ指定すると、receiptを作る前に明示codeで停止する。
- 各waveはfinalization前に不変ADRを作る必要がある。
- ADR以外のdecision descriptorを使う別契約は、この裁定だけでは変更しない。
