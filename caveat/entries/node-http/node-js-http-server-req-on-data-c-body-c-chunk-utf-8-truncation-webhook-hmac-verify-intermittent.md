---
id: node-js-http-server-req-on-data-c-body-c-chunk-utf-8-truncation-webhook-hmac-verify-intermittent
title: Node.js HTTP server で req.on('data', c => body += c) は chunk 境界 UTF-8 truncation で webhook HMAC verify を intermittent に壊す
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - nodejs
  - webhook
  - hmac
  - github-webhook
  - x-twitter-webhook
  - utf-8
  - buffer
  - intermittent-failure
  - auth
environment:
  os: linux
  arch: x64
  node: 22.22.1
  node_runtime: Node.js (any version with http module)
  context: raw http.createServer + req.on('data')
source_project: null
source_session: 2026-05-03T09:53:39.008Z/81bb13299fa4
created_at: 2026-05-03
updated_at: 2026-05-03
last_verified: 2026-05-03
---

## Symptom

GitHub webhook (X-Hub-Signature-256) や X webhook (X-Twitter-Webhooks-Signature) を Node.js の生 http server (`http.createServer` + `req.on('data', ...)`) で受信して HMAC 検証する実装で、 **HMAC verify が intermittent に失敗** する:

- 同じ secret、 同じ受信器、 同じ webhook URL なのに、 last_response が 200 / 401 の混在パターン
- 短いペイロード (commit 1 個など) は 200 が多い
- 大きいペイロード + 日本語/中国語/絵文字を含む commit message / tweet payload で 401 発火率上昇
- 「最初の delivery が 401、 数秒後の retry / 次の delivery が 200」 のような非決定的タイミング
- response body は `Unauthorized` (HMAC mismatch のため)
- GitHub webhook deliveries page では `Invalid HTTP Response: 401` と表示

副作用:
- auto-deploy webhook が時々取りこぼす → marker file 書かれず → host cron poller が pull せず → main push が server に反映されない

## Cause

handler 内で `let body = ''; req.on('data', c => { body += c; })` パターンを使っていると、 Node.js の `Buffer + string` 暗黙変換が `Buffer.toString()` (default UTF-8) を呼ぶ。 webhook payload が `req.on('data')` で複数 chunk に分割されて受信される際、 multi-byte UTF-8 sequence (日本語 char = 3 byte、 絵文字 = 4 byte) が **chunk 境界で分断** されると、 各 chunk の末尾 / 先頭に不完全 sequence が現れる。 Buffer.toString() は不完全 sequence を replacement char `U+FFFD` (3 byte UTF-8) に置換するので、 結合後の string は元 bytes と異なるバイト列になる。

`crypto.createHmac('sha256', secret).update(string)` は string を UTF-8 encode してから HMAC するので、 元 raw bytes の HMAC とは違う digest になる。 → `X-Hub-Signature-256` (= GitHub が raw bytes で計算した digest) と mismatch → 401。

ASCII-only payload では発生しない: ASCII の各 char は 1 byte で chunk 境界に落ちても truncation が起きないため。 これが「再現性が混在」 する理由。

## Resolution

**Buffer 配列で受けて end で Buffer.concat() で連結し、 HMAC verify には Buffer をそのまま渡す**:

```js
// ❌ Bug: Buffer→String 暗黙変換で UTF-8 truncation
let body = '';
req.on('data', c => { body += c; });
req.on('end', () => {
  if (!verifyHmac(body, sig, secret)) return res.writeHead(401).end('Unauthorized');
  // ...
  const payload = JSON.parse(body);
});

// ✅ Fix: Buffer 配列で蓄積 → concat → HMAC は Buffer のまま
const chunks = [];
req.on('data', c => { chunks.push(c); });
req.on('end', () => {
  const body = Buffer.concat(chunks);
  if (!verifyHmac(body, sig, secret)) return res.writeHead(401).end('Unauthorized');
  // ...
  const payload = JSON.parse(body.toString('utf8'));  // ← 完全 buffer の toString は安全
});
```

`crypto.createHmac().update(buffer)` は bytes をそのまま HMAC するので chunk 分断の影響を受けない。 JSON.parse には完全 Buffer の toString('utf8') を渡せば truncation 起きない (chunk 境界の問題は途中で toString するから起きる)。

Express など framework を使っているなら `bodyParser.raw()` や `bodyParser.json({ verify: (req, res, buf) => { req.rawBody = buf; } })` で raw Buffer を確保するのが定石。

## Evidence

- 過去 30 件の GitHub webhook deliveries で 401/200 混在パターン確認、 401 のときの response body は "Unauthorized"、 GitHub から見ると `Invalid HTTP Response: 401`
- 401 になりやすい delivery はサイズが大きく日本語 commit message を多く含む payload (確認: `gh api repos/.../hooks/<id>/deliveries/<id>` で payload + duration を見ると、 401 のときは body 30KB+ の傾向)
- ASCII のみの payload (= 短い英語 commit) では 200 のみ
- 修正実装は OpenCClaw repo commit (lib/webhook-handlers.js) で適用、 同じ bug が GitHub deploy handler / X webhook event handler の 2 箇所にあった</evidence>
<parameter name="context">OpenCClaw (個人 Bot プロジェクト) の webhook receiver で発覚。 GitHub push → Caddy reverse proxy → Node.js webhook receiver の経路で、 main push 時の auto-deploy が intermittent に止まる症状から原因究明。 Caddy 層の問題と最初は誤解したが、 401 response の body が "Unauthorized" (= 受信器の HMAC handler が返す文字列) と一致したため受信器側と判明。
