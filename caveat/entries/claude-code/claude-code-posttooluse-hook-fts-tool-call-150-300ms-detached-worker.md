---
id: claude-code-posttooluse-hook-fts-tool-call-150-300ms-detached-worker
title: Claude Code PostToolUse hook で同期 FTS は毎 tool call に 150-300ms 乗せる — detached worker で非同期化必須
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-code
  - hook
  - performance
  - node
  - post-tool-use
  - async
environment:
  os: win32
  arch: x64
  node: '>=22.5'
  platform: windows
  claude-code: any
source_project: null
source_session: 2026-04-22T03:38:56.273Z/bcc58400fd75
created_at: 2026-04-22
updated_at: 2026-04-22
last_verified: 2026-04-22
---

## Symptom

PostToolUse hook 内で DB を開いて FTS5 検索するなど「重い I/O」を同期実行すると、tool 呼び出しごとに 150-300ms の overhead が乗る。Windows では稀に 500-2000ms のスパイク。Claude Code が hook の exit を待つため、ユーザーから見て全 tool call が遅くなる体験になる。

## Cause

Claude Code は PostToolUse hook の stdout を次ターンのコンテキストに挿入する契約なので、hook 完了まで同期的に待つ。Node 起動 (~60-80ms) + bundle load (~100ms) + 実処理 (~30-100ms) で ~200ms が下限。hook 登録を「matcher で tool_name=Bash|Edit 等に絞る」だけでは軽減できない — その tool 群が実質的に全 tool call を占めるため。

## Resolution

前景 hook は ~20ms で戻す構造にする: (1) pending queue の drain + emit、(2) 重い処理が必要な条件のときだけ `spawn(execPath, [...args], { detached: true, stdio: 'ignore', windowsHide: true }).unref()` で worker を fork、即 exit。worker は結果を pending dir (session 単位) に書き込み、次の hook tick で drain される。これで happy path のレイテンシは Node startup + bundle load の下限(~170ms on Windows, ~80ms on POSIX)まで抑えられる。reminder は 1 tick 遅延するが、Claude の次ターン前には必ず到着する。

## Evidence

Caveat プロジェクト v0.10 実装で実測: 前景 hook の typical 170-200ms(ほぼ Node 起動 overhead)、worker は裏で 100-300ms。`apps/cli/src/commands/hookCmd.ts` の runHook() と spawnWorker()、`packages/core/src/pendingReminders.ts` の queue 実装を参照。
