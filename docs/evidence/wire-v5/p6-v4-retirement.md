# P6受入証拠 — v4退役判定

- 日付: 2026-07-25

## wv5-0610 — 判定基準を実測へ当てる

設計正本§5「v4 endpointは受理を継続する。v5 cutover中も、退役裁定（P6）を通すまで
v4を止めない」および§6のrollback条件に照らして、3つの基準を実測した。

| 基準 | 実測 | 判定 |
|---|---|---|
| 全hostがv5で安定している | 4 host全て`contract_version=5.0`、最終report 2〜3分前 | **満たす** |
| v4 outboxに未送信が残っていない | mac-kite 0件、main-server 0件 | **満たす** |
| retention期間の経過 | cutoverから**数分**。v4は依然として有効（endpoint 401＝経路生存） | **満たさない** |

退役済み`codegraph`だけは`contract_version=2.0`の`not_applicable`として履歴に残る。
これはcompatibility契約どおりで、現役製品はすべて5.0に揃っている。

main-serverの`servermanager`はwv5-0880修理の追従前に一度`1.0`のままreportしたが、
clone更新後の再reportで`installed / 5.0`になった。全host・全現役製品でwire版に統一された。

## wv5-0620 — 裁定

**v4 endpointは停止しない。据置く。**

理由:

1. **retention期間が経過していない。** cutover完了から数分しか経っておらず、
   「host単位でv4へ戻せる」というrollback条件（§6）が実質的に必要な期間である。
   4 hostすべてが同日に切替わったため、v5固有の問題が時間差で出る可能性を排除できない。
2. v4を止めても得られる利益が無い。v4 endpointは`FACTORY_V4_INGEST_ENABLED`という
   独立flagで動いており、v5の運用に干渉しない。稼働コストも無視できる。
3. 逆に止めると、host別rollbackが即座にできなくなる。**戻せる状態を捨てる変更を、
   必要が無いのに行わない。**

### 再評価条件

次のすべてを満たした時点で、あらためて退役を裁定する。

- 4 hostが**7日以上**連続でv5 reportを送り続け、v5起因のdead-letterとack失敗が0件であること
- その期間中にhost別v4 rollbackを一度も必要としなかったこと
- v4 outboxが全hostで空のままであること
- BugHub側でv4 endpointへの受理が0件であること（誰も使っていないことの実測）

**未達を成功扱いしない。** 本Phaseは「基準を測り、満たさないので据置く」という
裁定で閉じる。退役そのものは将来の別waveの作業として残る。
