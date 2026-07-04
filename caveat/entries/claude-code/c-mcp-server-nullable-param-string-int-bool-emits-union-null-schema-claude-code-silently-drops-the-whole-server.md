---
id: c-mcp-server-nullable-param-string-int-bool-emits-union-null-schema-claude-code-silently-drops-the-whole-server
title: 'C# MCP server: nullable param (string? / int? / bool?) emits union null schema → Claude Code silently drops the whole server'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - mcp
  - claude-code
  - csharp
  - dotnet
  - json-schema
  - silent-drop
  - modelcontextprotocol
environment:
  os: linux
  arch: x64
  node: 22.22.1
source_project: null
source_session: 2026-05-23T13:14:43.003Z/0983d58fab53
created_at: 2026-05-23
updated_at: 2026-05-23
last_verified: 2026-05-23
---

## Context

Diagnosis cost ~16 minutes across two sessions because `claude mcp list` reports `✓ Connected` and the stdio probe shows the server working — every obvious health signal is green. The failure is two layers down (Anthropic API schema validation inside the loader) and is silent. The minimum diagnostic chain that actually finds it: (1) confirm the server is `Connected`, (2) stdio-probe and dump the tools/list JSON, (3) grep for `["string","null"]` / `["integer","null"]` / `["boolean","null"]`. If any hit, you found the cause.

## Symptom

A C# MCP server built on the ModelContextProtocol NuGet SDK appears `✓ Connected` in `claude mcp list`, the stdio `initialize` + `tools/list` handshake works, and the binary returns a valid tools list when probed directly — but inside an actual Claude Code session, ZERO tools from that server show up. The `deferred_tools_delta` event registers tools from other MCP servers (including other stdio-spawned .exe MCPs) but the offending server contributes nothing. The whole server vanishes, not just the offending tool. No error message is emitted.

## Cause

The C# ModelContextProtocol SDK (verified at NuGet `ModelContextProtocol` 1.3.0) maps nullable C# parameters like `string? message = null`, `int? x = null`, `bool? y = null` to JSON Schema `"type": ["string", "null"]` (and analogous union-null forms). Claude Code's MCP loader (verified on 2.1.145) converts MCP tool schemas to Anthropic API tool definitions, which require `type` to be a single string — union types are rejected. Instead of dropping just the invalid tool, the loader drops the entire MCP server silently. Crucially, `claude mcp list` performs a separate health-check spawn that does not run the same Anthropic-schema validation, so it keeps reporting `✓ Connected`, which masks the root cause.

## Resolution

Replace every nullable optional parameter in C# tool methods with a non-nullable type + sentinel default, and absorb the null semantics at the method boundary. Example:

```csharp
// before — schema becomes ["string","null"]
public PingResult Ping(string? message = null)
    => new(message ?? "pong", ...);

// after — schema is plain "string"
public PingResult Ping(string message = "")
    => new(string.IsNullOrEmpty(message) ? "pong" : message, ...);
```

Same shape works for `int x = -1` / `bool x = false`. Downstream services that legitimately need null can be fed via `string.IsNullOrEmpty(x) ? null : x`. Verify the fix by stdio-probing tools/list and grepping the JSON for `["string","null"]` / `["integer","null"]` / `["boolean","null"]` — all should be gone, then restart Claude Code so the MCP loader re-discovers the server.

## Evidence

stdio probe of the original binary (Mcp.ComputerUse 0.1, NuGet ModelContextProtocol 1.3.0) returned a valid tools/list with 20 tools, 4 of which contained `"type":["string","null"]` in their inputSchema:
- ping.message
- screenshot.savePath
- launch_app.args / workingDir
- shell.workingDir

The session JSONL transcript's `deferred_tools_delta` showed `flaui-mcp` (a sibling .exe MCP without nullable params) registering 32 tools, while this server registered 0. After patching the 4 methods to use `string x = ""` and re-publishing with `dotnet publish -c Release -r win-x64`, the new tools/list contained zero union-null types and the server name reappeared in Claude Code's deferred tools after a window reload.
