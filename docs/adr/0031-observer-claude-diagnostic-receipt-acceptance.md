# ADR 0031: Observer Claude diagnostic receiptを受け入れる

日付: 2026-07-16

## Status

Accepted。factory queue 19c1を`DONE`、19c2を`H-WAIT`とする。19dは19c2の実証待ちを維持する。

## Evidence

- Observer design:
  [ADR 0112](../../../Observer/docs/adr/0112-claude-characterization-diagnostic-receipt-contract.md)
- Observer acceptance:
  [ADR 0113](../../../Observer/docs/adr/0113-claude-characterization-diagnostic-receipt-acceptance.md)
- Observer implementation `f239a07`
- focused 9/9、related 29/29、`npm run check` green
- package dry-run 57 files、characterization bin／core収録
- read-only readiness: Claude Code `2.1.210`、`ready_for_h`、reply surface `unsupported`

## Decision

queue 19c1を完了する。工場はObserverのraw-free hook diagnostic receiptを再実装せず、P5-1b3dの
sanitized receiptだけを親正本へ還流する。first liveの`capture missing`を成功へ変更せず、次回は
`hook_invocation`、`stop_capture`、`result_capture`、job/session、terminal、cleanupを独立判定する。

queue 19c2は別H承認待ちである。一つのbackground job／model request、isolated settings、同一handle
observe／stop／cleanupだけを対象とし、raw logs、private state、headless resume、別providerへ
fallbackしない。19c2が成立するまで19d、19e、O3を先行させない。

full regressionと独立重監査はPhase O2完了時に一回だけ行う。
