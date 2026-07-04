---
id: cloudflare-remotely-managed-remote-config-tunnels-are-configurable-via-api-put-cfd-tunnel-id-configurations-the-legacy-routes-404-misleads-you-into-thinking-it-s-dashboard-only
title: Cloudflare remotely-managed (remote_config) tunnels ARE configurable via API — PUT cfd_tunnel/{id}/configurations; the legacy /routes 404 misleads you into thinking it's dashboard-only
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - cloudflare
  - tunnel
  - cloudflared
  - api
  - remote-config
  - dns
  - cfargotunnel
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  service: Cloudflare Tunnel (cloudflared), remote_config:true
  api: api.cloudflare.com/client/v4
source_project: null
source_session: 2026-05-31T03:07:02.005Z/49275b3b94f5
created_at: 2026-05-31
updated_at: 2026-06-03
last_verified: 2026-06-03
---

## Context

Exposing a self-hosted service on a new subdomain through an existing remotely-managed Cloudflare Tunnel.

## Symptom

Trying to add a public hostname to a Cloudflare Tunnel that is remotely-managed (remote_config: true) via API, the old `/routes` (and some configuration) calls return 404, leading to the wrong conclusion that remotely-managed tunnels can only be edited in the Zero Trust dashboard and not via API/Global API Key.

## Cause

Wrong endpoint. Remotely-managed tunnels store config at Cloudflare and are configured precisely via `PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations` with body {"config":{"ingress":[...]}}. The ingress array MUST end with a catch-all `{"service":"http_status:404"}`, and PUT REPLACES the entire config — so GET the current config first and append your rule before the catch-all, or you wipe other hostnames. Routing a public hostname also needs a DNS CNAME `host -> <tunnel_id>.cfargotunnel.com` (proxied) — NOT an A record to the origin's (private) IP. Token needs Account-level Cloudflare Tunnel:Edit (+ Zone DNS:Edit for the CNAME).

## Resolution

See above.

## Evidence

Official docs (create-remote-tunnel-api) confirm the configurations PUT endpoint and the CNAME-to-cfargotunnel.com requirement. In practice: GET returned 8 working hosts all using service https://caddy:443 with originRequest {noTLSVerify:true,matchSNItoHost:true}; PUT with the appended rule succeeded (success:true); replacing a bogus `A -> 192.0.2.1 proxied` with the CNAME made the hostname resolve and serve.

Re-verified 2026-06-03 on a different account+tunnel: GET `cfd_tunnel/{id}/configurations` -> success with 12 existing hosts (the catch-all entry has hostname=null). Gotcha: `GET /accounts` returned an EMPTY list for the API token, yet the SAME token reads the tunnel configurations fine — an empty /accounts does NOT mean 'no tunnel scope' (the token had Cloudflare Tunnel access without Account Settings:Read). Don't conclude 'blocked' from an empty /accounts. (account_id is the path segment of the dashboard URL `dash.cloudflare.com/<account_id>/`.)
