---
id: xarticle-mcp-unpublish-update-content-publish-linked-tweetid
title: 'xarticle MCP: 再公開(unpublish→update_content→publish)でも linked tweetId は保持される'
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - xarticle
  - x-article
  - claude-code
  - WebAICoding
  - publish-flow
environment:
  os: linux
  arch: x64
  node: 22.22.1
source_project: null
source_session: 2026-06-20T13:24:47.876Z/6aa2cc9548d2
created_at: 2026-06-20
updated_at: 2026-06-20
last_verified: 2026-06-20
---

## Symptom

WebAICoding ブログの公開フロー §8/§7 で、X Article を更新するため x_article_unpublish → x_article_update_content → x_article_publish を実行。CLAUDE.md §8 は「再公開で新しいリンクツイートが立つ→プロフィールの固定ツイートを貼り直す（ユーザー作業）」と警告している。実際にどうなるか不明だった。

## Cause

xarticle MCP の publish は、同一 articleEntityId に対して再公開しても新しい tweet を作らず、既存の linked tweet を再利用する（tweetId が保持される）。article entity と linked tweet が 1:1 で固定されているため。

## Resolution

2026-06-20 セッションで2回再現: (1) トップページ目次 articleEntityId 2040377064726097920 → 再公開後 tweetId 2040378715331531230（元の記事一覧URLと同一）。(2) LiveTR記事(#31) articleEntityId 2068316427631955968 → 締めの一文を削除して再公開後も tweetId 2068318822663438660 のまま。よって記事URL・x-top-page.md のリンク・reference_x_articles.md の記録URLは差し替え不要で、プロフィール固定ツイートの貼り直しも（tweetId 不変なので）おそらく不要。CLAUDE.md §8 の「新しいリンクツイートが立つ」警告は今回の観測と食い違う。次回も再公開前後で tweetId を確認し、変わらなければ各種URL参照の更新・固定貼り直しはスキップしてよい。

## Evidence

publish 戻り値: top page {"tweetId":"2040378715331531230"}（再公開後も同一）、記事 {"tweetId":"2068318822663438660"}（本文編集をはさむ2回の publish で同一）。
