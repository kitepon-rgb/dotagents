# ADR 0033: Observerの継続理解を正し、Aiterm Claude対話routeをqueueへ追加する

日付: 2026-07-16

## Status

Accepted。factory queue 19c3を`READY`として追加する。queue 19cは旧Claude background job経路の
blocked記録として維持し、19dは19c3完了待ちへ変更する。

## Corrected doctrine

- Throughline L2は親のcompleted chainとrollback証拠であり、Observer自身の継続理解を代替しない。
- Observerは親と同providerの一つの利用者可視sessionとして立ち、completed turnごとに同じsessionで
  理解を更新する。fresh stateless evaluatorの列へ置き換えない。
- SupervisorはAIではない。delivery、exact-once、timeout／crash recovery、generation、Mailbox publishを
  管理するNode control processであり、Observer cognitionを所有しない。
- MailboxはObserverから親への助言配送、Throughlineは親からObserverへの確定turn供給である。

Observer側の詳細責務はObserver
[ADR 0115](../../../Observer/docs/adr/0115-persistent-observer-context-and-claude-transport.md)を正とする。

## Claude route decision

Claude Code 2.1.210のbackground jobへ公開非対話reply／terminal exact result readがないという
[ADR 0032](0032-observer-claude-live-recharacterization-blocked.md)の証拠は維持する。ただし、それを
Claude Observer全体の行き止まりとは扱わない。

Aitermへ公開対話tool `claude_agent`を追加し、Aiterm所有の永続PTYでClaude Code TUIを起動する。
同一sessionへのfollow-up、Stop完了、exact result、timeout後回収、interrupt／closeを公開契約として
閉じた後、ObserverのClaude callerをその契約だけで実装する。

`claude -p`反復、Claude private protocol／transcript／debug log、別providerへのfallbackは採用しない。
Aitermはtransportだけを所有し、Throughline／Observer／Mailboxロジックを内包しない。

## Queue and gates

1. queue 19c3: Aiterm repoで思想・ADR・active TODO、characterization fixture、実装、focused／related
   gate、独立commitを閉じる。
2. queue 19d: Observer repoでAiterm公開toolをproduction callerへ接続し、同じ永続Claude sessionを
   Supervisor processが所有する。
3. queue 19e: 別H承認で実Claude初回／follow-upとdual-host campaignを一度実施する。

live Claude request、login、credential、publish、push、deployはHのまま維持する。Latticeの設計・実装・
研究成果は本waveへ持ち込まない。
