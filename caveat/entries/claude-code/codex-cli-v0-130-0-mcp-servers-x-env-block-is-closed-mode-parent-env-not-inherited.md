---
id: codex-cli-v0-130-0-mcp-servers-x-env-block-is-closed-mode-parent-env-not-inherited
title: 'Codex CLI v0.130.0: `[mcp_servers.X.env]` block is closed mode — parent env NOT inherited'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - codex
  - mcp
  - env-inheritance
  - config-toml
  - silent-fallback
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
source_project: null
source_session: 2026-05-17T07:52:52.798Z/84be36041651
created_at: 2026-05-17
updated_at: 2026-05-17
last_verified: 2026-05-17
---

## Symptom

MCP server spawned by Codex CLI (e.g. `node /app/mcp-server.js`) sees ONLY the env keys explicitly written in `[mcp_servers.X.env]` of `config.toml`. Parent process env (set by docker compose / shell / env_file) is dropped. Resulting bugs are silent: lib/config.js defaults take over (LOGBOT_HOST=127.0.0.1 → IS_REMOTE=false → local file mode → stale fallback files get read instead of the canonical path expected to be in CRON_JOBS_PATH). Tool calls "succeed" but return data from the wrong source, looking like model hallucination at the LLM layer. Verified by inspecting `/proc/<mcp-pid>/environ` and seeing only the 3 keys from toml versus the ~15 keys in the codex app-server parent.</symptom>
<parameter name="cause">`[mcp_servers.X.env]` in Codex CLI's config.toml replaces the child's env rather than augmenting it. Many MCP servers implicitly depend on inherited env (auth tokens, file paths, host/port for sibling services). Without explicit listing, those keys fall back to library defaults which can point to phantom files or wrong hosts. Codex's built-in plugins (`[plugins."gmail@openai-curated"]` etc.) are unaffected because they go through OpenAI's own OAuth path, masking the breakage and making it look like only some tools are broken.</cause>
<parameter name="resolution">Enumerate every env var the MCP server actually needs and write all of them under `[mcp_servers.X.env]`. For secrets (API tokens) that should not be committed: either (a) keep config.toml outside git and inline the secret on the host, or (b) test whether Codex CLI supports `${VAR}` interpolation in env values — if so, write `TOKEN = "${BELL_INTERNAL_TOKEN}"` and rely on env expansion at spawn time. Also delete any stale fallback files in the repo (e.g. committed `.cron-jobs.json` test fixtures) that library defaults might land on, and add them to .gitignore.</resolution>
<parameter name="evidence">Inside `openclaw-bellbot-codex` container: `cat /proc/112/environ | tr '\0' '\n' | grep -E 'LOGBOT|CRON|TOKEN'` returned EMPTY for PID 112 (`node /app/mcp-server.js`), while parent PID 15 (`codex app-server`) had LOGBOT_HOST=discord-bridge / CRON_JOBS_PATH=/var/lib/openclaw/.cron-jobs.json / BELL_INTERNAL_TOKEN=xxx all set. Tool call `cron_schedule action=list` returned 30+ entries from April 2026 (matching contents of `/app/.cron-jobs.json` = a stale committed fixture, mtime Apr 8) instead of the 12 entries actually live in `/var/lib/openclaw/.cron-jobs.json`. The toml block at the time:
```toml
[mcp_servers.openclaw.env]
MCP_MODE = "stdio"
BELLBOT_HOST = "127.0.0.1"
BELLBOT_PORT = "18811"
```
— only 3 keys, and indeed exactly those 3 keys appeared in the child env.</evidence>
<parameter name="context">Discovered during OpenAI Codex migration from Claude Code CLI. Discord chat asked Bell "what's my X posting schedule?", Bell answered with bogus expired-April-2026 jobs, looking at first like an LLM hallucination. Adding a `console.log` of MCP tool results in the bellbot-codex parent (which sees notifications from Codex app-server) revealed the tool was actually returning that stale data — moving the diagnosis from "GPT-5 misreads tool output" to "tool returns wrong data". `/proc/PID/environ` inspection then localized it to env propagation.</context>
<parameter name="environment">{"codex_cli": "0.130.0", "node": "22.x (in container)", "platform": "linux/amd64 docker", "host_os": "Ubuntu Server 24.04 (kernel 6.x)"}

## Cause



## Resolution



## Evidence


