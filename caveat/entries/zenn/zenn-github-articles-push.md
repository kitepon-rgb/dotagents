---
id: zenn-github-articles-push
title: 'Zenn の GitHub 連携: articles/ はリポジトリ・ルート直下のみ＋連携を付け替えても push しないと既存記事が再同期されない'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - zenn
  - github-integration
  - static-site
  - monorepo
environment:
  os: darwin
  arch: arm64
  node: 26.3.0
  service: zenn.dev GitHub deploy
source_project: null
source_session: 2026-06-21T09:33:43.573Z/5b1d0e001568
created_at: 2026-06-21
updated_at: 2026-06-21
last_verified: 2026-06-21
---

## Symptom

Zenn の GitHub デプロイ連携で、(1) articles/ をサブディレクトリに置くと記事が認識されない。(2) 連携先リポジトリを別repoに付け替えた直後、既存記事が新リポジトリの内容に更新されない（古い本文・古いドメインのまま）。Webページを見ても変化が無い。

## Cause

Zenn は連携リポジトリの「ルート直下」の articles/ と books/ しか読まない（サブディレクトリ未対応）。さらに同期はブランチへの push（デプロイ webhook）契機でのみ走り、連携を付け替えただけでは既存コミットを再デプロイしない。よって付け替え後に新しい push が無いと、Zenn 上の既存記事は更新されない。

## Resolution

(1) articles/ はリポジトリ・ルート直下に置く（Hugo の content/ などと 1 リポジトリに同居可能。Zenn は articles/ だけ見て他を無視する）。(2) 連携を付け替えたら、空コミット（git commit --allow-empty）を 1 つ push して Zenn のデプロイを誘発する。これで既存記事が新リポジトリの内容へ更新される。連携の付け替え自体は「ダッシュボードで解除→再連携」で、同期済みデータは残る。

## Evidence

連携先を別repoへ付け替えた直後の記事ページは旧ドメイン・画像なしのまま。空コミットを push した後に再取得したら、約12秒で本文画像・内部リンク・転載バナーが全て新内容に更新された。
