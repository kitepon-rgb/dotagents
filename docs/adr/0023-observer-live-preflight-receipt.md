# ADR 0023: Observer dual-host live preflight receipt

日付: 2026-07-16

## Status

Accepted。Observer P5-1b-preflightの非H契約だけを受け入れる。Claude／Codexの
public surface、実model request、hook trust、65秒超wait、明示停止、intentional faultは
実証済みへ昇格しない。

## Product receipt

- Observer design: `50b4e86`、ADR 0103
- Observer implementation: `bbe407d`
- Observer acceptance: `80b06f0`、ADR 0104
- focused: preflight contract／CLI 13/13
- related: product diagnostics、Claude runtime、Codex process、hook config、CLI 40/40
- static: `npm run check` green
- actual read-only preflight: exit 0、top-level `h_required`

actual preflightではproduct、Claude runtime、Codex runtime、hook candidates、canonical cwdが
`ready`となり、Claude／Codex public surfaceは`h_required`のまま残った。provider／app-server、
model request、host config read／write、hook trust、credential、intentional faultは実行していない。

## Queue decision

- 非H preflightをDONEにする。
- 旧queue 8のCodex live app-server／Claude公開delivery／Stop captureは、同じ証拠を要求する
  queue 19のdual-host live campaignへ統合し、二重実施しない。
- 次の主レーンはqueue 19のH-WAITである。O2を閉じる前にO3へ進まない。
- intentional fault trancheと4 host／BugHub canaryはqueue 20の別H承認へ残す。
- full regressionと独立重監査はPhase O2完了時に一回だけ行う。
