# OpenAI Codex hook trust surfaces — source pointer

- 取得日: 2026-07-21
- 出典: OpenAI Codex Manual
- 確度: 一次仕様
- 取得方法: `openai-docs` bundled helper（freshness検証済み）

## Source URLs

- [CLI slash commands](https://learn.chatgpt.com/docs/developer-commands.md?surface=cli)
- [IDE slash commands](https://learn.chatgpt.com/docs/developer-commands.md?surface=ide)
- [Hooks](https://learn.chatgpt.com/docs/hooks)

## Bounded source facts

- CLI built-in command一覧は`/hooks`をhookのreview／trust／disable入口として掲載する。
- IDE extension command一覧は`/hooks`を掲載しない。
- Hooks章は非managed hookをcurrent hash単位でtrustし、CLIの`/hooks`でreviewすると定義する。

一次本文は著作権上このrepoへ複製せず、上記公式URLと取得時のfreshness検証を正とする。
