# ADR 0032: Observer Claude live再characterizationをblockedとして受け入れる

日付: 2026-07-16

## Status

Accepted。factory queue 19c2を`DONE`とする。queue 19cと19dは公開契約不足による`BLOCKED`を
維持し、19eへ進まない。

## Evidence

- Observer acceptance:
  [ADR 0114](../../../Observer/docs/adr/0114-claude-live-recharacterization-blocked.md)
- 対象: Claude Code `2.1.210`、Observer `c7b2b27`
- 一つのbackground job、一つの固定Haiku model request、追加spawnなし
- public observe terminal: `done`、明示stop不要
- `hook_invocation=confirmed`
- `job_session_correlation=confirmed`
- `stop_capture=confirmed`
- `result_capture=blocked`、`E_CLAUDE_CHARACTERIZATION_RESULT_INVALID`
- `reply_surface=unsupported`
- `terminal_exact_result=unsupported`
- cleanup、Observer project fingerprint不変、Claude host settings不変: confirmed

raw provider ID、model output、prompt、settings本文、host log、private job state、credentialは収集していない。
push、publish、deploy、login、intentional faultも実行していない。

## Decision

queue 19c2は再characterizationを一回実行し、最初のliveで不明だったStop hook発火、Stop payload、
job／session相関をconfirmedへ切り分けたため完了する。canonical Observer resultだけが
`E_CLAUDE_CHARACTERIZATION_RESULT_INVALID`で拒否された。raw outputを保存していないため、
具体的な不一致内容は推測しない。

一方、queue 19dが必要とする既存background jobへの公開非対話replyとterminal exact result readは
Claude Code 2.1.210の公開面にない。deterministic deliveryとexact result recoveryが成立しないため、
部分caller、fixture、headless resume、private protocol、raw logで不足契約を隠さない。19dは
`BLOCKED`、19eとO3は後続待ちを維持する。

再開条件は、Claudeの固定versionまたは公開契約が変わり、同一background jobへの非対話requestと
exact result recoveryを公開面だけで構成できる新しい非H証拠が得られることである。新しいlive実証は
別H承認を要する。full regressionと独立重監査はPhase O2完了時に一回だけ行う。
