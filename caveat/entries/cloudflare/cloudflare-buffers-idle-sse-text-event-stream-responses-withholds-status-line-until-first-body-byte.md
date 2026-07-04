---
id: cloudflare-buffers-idle-sse-text-event-stream-responses-withholds-status-line-until-first-body-byte
title: Cloudflare buffers idle SSE (text/event-stream) responses — withholds status line until first body byte
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - cloudflare
  - sse
  - text/event-stream
  - mcp
  - streamable-http
  - cloudflare-tunnel
  - buffering
  - caddy
  - forklore
environment:
  os: darwin
  arch: arm64
  node: 26.3.1
  proxy: Cloudflare proxied + cloudflared Tunnel
  edge: Caddy reverse_proxy flush_interval -1
  sdk: '@modelcontextprotocol/sdk StreamableHTTPServerTransport/Client'
  mcp_protocol: 2025-11-25
  runtime: Node 22
source_project: null
source_session: 2026-06-26T21:38:49.670Z/ef3ccf09dff1
created_at: 2026-06-26
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Context

Forklore remote MCP published as single https /mcp so a user's AI connects by URL. Path: internet → Cloudflare (proxied) → cloudflared Tunnel → Caddy reverse_proxy → Node MCP (forklore-net bridge, published 192.168.1.2:18843).

## Symptom

An MCP Streamable HTTP server (apps/mcp-server src/http.ts, novel.kitepon.dev/mcp) behind Cloudflare (Tunnel + Caddy) works for POST JSON-RPC but the standard MCP SDK client times out (-32001) on the first tool call. Isolation: the SDK opens a server-initiated GET /mcp SSE notification stream; through Cloudflare that GET returns nothing — curl reports code 000, 0 bytes even after 6s (no status line). The same GET against the origin (192.168.1.2:18843) returns 200 with ttfb ~2ms (then idle, 0 bytes = normal idle SSE). POST request/response works fine through Cloudflare (200, 50–77ms).

## Cause

Cloudflare buffers a text/event-stream response that has not yet emitted any body bytes: it withholds the HTTP status line + headers from the downstream client until the origin sends the first byte. An idle SSE stream waiting for server-initiated events never emits an initial byte, so Cloudflare holds the connection indefinitely and the client never receives the 200. Independent of Caddy (flush_interval -1 forwards the 200 immediately; buffering is at the Cloudflare edge/Tunnel layer).

## Resolution

Fix in apps/mcp-server/src/http.ts: (1) construct StreamableHTTPServerTransport with enableJsonResponse: true so request/response returns application/json on the POST (tools return single results, no streaming needed); (2) return HTTP 405 (Allow: POST, DELETE) for GET /mcp instead of delegating to transport.handleRequest — the MCP spec makes the server-initiated SSE stream OPTIONAL and 405 is the correct "not supported" signal, so the SDK client falls back to POST-only JSON. Verified: standard @modelcontextprotocol/sdk Client completed graph.upsert→episode.put→validate→release(publish) through the public Cloudflare URL. General rule for ANY SSE behind Cloudflare (incl. future reader body-streaming): flush an initial comment (":\n\n")/heartbeat immediately; X-Accel-Buffering: no alone may be insufficient for an idle stream. See docs/09 §13, docs/07 §1.

## Evidence

Measured GET /mcp SSE, same server, throwaway Bearer: direct → code=200 ttfb=0.002s size=0B; public (Cloudflare) → code=000 size=0B after --max-time 6. Raw POST initialize+tools/list through Cloudflare → 200 application/json 0.05–0.077s. After enableJsonResponse+GET→405: SDK Client round-trip through the public URL all OK.
