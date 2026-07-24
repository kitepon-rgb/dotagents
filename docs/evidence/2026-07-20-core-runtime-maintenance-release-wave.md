# Core runtime maintenance release wave — 2026-07-20

## Scope

Lattice `factory-master` の `fm-0647`、`fm-0649`、`fm-0650`、`fm-0651` を同一
maintenance waveで実施した。各製品repoの正規履歴、CI、npm registry、当該端末のglobal
install、公開後smokeを完了条件とした。

## Spotter 1.4.26

- Tasks: `fm-0647`（SessionEndの`E_UNREACHABLE`）、`fm-0650`（Windows PowerShell hook）
- Release head: `68f612b034ea9a647614fa6e21dacc29d3b24c34`
- Main changes:
  - daemonが既に停止済みのSessionEnd cleanupを`already-stopped`として扱い、warningへ誤分類しない。
  - Windows native Codex hookのquoted Node commandへPowerShell call operator `&`を付け、
    installerは新旧形式を認識する。
  - Windows runtime error storeのprivate ACL処理上限を3秒から15秒へ延長した。
- Verification:
  - focused: Codex backend/hook 82件、install/runtime error store 52件、SessionEndを含む関連test。
  - local full: 532件（530 pass、2 platform skip）、68-file pack。
  - CI: [run 29703109025](https://github.com/kitepon-rgb/Spotter/actions/runs/29703109025) success。
- Publication:
  - [GitHub v1.4.26](https://github.com/kitepon-rgb/Spotter/releases/tag/v1.4.26)
  - npm `claude-spotter@1.4.26`、`latest=1.4.26`
  - registry shasum `fd16f843093087955a4391b72e5d060727ac7b09`
  - global `spotter 1.4.26`
- Post-publish smoke:
  - 一時HOMEへの`spotter install -y --auditor-context disabled`が成功。
  - `spotter codex-hook diagnostics`でSessionStart、UserPromptSubmit、Stopが
    registered / compatible / canonical。

## Throughline 0.8.2

- Task: `fm-0649`
- Release head: `15427bf2655be7cdc64f5ed033d7dabf5e8371a2`
- Main change: Windows native Codex hookのquoted Node commandへPowerShell call operator `&`
  を付け、POSIX commandを不変に保った。
- Verification:
  - focused 18件、local full 705件（704 pass、1 skip）、203-file pack。
  - CI: [run 29702684694](https://github.com/kitepon-rgb/Throughline/actions/runs/29702684694) success。
- Publication:
  - user-owned dirty 7ファイルをtarballへ混入させないため、release headのdetached一時worktreeから
    publishし、完了後に一時worktreeだけを除去した。元worktreeのdirty変更は保持した。
  - [GitHub v0.8.2](https://github.com/kitepon-rgb/Throughline/releases/tag/v0.8.2)
  - npm `throughline@0.8.2`、`latest=0.8.2`
  - registry shasum `a65f297d952d5d497eac14255db5e9d2f891b8fe`
  - global `throughline v0.8.2`
- Post-publish smoke:
  - 一時HOMEへの`throughline install`がClaude/Codex hookを配置。
  - `throughline factory-diagnostics --json`がversion `0.8.2`、overall `ready`、
    Codex hooks `ready`を返した。

## Caveat 0.17.1

- Task: `fm-0651`
- Release head: `4bdf1f620ba67c11b37131204098ba19911ec121`
- Main change: Windows native Codex hookのquoted Node commandへPowerShell call operator `&`
  を付け、再install、ownership判定、diagnosticsを新旧形式へ対応させた。
- Verification:
  - focused 16件、workspace build / typecheck / test、release smoke、npm pack、publish dry-run。
  - CI: [run 29702926409](https://github.com/kitepon-rgb/Caveat/actions/runs/29702926409) success。
- Publication:
  - [GitHub v0.17.1](https://github.com/kitepon-rgb/Caveat/releases/tag/v0.17.1)
  - npm `caveat-cli@0.17.1`、`latest=0.17.1`
  - registry shasum `4487fe3dab4127fddd2566aa236174169481e8b7`
  - global `caveat 0.17.1`
- Post-publish smoke:
  - 一時Codex homeへのhook installがUserPromptSubmit、PostToolUse、Stopを配置。
  - `caveat codex-hook diagnostics`がavailability `available`、installation `installed`。

## Result

対象4件の修正、version bump、公開CI、GitHub release、npm publish、global install、
公開後smokeが完了した。Windows commandの実runner検証は各製品CIで通過し、macOS上の
公開後smokeはregistryからglobal installした実packageで行った。
