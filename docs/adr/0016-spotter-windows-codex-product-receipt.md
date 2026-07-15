# ADR 0016: Spotter Windows Codex実行経路の製品receipt

日付: 2026-07-16

## Status

Accepted cross-repo receipt。SpotterのWindows Codex CLI実行経路修正と公開済みv1.4.25だけを受け入れる。
4 hostへの実配布、hook trust、Codex auditor／Sidecar diagnostics、factory report再送は本receiptから推測しない。

## Source evidence

- repo: `/Users/kite/Developer/Spotter`
- product fix commit: `65bccf8`
- product fix tree: `557cdc2ecd928b6f5aa6ea7727096eab40bfa6a6`
- annotated tag: `v1.4.25`（peeled commit `65bccf8`）
- release record commit: `e26d37f`
- release record tree: `9efba36d0327d50412c959fe27b878dced93278b`
- archived product plan: `docs/archive/WINDOWS_CODEX_DISCOVERY_FIX_PLAN.md`
- product plan git blob: `40239662c1bc6fbf30ed9f4add93b899dc7e7140`
- product plan SHA-256: `e86fb2f75f7b5b733d5232fbc347831c3013ef646c8d7491ecf577695d057f44`

## Accepted contract

- Windowsの固定version／features probeだけは未解決npm shimを`cmd.exe`経由で起動する。
- auditorとSidecar workflowは検証済みnpm shimをNode entrypointへ解決し、project pathや引数を
  `cmd.exe`へ再解釈させない。
- POSIXと実体`.exe`は直接spawnし、stdin prompt、非0終了、timeout、bounded outputのfail-loud契約を維持する。
- Windows timeoutはprocess tree終了を待ち、終了確認失敗を`E_CODEX_CLI_TERMINATION`としてtimeout成功と区別する。

## Gate

- current product HEAD `e26d37f`で変更契約に直結するfocused 131 PASS / 0 FAIL / 0 SKIP。
- `git diff --check` PASS、Spotter worktree clean、`main...origin/main`一致。
- 製品正本には530 tests（528 pass / 2 platform skip）、68-file pack、FOX Windows native tarball仮導入、
  4 hostのregistry版global install／warning 0 doctor、npm `latest`／GitHub Release同期が記録済み。
- この受入ではregistry再照会、実host設定変更、hook trust、report送信、push、publishを実行していない。

## Queue transition

BugHub計画Wave 8のSpotter項目を製品修正とhost rolloutへ分割し、v1.4.25 producer fixだけDONEにする。
4 hostのinstall、doctor、Codex auditor、Sidecar diagnosticsとdotagents adapterの実配布receiptはR2へ残す。
