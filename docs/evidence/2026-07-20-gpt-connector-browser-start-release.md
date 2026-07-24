# gpt-connector browser start 起動境界修正 — 2026-07-20

## Scope

Lattice `factory-master` の `fm-0639` を実施した。macOSの専用Chromeが正常に稼働しているのに、
`gpt-connector browser start` が起動境界で間欠的に `CDP_UNAVAILABLE` または
`RUNTIME_DRIFT` を返す問題を対象とした。

## Diagnosis

- Caveat `gpt-connector-browser-start-runtime-drift-cdp-unavailable-windowserver-flake` と
  `rag/tools/gpt-connector-macos-window-launch.md` を先に確認した。
- 実機再現時も9223 listener、専用profile、SingletonLockはPID `81871`で一致し、
  `doctor` は `ready` だった。port競合、profile lock異常、Chrome停止ではなかった。
- 既存endpoint所有者検査は短いCDP probe timeoutを共用し、最終WindowServer可視性検査は
  app readinessの15秒deadline残時間しか受け取らないため、正常な収束が境界を越えると失敗していた。

## Product changes

- gpt-connector commits:
  - `fa329f9`: 既存endpoint所有者検査へ3秒、WindowServer可視性収束へ5秒の独立graceを追加。
    profile・所有PID照合と最終fail-closed判定は維持した。
  - `9cc7831`: `npm pack` が必ずcheckとbuildを行う `prepack` gateを追加。
- focused launcher tests: 36 pass。
- full gate: lint、typecheck、126 tests pass。
- local実機: 修正版 `browser start` が2回連続 `already_ready`。
- このrepoにはGitHub Actions workflowが無いため、remote CIはスキップ。local full gateを公開gateとした。

## Publication

- `gpt-connector@0.4.6` はnpm publish自体は成功したが、tarballの実行対象 `dist` が0.4.5のままという
  release不整合を公開後smokeで検出した。上書きせず、失敗をCHANGELOGへ記録して0.4.7で修正した。
- [GitHub v0.4.7](https://github.com/kitepon-rgb/gpt-connector/releases/tag/v0.4.7)
- npm `gpt-connector@0.4.7`、`latest=0.4.7`、registry shasum
  `19b371de87f33ca8c782c6fd9ae9d7cb50273b15`。
- 公開前に0.4.7 tarballを展開し、`dist/src/version.js` が0.4.7、launcher distが
  `ownershipProbeGraceMs` / `windowVisibilityGraceMs` を含むことを確認した。
- global install後、`gpt-connector --version` は0.4.7、`doctor` は `ready`、公開版
  `browser start` は2回連続 `already_ready`。

## Dirty-file handling

gpt-connector repoに以前から存在した未追跡 `gpt-connector-0.4.4.tgz` は旧pack成果物だった。
0.4.6/0.4.7のtarball内容一覧に混入しないことを確認し、commit・publish対象から除外した。
ユーザー所有物として削除していない。
