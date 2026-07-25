# Observer wire v6 server safety net

- Date: 2026-07-25
- Source repo: `/Users/kite/Developer/ServerManager`
- Source commit: `a045743`
- Scope:
  - `bughub/test/factory-contract.test.js`
  - `bughub/test/factory-ingest.test.js`
  - `bughub/test/factory-router.test.js`
- Test:
  `node --test --test-reporter tap bughub/test/factory-contract.test.js bughub/test/factory-router.test.js bughub/test/factory-ingest.test.js`
- Result before implementation: 54 tests, 48 pass, 6 expected failures

## 固定した失敗条件

1. `validateFactoryReportV6`が存在し、Observerを含む固定14製品だけを受理する。
2. v5はObserver入りsnapshotを拒否し、既存の固定13製品契約を維持する。
3. Observerの`safe_context` allowlistは空で、pathを含む値をerrorへechoしない。
4. `/api/factory/v6/reports`は独立flagがOFFなら404、ONならv6 handlerだけへ渡す。
5. v6 flagをONにしてもv5 endpointを停止しない。
6. actual version `v6`で、ObserverをmacOSではrequired、server / WSL /
   Windows nativeではunsupportedとして評価する。
7. v6はv5と共有するhistory/currentを使い、遅れて届いたv5 reportが
   v6のObserver currentを巻き戻さない。

## red確認

失敗は新規v6契約の未実装に限定された。

- v6 validator未公開: 2件
- v6 save wrapper未公開: 3件
- v6 endpoint未登録: 1件

既存v1 / v2 / v4 / v5の48件は同じfocused runでgreenだった。
