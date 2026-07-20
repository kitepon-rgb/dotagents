# ADR 0109: cf-0155 main-server Codex hook実火の補完受入

- Status: Accepted
- Date: 2026-07-21
- Scope: Lattice `codex-full-support/cf-0155`
- Supersedes: [ADR 0074](0074-codex-hook-cross-host-acceptance.md) のうち、main-serverを設定検査だけで実火済みへ拡張した受入根拠

## Decision

main-server上で新しい読み取り専用Codex CLI sessionを起動し、dotagents projectの
SessionStart、UserPromptSubmit、Stop hookが実際に完了したことを直接観測した。
ADR 0074で既に直接観測済みのFOX WSL2／FOX Windows nativeと合わせ、
`plan_callout-hooks.md` Phase 6をbaselineにした「他端末実火」を満たすため、
Lattice task `cf-0155` を完了とする。

## main-server直接証拠

- host: `main-server`
- Codex: `codex-cli 0.144.6`
- session: `019f818f-5d5f-7e92-9be2-7e1f61e94739`
- prompt result: `CF0155_MAIN_HOOK_OK`
- SessionStart: 4 entriesすべて`Completed`
- UserPromptSubmit: 4 entriesすべて`Completed`
- Stop: 4 entriesすべて`Completed`
- session key: `ae9621b85b6b218afcf623525456d3a5143b4a9915d73db8560e745b913c945f`
- generated state:
  - `ae9621b85b6b218afcf623525456d3a5143b4a9915d73db8560e745b913c945f.codex-onset-info`
  - `ae9621b85b6b218afcf623525456d3a5143b4a9915d73db8560e745b913c945f.31dc0e24f6a5.codex-snapshot`
- Spotter ledger after session: 110 events、Claude 53／Codex 57、parse error 0
- Spotter runtime error store: records 0、open 0、unacknowledged 0
- remote `git status --short`: 出力なし

## 境界

Codex App Remoteでhook INFOが会話画面へ配送されなかった事象は、CLI hook commandの
実火・完了とは同一視しない。本ADRはCLI実火だけを受け入れ、App Remoteの表示配送や
Throughline handoffの受入へ拡張しない。

Lattice製品repoは変更していない。廃止済み`codex-rc`は利用していない。

