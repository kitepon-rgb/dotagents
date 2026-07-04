---
id: docker-compose-restart-port-mapping-environment-up-force-recreate
title: '`docker compose restart` は port mapping や environment の変更を反映しない — `up --force-recreate` が必要'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker-compose
  - restart
  - ports
  - recreate
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-29T11:26:38.621Z/ee37b7e95af5
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

compose.yaml の `ports:` を編集してから `docker compose restart <service>` を打つと、コンテナは再起動するが新しい port mapping が反映されない (`docker compose ps` の PORTS 列が古いまま)。ホスト curl で新ポートに繋がらず混乱。</symptom>
<parameter name="cause">`docker compose restart` は **既存のコンテナ仕様で再起動するだけ**。port mapping / environment / volume 等の compose ファイル定義変更は無視される。設定変更を反映するには **コンテナの再生成 (recreate)** が必要。</cause>
<parameter name="resolution">`docker compose up -d --force-recreate <service>` を使う。または `docker compose up -d` (config 変更検出 + 必要なサービスだけ recreate) 。stop + rm でも明示的に潰せる。port mapping 変更したら必ず recreate を意識する。</resolution>
<parameter name="evidence">`ports: ["192.168.1.2:18803:18803", "127.0.0.1:18803:18803"]` 追加後 restart → ps の PORTS が `127.0.0.1:18803->18803/tcp` のまま (LAN bind なし)。`up --force-recreate` で `192.168.1.2:18803->18803/tcp, 127.0.0.1:18803->18803/tcp` 両方表示。</evidence>
<parameter name="environment">{"docker_compose": "v2.x / v5.x"}

## Cause



## Resolution



## Evidence


