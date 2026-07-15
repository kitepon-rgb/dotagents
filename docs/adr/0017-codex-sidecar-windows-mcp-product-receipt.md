# ADR 0017: Codex Sidecar Windows MCP shim製品receipt

日付: 2026-07-16

## Status

Accepted cross-repo receipt。Codex SidecarのWindows MCP npm shim修正と公開済みv0.3.7だけを受け入れる。
FOX Windows nativeへのglobal install、factory scan、post-update gate、outbox送信、Task Scheduler適用は
本receiptから推測しない。

## Source evidence

- repo: `/Users/kite/Developer/codex-sidecar`
- product fix／release commit: `493d0cd`
- product fix tree: `84375ba50bc3c93c1c3c365c8493411ae8c43cf9`
- annotated tag: `v0.3.7`（peeled commit `493d0cd`）
- completed plan commit: `f220867`
- repository overview receipt commit: `170ecb5`
- current HEAD tree: `82a79f9a84062d4d8f56db1c6fbebae0593e6caf`
- archived product plan: `docs/archive/WINDOWS_MCP_SHIM_PLAN.md`
- product plan git blob: `b7c0a639accd252625e7e34478f84f857b0aaa94`
- product plan SHA-256: `75f5f26977ec23d88841cb171362207465e4dc29cfcc29388e95d0f88a0416a7`

## Accepted contract

- `factory-diagnostics`だけが、Windowsでregular `.exe`または検証済みnpm `.cmd`をPATHから解決する。
- `.cmd`は固定npm shim shapeだけを許可し、JavaScript entrypointのrealpathがshim配下の
  `node_modules`内regular fileに留まることを要求する。
- filesystem解決はkill可能helperへ隔離し、helperとMCP initializeを一つの3秒deadlineへ収める。
- shell起動、引数再解釈、一般command runner、代替実行ファイルへのfallbackを追加しない。
- helper 4 KiB、MCP stdout 64 KiB、固定initialize request、UNC／reparse／traversal拒否を維持する。

## Gate

- current product HEAD `170ecb5`でCLI build PASS。
- Windows resolver／factory diagnostics focused 18 PASS / 0 FAIL / 0 SKIP。
- `git diff --check` PASS、worktree clean、`main...origin/main`一致。
- 製品正本にはfull workspace typecheck／lint／build／test、pack/install smoke、exact-SHA CI
  `29291350736`、core→CLI→MCP 0.3.7公開、Docker HTTP initialize、registry install、tag／Releaseが記録済み。
- この受入ではregistry再照会、実host変更、report送信、scheduler適用、push、publishを実行していない。

## Queue transition

BugHub計画1rの製品修正をDONEとして不変receiptへ束縛する。FOX Windows nativeの実配布版による
12製品scan、post-update gate、enqueue／flush、Task Scheduler dry-run／applyはH/R2へ残す。
