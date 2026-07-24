# ADR 0092: cf-0023 新規 Codex session 受入境界

## Decision

Lattice task `cf-0023` は、Mac の正規 Codex CLI から開始した一つの新規 session で、次の6面を
直接観測して受け入れる。

1. repo の `AGENTS.md` に基づく規範
2. 配布済み Codex skill の可視性と代表1件の正規選択
3. native subagent の role routing と実行
4. Codex lifecycle hook の session 内実発火
5. 必須 MCP の session 内可視性と read-only 疎通
6. 同一 session の複数 turn 継続

全現役入口・全skill・全host・Throughline restore の網羅は、それぞれ `cf-0026`、`cf-0106`、
`cf-0125` などの後続taskが所有するため、本taskの完了条件へ追加しない。

## Parallel review placement

既存証拠棚卸し、実測手順監査、完了仮説の反証を、routing smoke と
`verify-codex-agent-routing` が green の native sorter 2件・refuter 1件へ read-only で委譲する。
placement dry-run の `registry-refresh-ambiguous` は、同一 workflow に複数の最新registry観測があるため
親選択を要求するものであり、能力不足や実行不能を示さない。親は検証済みの次の固定handleだけを選ぶ。

- `/root/cf0023_evidence_inventory`
- `/root/cf0023_session_surface`
- `/root/cf0023_acceptance_refuter`

書込み、branch操作、commit、push、外部状態変更、Lattice本体変更、廃止済み`codex-rc`の利用は許可しない。
別executorや暗黙fallbackも使わない。

## Validation

- 3 Worker Reportを親が実ファイル・実コマンドと照合してaccept/rejectする。
- 新規 session の JSON event logと最終応答を保存し、6面を項目別に直接根拠へ結び付ける。
- focused verifier、`make lint`、GitHub ActionsをgreenにしてからLattice taskを閉じる。

## Rollback

本Decision時点のrepo変更は本ADRとLattice start eventだけで、外部runtime設定は変更しない。
受入不能ならtaskを未完了のまま残し、このADRを完了証拠へ使わない。
