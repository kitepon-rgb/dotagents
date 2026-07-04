---
id: docker-compose-v2-project-service-n-v1-project-service-n
title: Docker Compose v2 はコンテナ名がハイフン区切り (`project-service-N`)、v1 のアンダースコア (`project_service_N`) と非互換
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker
  - docker-compose
  - v1-v2-migration
  - naming
environment:
  os: win32
  arch: x64
  node: 24.14.0
  container: docker
  tool: docker-compose-v2
source_project: null
source_session: 2026-04-29T13:29:04.776Z/8d9940c52482
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

`docker-compose` (v1) で動いていた監視スクリプトを Docker Compose v2 (`docker compose`) 環境で動かしたら、コンテナ名でハードコードしていた箇所が全部空振りする。`docker exec myproject_app_1 ...` が "No such container" になり、実体は `myproject-app-1` で動いている。

## Cause

Compose v2 は コンテナ命名フォーマットを `<project>_<service>_<index>` から `<project>-<service>-<index>` に変更した（v1 → v2 のブレーキング変更）。これは BC ブレイクとして 2021 年に明文化されている。Podman → Docker 移行時のように compose 実装が変わると気付きづらい。

## Resolution

コンテナ名をハードコードする代わりに `docker compose ps -q <service>` でコンテナ ID を引く、または `--name` でリテラル指定して compose の自動命名に依存しない。既存ハードコード箇所は v2 表記 (ハイフン) に置換。互換のためなら `name:` をプロジェクト変数で生成する形に変える。

## Evidence

2026-04-29 ServerManager 監視スクリプトの ConnectC2X コンテナ名を旧 `connectc2x_connect-c2x_1` (v1) から実際の `connectc2x-connect-c2x-1` (v2) に修正。サービス名内のハイフン (`connect-c2x`) はそのまま、区切り文字だけが `_` → `-` に変わる。
