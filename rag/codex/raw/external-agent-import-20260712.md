# Codex external-agent import（公式抜粋）

- 出典: https://learn.chatgpt.com/docs/app-server#detect-and-import-external-agent-config
- 取得日: 2026-07-12
- 取得方法: OpenAI Developer Docs MCP `fetch_openai_doc`
- 確度: 高（OpenAI 公式）

Supported `itemType` values are `AGENTS_MD`, `CONFIG`, `SKILLS`, `PLUGINS`,
`MCP_SERVER_CONFIG`, `SUBAGENTS`, `HOOKS`, `COMMANDS`, and `SESSIONS`. For
`PLUGINS` items, `details.plugins` lists each `marketplaceName` and the
`pluginNames` Codex can try to migrate. Detection returns only items that still
have work to do. For example, Codex skips AGENTS migration when `AGENTS.md`
already exists and is non-empty, and skill imports don't overwrite existing
skill directories.
