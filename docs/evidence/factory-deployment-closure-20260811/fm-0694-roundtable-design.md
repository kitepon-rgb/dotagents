# fm-0694 円卓設計確定

- 実施日: 2026-08-11
- Peertable room: `factory-master-fm-0694`
- 参加席: 製品契約、Windows安全、テスト／文書、議長
- 制約: BPR5は退役済みのまま維持し、Latticeへ同機能を戻さない。

## 採用した恒久修理

1. 管理12製品、wire v7の15 ID、host別required集合をdotagents所有の単一展開契約から供給する。
2. host profile・OS・arch・macOS majorの不整合や未知値をfail-closedにし、`verify-install`の重複判定を除く。
3. MarkItDownは「確認成功かつ不在」「存在」「確認失敗」を分離し、順にinstall、upgrade、fail-closedとする。
4. Windows agents-update schedulerはdry-run既定、UTF-16LE BOM、所有者限定ACL、登録後の読み戻し、実行単位へ結び付いたbatch token、当該実行のv7 reportとBugHub受理確認を必須にする。
5. 製品集合のテストは個数でなく、OS/arch別の完全なID・package集合とv7正本との一致を検査する。
6. Windows本番Task Schedulerへのapplyは、目的・影響・戻し方を示した直前承認後だけ行う。

## 円卓で棄却した状態

- 未知OS/archやprofile/OS不整合を受理する契約。
- `uv tool list`失敗をMarkItDown未導入として扱う挙動。
- `schtasks /Create`の終了コードだけで登録成功とする挙動。
- 古いreport/ackファイルの存在だけで今回のBugHub受理を成功扱いする挙動。
- 件数だけで製品集合の正しさを判定するテスト。

以上を `fm-0695`〜`fm-0698` の受入条件として実装・検証する。
