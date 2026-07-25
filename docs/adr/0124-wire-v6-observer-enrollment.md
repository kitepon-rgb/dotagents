# ADR 0124: Observerはwire v6の固定14製品目として編入する

- **状態:** Accepted
- **日付:** 2026-07-25
- **対象:** dotagents reporter、ServerManager / BugHub ingest、Observer adapter
- **関連:** [ADR 0123](0123-observer-core-integration-reinstatement.md)、[wire v6設計](../wire-v6-design.md)

## Context

Observerは自作コア製品として編入することが再確認された。現役wire v5は固定13製品の
完全報告契約で、clientとserverがexact-key検証を行う。v5を同じversionのまま14製品へ
変更すると、既存client、server、fixture、保存済み証拠の意味を破壊する。

wire v3にはObserver用の予約設計があったが、実装・cutover・運用には使われなかった。
未使用の歴史versionを後から現役化することも、versionの意味を不明確にする。

AIShell編入時には、旧majorのoptional key登録が次majorへ継承されず観測面から消える
欠陥を経験した。Observerをoptional fieldやserver expectationだけで先行登録しても、
固定集合への編入を保証できない。

## Decision

1. Observerはwire v6の固定14製品目`observer`として編入する。
2. v6はv5の13製品順序を維持し、末尾へ`observer`を加えた完全報告契約とする。
3. v5のschemaとendpointは変更せず、rollback期間中はv6と並存させる。
4. wire v3は未使用の履歴として凍結し、復活させない。
5. Observer v1はmacOS arm64で`required`、Linux server / WSL / Windows nativeで
   構造化`unsupported`とする。
6. reporterは`observer diagnostics`の公開schemaだけを使い、Observer内部DB、
   path、prompt、session、watch情報を読まず送らない。
7. v6はserver-firstで実装し、独立feature flag、dual-run、host別cutover、
   host別v5 rollbackを必須とする。
8. expectationはrequestのactual wire versionで評価し、共有save pathから
   v2/v5へfall-throughさせない。

## Consequences

- client、server、fixture、runbook、host matrixは同じ固定14製品集合へ同一waveで更新する。
- v6実装前にServerManager側のschema・endpoint・migration・v5 regressionを先に閉じる。
- v5はObserverを報告しないため、rollback後も既存13製品の意味が変わらない。
- Observerのplatform拡大やruntime詳細projectionは別の製品決定なしに追加できない。
- 公開package identityはwire product ID `observer`と分離できるが、adapterが両者の一致を検証する。

## Rejected alternatives

### v5へObserverを後付けする

同一versionのschema変更になり、既存clientとserverのexact-key契約を破壊するため棄却する。

### wire v3を復活させる

実装されなかった歴史versionの意味を後から変更し、運用証拠と食い違うため棄却する。

### Observerをoptional keyとして登録する

固定集合への編入を保証せず、major更新で消える既知事故を再発させるため棄却する。

### Observer内部stateをServerManagerが読む

製品所有境界とprivacyを破り、診断契約を迂回するため棄却する。
