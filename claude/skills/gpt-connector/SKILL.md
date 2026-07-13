---
name: gpt-connector
description: ChatGPTのsecond opinion、gpt-connector MCPの診断・利用・timeout後のsession回収を頼まれた時に使う。
---

# gpt-connector

正規MCP server IDは `gpt_connector`、commandは `gpt-connector-mcp`。詳細は [docs/06_gpt-connector.md](../../../docs/06_gpt-connector.md)。

専用Chrome・product-owned state・明示model/effort・caller既知slugを守る。timeout時は `sessions` で回収し、Oracle/OpenAI APIへの暗黙fallbackはしない。Oracleは互換・rollback専用である。
