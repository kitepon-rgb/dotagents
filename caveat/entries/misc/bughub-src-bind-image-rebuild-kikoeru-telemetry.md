---
id: bughub-src-bind-image-rebuild-kikoeru-telemetry
title: bughub コンテナは src を bind マウントしていない（image 焼き込み）→ 編集後は rebuild 必須。kikoeru-telemetry とは非対称
visibility: private
confidence: confirmed
outcome: resolved
tags:
  - docker
  - deploy
  - bughub
  - kikoeru
  - home-server
environment:
  os: darwin
  arch: arm64
  node: 26.3.1
source_project: null
source_session: 2026-06-26T22:16:09.940Z/c07c6ea44aac
created_at: 2026-06-26
updated_at: 2026-06-26
last_verified: 2026-06-26
---

## Symptom

自宅サーバ(192.168.1.2)の bughub の src（adapters/kikoeru.js, normalize.js 等）を編集して docker restart しても反映されない。kikoeru-telemetry の感覚で「src 編集→restart」をやると変更が効かない。

## Cause

2つの Kikoeru 関連コンテナで配備方式が非対称。kikoeru-telemetry は `/home/kite/kikoeru/telemetry -> /app` を bind マウント（src 直マウント＝restart で反映）。一方 bughub は data のみ bind（`/home/kite/bughub/data -> /app/data`）で src は image に焼き込み（compose.yml `build: .`）＝編集は rebuild しないと反映されない。さらに bughub の git source-of-truth は `/home/kite/ServerManager/bughub` だが、ビルド先（compose.yml/.env がある所）は別ディレクトリ `/home/kite/bughub`。deploy.sh が前者→後者へ rsync してから `docker compose up -d --build` する2段構え。

## Resolution

bughub 変更時: ①`/home/kite/ServerManager/bughub/src/` を編集（git 正本）→ ②`rsync -az --delete --exclude node_modules --exclude data --exclude .env --exclude '*.log' /home/kite/ServerManager/bughub/ /home/kite/bughub/` → ③`cd /home/kite/bughub && docker compose up -d --build`（deploy.sh と同等。deploy.sh は WSL 開発元から self-ssh 前提なのでサーバ上では手動 rsync が楽）。反映確認は `/api/issues?app=<App>`。kikoeru-telemetry は従来どおり src 同期＋`docker restart kikoeru-telemetry` でOK（bind マウントなので rebuild 不要）。

## Evidence

docker inspect bughub の Mounts は data のみ。docker inspect kikoeru-telemetry は `/home/kite/kikoeru/telemetry -> /app`。compose up -d --build で bughub:latest 再ビルド後、/api/issues?app=Kikoeru の severity_raw が null→warn/info に変化して反映確認。
