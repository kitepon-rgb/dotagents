# peertable-wire-v7-execution 終端監査 決定証跡

## 対象

plan `peertable-wire-v7-execution`（t-publish・t-enroll-cutover・t-constitution・t-smoke 4task done）の
terminal-audit phase gate。実装者tsumugi以外の独立席（t-constitutionは自分の担当だが、
他3taskの実装には不関与）として、受入条件をH承認[45]の4項目に対応させて再実測した。

## 受入条件（H承認[45]）との対応と実測

### ①npm publish 0.3.5→0.3.6

- `npm view peertable version`→`0.3.6`（t-publish時に確認済み・本監査時点でも変化なし）。
- t-publish完了時に独立監査済み（room [72]、tarball内容・祖先gate含む）。bell受理済み（room [74]）。

### ②wire v7 enroll（コード実装部分A・B。実deploy/cutoverはcutover-deploy planへ分割済み）

- `lib/factory/v7.mjs`・ServerManager側実装は前task（t-adapter・t-enroll-cutover）で確認済み。
- 本plan範囲のA・B（ServerManager schema/ingest/router、dotagents配信CLI）はflag既定false・
  133+61 test全green（tsumugi報告、design_memoと差分整合確認）。

### ③公開後smoke

- 自分の環境で`peertable-client diagnostics --json`実行→`overall: ready`（product.version 0.3.6、
  5 check全pass/not_applicable）を独立実測、証跡記載と一致。
- `bin/factory-scan-v6.mjs`・`bin/factory-scan-v7.mjs`の存在を確認。`V7_PRODUCT_IDS =
  [...V6_PRODUCT_IDS, 'peertable']`（`lib/factory/v7.mjs`）というコード構造上、v6/v7の差分が
  peertable追加のみになることは実装によって保証されている（t-adapter監査時に確認済みのロジック）。

### ④正典4箇所の自作コア製品数を11へ更新

- 自分が実装(t-constitution)。tsumugiの独立監査（room [75]）で受理済み（room [76]）。

## 実deploy/cutoverについて

実際のdeploy・flag有効化・Mac canary dual-run・mac-kite正式cutoverは別plan
`peertable-wire-v7-cutover-deploy`として分割・完了しており、そちらの終端監査は別途
`docs/evidence/peertable-wire-v7-cutover-deploy/terminal-audit-decision.md`で実施した
（欠陥なし）。

## 結論

4項とも欠陥なし。carry over（main-server自身のhost分・FOX 2host）は明示未実施として
記録されており、H承認範囲内の残作業として次waveへ引き継がれる。

記録者: koharu
