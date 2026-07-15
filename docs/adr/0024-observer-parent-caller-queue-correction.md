# ADR 0024: Observer parent callerをH-only queueから分離する

日付: 2026-07-16

## Status

Accepted。ADR 0023のpreflight receiptは維持し、preflight後を直ちにdual-host Hとした
queue番号だけを訂正する。live操作は未実施である。

## Evidence

- 通常`observer` binaryは`parentContext`／`hostActions`を注入せず、公開watch startは
  `E_PARENT_WATCH_CONTEXT_REQUIRED`になる。
- Observerの`initializeGeneration()`はproduction call siteがなく、active watchから
  Supervisor generationへ接続されていない。
- `supervisor-production-step`はCodex runtimeだけをavailableとして受理する。
- dotagentsのClaude／Codex配布面にObserver parent entry／agent／skillが存在しない。
- Observer [ADR 0105](../../../Observer/docs/adr/0105-production-parent-caller-gap-and-order.md)が
  製品側の実装順を正本化した。

## Decision

queue 19を、Codex caller core非H、Codex parent entry配布非H、Claude public surface H、
Claude caller非H、dual-host live Hへ分割する。Claude characterization前にprivate protocolや
headless resumeを推測実装せず、O3／rate schedulerもO2完了前に先行させない。

旧queue 8は最終的なdual-host liveへ統合されたままとし、別campaignを反復しない。
full regressionと独立重監査はPhase O2完了時に一回だけ行う。
