---
id: x-api-v2-article-text-plain-text
title: X API v2 article オブジェクトのフル本文キーは text ではなく plain_text
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - x-api
  - twitter
  - x-articles
  - long-form
  - schema-undocumented
environment:
  os: linux
  arch: x64
  node: 22.22.1
  x_api_version: v2
  tier: Pro
  verified_date: 2026-05-02
source_project: null
source_session: 2026-05-02T07:55:20.095Z/6358afb14237
created_at: 2026-05-02
updated_at: 2026-05-02
last_verified: 2026-05-02
---

## Context

X API v2 の tweet endpoint で `tweet.fields=article` を要求。Bearer Token 認証 (Pro plan)。

## Symptom

ツイートが X 公式の長文記事機能 (X Articles) を含む場合、tweet.fields に `article` を追加して `tweet.article.text` を読むと undefined になり、本文が空で出力される。応答には記事URL (`http://x.com/i/article/<id>`) しか出てこない。

## Cause

X API v2 の article オブジェクトの実際のスキーマは公式ドキュメントに詳細記載がない（少なくとも 2026-05 時点）。本番レスポンスを叩いて判明した実構造は:
- `title` (string) — 記事タイトル
- `plain_text` (string) — フル本文（実例で約1600字）
- `preview_text` (string) — 短い要約（実例で約67字）
- `cover_media` (string) — media_key 単体（dict ではない）
- `entities`, `media_entities`

`text` というキーは存在しない。命名から推測して `tweet.article.text` を実装すると常に undefined。

## Resolution

`tweet.article.plain_text` を一次優先、フォールバックで `preview_text` を読む。TypeScript の型定義例:

```ts
article?: {
  id?: string;
  title?: string;
  plain_text?: string;
  preview_text?: string;
  entities?: TweetEntity;
  cover_media?: string;
  media_entities?: Array<{ start: number; end: number; media_key?: string }>;
};
```

表示側:
```ts
const articleBody = tweet.article.plain_text ?? tweet.article.preview_text;
```

検証用サンプル: `https://x.com/QLyun35332/status/2050079506376085585`

## Evidence

2026-05-02、ConnectC2X (MCP server) の実機検証で確認。tweet ID 2050079506376085585 を fetch_tweet し、`tweet.article` オブジェクト全体をダンプ。`text` キーなし、`plain_text` に1626字のフル本文、`preview_text` に67字のプレビュー、`cover_media` は media_key 文字列単体だった。
