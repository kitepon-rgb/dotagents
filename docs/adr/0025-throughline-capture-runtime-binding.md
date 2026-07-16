# ADR 0025: Claude captureをcampaign Throughline candidateへ束縛する

日付: 2026-07-16

## Status

Accepted for campaign correction。queue 19eを保持し、新規Claude sessionより先に配線を補正する。

## Context

Observer hookのstate root修理後、実Claude model応答とThroughline DB sessionは成立したが、
completed receipt fileは作られなかった。preflight／readはcampaign candidateのabsolute commandを使う一方、
Claude settingsのproduct-owned Stop hookはbare `throughline process-turn`で、Aiterm controllerのPATHが
global packageを先に解決していた。同じversion文字列だけではcapture surface一致を証明できない。

## Decision

1. Claude parentを保持するAiterm controllerは`PATH=<campaign-prefix>/bin:$PATH`で起動する。
2. Throughline設定をdotagentsから手書きせず、既存のbare hookをcandidate prefixへPATH解決する。
3. global package更新、手動transcript投入、別provider、fixture成功へfallbackしない。
4. candidate自然Stopからreceiptが作られ、`observer-read`でhost／turnを確認するまでlive成功にしない。
5. 失敗sessionは公開closeし、raw ID、prompt、host log、設定本文をDecision証拠へ保存しない。

## Acceptance

- Observer runbookとactive planがcapture／readの実行物一致を必須化する。
- 次のactual Claude attemptでcandidate receipt fileとcompleted feedを確認する。
- initial／follow-up exact result、65秒超wait、terminal、rollbackはqueue 19e全体の受入へ残す。
