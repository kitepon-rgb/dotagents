# ADR 0013: Throughline factory diagnostics製品修正receipt

日付: 2026-07-16

## Status

Accepted cross-repo receipt。Throughline producerのCodex hook集約修正と公開済みv0.6.3だけを受け入れる。
main-server／Mac／FOX WSL2への導入・再送、全host post-update gateを本receiptから推測しない。

## Source evidence

- repo: `/Users/kite/Developer/Throughline`
- producer fix commit: `f928c13`
- producer fix tree: `0f67666235b605e83ebe76a335f68c3d2a61ba63`
- release tag commit: `v0.6.3` / `fc83ddf`
- release record commit: `fe8ea87`
- release record tree: `88793c3079d648528613316946ea1d09cc35ea02`
- product plan: `docs/13_native_factory_diagnostics_plan.md`
- product plan git blob: `4182a4d18b62f76dff54cd8bee44b543557f4652`
- product plan SHA-256: `427a570a748ecc1d1b098851375199e452c1a204924fba5c0d155f1896ddf4cf`

## Accepted contract

- canonical UserPromptSubmit／PostToolUse／Stopがすべて`ready`ならhook summaryとCodex connectorを
  `ready`へ集約する。
- 未検査のClaude connectorは`unverified`のまま公開するが、Codex-only overallを阻害しない。
- read-only、privacy、JSON-only、exit、database schema、capture／restore／handoff契約は変更しない。

## Gate

- current product HEAD `ebfc152`でfocused 15 PASS / 0 FAIL / 0 SKIP。
- `git diff --check` PASS、Throughline worktree clean。
- 製品正本には公開CI `29284655280`（9/9 green）、npm shasum
  `4f3fcd2598a75f026358dae7f3eb3165242b580b`が記録済み。
- この受入ではregistry再照会、実host hook適用、report送信、push、publishを実行していない。

## Queue transition

BugHub計画1mを製品修正とhost rolloutへ分割し、producer fixだけDONEにする。残るmain-server正規hook、
Mac handoff readiness、FOX WSL2再観測はR2／host rolloutとして未完のまま維持する。
