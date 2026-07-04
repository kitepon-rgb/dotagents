---
id: codex-cli-app-server-turn-start-input-thread-start-2
title: 'Codex CLI app-server: turn/start は input 配列 + 事前 thread/start の 2 段階呼び出しが必須'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - codex
  - codex-app-server
  - json-rpc
  - silent-failure
  - api-contract
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  codex_cli: 0.130.0
  transport: codex app-server WebSocket JSON-RPC
source_project: null
source_session: 2026-05-15T02:03:55.462Z/8654179afb84
created_at: 2026-05-15
updated_at: 2026-05-15
last_verified: 2026-05-15
---

## Symptom

Codex `app-server` (`codex app-server --listen ws://...`) 経由で `turn/start` を呼んでも prompt が Codex に届かず無反応. iPhone / 外部 UI 側で「Send タップ → Mac Host log には dispatch_ui_action が出ているのに Codex 応答が一切来ない」状態. tool error も throw されない (silent failure). `startTurn({ threadId, prompt: "hello" })` の形で呼んでも JSON-RPC エラーが返らないので、誤って動いていると思いがち.

## Cause

`codex app-server` の `turn/start` JSON-RPC method は (1) `prompt: string` ではなく `input: [{ type: "text", text: "...", text_elements: [] }]` 配列形式を要求, (2) 事前に `thread/start` を呼んで返ってくる `thread.id` を渡す必要がある (新規 thread の場合), (3) 既存 thread を再開する場合は事前に `resumeThread({ threadId, cwd })` を呼ぶ必要がある, (4) `startThread` には `cwd` / `serviceName` / `approvalsReviewer: "user"` / `experimentalRawEvents: true` / `persistExtendedHistory: false` を渡す必要がある. これらが揃わないと Codex 側が silently drop する (error response は返らないが notification も来ない).

## Resolution

broker 版実装と同形に書き直す:
```ts
let threadId: string;
const cwd = process.cwd();
if (action.threadId !== null) {
  threadId = action.threadId;
  await codex.resumeThread({ threadId, cwd }).catch(() => {});
} else {
  const threadResp = await codex.startThread({
    cwd,
    serviceName: "your-service-name",
    approvalsReviewer: "user",
    experimentalRawEvents: true,
    persistExtendedHistory: false,
  });
  threadId = threadResp.thread.id;  // throw if undefined
}
await codex.startTurn({
  threadId,
  input: [{ type: "text", text: userPromptString, text_elements: [] }],
  cwd,
});
```
別実装 (broker 版 codex-link) から protocol 層を port する時は、`startTurn` の signature を必ず確認する. `prompt: string` を受ける wrapper があるなら中身が input 配列に変換しているはず — 直叩きする場合はその変換を再実装する必要がある.

## Evidence

codex-link-p2p commit `42fabf0` の dispatchUIAction 修正. dogfood セッション中に submitTurn fire / DC send 144 bytes 成功 / Mac Host で peer_frame_received + dispatch_ui_action ログ出力までは確認できたが、Codex から notification が一切返ってこない症状を診断ログ追加で発見. 隣リポ broker 版 (codex-link) では正しく 2 段階呼び出しになっていたが、Phase 10 で port する時にこの細部がドロップしていた.
