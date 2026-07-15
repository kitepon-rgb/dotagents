# ADR 0029: Observer Claude live characterizationをblockedとして受け入れる

日付: 2026-07-16

## Status

Accepted。factory queue 19cのH実行は完了したが、成功条件は成立しなかった。
queue 19cと19dを`BLOCKED`とし、19eへ進まない。

## Evidence

- Observer acceptance:
  [ADR 0111](../../../Observer/docs/adr/0111-claude-live-characterization-blocked.md)
- 対象: Claude Code `2.1.210`、Observer `71267c7`
- 一つのbackground job、一つのmodel request、追加spawnなし
- public observe terminal: `done`
- `reply_surface=unsupported`
- isolated Stop capture: `E_STOP_CAPTURE_MISSING`
- `job_session_correlation=blocked`、`stop_capture=blocked`
- `terminal_exact_result=unsupported`
- cleanup、Observer project fingerprint不変、Claude host settings不変: confirmed

raw provider ID、prompt、settings本文、host log、private job state、credentialは収集していない。
push、publish、deploy、login、intentional faultも実行していない。

## Decision

queue 19cはH待ちではなく、live実行後の契約不足による`BLOCKED`へ遷移する。今回の一回だけで
Claude background agent一般のStop hook不成立原因までは断定しないが、19dが必要とする公開reply、
job/session/Stop相関、terminal exact result recoveryは実証されていない。

queue 19dで部分callerやfallbackを実装しない。fixture、`claude -p --resume`、private protocol、
TUI自動操作、raw `logs`／private stateを成功代替にしない。同じversion／同じ仮説の再試行は行わず、
再開には不足公開面またはStop capture条件を説明する新しい非H証拠と、別のH承認を必要とする。
19dが閉じるまで19e dual-host live Hと後続O3を先行させない。

full regressionと独立重監査はPhase O2完了時に一回だけ行う。
