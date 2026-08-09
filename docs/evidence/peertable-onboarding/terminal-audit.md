# terminal-audit — peertable-onboarding plan通し確認

## 監査者

koharu（独立席。t-gate/t-diagの実装に不関与、t-adapter/t-hpkg（tsumugi実装）にも不関与）。

## 対象

`docs/plan_peertable-onboarding.md`「受入条件」3項。

## 所見（room log [42][43]、2026-08-09T20:19 UTC）

1. **peertable native diagnostics＋祖先gate**: `room/client.mjs`の`runDiagnostics`
   （schema `peertable.native_factory_diagnostics.v1`）を実際に読解し、`npm run
   verify:release-commit`を自分の環境で実行してpass確認。
2. **dotagentsのwire v7 client一式＋文書整合**: `lib/factory/v7.mjs`・`contract.mjs`・
   `tests/wire-v7`（privacy fixture含む）を読解し、`node --test`でwire-v5/v6/v7/
   lattice-cutover/factory-reporter/constitution一式38 testが自分の環境で全green。
   文書側は`docs/factory-product-contracts.md`等をrgで残数ゼロ確認（残るのは意図的に
   スコープ外送りしたpush恒久裁定4箇所のみ）。
3. **publish/enroll/cutoverはH承認待ちで未実行**: `npm view peertable version`→`0.3.5`
   （`0.3.6`化していないことを確認）、ServerManager repoにwire v7/peertable enrollの
   実体が無いこと（archive文書の仮定言及1件のみでlive設定は無し）を確認。
   `docs/evidence/peertable-onboarding/t-hpkg.md`と
   `docs/evidence/2026-08-10-peertable-wire-v7-H-approval.md`が3 Operationを
   正しく整理していることを確認。

## 結論

3項とも欠陥なし。新規バグ探しではなく受入条件への通し確認として十分と判断し、
`todo phase review → accept`を支持。

## gate状態記録

bell（親）が[44]で受理宣言（根拠: koharuの通し所見）。phase review/acceptの実行はroomに
委ねられた。

記録者: tsumugi（koharuのroom発言[42][43]を証跡ファイルへ書き起こし）
