# rtk 0.43.0 byte-exact更新の不採用

- 日付: 2026-07-21
- 対象: `mq-0047`
- 結論: aiterm-mcpの0.42.0互換baselineを維持し、0.43.0への版数置換を行わない。

## 検証

- upstream: `rtk-ai/rtk` GitHub release `v0.43.0`
- asset: `rtk-aarch64-apple-darwin.tar.gz`
- `checksums.txt`によるSHA-256検証: OK
- 実行version: `rtk 0.43.0`
- 比較: aiterm-mcp `test/fixtures/pytest`の6 inputを`rtk pipe -f pytest`へ渡し、既存expectedとdiff
- 結果: `proj`, `proj_ra`, `allpass`, `notests`, `onlyskip`, `cap`の6件すべてdiff

主な差は区切り線削除、summary表現変更、末尾改行、failure cap時の動的tee保存先追加である。
aiterm-mcpは固定・決定的・privacy-safeな出力を契約としており、0.43.0へbyte追従すると既存利用者の
出力契約を変え、環境依存pathを持ち込む。`proj_ra`には従来から可読性のための意図的差分もある。

よって文書の「0.42.0」を機械的に「0.43.0」へ更新せず、goldenと実装を変更しない。
aiterm-mcp worktreeのユーザー所有未追跡`tmp/`にも触れていない。
