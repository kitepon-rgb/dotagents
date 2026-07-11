---
id: docker-compose-project-external-network-attach
title: docker compose で別 project の external network に attach する書式
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - docker-compose
  - networking
  - external-network
  - multi-project
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-29T11:27:19.873Z/b2deff738818
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

project A の compose で起動したコンテナを project B (別 compose ファイル、別 network namespace) のサービス (例: 共有 reverse proxy / Caddy) からコンテナ名で名前解決させたい。どちらも同じ Docker daemon 上で稼働しているのに `host -> resolve failed` で接続できず、host LAN IP 経由 routing にすると ufw でブロックされる別の罠に陥る。</symptom>
<parameter name="cause">docker compose は project 毎に **独立した default network** を作成 (`<project>_default`)。同じ daemon でも compose project が違うと name resolution が効かない。共有したいネットワークを片方で `external: true` 宣言して attach する必要がある。</cause>
<parameter name="resolution">attach する側の compose.yaml に:
```yaml
services:
  myservice:
    networks:
      - default
      - other-project_default
networks:
  other-project_default:
    external: true
```
これで myservice は両 network に所属し、`other-project_default` 内のコンテナから name で解決される (例: Caddyfile の `reverse_proxy myservice:18803`)。`docker network ls` で network 名を確認、`docker compose up --force-recreate` で反映。</resolution>
<parameter name="evidence">Caddy (project license-server, network license-server_default) から openclaw project のコンテナ openclaw-webhook へ connection refused。compose.yaml に `networks: [default, license-server_default]` + 末尾に `networks: license-server_default: external: true` を追加 + recreate → Caddyfile `reverse_proxy openclaw-webhook:18803` で名前解決成功 (`docker exec caddy wget -qO- http://openclaw-webhook:18803/health` → `{"ok":true}`)。</evidence>
<parameter name="environment">{"docker_compose": "v2.x"}

## Cause



## Resolution



## Evidence


