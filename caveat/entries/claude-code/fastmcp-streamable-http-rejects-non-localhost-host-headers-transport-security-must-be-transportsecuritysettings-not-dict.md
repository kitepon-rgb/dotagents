---
id: fastmcp-streamable-http-rejects-non-localhost-host-headers-transport-security-must-be-transportsecuritysettings-not-dict
title: FastMCP streamable-http rejects non-localhost Host headers; transport_security must be TransportSecuritySettings (not dict)
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - mcp
  - fastmcp
  - streamable-http
  - transport-security
  - lan-deployment
  - dns-rebinding
environment:
  os: Ubuntu 7.0.0-14-generic
  arch: x64
  node: 22.22.1
  python: 3.14.4
  mcp: 1.27.1
  transport: streamable-http
source_project: null
source_session: 2026-05-11T15:45:28.842Z/258fde536d3e
created_at: 2026-05-11
updated_at: 2026-05-11
last_verified: 2026-05-11
---

## Context

Building a stock-data MCP server bound to 0.0.0.0:39200 on a LAN box and registering it from a Claude Code client on a different LAN host via `claude mcp add --transport http`. Curl returned 'Invalid Host header' until the override; then 500 errors until the dict-vs-model fix.

## Symptom

When binding FastMCP's streamable-http transport to a LAN address (e.g. 0.0.0.0:39200) and POSTing to /mcp from another LAN host, the server first returns 400 'Invalid Host header'. After overriding mcp.settings.transport_security with a plain dict it then returns 500 'Internal Server Error' with traceback: AttributeError: 'dict' object has no attribute 'enable_dns_rebinding_protection' from mcp/server/transport_security.py validate_request.

## Cause

FastMCP defaults `transport_security` to `TransportSecuritySettings(enable_dns_rebinding_protection=True, allowed_hosts=['127.0.0.1:*','localhost:*','[::1]:*'], allowed_origins=['http://127.0.0.1:*', ...])`. Any other Host header is rejected before the MCP handler runs. The setting must be a `TransportSecuritySettings` Pydantic model instance — assigning a plain dict (or the output of `.model_dump()`) bypasses the validator and the middleware then crashes when it accesses attributes.

## Resolution

Import `from mcp.server.transport_security import TransportSecuritySettings` and replace the whole setting with a new model instance that includes the LAN host/origin:

```python
mcp.settings.transport_security = TransportSecuritySettings(
    enable_dns_rebinding_protection=True,
    allowed_hosts=["127.0.0.1:*", "localhost:*", "[::1]:*", "192.168.1.2:39200", "192.168.1.2"],
    allowed_origins=["http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*", "http://192.168.1.2:39200"],
)
mcp.run(transport="streamable-http")
```

Patterns support wildcards (`host:*`). Wildcard `*` for allowed_hosts disables protection entirely — avoid; enumerate the LAN address you actually serve.

## Evidence

mcp/server/transport_security.py:114 reads `self.settings.enable_dns_rebinding_protection` — fails if `self.settings` is dict. Default Settings field introspection on FastMCP 1.27.x: `transport_security = {'enable_dns_rebinding_protection': True, 'allowed_hosts': ['127.0.0.1:*','localhost:*','[::1]:*'], 'allowed_origins': ['http://127.0.0.1:*', ...]}`. Confirmed reproduction on Ubuntu 7.0.0 + Python 3.14.4 + mcp 1.27.1.
