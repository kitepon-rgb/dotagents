# P4 昇格キュー — 端末メモリ→リポ正典への昇格待ち行列

状態: 終了・archive（2026-07-21。現行コア外の旧依頼はLatticeで根拠付き終了）

前提: FOX(WSL) の P4 メモリ整理（2026-07-04・bulk-curation 20プロジェクト・flags 35件のオーナー裁定）で確定した「リポに置くべき真実」。**起票元の FOX(WSL) は Mac 主作業リポに触らない（オーナー指示 2026-07-04「Macでの作業対象はこっちで触れんなよ」）**ため、消化は各リポの次の作業セッション（端末問わず）が行う。

消化の作法: ①対象リポで fetch→照合 ②出典メモリ（FOX(WSL) の端末メモリ。下記に要旨あり＝メモリを読めなくても本表だけで書ける）を本表の要旨から正典へ書き起こす ③push ④本表の行を `[x]`＋日付にして dotagents を push。全行消化されたら本ファイルは削除してよい。

## OpenCClaw

> 2026-07-17 消化試行: local clone が origin/main から 203 commit behind かつ他セッションの
> 未収容 WIP（docs/00_overview.md・rag/INDEX.md = Bell News 統合の dirty）があり、incoming と
> 交差して ff 不可。他レーンの WIP を stash/巻き込みしないため 3 行とも見送り。
> OpenCClaw を触る次のセッション（WIP 収容後）で消化する。
>
> 2026-07-19注記: GitHub側ではOpenCClawがBellへ改名済み。未消化の3行は残したまま、消化先を
> Bell repo（`~/Developer/bell`）として読む。

- Latticeへ移管済み: mq-0017 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L6
- Latticeへ移管済み: mq-0018 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L7
- Latticeへ移管済み: mq-0019 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L8
- 消化済み: aiterm heredoc×mark 罠 → caveat `aiterm/aiterm-pty-send-mark-true-breaks-heredoc-...` に public 登録（2026-07-04）／C# MCP nullable→server silent drop → caveat に**既存 public 登録あり**（重複登録不要）

## ServerManager

- Latticeへ移管済み: mq-0024 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L9
- Latticeへ移管済み: mq-0025 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L10
- Latticeへ移管済み: mq-0026 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L11
- Latticeへ移管済み: mq-0027 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L12
- Latticeへ移管済み: mq-0028 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L13

## rpgdev

- Latticeへ移管済み: mq-0032 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L14
- Latticeへ移管済み: mq-0033 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L15

## stock-mcp

> 2026-07-17: この Mac に stock-mcp の clone が無く消化不能。stock-mcp を持つ端末で消化する。

- Latticeへ移管済み: mq-0039 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L16

## WebAICoding

- Latticeへ移管済み: mq-0043 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L17

## terminal（aiterm-mcp）

- Latticeへ移管済み: mq-0047 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L18

## MMOAuction（リポ側の旧パス残り）

- Latticeへ移管済み: mq-0051 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L19

## Caveat（FOX(WSL) の 2026-05-09 未収容 WIP からの救出。オーナー裁定 2026-07-04）

- Latticeへ移管済み: mq-0055 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L20
- 参考: 同 WIP の告知文ドラフト（v0.14.8 用・版落ち）は同 tar と `~/Archives/p4-stale-memory-20260704/caveat-announcements-v0.14.8.md` に退避済み。次の告知を書くならトーン見本として再利用可

## グローバル憲法・caveat（消化済み）

- Latticeへ移管済み: mq-0060 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L21
- Latticeへ移管済み: mq-0061 → docs/archive/lattice-source-ledger/memory-promotion-queue-cutover-20260719.md#L22
