---
id: codex-deferred-tool-search-may-find-playwright-mcp-tools-without-exposing-mcp-namespace
title: Codex deferred tool search may find Playwright MCP tools without exposing mcp namespace
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - codex
  - mcp
  - playwright
  - tool-search
  - deferred-tools
  - codex-rc
environment:
  os: linux
  arch: x64
  node: 22.22.1
  project: codex-rc
  cwd: /home/kite/projects/codex-rc
  server: kite@192.168.1.2
  mcp_server: playwright
  playwright_image: mcr.microsoft.com/playwright:v1.59.1-noble
  playwright_mcp_package: '@playwright/mcp@0.0.73'
  device: iPhone 15
  date: 2026-05-06
source_project: null
source_session: 2026-05-06T00:26:02.264Z/32f4f0191e43
created_at: 2026-05-06
updated_at: 2026-05-06
last_verified: 2026-05-06
---

## Context

codex-rc repo at `/home/kite/projects/codex-rc`; global Codex MCP server named `playwright`; registered command is `ssh kite@192.168.1.2 "docker run --rm -i --ipc=host --network=host mcr.microsoft.com/playwright:v1.59.1-noble npx -y @playwright/mcp@0.0.73 --headless --no-sandbox --device 'iPhone 15' --isolated"`. Used while validating Web UI `http://192.168.1.2:3000/` app-server steer smoke.

## Symptom

`tool_search` for `playwright browser navigate click snapshot` reports Playwright-related tools found, but the follow-up callable tool namespace does not include `mcp__playwright__browser_*`; only unrelated tools such as `mcp__codex_apps__github` appear.

## Cause

In this Codex session, deferred MCP tool exposure did not make the registered `playwright` stdio MCP server callable even after the server was fixed and verified. The Playwright MCP server itself responded to JSON-RPC `initialize` and `tools/list`, so the failure was not the remote Docker server process.

## Resolution

Do not assume callable Playwright MCP tools are available merely because `tool_search` reports matches. Verify the namespace appears in the next tool list. If it does not, either start a fresh Codex session after fixing MCP registration or run Playwright directly through the server Docker image as a workaround for browser smoke tests.

## Evidence

`codex mcp get playwright` showed enabled stdio config. Direct JSON-RPC probe over the same ssh/docker command returned Playwright serverInfo and tools including `browser_navigate`, `browser_click`, and `browser_snapshot`. On 2026-05-06, `scripts/playwright-mcp-probe.sh` reproduced this with `server=Playwright 1.60.0-alpha-1777669338000`, `tools=23`, and sample tools including `browser_click` and `browser_navigate`. In the codex-rc PWA smoke pass on 2026-05-06, the robust path remained server-side Docker Playwright smoke (`scripts/web-ui-playwright-smoke.sh`), which passed after checking reload state restoration, steer, logs, and cancel. Earlier sessions showed `tool_search` could find Playwright tools while the callable tool list exposed to the assistant contained GitHub/caveat/codegraph namespaces but no `mcp__playwright__...` namespace.
