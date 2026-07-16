# ADR 0036: Observer Claude production caller core受入

日付: 2026-07-16

## Status

Accepted。工場queue 19d-cを完了し、次の非H readyを19d-dとする。

## Decision

- Observer `d8dfb92`で、Aiterm公開面だけをClaude provider operation、production step、非AI Supervisor process、
  Claude親caller、CLIへ接続した。
- 一つのactive generationでは、private watch bindingの同じ`claude.session`へ全通常cycleを送り、
  `claude -p`反復、unknown後のprompt再送、Codex/API fallbackを行わない。
- initial generationは既存Aiterm Claude activationが一度だけ所有し、callerは二重初期化しない。
- 通常終了は`pty_close`を先、MCP process closeを後に行う。session launch確定前の結果不明経路ではMCPだけを閉じ、
  durable sessionを勝手に破壊しない。
- rollover／parent rebindのstop／relaunch／recoveryは19d-dまで未実装であり、明示errorを維持する。

## Evidence

- focused: 27 passed、0 failed、0 skipped。
- related: Aiterm transport、Claude operation／host、watch、Supervisor process、Claude／Codex caller、CLIの
  91 passed、0 failed、0 skipped。
- static: `npm run check` green。
- Observer正本: `docs/adr/0119-claude-production-caller-acceptance.md`。
- full regression、独立重監査、実Claude model request、login、credential、publish、pushは未実施。
  fullと独立重監査は19d-d、live Hは19eへ残す。

## Doctrine

Throughline L2は親completed chain／rollback証拠であり、Observer cognitionの代替ではない。Observer cognitionは
同providerの利用者可視な永続AI sessionが所有する。SupervisorはAIではなくdelivery、exact-once、recovery、
generation、Mailbox publishだけを管理する。この設計訂正を変更しない。

## Rollback

本commitをrevertし、親queueを19d-cへ戻す。Observer実装のrollbackはObserver ADR 0119に従い、
P5-1b4a／bと既存Codex callerを維持する。
