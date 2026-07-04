---
id: rootless-podman-anonymous-volume
title: rootless Podman の anonymous volume はハッシュ名で表示され退避漏れを起こしやすい
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - podman
  - docker
  - volumes
  - anonymous-volume
  - backup
  - migration
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-28T07:33:49.171Z/a7a5f5b4de4c
created_at: 2026-04-28
updated_at: 2026-04-28
last_verified: 2026-04-28
---

## Context

サーバー移行で nextcloud-app の /var/www/html が 808MB の anonymous volume にあり、これを取り逃しそうになった。openclaw-mcp の node_modules も同様

## Symptom

podman volume ls すると `nextcloud_app_data` のような名前付きボリュームに混じって `ac11fe4a13a5c62c601c88ecb01e05402d09128b7eb726fc71bc61ee3bd1309d` のような64桁ハッシュ名が並ぶ。compose ファイルには明示的な volume 定義がない（image の Dockerfile に VOLUME 命令だけある）ため、退避時に「これ何のボリューム？」と判別できず無視 or 全部退避する羽目になる

## Cause

image の Dockerfile に VOLUME 命令があり、compose で明示的に volume 名を割り当てていない場合、Podman/Docker は anonymous volume を作る。命名規則は SHA-256 ハッシュ。container を recreate するたび新しいハッシュになり古い ones が残骸として滞留する

## Resolution

退避前に `podman ps -aq | xargs -I% podman inspect % --format '{{.Name}}: {{range .Mounts}}{{if eq .Type "volume"}}{{.Name}} -> {{.Destination}}{{println}}{{end}}{{end}}'` で各 container と使用中 volume の対応を取得し volume-names.txt に保存。`podman volume ls -q` の全件と差分すれば「使われている anonymous」と「孤児」が判別できる。退避は前者だけ

## Evidence

2026-04-28: podman volume ls 出力に license-server_caddy_data 等の named volumes と並んで ac11fe4a..., 8dd57e23..., 53413637... の 5 つのハッシュ名 volumes。inspect で 2 つは使用中、3 つは孤児だった
