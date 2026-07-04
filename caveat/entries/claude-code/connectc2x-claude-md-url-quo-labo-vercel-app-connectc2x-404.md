---
id: connectc2x-claude-md-url-quo-labo-vercel-app-connectc2x-404
title: 'ConnectC2X: CLAUDE.md 記載の公開 URL (quo-labo.vercel.app/connectc2x) が実は 404'
visibility: private
confidence: confirmed
outcome: impossible
tags:
  - claude-md
  - docs-drift
  - vercel
  - rewrite
  - cross-repo
  - connectc2x
  - quo-labo
environment:
  os: linux
  arch: x64
  node: 22.22.1
  docs_file: /home/kite/projects/ConnectC2X/CLAUDE.md
  cross_repo: C:\Users\kite_\Documents\Program\QuoLabo (別 Vercel project)
  vercel_cli: 50.39.0
source_project: null
source_session: 2026-05-24T09:52:36.727Z/226d8f061549
created_at: 2026-05-24
updated_at: 2026-05-24
last_verified: 2026-05-24
---

## Context

ConnectC2X リポジトリの CLAUDE.md「Webフロントエンド (`web/`)」「Quo Labo 統合」節。Vercel scope `quo-lu` に `web` / `connectc2x` / `quo-labo` の 3 project があり、本来は Quo Labo が外向きエッジで `/connectc2x/*` を内部の connectc2x project へ rewrite する設計。

## Symptom

CLAUDE.md は「公開URL: `https://quo-labo.vercel.app/connectc2x`」「Quo Labo 側 vercel.json で rewrite `/connectc2x/:path+ → https://connectc2x.vercel.app/connectc2x/:path+`」と謳っているが、実機で `curl -sI https://quo-labo.vercel.app/connectc2x` は HTTP/2 404 を返す。`/connectc2x/` (末尾スラ) は 308 だけ返って rewrite 先に届かない。`quo-labo.vercel.app/` 自体も 404。

## Cause

Quo Labo プロジェクト (別リポジトリ `C:\Users\kite_\Documents\Program\QuoLabo`) 側で rewrite を含む `vercel.json` が production に反映されていない、または Quo Labo project の現行 deployment が古くて rewrite ルールが入っていない。本リポジトリ (ConnectC2X) からは触れない領域 (cross-repo / cross-project)。結果として「公開 URL」は実質 `https://connectc2x.vercel.app/connectc2x` になっており、CLAUDE.md の記載と乖離している。

## Resolution

2 択: (a) Quo Labo 側リポジトリで rewrite 入り `vercel.json` を再デプロイする (`cd ~/QuoLabo && vercel --prod`)、(b) または ConnectC2X 側 CLAUDE.md の「公開URL」「Quo Labo 統合」セクションを `connectc2x.vercel.app/connectc2x` に書き換える。どちらにせよ `kitepon.dev` 移行 (0.2.1) とは無関係で、移行以前から壊れていた可能性が高い (issue は 49 日前の deployment と同年代)。デプロイ動作確認の際は `quo-labo.vercel.app` ではなく `connectc2x.vercel.app` を叩くこと。

## Evidence

`curl -sI https://quo-labo.vercel.app/` → 404。`curl -sI https://quo-labo.vercel.app/connectc2x` → 404 (`x-vercel-error: NOT_FOUND`)。`curl -sI https://quo-labo.vercel.app/connectc2x/` → 308 のみ。`curl -sI https://connectc2x.vercel.app/connectc2x/guide` → 200 + 新ドメイン文字列あり。
