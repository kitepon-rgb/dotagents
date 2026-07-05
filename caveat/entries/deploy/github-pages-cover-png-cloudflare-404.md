---
id: github-pages-cover-png-cloudflare-404
title: GitHub Pages 公開直後、デプロイ判定で cover.png を直ポーリングすると Cloudflare が 404 を焼き付ける
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - cloudflare
  - github-pages
  - cdn-cache
  - '404'
  - hugo
  - deploy
  - cache-poisoning
environment:
  os: darwin
  arch: arm64
  node: 26.4.0
  host: blog.kitepon.dev
  ssg: Hugo
  hosting: GitHub Pages
  cdn: Cloudflare
  repo: WebAICoding
source_project: null
source_session: 2026-07-05T11:44:25.817Z/ba277f34aa73
created_at: 2026-07-05
updated_at: 2026-07-05
last_verified: 2026-07-05
---

## Context

WebAICoding（ブログ blog.kitepon.dev）の記事公開フロー §7「X投稿の前提: デプロイ完了を待つ」。記事は content/post/<slug>/index.md ＋ cover.png/cover-sm.png ＋ 本文図版。tools/cover が生成。ホスティングは GitHub Pages（Deploy Actions）＋ Cloudflare（cf-cache-status が出る＝プロキシ有。CLAUDE.md の "DNS only" 記述は実態と食い違い）。

## Symptom

Hugo+GitHub Pages（Cloudflare 経由）の blog.kitepon.dev で新記事を push 後、記事本文・cover-sm.png・converse.png は 200 なのに cover.png だけ 404 が居座り、トップのカードでカバーが消える。404 レスポンスに cf-cache-status: HIT が付く（ファイルは実在してデプロイ済みなのに 404）。

## Cause

CLAUDE.md 公開フロー §7 の「デプロイ完了待ち」で cover.png を curl ループで叩いていた。デプロイ伝播中は GitHub Pages が旧コンテンツを配信するため新規ファイル cover.png は 404 を返す。その 404 を Cloudflare がキャッシュ（max-age）してしまい、ファイルが live になった後も焼き付いた 404 を配信し続ける。ポーリング対象が cover.png だけだったため、叩いていない cover-sm.png/converse.png は同一コミットでも 200 のままだった＝「ポーリングした URL だけ 404 が焼き付く」構図。

## Resolution

デプロイ完了判定は記事ページ URL（<記事URL>/）でポーリングし、cover.png を直ポーリングしない。カバーの到達確認はキャッシュバスター付き1回だけ＝curl '<記事URL>/cover.png?cb=$(date +%s)'。焼き付いた 404 は TTL 失効で数分後に自然に解ける（実際このセッションで解けた）／急ぐなら Cloudflare ダッシュボードでその URL をパージ（repo に CF API トークンは無い）。CLAUDE.md §7 をこの手順に修正済み。

## Evidence


