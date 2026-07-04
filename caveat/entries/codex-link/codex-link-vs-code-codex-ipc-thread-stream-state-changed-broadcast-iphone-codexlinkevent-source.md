---
id: codex-link-vs-code-codex-ipc-thread-stream-state-changed-broadcast-iphone-codexlinkevent-source
title: 'Codex Link: VS Code Codex IPC の thread-stream-state-changed broadcast を iPhone 向け CodexLinkEvent の source にすると詰む'
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - codex-link
  - mac-host
  - vscode-codex
  - ipc
  - streaming
  - dedup
  - live-sync
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  repo: codex-link
  codex_cli: 0.130.0
source_project: null
source_session: 2026-05-13T06:48:11.092Z/b958d8943b0a
created_at: 2026-05-13
updated_at: 2026-05-13
last_verified: 2026-05-13
---

## Context

Codex Link 3 面 live 同期 (iPhone / Mac Host / Codex CLI + VS Code Codex 拡張) を Codex CLI 0.130.0 系で組む際の構成判断。Mac Host 起動時に loopback WS app-server を spawn し、CLI は `--remote ws://...` で同じ app-server に attach、VS Code 拡張は jsonl watcher で thread を pick up する設計が正解。VS Code IPC は `thread-follower-start-turn` での turn 注入と broadcast 購読の両用法とも、現状の dedup と app-server 分離問題で iPhone 向け routing には使えない。

## Symptom

Mac Host (`apps/mac-host`) が VS Code Codex 拡張の IPC socket (`$TMPDIR/codex-ipc/ipc-$UID.sock`) に follower として接続し、`thread-stream-state-changed` broadcast を `CodexLinkEvent` に変換して iPhone へ転送する設計にすると、(1) iPhone app が turn 中にフリーズ (操作不能、Codex 実行中ではない)、(2) `codex tui --remote ws://...` で attach した CLI TUI に turn が一切表示されない、(3) `handleCodexNotification` を IPC open 時に skip すると loopback WS app-server 経由 (CLI/iPhone 起点) の turn も iPhone に届かなくなる。

## Cause

複合要因:

(A) iPhone freeze の真因は streaming dedup の設計ミス。`emitCodexLinkEventsFromVscodeConversation` の agent text 用 signature が `${turnId}|agent|${i}|${text.length}|${text.slice(-32)}` のため、ストリーミングで 1 トークン伸びるたびに新しい signature → 累積 agent text を丸ごと `transcript.item.recorded` で再送。1 turn で何百回も全文 push され、iPhone 側 `SessionProjection.apply` が UI thread を block。`transcript.item.recorded` は本来 completed item 用で、streaming delta には不向き。

(B) CLI TUI dark の真因は app-server 不一致。`apps/mac-host/scripts/codex-link-cli-attach.sh` 経由で CLI が attach するのは Mac Host が spawn した **loopback WS app-server** (`codex app-server --listen ws://127.0.0.1:0`)。一方 `thread-follower-start-turn` (VS Code IPC) で開始される turn は VS Code 拡張の**内部 app-server** で走るので、loopback WS app-server には何の notification も流れず CLI 側は無音。

(C) `handleCodexNotification` で `vscodeIpc?.isOpen` のとき codex-events 経路を skip する dedup 戦略は誤り。VS Code 拡張の broadcast は VS Code 内部 app-server 由来の turn しか出さない (loopback WS app-server の turn は jsonl 経由で VS Code 側 UI に出るが、内部 app-server を経由しないので broadcast には乗らない)。skip した瞬間に iPhone への delivery 経路が消える。

## Resolution

VS Code IPC broadcast → CodexLinkEvent パスは捨てる。3 面 live sync は以下で組む:

1. Mac Host は常に loopback WS app-server (`startMacHostCodexLoopbackWebSocket` in [apps/mac-host/src/codex.ts](apps/mac-host/src/codex.ts)) で turn を回す。`MacHostSessionRunner.startTurn` から `thread-follower-start-turn` 分岐を削除。
2. iPhone への event 配送は `handleCodexNotification` → `codex-events.ts` の正規化経路に一本化 (skip 削除)。streaming delta は `assistant.delta`、completion 時のみ `transcript.item.recorded` という正しい protocol shape になる。
3. CLI TUI は同じ loopback WS app-server に `codex tui --remote ws://127.0.0.1:<port>` で attach するので native に live 共有される。
4. VS Code Codex 拡張は jsonl watcher で loopback WS app-server の thread を pick up (2026-05-13 確認済挙動)。`apps/mac-host/src/session.ts` から VS Code IPC 関連の `attachVscodeIpc` / `handleVscodeIpcMessage` / `emitCodexLinkEventsFromVscodeConversation` / `applyVscodePatches` / `vscodeConversations` / `vscodeSentSignatures` 一式と `replaceVscodeIpc` を全削除し、Runner の options から `vscodeIpc` を外す。cli.ts は socket 存在検知ログだけ残す。

未解決の課題: VS Code Codex panel に直接打鍵した turn (VS Code 内部 app-server で完結) は iPhone/CLI に届かない。取り込むなら、broadcast を streaming delta event として正しく扱い、かつ loopback WS app-server 由来の turnId と source-side で dedup する別実装が要る。長さ + 末尾 32 字 dedup は使うな。

## Evidence

2026-05-13 セッションで再現。commit fb2a1a8 (loopback WS app-server デフォルト化) + 05967d4 (VS Code IPC follower) の組み合わせで iPhone freeze と CLI TUI dark が同時発症。`apps/mac-host/src/session.ts` の修正 (broadcast 経路全削除 + startTurn 分岐撤去 + handleCodexNotification skip 撤去、session.ts -222 行 / cli.ts -50 行) で typecheck 4 package clean、`pnpm --filter @codex-link/mac-host test` 26/26 pass。残るは実機動作確認。
