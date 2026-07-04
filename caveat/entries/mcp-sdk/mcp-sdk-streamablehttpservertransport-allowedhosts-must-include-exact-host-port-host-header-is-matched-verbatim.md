---
id: mcp-sdk-streamablehttpservertransport-allowedhosts-must-include-exact-host-port-host-header-is-matched-verbatim
title: MCP SDK StreamableHTTPServerTransport allowedHosts must include exact host:port (Host header is matched verbatim)
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - mcp
  - '@modelcontextprotocol/sdk'
  - streamable-http
  - dns-rebinding
  - host-header
  - nodejs
environment:
  os: darwin
  arch: arm64
  node: v26.0.0
  platform: darwin
  sdk: '@modelcontextprotocol/sdk@1.29.0'
source_project: null
source_session: 2026-05-17T05:04:17.069Z/6efd8c0e3337
created_at: 2026-05-17
updated_at: 2026-05-17
last_verified: 2026-05-17
---

## Context

Hit while adding a Streamable HTTP transport mode to an MCP server (sidecar package) and writing a node:test smoke test that pointed an in-process client at `port: 0`. The SDK's `webStandardStreamableHttp.d.ts` documents `allowedHosts` as "List of allowed host header values for DNS rebinding protection" without flagging the host:port verbatim-match behavior.

## Symptom

When `enableDnsRebindingProtection: true` and `allowedHosts: ["127.0.0.1"]` (host only), `@modelcontextprotocol/sdk`'s `StreamableHTTPServerTransport` rejects valid in-process clients with HTTP 403 and JSON-RPC error `{"code":-32000,"message":"Invalid Host header: 127.0.0.1:56460"}`. The client surfaces it as `Streamable HTTP error: Error POSTing to endpoint: ... code: 403`. Tests pointing a `StreamableHTTPClientTransport` at `http://127.0.0.1:<ephemeral>/mcp` fail even though the bind host matches.</symptom>
<parameter name="cause">The SDK matches the incoming `Host` request header against `allowedHosts` verbatim, not by hostname-only comparison. Node's HTTP client always sets `Host: <hostname>:<port>` when the port is non-default (i.e., the ephemeral port 0 path always produces `Host: 127.0.0.1:<port>`), so an `allowedHosts` list containing only `"127.0.0.1"` never matches. The SDK docs/typings call the field "List of allowed host header values" but do not state that `host:port` is required when the client connects on a non-default port.

## Cause



## Resolution

Always populate `allowedHosts` with BOTH the bare host and `host:port` forms (and `localhost`/`127.0.0.1` variants if you bind to `0.0.0.0`). For tests that use `port: 0` (ephemeral), either (a) read `server.address().port` after `listen()` and inject the resulting `host:port` before creating any session transport, or (b) disable DNS rebinding protection in tests by passing `allowedHosts: undefined` / empty. Production code should compute defaults like `[host, "${host}:${port}", "127.0.0.1", "127.0.0.1:${port}", "localhost", "localhost:${port}"]`.

## Evidence

Reproduced on macOS 14 with `@modelcontextprotocol/sdk@1.29.0`, Node v26.0.0. Server constructed with `new StreamableHTTPServerTransport({ sessionIdGenerator, enableDnsRebindingProtection: true, allowedHosts: ["127.0.0.1"] })`; client `new StreamableHTTPClientTransport(new URL("http://127.0.0.1:<port>/mcp"))` → server logs `Invalid Host header: 127.0.0.1:<port>` and returns 403. Adding `${host}:${port}` to `allowedHosts` (or removing the protection) makes the same client succeed.
