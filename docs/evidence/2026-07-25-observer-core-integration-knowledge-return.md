# Observer正式編入 knowledge return

- 取得日: 2026-07-25
- 確度: 実装・公開・本番rollback・完全回帰で確認済み

## 正典へ戻した判断

- 工場管理対象数は11、自作コア数は10、第三者管理はMarkItDown 1製品である。
- Observerは自作コアで、macOS対応hostだけ`required`。非対応hostは構造的
  `unsupported`とする。
- factory wireの固定集合変更は旧majorを変更せず新majorで行う。Observerはwire v6の
  14番目であり、v5はhost別rollback用に保持する。
- 更新ジョブのpost-update gateは現行wire runnerへ固定し、releaseで追加した
  platform限定製品数を回帰fixtureへ反映する。

## 再走を防ぐ罠

- 製品の「管理」と「所有」を同義にしない。MarkItDownは管理対象だが修正所有者ではない。
- server flagを戻す前に全hostを旧majorへ戻す。client payloadを別majorへ変換しない。
- schedulerの引数省略既定は互換契約であり、現行本番登録の選択根拠にしない。
- source revisionはcompose rollback時にも旧値へ復元し、稼働codeとreadiness表示を一致させる。
- full CIに新wire testが列挙されていることをfixtureで固定し、個別test greenだけで閉じない。

詳細な受入・修理一覧は
[最終監査](2026-07-25-observer-core-integration-final-audit.md)を参照する。
