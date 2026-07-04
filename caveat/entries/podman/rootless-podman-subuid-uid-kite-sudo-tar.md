---
id: rootless-podman-subuid-uid-kite-sudo-tar
title: rootless Podman の subuid 越し UID 所有ファイルは kite から sudo 無しでは tar できない
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - podman
  - rootless
  - subuid
  - tar
  - backup
  - permission
  - uid-remap
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-28T07:34:08.688Z/633b4382dfce
created_at: 2026-04-28
updated_at: 2026-04-28
last_verified: 2026-04-28
---

## Context

BazziteOS+rootless Podman → Ubuntu+Docker 移行。Nextcloud の MariaDB データ (UID 525287) と config (UID 524321) を含むホームを退避しようとした

## Symptom

サーバー移行の home backup で `tar czf - kite/nextcloud kite/license-server ...` が exit 2 で失敗。sudo なしの kite ユーザーから subuid range（524288〜589823）の UID で書かれたファイルが「Permission denied」で読めない

## Cause

rootless Podman は container 内 root を host の subuid range 先頭にマップする（kite の subuid:524288:65536 なら container UID 0 → host UID 524288）。container 内 www-data (UID 33) は host UID 524321 に、mysql (UID 999) は 525287 に。これらの UID で書かれた bind mount 配下のファイル（例: ~/nextcloud/db, ~/nextcloud/config）は、kite ユーザーから見ると「他人」所有なので 0640 等のモードでは読めない

## Resolution

tar コマンド全体を sudo で実行: `ssh kite@server 'sudo tar czf - kite/...' > backup.tar.gz`。sudo は subuid 範囲を含む全 UID を読める。受け側で展開する時は `--no-same-owner` を付けるか、展開後に正しい UID へ chown

## Evidence

2026-04-28 14:13: 1回目の `tar` コマンドが exit 2 で失敗、141MB で停止 (期待 1.2GB)。`sudo tar` で再実行したら exit 0、1.2GB で完走
