# ADR 0030: Claude characterization blockerを診断receiptと再Hへ分解する

日付: 2026-07-16

## Status

Accepted。factory queue 19c1を`READY`、19c2を`H-WAIT→19c1`として追加し、19dの依存先を
19c2へ更新する。

## Evidence

- first live result:
  [Observer ADR 0111](../../../Observer/docs/adr/0111-claude-live-characterization-blocked.md)
- diagnostic design:
  [Observer ADR 0112](../../../Observer/docs/adr/0112-claude-characterization-diagnostic-receipt-contract.md)
- Claude Code 2.1.210の保存済み公式仕様では、Stopはmain agent完了時に発火し、`--settings`は
  background sessionへ引き継がれる。
- managed／user／project settingsにhook禁止設定はなく、live daemonからNodeも解決できる。
- 現行Observer hookはstdin／payload／result parse失敗時にreceiptを残さないため、
  `E_STOP_CAPTURE_MISSING`だけではhook未発火とhook内拒否を区別できない。

## Decision

19cを同じHの反復へ戻さない。まず19c1で、raw-free diagnostic receipt、direct shebang CLI、
成功／失敗別verify、owner-only cleanupをObserver製品repoで閉じる。これは工場コア製品の正規利用で
再現した診断欠陥の根治であり、Claude実火を含まない非H waveである。

19c1受入後だけ、19c2として目的・影響・rollbackを再提示し、一つのjob／model requestの明示承認を
得る。19c2で成立した公開面が揃うまで19dを実装せず、19e／O3も先行させない。

既存ADR 0029やObserver ADR 0111へ追記せず、本Decisionを新しい不変証拠とする。
