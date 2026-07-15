# ADR 0025: Observer Codex parent caller coreを受け入れる

日付: 2026-07-16

## Status

Accepted。factory queue 19aだけを完了し、19b Codex parent entry／dotagents配布を
次の実行対象とする。live providerとLatticeは対象外のまま維持する。

## Evidence

- Observer design `133cf37`:
  [ADR 0105](../../../Observer/docs/adr/0105-production-parent-caller-gap-and-order.md)
- Observer implementation `286a6db`: current Codex parent、watch予約、同一app-server
  transportによるspawn／ready、initial generation、Supervisor loop、terminal stopを一processへ接続
- Observer acceptance `8f5fb90`:
  [ADR 0106](../../../Observer/docs/adr/0106-codex-parent-caller-core-acceptance.md)
- focused gate: 9/9
- related gate: 77/77
- static gate: `npm run check` green

runtime不一致、spawn unknown、ready unknown、generation conflict、stop terminal unknownは
別runtime／別spawn／成功へ丸めず、同一transportのownershipとterminal確認順をfixtureで固定した。
live provider、model request、credential、login、host config変更、push、publish、deployは
実行していない。

## Decision

queue 19aを`DONE`、19bを`NOW`とする。19bでは現在Codex親からexact contextを作る
明示entryとdotagents配布面だけを実装し、isolated HOMEでinstall／verify／rollbackする。
Observer runtimeをdotagentsへ複製せず、NodeからCodex native toolを偽装しない。

Claude characterization以降は19c〜19eへ分離したままとし、full regressionと独立重監査は
Phase O2 gateで一度だけ行う。
