---
id: x-twitter-oauth2-refresh-400-invalid-token-refresh-token-rotation
title: X (Twitter) OAuth2 refresh が 400 invalid_token を返し refresh 不可、 token rotation 機構が壊れて連鎖障害になりやすい
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - openclaw
  - x-api
  - oauth2
  - refresh-token
  - rotation
  - intermittent
environment:
  os: linux
  arch: x64
  node: 22.22.1
  date: 2026-05-03
  project: OpenCClaw
  x_api_version: v2
  oauth2_endpoint: /2/oauth2/token
  processes: openclaw-webhook + discord-bridge + bellbot
source_project: null
source_session: 2026-05-03T09:54:05.182Z/38f4d70803cb
created_at: 2026-05-03
updated_at: 2026-05-03
last_verified: 2026-05-03
---

## Context

OpenCClaw の Bell_QuoLu (X bot account) OAuth2 token 周辺で 2026-05-03 に観測。 webhook receiver の log を読んでいて副次発見、 本日のメインタスク (bell_image_search) とは無関係だが個別記録に値する環境トラップ。 OpenCClaw 固有のプロセス構造 (3 プロセス token 共有 + LogBot pull 経路) に依存するので private で記録。

## Symptom

X (Twitter) API v2 を OAuth2 token で叩く運用で、 webhook receiver / bot の API call が 401 になり OAuth2 refresh 試行が以下のエラーで失敗する:

```
[x-oauth2] リフレッシュ失敗 (OAuth2 refresh failed (400): Value passed for the token was invalid.)
```

- HTTP status: 400 (`/2/oauth2/token` endpoint)
- response: `{ "error": "invalid_request", "error_description": "Value passed for the token was invalid." }` 系
- access_token + refresh_token のペアを `.env` に保存して使う運用 (Bell_QuoLu 等の bot account)
- access_token が期限切れになると refresh_token で新しい access_token を発行する想定だが、 refresh も 400 で弾かれる

副作用:
- API call が連続失敗 → bot 機能 (post tweet / read timeline 等) が停止
- LogBot 等の別プロセスから token を pull する fallback で凌げる場合があるが、 LogBot 側の token も古ければ全停止
- Quo が手動で OAuth2 再認可 (ブラウザフロー) するまで復旧しない

## Cause

主に 2 つの原因が観測されている:

1. **refresh_token rotation の取りこぼし**: X の OAuth2 仕様では refresh_token を 1 回使うと新しい refresh_token に rotate される。 この新 refresh_token を保存し損ねる (= 旧 refresh_token を再利用する) と、 旧 refresh_token は X 側で revoke 済みなので 400 invalid_token。 並行プロセスが同じ refresh を試みて race するときに発火しやすい。

2. **手動 token 更新 / 別経路再認可で旧 refresh_token が無効化**: Quo が別端末で `scripts/oauth2-setup.js` 等を走らせて新 token 発行すると、 古い refresh_token は X 側で revoke される。 既存プロセス (`.env` をキャッシュしているもの) は古いまま残るので 400。

OpenCClaw の場合: webhook-receiver / discord-bridge / bellbot の 3 プロセスがそれぞれ token を持ち、 refresh の race + LogBot pull 経路がある複雑な構造のため、 rotation 取りこぼしが起きやすい。

## Resolution

**復旧手順** (Quo 手動): `scripts/oauth2-setup.js` で OAuth2 再認可 (ブラウザフローで Bell_QuoLu アカウントを auth → 新 access_token + refresh_token を取得) → `.env` (`BELL_X_OAUTH2_*`) を更新 → bellbot / webhook-receiver / discord-bridge を restart。

**予防的設計** (将来の改善余地):
- token store を 1 箇所 (= LogBot) に集約し、 他プロセスは pull のみで持つ → rotation race 削減
- refresh_token rotation の atomic save (= 失敗時に旧 token を残すロジック) で取りこぼしを防ぐ
- token expiry の余裕観察 (= 期限ぎりぎりに refresh しない、 一定 buffer で先回り refresh)
- 400 invalid_token を検知したら **Quo に Discord 通知** で手動再認可を促す自動化

## Evidence

openclaw-webhook container log で繰り返し観測:
```
[x-oauth2] 401 検出、トークンをリフレッシュ中...
[x-oauth2] リフレッシュ失敗 (OAuth2 refresh failed (400): Value passed for the token was invalid.)、LogBot から pull 試行...
[x-oauth2] LogBot (discord-bridge:18800/oauth2-sync) からトークン pull 成功
[x-oauth2] LogBot pull のトークンで継続 (二重 refresh は回避)
```

LogBot pull で凌いでいる現状が記録から確認できる (= 部分的に動いているが本質的解決ではない)。
