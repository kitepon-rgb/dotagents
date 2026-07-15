# ADR 0028: Observer Claude characterization harnessを受け入れる

日付: 2026-07-16

## Status

Accepted。factory queue 19c0だけを完了する。queue 19c live Hは明示承認待ち、19d Claude
production callerは19cの実証結果待ちである。

## Evidence

- Observer design `280b746`:
  [ADR 0109](../../../Observer/docs/adr/0109-claude-public-surface-characterization-contract.md)
- Observer implementation `f40b672`: characterization専用CLI／Stop hook、isolated settings、
  session/result digest、sanitized verification、owner-only cleanup、5-bin product manifest
- dotagents adaptation `78c358b`: package verifierとisolated rollback fixtureの5-bin追従
- Observer focused 10/10、related 26/26、`npm run check` green
- package dry-run 57 files、新bin／core収録
- dotagents `tests/install/observer-package.sh`、specific shellcheck、syntax green
- Observer acceptance:
  [ADR 0110](../../../Observer/docs/adr/0110-claude-characterization-harness-acceptance.md)
- actual read-only readiness: Claude Code 2.1.210、`status=ready_for_h`、
  `reply_surface=unsupported`

## Decision

queue 19c0を`DONE`とする。dotagentsはObserverのcapture、session相関、result parse、cleanupを
再実装せず、Observer package manifestが宣言する5本のbinをinstalled pathとdiagnosticsで
検証するだけとする。

次はqueue 19c live Hで、同じ一つのClaude background jobを用いてjob/session/Stop相関、
exact result、terminal、cleanupをcharacterizeする。公開非対話reply surfaceが無い場合の
`unsupported`は正しい調査結果だが、19d caller成功へ丸めない。private protocol、
`claude -p --resume`、TUI自動操作、raw `logs`、private job stateへfallbackしない。

live Claude、model request、host config、hook trust、credential/login、intentional fault、push、
publish、deployは実行していない。full regressionと独立重監査はPhase O2完了時に一回だけ行う。
