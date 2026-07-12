# Codex skill discovery（公式抜粋）

- 出典: https://learn.chatgpt.com/docs/build-skills
- 取得日: 2026-07-12
- 取得方法: OpenAI Developer Docs MCP `fetch_openai_doc`
- 確度: 高（OpenAI 公式）

Codex reads skills from repository, user, admin, and system locations. For repositories, Codex scans `.agents/skills` in every directory from your current working directory up to the repository root. If two skills share the same `name`, Codex doesn't merge them; both can appear in skill selectors.

| Skill Scope | Location | Suggested use |
|---|---|---|
| `USER` | `$HOME/.agents/skills` | Use to curate skills relevant to a user that apply to any repository you may work in. |

Codex supports symlinked skill folders and follows the symlink target when scanning these locations.

Direct skill folders are best for local authoring and repo-scoped workflows. If you want to distribute a reusable skill, bundle two or more skills together, or ship a skill alongside a connector, package them as a plugin.
