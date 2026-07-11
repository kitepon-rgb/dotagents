---
id: codex-exec-sandbox-corepack-pnpm-sandbox
title: codex exec の sandbox 内では corepack/pnpm がネットワーク遮断で実行不能 — 委譲先にテストを期待せず統括が sandbox 外でゲートを回す
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - codex-cli
  - sandbox
  - seatbelt
  - corepack
  - pnpm
  - delegation
  - macos
environment:
  os: macOS
  arch: arm64
  node: 26.4.0
  codex_cli: 0.144.1
  pnpm: 10.0.0 (corepack pin)
source_project: null
source_session: 2026-07-11T07:22:26.410Z/5ac955faf3e8
created_at: 2026-07-11
updated_at: 2026-07-11
last_verified: 2026-07-11
---

## Symptom

codex exec --sandbox workspace-write に「pnpm workspace のテストを回して green まで」を委譲すると、node_modules を事前インストール済みでも corepack 経由の pnpm 実行が署名検証エラーで停止し（corepack がネットワークで pnpm の integrity を検証しようとして遮断される）、テスト・typecheck が 1 本も走らない。tsx 等の devDependency も sandbox ビューで解決できず ERR_MODULE_NOT_FOUND になるケースもある。委譲先の報告は「実装したが検証は未実施」になる。

## Cause

codex CLI の sandbox（macOS seatbelt）は workspace 外への書き込みとネットワークを遮断する。corepack は packageManager pin の pnpm を実行する際に署名/整合性検証（ネットワーク要求）を行うため、キャッシュ状態によっては sandbox 内で常に失敗する。tmux の Unix socket 拒否（既存罠 codex-exec-sandbox-unix-socket-tmux-sandbox）と同根の「sandbox が環境依存操作を塞ぐ」系。

## Resolution

委譲契約側で織り込む: (1) 委譲先には実装と git diff --check までを求め、pnpm 系ゲート（test/typecheck/build）は統括が sandbox 外で再実行して採用判定する、(2) 契約に「sandbox 起因の実行不能はコード不具合と誤認せず切り分けて報告せよ」を明記する（実績: 委譲先 2 体とも正直に切り分けて報告し、統括の再実行で全 green を確認できた）。worktree への事前 pnpm install は build/test 資材の準備として有効だが、sandbox 内の corepack 実行自体は救えない。

## Evidence

Caveat v0.15 開発（2026-07-11）で 2 連続観測: gpt-5.6-luna 委譲（4 ファイル修正）と gpt-5.6-terra 委譲（自動再索引実装）の両方が「pnpm 署名検証エラー」「Cannot find package 'tsx'」でテスト実行不能を報告 → 統括が同一 worktree を sandbox 外で `node scripts/pnpm.mjs -r build && -r test` して 264/272 tests 全 green。
