---
id: sed-i-inode-bind-mount
title: '`sed -i` はファイル inode を入れ替えるため、ファイル単位 bind mount のコンテナには変更が反映されない'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker
  - bind-mount
  - sed
  - inode
  - linux
environment:
  os: linux
  arch: x64
  node: 24.14.0
  container: docker
source_project: null
source_session: 2026-04-29T11:32:38.020Z/d0a795a8dbe5
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

ホスト側で `sed -i` を使って bind mount された設定ファイル（Caddyfile、nginx.conf など）を編集したのに、コンテナ内のアプリで設定が更新されない。`docker exec ... cat /path/to/file` で見ても旧内容のまま。コンテナを restart すると反映される。

## Cause

`sed -i` は名前に反して in-place 編集ではなく「一時ファイルを作って rename で置き換える」実装。元ファイルの inode が破棄されて新しい inode に変わる。Docker のファイル単位 bind mount は inode を握って bind するため、ホスト側で inode が変わってもコンテナ側は旧 inode を見続けて更新を取りこぼす。

## Resolution

いずれか: (a) コンテナを `docker restart` する、(b) `sed` の代わりに `cat > file` / `tee` 等の inode 維持型書き込みを使う、(c) ファイル単位ではなくディレクトリ単位 bind mount に変更してコンテナ側はディレクトリ inode を握らせる。設定ファイル運用なら (c) がもっとも事故が少ない。

## Evidence

2026-04-29 ServerManager Caddy の Caddyfile を `sed -i` で書き換えても docker exec から見て反映されず、`docker restart caddy` で初めて反映。
