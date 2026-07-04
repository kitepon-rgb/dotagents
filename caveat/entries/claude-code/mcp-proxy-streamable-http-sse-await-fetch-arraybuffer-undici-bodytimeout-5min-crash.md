---
id: mcp-proxy-streamable-http-sse-await-fetch-arraybuffer-undici-bodytimeout-5min-crash
title: mcp-proxy Streamable HTTP は応答後も SSE を閉じないため、リバプロが await fetch().arrayBuffer() で受けると undici bodyTimeout (5min) で必ず crash
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - mcp-proxy
  - mcp
  - streamable-http
  - sse
  - undici
  - fetch
  - bodytimeout
  - long-lived-stream
  - transform-stream
  - node.js
environment:
  os: linux
  arch: x64
  node: 22.22.1
  runtime: Node.js v22 LTS (undici 内蔵 fetch)
  lib: mcp-proxy 6.x
  mcp_transport: Streamable HTTP (/mcp endpoint)
  framework: Express 5
  container: docker compose
source_project: null
source_session: 2026-05-03T19:08:05.525Z/a9371f061110
created_at: 2026-05-03
updated_at: 2026-05-03
last_verified: 2026-05-03
---

## Context

背景: stdio MCP サーバ (例: openai-image-mcp / mermaid-mcp / excalidraw-mcp) を `mcp-proxy --port N --host 0.0.0.0 -- /path/to/stdio-mcp-bin` で HTTP 化し、その手前に独自 Node.js リバプロを立てて bearer auth・OAuth・response intercept (生成物 path → public URL rewrite 等) を挟みたい構成で発生する。

mcp-proxy 6.x の Streamable HTTP は MCP 仕様の `/mcp` 単一エンドポイント (notifications も同じ stream で双方向に流れる long-lived 設計) なので、リバプロ側が「1 リクエスト = 1 レスポンス完了」 の旧来の HTTP 感覚で `await fetch().arrayBuffer()` や `await fetch().text()` で受けると確実にハマる。

特に応答に対して **後処理 (path rewrite, content type 変換, etc) を挟みたい誘惑** がある時に「全体を buffer して JSON.parse すれば楽」 と書きがちで、その瞬間に踏む罠。streaming Transform で chunk 単位処理が正解。

## Symptom

mcp-proxy 6.x で stdio MCP server を Streamable HTTP (`/mcp`) endpoint として公開し、その手前に Node.js のリバプロ (Express + node global `fetch` = undici) を立てて `await upstreamRes.arrayBuffer()` で response 全体を読もうとすると、毎回 5 分後に以下で死ぬ:

```
BodyTimeoutError: Body Timeout Error
  code: 'UND_ERR_BODY_TIMEOUT'
```

スタックは `Readable.fromWeb(upstreamRes.body).pipe(res)` の内部 (`emitErrorNT`) から立つ。pipe 経路に error handler が無いと unhandled error event で **プロセスごと crash** し docker `restart: unless-stopped` が再起動ループに入る。

クライアント (例: Claude Code, Bell の Claude CLI) からは「ツール呼び出しがタイムアウトする」 ように見え、同じセッションで複数回リトライした痕跡 (mcp-proxy 側に `establishing new SSE stream for session ID ...` が 4-5 連発) が残る。tool 自体 (例: openai-image generate_image) は **CallToolRequest を完了して結果を流している** のにレスポンスが届かない、という不可解な挙動になる。

## Cause

mcp-proxy 6.x の Streamable HTTP は仕様上 long-lived な SSE 接続で、tool 結果を `event: message\ndata: {jsonrpc...}\n\n` で 1 イベント送った後も notification / keepalive 用に **接続を閉じない**。

undici (Node 18+ 内蔵 fetch) の `Response.arrayBuffer()` は body stream の **完全 close** を待つ。mcp-proxy が close しないので待ち続ける → undici 側のデフォルト `bodyTimeout: 300_000` ms (5 分) が満了 → `UND_ERR_BODY_TIMEOUT` を throw。

更に `Readable.fromWeb(upstreamRes.body).pipe(res)` の Web→Node Stream 変換層は **error event を pipe で自動伝搬しない** ため、Readable に明示的な error handler を付けないと unhandled error → Node プロセス即死。

## Resolution

**arrayBuffer 戦略を捨てて Transform stream で chunk 単位 SSE rewrite に変更する**。stream を閉じずに pipe しっぱなしにすれば bodyTimeout は発火しない (chunk が来てるうちは alive 判定)。

```ts
import { Transform } from 'node:stream';
import { Readable } from 'node:stream';

function makeSseRewriteTransform() {
  let buf = '';
  return new Transform({
    transform(chunk, _enc, cb) {
      try {
        buf += chunk.toString('utf8');
        let idx;
        while ((idx = buf.search(/\r?\n\r?\n/)) !== -1) {
          const sep = buf.slice(idx).match(/^\r?\n\r?\n/)![0];
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + sep.length);
          // ここで block を JSON.parse → rewrite → re-encode
          this.push(rewrittenBlock + '\n\n');
        }
        cb();
      } catch (e) { cb(e instanceof Error ? e : new Error(String(e))); }
    },
    flush(cb) { if (buf) this.push(buf); cb(); },
  });
}

const upstreamNode = Readable.fromWeb(upstreamRes.body);
const onErr = (e) => { console.error(e); if (!res.writableEnded) res.end(); };
upstreamNode.on('error', onErr);
res.on('close', () => upstreamNode.destroy());
upstreamNode.pipe(makeSseRewriteTransform()).pipe(res);
```

ポイント:
1. **Transform で chunk が来た順に処理**。stream は閉じずに pipe しっぱなし。bodyTimeout は発火しない
2. **upstream node stream と transform の両方に error handler**。pipe は error を伝搬しないので明示的に
3. `res.on('close', () => upstreamNode.destroy())` でクライアント切断時に upstream も明示 destroy (orphan stream 防止)
4. body 長が変わるので `res.removeHeader('Content-Length')` (chunked encoding にする)

回避策として undici の `bodyTimeout` を 0 (= unlimited) に設定する手もあるが、本当に upstream が固まったときに永久ハングするので非推奨。streaming に書き直すのが正解。

## Evidence

image-hub プロジェクト (https://github.com/kitepon-rgb/image-generator) の `server/image-hub-app/src/index.ts` で再現 → 修正:

- **再現コミット** (壊れていた版): `await upstreamRes.arrayBuffer()` で受ける実装。openai-image MCP の generate_image を Bell から呼ぶと毎回 5 分後 BodyTimeoutError → image-hub container crash → restart loop。再現率 100%。
- **修正コミット**: `Transform` stream で chunk 単位 SSE rewrite に変更。同じ generate_image が **11.86s で 200 完走**、URL rewrite & intercept ログも正常、image-hub 安定。

mcp-proxy の openai-image-mcp 側ログにも `CallToolRequest` 完了後に複数の `establishing new SSE stream for session ID ...` が並んでおり、Bell が retry を繰り返していた痕跡が残っていた (= 上流は正常、proxy 層がレスポンス返せず client が retry)。
