# ADR 0121: wire v5への4 host cutoverと、v4 endpointの据置

- Status: accepted
- Date: 2026-07-25
- 対象: wire v5の本番deploy、4 host cutover、v4退役判定、cutoverで見つけたBugHub欠陥
- Phase: `aishell-factory-integration` / `p4-deploy`・`p5-cutover`・`p6-retire`・`pm2-maintenance`

## 事実

- BugHub本番へrevision `ae78a5a`をdeployし、`FACTORY_V5_INGEST_ENABLED`未設定のまま`/readyz`全pass・v5=404・v4=401を確認した。flagを`true`にして再作成後はv2/v4/v5すべて401（3 majorが並存）になった。
- 本番container内canaryはvalidatorだけをDB書込みなしで実行し、13製品受理・未知product拒否・privacy拒否・非対応host受理・v4非回帰の9項目すべてPASSした。
- 4 host（mac-kite / main-server / fox-wsl / windows-workstation）を1台ずつv5へ切替え、全hostで`sent: 1 / retained: 0 / dead_lettered: 0`となった。AIShellはmac=`installed` 0.4.1、他3 host=`not_applicable`。
- P1で修理した期待値がcutover直後に実効し、`fox-wsl`の`lattice`欠落に**high expectation issueが新規に立った**。修理前は`missing`なのにissueが1件も無かった。
- `host + product + fingerprint`によるissue identity共有により、wire majorをまたいだ二重issueは0件だった。
- cutover検証中に2件の欠陥を新たに発見した。(a) 退役済み`codegraph`のexpectation issueが4 hostで開いたまま残り、最終更新2026-07-20から自動解決しない。(b) main-serverの`servermanager`だけ`contract_version=1.0`を返し他製品は`5.0`だった（v4時点でも同じでv5非回帰）。
- windows-workstationで`bash ./install.sh`を実行したところ同一物理マシンのWSLで走り、`fox-wsl`のsymlinkをWindows repoへ張り替えた。検知して`fox-wsl`自身のrepoから再installし復旧した。
- 退役判定時点で、全hostがv5で安定しv4 outboxは空だったが、cutoverからの経過は数分だった。

## Decision

1. **wire v5を4 host全てで現役wireとする**。v5 endpointは`FACTORY_V5_INGEST_ENABLED=true`の明示時だけ公開し、v2 / v4 endpointは受理を継続する。保存面はv2 / v4と共有し、退役済み`codegraph`は当時の`contract_version=2.0`のまま`not_applicable`として履歴に残す。**major越しの履歴は書き換えない。**
2. **v4 endpointは停止せず据置く**。全host v5安定とv4 outbox空は満たすが、retention期間が経過していない。cutoverから数分の時点でhost別rollbackを捨てる利益は無く、v4は独立flagでv5に干渉しない。**戻せる状態を必要なく捨てない。** 再評価条件は「4 hostが7日以上連続でv5 reportを送りv5起因のdead-letter / ack失敗が0件」「その期間host別v4 rollbackを一度も必要としなかった」「v4 outboxが全hostで空」「BugHub側でv4受理が0件」の全充足とする。未達を成功扱いしない。
3. **退役製品のexpectation issueはfull snapshotで明示解決する**。full snapshotに現れない製品はそのwire majorから退役しており、以後どのreportでも評価されない。`report_mode === 'full'`の時だけ報告集合外のopen expectation issueを解決する。個別の退役コマンドを増やさず、将来どの製品が退役しても自動で効く形にする。
4. **`contract_version`はwire contract版を一貫して指す**。製品固有のschema版は`state_schema_version`が持つ。`scan.mjs`の`emptyProduct()`がv1期の`1.0`を固定するため、v5では`servermanager`も他製品と同じくwire版へ上書きする。
5. **WSLを持つWindows hostへの`ssh <host> "bash ..."`はWSLで実行される**ことを既知の罠として記録する。host識別を`hostname`だけで判断せず、Windows nativeとWSLは別hostとして扱う。今回`fox-wsl`のsymlinkを壊し復旧した実例がある。

## 帰結

wire v5が現役wireになり、AIShellが工場の観測面へ正式に載った。A3で入れたoptional登録が
wire majorを越えられず消えていた状態が解消された。v4は据置きのため、host単位のrollbackは
引き続き可能である。
