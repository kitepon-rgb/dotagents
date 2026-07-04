---
id: ufw-default-deny-routed-docker-bridge-host-lan
title: ufw default `deny (routed)` で Docker bridge → host LAN へのアクセスがブロックされる
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - ufw
  - docker
  - networking
  - host-network-mode
  - routing
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-29T11:26:49.639Z/36507e424700
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

Docker コンテナ (bridge network) 内から host の LAN IP `192.168.1.X:PORT` に curl すると connection timeout。ホストから同じ URL は届く、host loopback は届く、Docker bridge gateway IP も届かない。`network_mode: host` の別コンテナ等にアクセスする時に頻発。</symptom>
<parameter name="cause">ufw の default policy が `deny (incoming), deny (routed)`。Docker bridge (172.16.0.0/12 等) から host の LAN IP (192.168.1.X) への connection は **routed traffic** 扱いで FORWARD chain で deny される。LAN 限定の `ufw allow from 192.168.0.0/16 to any port X` だけでは Docker bridge source は対象外。</cause>
<parameter name="resolution">`sudo ufw allow from 172.16.0.0/12 to any port <PORT> proto tcp` で Docker bridge ネットワーク全帯域から該当 port への接続を許可。または各コンテナ network の subnet を絞って許可 (`docker network inspect` で取得)。`network_mode: host` のコンテナへ別コンテナからアクセスする典型パターンで必要。</resolution>
<parameter name="evidence">`docker exec mycontainer curl -fsS --max-time 4 http://192.168.1.2:8123/` → timeout。host → 同 URL は OK、HA は `0.0.0.0:8123` で listen 済、`ufw status` に LAN 192.168.1.0/24 のみ allow。`ufw allow from 172.16.0.0/12 to any port 8123` 追加後 → コンテナ内 curl で HTML 取得成功。</evidence>
<parameter name="environment">{"os": "linux", "ufw": "default deny routed", "docker": "bridge network"}

## Cause



## Resolution



## Evidence


