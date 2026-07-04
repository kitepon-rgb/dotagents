---
id: connectc2x-vercel-prod-canonical-alias-connectc2x-vercel-app
title: 'ConnectC2X: vercel --prod だけでは canonical alias (connectc2x.vercel.app) が更新されない'
visibility: private
confidence: confirmed
outcome: resolved
tags:
  - vercel
  - alias
  - deployment
  - connectc2x
  - monorepo-link
  - canonical-url
environment:
  os: linux
  arch: x64
  node: 22.22.1
  vercel_cli: 50.39.0
  project_link: web/.vercel/project.json → projectName:web, scope:quo-lu
  canonical_alias_target_project: connectc2x
  framework: Next.js basePath:/connectc2x
source_project: null
source_session: 2026-05-24T09:52:18.170Z/5b91ef5ec42b
created_at: 2026-05-24
updated_at: 2026-05-24
last_verified: 2026-05-24
---

## Context

ConnectC2X リポジトリ (`/home/kite/projects/ConnectC2X`) の `web/` (Next.js + Vercel)。Vercel scope `quo-lu` に `web` / `connectc2x` / `quo-labo` の 3 project が並存。canonical 公開フロー: `quo-labo.vercel.app/connectc2x/*` → rewrite → `connectc2x.vercel.app/connectc2x/*` → 実ビルド。

## Symptom

`cd web && vercel deploy --prod` が成功し `target: production` を返すのに、canonical 公開 URL `https://connectc2x.vercel.app/connectc2x/*` が古いビルドを返し続ける (例: ドメイン置換後も guide ページが旧 `kitepon.dynv6.net` を露出)。preview URL (`web-<hash>-quo-lu.vercel.app`) を直接叩くと新ビルドは正しく動く。</symptom>
<parameter name="cause">ローカル `web/.vercel/project.json` のリンク先は scope `quo-lu` の project `web` (alias: `web-quo-lu.vercel.app`)。一方 canonical alias `connectc2x.vercel.app` は別の project `connectc2x` の **49 日前の deployment** (`connectc2x-nvlrkh2gk-quo-lu.vercel.app`) を指したまま放置されていた。`vercel --prod` は自身がリンクされている project の production を更新するだけで、別 project が持つ alias は触らない。`vercel promote` も「既に production」と 409 を返し alias 移動はしてくれない。

## Cause



## Resolution

即時対応: `cd web && vercel alias set <新deployment URL> connectc2x.vercel.app` で alias を新 deployment に手動で付け替える (今回は `vercel alias set web-21seboj85-quo-lu.vercel.app connectc2x.vercel.app` で復旧)。恒久対応の選択肢: (a) `web/.vercel/` を削除して `vercel link` で `connectc2x` project に再リンクし以後 `vercel --prod` で alias が自動追従するようにする、(b) または CLAUDE.md のデプロイ手順を「`vercel --prod` のあと必ず `vercel alias set` する」に書き換える。CLAUDE.md の現在の記載「`cd web && vercel deploy --prod`」だけだと罠を踏む。

## Evidence

`vercel ls` → deployment は `quo-lu/web` project に作られる。`vercel alias ls` → `connectc2x.vercel.app` の現行 alias 先は `connectc2x-nvlrkh2gk-quo-lu.vercel.app` (49d 経過)。`vercel promote <新deployment>` → `Error 409: already the current production deployment`。`vercel alias set` で復旧後、`curl https://connectc2x.vercel.app/connectc2x/guide | grep kitepon` で新ドメイン文字列を確認。
