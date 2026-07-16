# ADR 0035: Observer Claude session launch受入receipt

日付: 2026-07-16

## Status

Accepted cross-repo receipt。queue 19d-bを完了し、次の非H ready TODOを19d-cとする。

## Accepted evidence

- Observer `3116955`: Aiterm stdio MCP transportとClaude provider operation。focused 8/8、related 58/58、
  `npm run check` green。
- Observer `8de4830`: `claude.session` production route、promptless managed launch、structured receipt、
  record-first launch journal、明示拒否とtransport unknownの分離、recover-only、watch activation、
  initial generation。focused 27/27、related 35/35、`npm run check` green。
- Observer ADR 0117／0118を同repoの不変Decisionとし、dotagentsは実装状態を複製せずcommit／gate receiptだけを
  親queueへ記録する。

## Doctrine check

- Observer cognitionは同providerの利用者可視な永続AI sessionが所有する。
- Throughline L2は親completed chain／rollback証拠であり、Observer cognitionを代替しない。
- SupervisorはAIではなく、delivery、exact-once、recovery、generation、Mailbox publishだけを制御する。
- 旧`claude.job` background routeはblocked履歴互換に限定し、`claude -p`反復、private protocol、
  Codex／API fallbackをproduction routeへ入れていない。

## Orchestration receipt

P5-1b4b Controlは最終Runをacceptし、誤順序でterminal化した旧Runを採用せずrejectしたうえで、Observer ADR 0118に
Task finalizationした。workspace進行後にreject不能だったdotagents欠陥はADR 0034／`d0c2832`で独立修正した。

## Remaining boundary

- 19d-cでproduction step、非AI Supervisor process、Claude parent caller、CLI、同一session再利用を接続する。
- 19d-dでrollback／rebind／stop／closeを閉じ、P5-1b4 full regressionと独立重監査を一回だけ行う。
- 実Claude初回／follow-up、login、credential、hook trust、publish、pushは19e Hまで未実施のまま維持する。

## Rollback

本receipt commitをrevertして親queueを19d-a完了時点へ戻す。Observer実装のrollbackは同repo ADR 0117／0118を正とし、
dotagentsから他repo履歴を書き換えない。
