---
id: docker-ps-format-state-canonical-state-status-startswith-up
title: '`docker ps --format ''{{.State}}''` で canonical state を取れる。`{{.Status}}` 文字列を `startsWith(''Up'')` 等で曖昧パースする必要は無い'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker
  - container-state
  - monitoring
  - format-string
environment:
  os: win32
  arch: x64
  node: 24.14.0
  container: docker
source_project: null
source_session: 2026-04-29T13:29:15.878Z/72cb90a6a6bf
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

監視スクリプトで `docker ps --format '{{.Status}}'` の文字列を `startsWith('Up')` でパースしてコンテナ稼働判定していたら、"Restarting (1) 5 seconds ago" や "Created" が「停止」扱いになり、機械リトライで悪化させる。"Up 5 seconds (unhealthy)" は逆に「稼働」扱いされて health 異常を見落とす。

## Cause

`{{.Status}}` は人間可読文字列で、フォーマットが不安定（`Up`/`Exited`/`Restarting`/`Created`/`Paused`/`Dead` の prefix と、`(healthy)`/`(unhealthy)`/`(starting)` の suffix が混じる）。一方 docker は `{{.State}}` で **canonical state** をそのまま返す: `running`、`restarting`、`exited`、`created`、`paused`、`dead`、`removing` のいずれか一語。

## Resolution

監視・判定には `{{.State}}` を使う: `docker ps --format '{{.Names}}|{{.State}}|{{.Status}}'`。state 判定は `=== 'running'` で確実、health の `(healthy)`/`(unhealthy)` は別途 `.Status` から regex 抽出。`docker inspect --format '{{.State.Status}}'` でも同じ canonical 値が得られる。

## Evidence

2026-04-29 ServerManager 監視リライトで採用。旧コードの `startsWith('up')` は Restarting コンテナを停止扱いし、機械リトライで crashloop を加速していた。`.State` 採用で確実な state 判定に。
