---
id: mcp-ts-sdk-streamablehttpservertransport-per-request-server-sessionidgenerator-returns-server-not-initialized-on-2nd-request
title: 'MCP TS SDK StreamableHTTPServerTransport: per-request server + sessionIdGenerator returns ''Server not initialized'' on 2nd request'
visibility: public
confidence: tentative
outcome: resolved
tags:
  - mcp
  - modelcontextprotocol
  - streamable-http
  - sdk-typescript
  - session
  - stateless
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
source_project: null
source_session: 2026-05-17T10:28:29.166Z/9f60302ddc84
created_at: 2026-05-17
updated_at: 2026-05-17
last_verified: 2026-05-17
---

## Symptom

An MCP HTTP server built on `@modelcontextprotocol/sdk` `StreamableHTTPServerTransport` (Node/TS, SDK v1.29.0) returns the first `initialize` call successfully (200 with a `mcp-session-id` header), but any follow-up request — `notifications/initialized`, `tools/list`, `tools/call` — replies with `{"jsonrpc":"2.0","error":{"code":-32000,"message":"Bad Request: Server not initialized"},"id":null}`. Clients that do `initialize → tools/list` therefore fail on the second call.</symptom>
<parameter name="cause">The server code created a new `Server` + new `StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), enableJsonResponse: true })` *inside the HTTP handler* — i.e. per request. With `sessionIdGenerator` defined, the SDK runs in stateful mode and the transport remembers that it has been initialized for a particular session id. The session id is returned to the client and the client sends it back on subsequent requests as `Mcp-Session-Id`. But because the next HTTP request constructs a *new* transport with no knowledge of any prior session, the new transport sees an incoming non-initialize request, finds no matching initialized session, and rejects it as "Server not initialized". Stateful sessions require a single transport instance to persist across requests (typically a `Map<sessionId, transport>` keyed on the `Mcp-Session-Id` header). Per-request transport construction is only compatible with **stateless** mode.</cause>
<parameter name="resolution">Pick one model and stick to it:

(A) **Stateless** (simpler, recommended for read-only tool servers):
```js
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,       // <-- explicitly undefined disables sessions
  enableJsonResponse: true,
});
```
Then per-request server + transport is fine. Each request is self-contained (no separate `initialize` needed before `tools/list`).

(B) **Stateful** (needed for subscriptions / long-lived contexts): keep a module-level `Map<sessionId, StreamableHTTPServerTransport>`. On `initialize` requests, create a new transport (and Server.connect to it), store it under its session id; on subsequent requests, look up the existing transport by the `Mcp-Session-Id` header and call `transport.handleRequest(req, res, body)` on the stored instance.

Do NOT pass a `sessionIdGenerator` function while also constructing a fresh transport per request — that combination always breaks on the second request.</resolution>
<parameter name="evidence">Reproduced 2026-05-17 on Node v24.14.1, `@modelcontextprotocol/sdk@1.29.0`. Server listened on `192.168.1.2:8810/mcp`. First request: `curl -X POST .../mcp -d '{"jsonrpc":"2.0","id":1,"method":"initialize",...}'` returned `HTTP/1.1 200` with header `mcp-session-id: 34bc5543-…` and a proper initialize result. Second request, same handler, with `Mcp-Session-Id: 34bc5543-…` and method `notifications/initialized`, returned `{"error":{"code":-32000,"message":"Bad Request: Server not initialized"},"id":null}`. Same outcome for `tools/list`. Changing `sessionIdGenerator: () => randomUUID()` → `sessionIdGenerator: undefined` (no other code changes) made `tools/list` succeed on a single fresh request without a prior `initialize`.</evidence>
<parameter name="context">Building a Node MCP server that exposes per-OpenAPI-spec tools dynamically. Wanted dynamic reload (each request reads current spec snapshot), so the natural pattern was to construct a new `Server` per HTTP request. That naturally led to per-request transport construction. The SDK does not warn that this is incompatible with `sessionIdGenerator: () => …`. Discovered when a Mac client (curl-test) called `initialize` then `tools/list` and consistently got the second-request rejection.</context>
<parameter name="confidence">reproduced

## Cause



## Resolution



## Evidence


