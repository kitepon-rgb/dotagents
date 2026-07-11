---
id: claude-mcp-list-and-claude-mcp-get-strip-secrets-read-mcp-json-directly-for-env-headers
title: '`claude mcp list` and `claude mcp get` strip secrets — read `.mcp.json` directly for env/headers'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-cli
  - mcp
  - secrets
  - mcp-json
  - authentication
environment:
  os: win32
  arch: x64
  node: 22.5+
  claude_cli: 2.0+
source_project: null
source_session: 2026-04-19T16:12:33.254Z/f069e76ace44
created_at: 2026-04-19
updated_at: 2026-04-19
last_verified: 2026-04-19
---

## Context

Hit while auto-building a tool catalog from every MCP server Claude Code knows about. The intuition "the CLI is the source of truth" is wrong for anything involving credentials — the `.mcp.json` files are. This does not extend to OAuth tokens stored in `.credentials.json`; those have a different trust boundary and third-party tools should not read them.

## Symptom

You want to enumerate MCP servers from a Node script to introspect them (spawn stdio servers, call HTTP servers, etc.). `claude mcp list` / `claude mcp get <name>` return the server list and metadata, but any `env` entries for stdio servers and `headers` entries for HTTP servers are absent or blanked. Subsequent attempts to spawn or call those servers fail authentication (e.g., 401 from an HTTP MCP that needs a bearer token).

## Cause

The `claude mcp` CLI intentionally omits secrets from its output — it is not a secrets-dumping surface. The actual secret values live in `~/.claude/.mcp.json` (user scope) and `<projectRoot>/.mcp.json` (project scope). The CLI gives you the shape of each server, not its credentials.

## Resolution

For programs that genuinely need to invoke MCP servers (not merely list them), read `.mcp.json` directly and merge user + project scope with project taking precedence (matches Claude Code's own precedence). Treat `.mcp.json` as a user-authored config file — which is what it is — and keep your boundary firm: do NOT read `.credentials.json` (Anthropic OAuth tokens), that's a different class of secret and off-limits for third-party tools. For stdio: merge `env` into `spawn`'s options. For HTTP: pass `headers` through to your fetch.

## Evidence

A tool-discovery daemon added HTTP MCP transport and tried to live-fetch tool lists from x-api and claude.ai Gmail/Calendar/Drive via `claude mcp get` output; all returned 401/403 because the bearer tokens were blank. Switching to reading `~/.claude/.mcp.json` directly made the nine x-api tools enumerate successfully. It was later extended to also read `<projectRoot>/.mcp.json` after a project-scope server's env failed to merge.
