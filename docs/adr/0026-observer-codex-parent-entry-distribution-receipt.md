# ADR 0026: Observer Codex parent entryと配布を受け入れる

日付: 2026-07-16

## Status

Accepted。factory queue 19bだけを完了する。次の19cはClaude live characterizationを伴う
`H-WAIT`であり、明示承認前には開始しない。

## Evidence

- Observer design `659924c`:
  [ADR 0107](../../../Observer/docs/adr/0107-codex-parent-entry-and-distribution-contract.md)
- Observer implementation `0690ee0`: `observer parent codex run` foreground entry、
  installed package root、exact Codex context、signal／sanitized exit contract
- dotagents implementation `21bc352`: `run-observer-parent-watch` skill、
  `agents/openai.yaml`、official／legacy片面配布とrollback fixture
- Observer acceptance `41a031d`:
  [ADR 0108](../../../Observer/docs/adr/0108-codex-parent-entry-and-distribution-acceptance.md)
- Observer focused 12/12、related 25/25、`npm run check` green
- skill-creator validator、skill smoke、isolated HOME、Observer package rollback、
  `make lint` green

dotagentsはObserver runtime／stateを複製せず、公開CLIの選択とCodex標準execのforeground
session回収だけを配布する。spawn／ready／terminal unknownを別thread／別transport／成功へ
丸めず、live provider、model request、credential、login、実HOME config、hook trust、push、
publish、deployは実行していない。

## Decision

queue 19bを`DONE`とする。次は19cでClaude公開非対話reply ACK、exact result read、
job／session／Stop相関をliveで一回characterizeする。これはH操作なので、目的・影響・停止・
rollbackを示してオーナー承認を得るまで待つ。19cの実証前に19d Claude callerを実装しない。

full regressionと独立重監査はPhase O2完了時に一回だけ行う。
