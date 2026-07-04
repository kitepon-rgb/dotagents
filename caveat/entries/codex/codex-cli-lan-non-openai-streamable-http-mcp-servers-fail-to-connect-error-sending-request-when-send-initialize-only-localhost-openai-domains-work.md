---
id: codex-cli-lan-non-openai-streamable-http-mcp-servers-fail-to-connect-error-sending-request-when-send-initialize-only-localhost-openai-domains-work
title: 'Codex CLI: LAN/non-OpenAI Streamable-HTTP MCP servers fail to connect ("error sending request ... when send initialize"); only localhost & OpenAI domains work'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - codex-cli
  - mcp
  - streamable-http
  - rmcp
  - ssh-tunnel
  - localhost
  - network
environment:
  os: macOS (darwin)
  arch: arm64
  node: 26.0.0
  tool: codex-cli
  version: 0.137.0
  mcp_transport: Streamable HTTP (rmcp StreamableHttpClient)
  sandbox_mode: danger-full-access
source_project: null
source_session: 2026-06-09T05:22:24.464Z/68b9b035c7dc
created_at: 2026-06-09
updated_at: 2026-06-09
last_verified: 2026-06-09
---

## Context

Setting up a self-hosted ComfyUI image-gen MCP (comfy-sd-mcp) on a LAN host so codex CLI could call it. The MCP server was fully working (verified via curl), but codex CLI could not connect until the URL was moved to a localhost SSH tunnel.

## Symptom

codex CLI (0.137.0, both interactive TUI and `codex exec`) fails at startup to connect to Streamable-HTTP MCP servers whose URL is a LAN IP (192.168.x) or a self-hosted (non-OpenAI) domain. Error per server:

  ⚠ MCP client for `X` failed to start: MCP startup failed: handshaking with MCP server failed:
  Send message error Transport [rmcp::transport::...StreamableHttpClient...] error: Client error:
  HTTP request failed: http/request failed: error sending request for url
  (http://192.168.1.2:8820/mcp), when send initialize request

ALL such servers fail identically (e.g. multiple LAN MCPs on different ports, plus a self-hosted *.dynv6.net MCP) → "MCP startup incomplete (failed: ...)". A public OpenAI MCP (developers.openai.com/mcp) connects fine. `curl` from the SAME machine to the SAME LAN url completes a full MCP handshake (initialize/tools/list/tools/call) — so the server and the network path are fine; only codex's own MCP HTTP client can't reach it.

## Cause

codex CLI's MCP HTTP (rmcp StreamableHttpClient) connections cannot reach non-localhost / non-OpenAI hosts in this environment. It is NOT server-side and NOT a generic Streamable-HTTP bug (the exact same server works via curl and via a localhost route; and developers.openai.com over Streamable HTTP connects). sandbox_mode=danger-full-access (agent shell unrestricted) does not help — codex's own MCP client path still can't reach the LAN.

## Resolution

Expose the LAN/remote MCP on 127.0.0.1 via an SSH tunnel and point codex at localhost:

  ssh -N -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -L 127.0.0.1:8821:192.168.1.2:8820 user@192.168.1.2
  # ~/.codex/config.toml:
  [mcp_servers.X]
  url = "http://127.0.0.1:8821/mcp"

Persist with a launchd LaunchAgent (KeepAlive=true, RunAtLoad=true) so it auto-starts and auto-reconnects. After this, codex connects in BOTH interactive and exec, and tools/call works end-to-end. localhost is reachable by codex's MCP client where the LAN/remote URL was not.

## Evidence

`codex mcp list` shows the server enabled. With url=LAN: TUI startup prints "MCP startup incomplete (failed: ...)" listing every LAN/self-hosted HTTP MCP. With url=127.0.0.1 (SSH tunnel to the same server): the server drops off the failed list and `• Called <server>.<tool>(...)` returns an image/result. Direct curl MCP handshake (initialize → tools/list → tools/call) to the LAN url succeeds, proving the server is correct.
