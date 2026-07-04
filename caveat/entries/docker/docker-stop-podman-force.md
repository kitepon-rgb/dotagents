---
id: docker-stop-podman-force
title: '`docker stop` には podman の `--force` フラグが無い（移植時のサイレント挙動差分）'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker
  - podman
  - migration
  - cli-flags
environment:
  os: win32
  arch: x64
  node: 24.14.0
  container: docker
  from: podman
source_project: null
source_session: 2026-04-29T13:29:26.140Z/493e57b579cb
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

podman で動いていた `podman stop --force --time 10 <container>` を `docker stop --force --time 10 <container>` にそのまま置換したら `unknown flag: --force` で失敗。スクリプトのその先のロジックが catch されて dead code 化する。

## Cause

podman の `stop --force --time N` は「SIGTERM → N 秒待 → SIGKILL」のセマンティクス。`--force` フラグは「タイムアウト後に強制終了」を意味する podman 独自オプション。Docker 側はその挙動が `docker stop -t N` のデフォルト動作に組み込まれていて、`--force` フラグ自体が存在しない。`docker kill` は別物（即時 SIGKILL、waiting なし）。

## Resolution

podman `stop --force --time 10` は docker では `docker stop -t 10`（または `--time 10`）で機能等価。即時 SIGKILL が要るなら `docker kill <container>` を別途使う。`docker stop --help` で受け付けフラグを確認するクセをつけると安全。

## Evidence

2026-04-29 ServerManager の monitor.js を podman → docker 化する際に発覚。`tryRestart` の force-recover 経路を `docker stop -t 10 ${name}` に書き直して同等挙動を保持。
