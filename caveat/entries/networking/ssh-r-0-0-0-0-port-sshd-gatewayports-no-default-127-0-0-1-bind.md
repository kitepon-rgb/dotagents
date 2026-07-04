---
id: ssh-r-0-0-0-0-port-sshd-gatewayports-no-default-127-0-0-1-bind
title: SSH `-R 0.0.0.0:port` リバーストンネルは sshd の `GatewayPorts no` (default) で 127.0.0.1 にしか bind されない
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - ssh
  - reverse-tunnel
  - sshd_config
  - networking
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-29T11:27:03.194Z/a067224a050b
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

クライアント側で `ssh -R 0.0.0.0:18800:127.0.0.1:18800 user@host` でリバーストンネルを張ると、ssh プロセスは生きているが server 側で `0.0.0.0:18800` ではなく **`127.0.0.1:18800` のみ listen**。host LAN IP からアクセスすると不通。Docker コンテナ等 host loopback 以外からの接続が timeout。</symptom>
<parameter name="cause">sshd の `GatewayPorts` 設定がデフォルト `no` で、リバーストンネルは bind address 指定を無視して常に loopback (127.0.0.1) に bind する。`-R 0.0.0.0:port` の `0.0.0.0` 部分は client 側で指定しても server 側設定が優先され、実 bind は 127.0.0.1 になる。</cause>
<parameter name="resolution">サーバー側 `/etc/ssh/sshd_config` で `GatewayPorts yes` (任意 IP bind 許可) または `GatewayPorts clientspecified` (client が `-R 0.0.0.0:` 等指定した時のみ任意 IP bind) を設定 → `sudo systemctl reload sshd`。セキュリティ的に LAN 全体への expose は望まない場合、tunnel 経由のサービスを Bearer auth 等で別途防御するか、SSH 自体撤去して別経路 (host bind mount, container network attach 等) で代替。</resolution>
<parameter name="evidence">`ssh -R 0.0.0.0:18800:127.0.0.1:18800 ... -N` 後、server 側 `ss -tlnp | grep 18800` が `LISTEN 0 128 127.0.0.1:18800` のみ表示 (`0.0.0.0` ではない)。`/etc/ssh/sshd_config` に `#GatewayPorts no` (commented = default no)。</evidence>
<parameter name="environment">{"os": "linux openssh", "context": "reverse tunnel from client to public-bind on server"}

## Cause



## Resolution



## Evidence


