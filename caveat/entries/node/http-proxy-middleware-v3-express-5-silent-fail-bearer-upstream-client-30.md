---
id: http-proxy-middleware-v3-express-5-silent-fail-bearer-upstream-client-30
title: http-proxy-middleware v3 + Express 5 はリクエストを silent fail する (bearer 通過後 upstream に届かず client が 30 秒タイムアウト)
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - node
  - express
  - http-proxy-middleware
  - reverse-proxy
  - silent-fail
environment:
  os: linux
  arch: x64
  node: 22.22.1
source_project: null
source_session: 2026-05-03T14:09:28.226Z/ebf7af88f124
created_at: 2026-05-03
updated_at: 2026-05-03
last_verified: 2026-05-03
---

## Symptom

Express 5.x で `app.use(path, requireBearerAuth, createProxyMiddleware({ target, pathRewrite }))` の構成にすると、Bearer 認証は通るのにリクエストが upstream に到達しない。upstream コンテナの access ログにも痕跡なし、image-hub 側の proxy ログにも error イベントの出力なし、curl 側はサーバー応答なしで 30 秒近く待ってから timeout。`pathRewrite` を関数版にしようが target に path を含めようが症状変わらず。</symptom>
<parameter name="cause">http-proxy-middleware v3.0.x は Express 5 の `req.url` ハンドリング変更 (mount path 剥離タイミング + ルーティングレイヤーの match 戦略変更) と組み合わさると、内部の path 結合経路で「ユーザーから見えないところで」リクエストを破棄する経路に入る。Express 4 + 同じ middleware では問題なし。chimurai/http-proxy-middleware の Express 5 対応は v3.0.5 時点で完全ではない。</cause>
<parameter name="resolution">http-proxy-middleware を捨て、`node:fetch` ベースの素朴フォワーダで書く。Streamable HTTP のような単一エンドポイント proxy なら 40 行で済む: `app.all(mountPath, bearer, async (req, res) => { const r = await fetch(upstream, { method: req.method, headers: filteredHeaders, body: JSON.stringify(req.body) }); res.status(r.status); for (const [k,v] of r.headers) res.setHeader(k, v); Readable.fromWeb(r.body).pipe(res); })`。HOP_BY_HOP ヘッダー (host, connection, content-length 等) は除外、`express.json()` 経由で受けた `req.body` は `JSON.stringify` で再シリアライズ。これで silent fail は解消、stream レスポンス (SSE / chunked) もそのまま透過する。</resolution>
<parameter name="evidence">image-hub-app の Express 5.2.1 + http-proxy-middleware 3.0.5 で再現、bearer middleware の log は出る (token verify 成功) が proxy の error/proxyReq event 一切発火せず client 30s timeout、`node:fetch` 直叩きに置換した瞬間に同じリクエストが upstream に届き正常応答。</evidence>
<parameter name="environment">{"node":"22","express":"5.2.1","http-proxy-middleware":"3.0.5"}

## Cause



## Resolution



## Evidence


