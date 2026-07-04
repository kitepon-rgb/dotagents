---
id: db-volume-backup-podman-cp-snapshot
title: コンテナ内完結 DB は volume backup で取れない、podman cp で snapshot 必須
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - podman
  - docker
  - backup
  - migration
  - writable-layer
  - sqlite
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-28T07:33:29.794Z/0b3e2a5009e3
created_at: 2026-04-28
updated_at: 2026-04-28
last_verified: 2026-04-28
---

## Context

BazziteOS rootless Podman → Ubuntu Docker rootful 移行、license-server プロジェクト

## Symptom

サーバー移行で podman の named/anonymous volumes と host bind mount を全て退避したのに、特定アプリの DB が含まれていない。podman inspect の Mounts が空で、DB は container writable layer にある。通常の退避では捕捉できず、container 削除時に消える。auto-restore は最後の trigger 時点までしか戻らないので差分が失われる

## Cause

アプリ設計が「DB は container 内完結 + 外部 auto-backup（GitHub repo 等）」で、host mount を意図的に避けている。writable layer なので volume 退避には含まれない

## Resolution

移行直前に podman cp container:/path/to/db /tmp/snapshot で writable layer から直接コピー、退避フォルダに保管。新サーバーで docker compose create で容器だけ作成、起動前に docker cp snapshot container:/path/to/db で配置、その後 up -d で entrypoint が「DB 存在＝復元 skip」と判定して最新 snapshot が乗る

## Evidence

podman inspect license_api_prod の Mounts: 空。/app/data/licenses.sqlite Modify=2026-04-27 14:16 UTC vs GitHub backup latest=2026-04-26 12:34 UTC（差 26h）
