---
id: alpine-distroless-curl-wget-http-healthcheck-executable-file-not-found
title: 最小化されたプロダクションイメージ (alpine 派生・distroless 等) には curl/wget が無く、HTTP HEALTHCHECK が `executable file not found` で失敗する
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker
  - healthcheck
  - alpine
  - distroless
  - node.js
environment:
  os: win32
  arch: x64
  node: 24.14.0
  container: docker
  image: alpine/distroless
source_project: null
source_session: 2026-04-29T11:33:02.123Z/bd03ebf5dbe8
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

Dockerfile の `HEALTHCHECK CMD curl -f http://localhost:3000/health` が `OCI runtime exec failed: exec: "curl": executable file not found in $PATH` で失敗。コンテナ自体は起動しているのに常に unhealthy 扱いになり、`restart: on-failure` 系の compose 設定で無限再起動ループに入ることがある。

## Cause

プロダクション最適化された軽量イメージ（alpine、distroless、scratch + 静的バイナリ）はサイズと攻撃面削減のため curl/wget を含まない。HEALTHCHECK は `docker exec` 相当でコンテナ内のバイナリを叩くため、ホスト側に curl があっても無関係。

## Resolution

アプリのランタイムが既に持っているネット機能で代用する: (a) Node.js なら `node -e "require('net').createConnection(PORT,'localhost').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"` で TCP 接続確認、(b) アプリ自身に `--healthcheck` サブコマンドを実装、(c) どうしても HTTP の中身を見たいなら `wget` を `apk add` するか dedicated healthcheck バイナリ (`grpc-health-probe`、`httping` 等) を別ステージで COPY。alpine に curl を生やすのは最小化の意義を毀損するので原則 (a) か (b)。

## Evidence

2026-04-29 ServerManager 移行で license_api_prod のヘルスチェック設計時に発生。Node.js `net` モジュール直叩きで TCP 確認に切り替えて解消。
