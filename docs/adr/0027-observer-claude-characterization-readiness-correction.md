# ADR 0027: Observer Claude characterizationの非H準備を先行させる

日付: 2026-07-16

## Status

Accepted。factory queueへ19c0を追加し、19c live Hの前にcharacterization harnessを閉じる。
live Claude、model request、host config適用、hook trust、credential、loginは未実施である。

## Evidence

- Observer `41a031d`時点のpackage binは`observer`、`observer-mcp`、
  `observer-parent-stop-hook`、`observer-hook-config`の4本で、provider result
  characterization専用hook／harnessを持たない。
- 既存`observer-hook-config`が生成するのは親Mailbox配送用Stop hookである。
  `parent-stop-hook`はroute identityとMailbox claimを処理し、Claude
  `last_assistant_message`をprovider resultとして保存しない。
- dual-host preflightは上記parent Stop hook候補を検証するが、隔離`--settings`の
  provider result capture、job `sessionId`／Stop `session_id`相関、terminal exact resultを
  実行可能な形へ準備していない。
- Claude Code 2.1.210のread-only `claude agents --help`には`--json`／`--all`はあるが、
  既存background jobへ非対話requestを送る`send`／`reply` subcommandはない。
- 2026-07-15のheadless／resume／background lifecycle実測は基礎characterizationであり、
  factory queue 19cの相関・capture・exact result受入を閉じない。
- Observer [ADR 0109](../../../Observer/docs/adr/0109-claude-public-surface-characterization-contract.md)が、
  非H harness、live H、production callerの順を製品側で固定した。

## Decision

1. queue 19b完了後へ`19c0 READY`を追加し、Observer製品repoでcharacterization専用の
   isolation／capture／sanitized receipt／prepare／verify／cleanup harnessをfixture受入する。
2. queue 19cはH操作であることを維持するが、19c0完了まではdispatchしない。
3. queue 19cは公開面が無い場合の`unsupported`も正しいcharacterization結果として保持する。
   ただし`unsupported`をproduction caller成功へ丸めず、19dはblockedとしてオーナー裁定へ戻す。
4. 親Mailbox hook、`claude -p --resume`、private protocol、TUI自動操作、raw `logs`、
   private job stateをproduction result surfaceへ読み替えない。
5. queue 19a／19bの既存受入を子計画へ同期する。過去の基礎characterizationは削除せず、
   queue 19cを閉じない旨を明記する。

full regressionと独立重監査はPhase O2完了時に一回だけ行う。Lattice、push、publish、deploy、
intentional faultは本Decisionの対象外である。
