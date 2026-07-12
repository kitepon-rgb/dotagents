# Codex customization order（公式抜粋）

- 出典: https://learn.chatgpt.com/docs/customization/overview#next-step
- 取得日: 2026-07-12
- 取得方法: OpenAI Developer Docs MCP `fetch_openai_doc`（Codex manual helper は `x-content-sha256` 欠落で失敗）
- 確度: 高（OpenAI 公式）

## Next step

Build in this order:

1. Custom instructions with AGENTS.md so Codex follows your repo conventions. Add pre-commit hooks and linters to enforce those rules.
2. Install a plugin when a reusable workflow already exists. Otherwise, create a skill and package it as a plugin when you want to share it.
3. MCP when workflows need external systems (Linear, GitHub, docs servers, design tools).
4. Subagents when you're ready to delegate noisy or specialized tasks to subagents.
