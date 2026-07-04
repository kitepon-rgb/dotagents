---
id: caddy-docker-reverse-proxy-to-host-bound-service-times-out-ufw-default-drop-blocks-the-docker-bridge-subnet
title: Caddy (docker) reverse_proxy to host-bound service times out — UFW default DROP blocks the docker bridge subnet
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - caddy
  - ufw
  - docker
  - networking
  - reverse-proxy
  - firewall
environment:
  os: linux
  arch: x64
  node: 22.22.1
source_project: null
source_session: 2026-07-04T14:16:26.577Z/ed7d4677e5f8
created_at: 2026-07-04
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Context

Host with UFW default-deny inbound + LAN-only allow rules, running Caddy in docker as the TLS/reverse-proxy front for a mix of dockerized and host-bound (systemd) services.

## Symptom

Caddy running in docker returns 502 with `dial tcp <host-LAN-IP>:<port>: i/o timeout` when reverse-proxying to an upstream that is a HOST process (systemd-started, bound on the host LAN IP). Services reached through a docker network on the same box work fine, which misdirects diagnosis toward the app instead of the firewall.

## Cause

UFW default DROP with allow rules limited to the LAN subnet (e.g. 192.168.x.0/24). The Caddy container's traffic egresses from the docker bridge subnet (e.g. 172.18.0.0/16), which matches no allow rule, so packets to the host-bound port are dropped.

## Resolution

`sudo ufw allow from <docker_bridge_subnet> to any port <port> proto tcp`. Obtain the subnet with `docker network inspect <network> --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'`. Triage order: (1) `docker exec caddy wget -qO- http://<host-LAN-IP>:<port>/` to test container→host reachability, (2) `curl 127.0.0.1:<port>` on the host to confirm the bind, (3) `docker logs caddy` for the raw 502 cause. Alternative fix: containerize the upstream into the same docker network.

## Evidence


