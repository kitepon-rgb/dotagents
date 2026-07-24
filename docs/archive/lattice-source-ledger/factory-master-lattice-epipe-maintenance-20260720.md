# Factory master — Lattice stdout EPIPE maintenance

2026-07-20 の `cf-0026` 最終確認で再現した非クリティカル欠陥を、Lattice 製品側の次回 maintenance wave へ引き渡すための説明参照。

- [ ] `fm-0657`: Lattice CLI の JSON 出力を早期終了する consumer へ pipe した際、`lattice todo status | head -c 1200` で未処理の `EPIPE` が stack trace と Node.js 異常終了を発生させる。stdout の `EPIPE` を静かな正常終了または契約化された typed error へ正規化し、同じ pipe を使う focused CLI test、version bump、publish、global install、公開後 smoke まで Lattice 製品の maintenance wave で閉じる。dotagents では再現記録と工程追跡だけを所有し、Lattice 本体は変更しない。
