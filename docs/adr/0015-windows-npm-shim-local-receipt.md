# ADR 0015: Windows npm shimローカル修正receipt

日付: 2026-07-16

## Status

Accepted local receipt。Windows command resolverの現行npm `.cmd` shapeとPATHEXT安全境界だけを
受け入れる。FOX Windows nativeの実配布版scan／report成功は未受入のまま残す。

## Source evidence

- PATHEXT implementation commit: `5f781a8`
- PATHEXT implementation tree: `ed93c6f5517d38269e9223c7510570e3f8dae2da`
- two-space shim implementation commit: `5479a73`
- two-space shim implementation tree: `bc4388ede75c740a49361a376be858e2b00a15fe`
- owner: `lib/factory/command.mjs`
- characterization: `tests/factory-scan/factory-scan.test.mjs`

## Accepted contract

- npm `.cmd`の検証済み1／2スペース`SET "_prog=..."` variantだけを受理する。
- PATHEXTの許可外候補は実行せず次候補へ進み、実行可能入口を`.exe`とexact npm `.cmd`へ限定する。
- `.cmd`は`cmd.exe`へ渡さず、検証済み`node_modules`内regular-file／realpath entrypointをNodeで直接起動する。
- traversal、dynamic command、悪意あるshim、許可外extensionをfail loudにし、解決全体の5秒deadlineと
  subprocess kill境界を維持する。

## Gate

- focused 5 PASS / 0 FAIL / 0 SKIP。
- `git diff --check` PASS。
- FOX Windows native実機、12製品scan、post-update gate、enqueue／flush、pushは未実行。

## Queue transition

BugHub計画1qをlocal resolver修正とFOX Windows実機receiptへ分割する。前者だけDONE、後者はH/R2へ残す。
