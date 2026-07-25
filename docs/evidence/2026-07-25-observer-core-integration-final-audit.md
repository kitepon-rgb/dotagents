# Observerコア製品正式編入 最終監査

- 日付: 2026-07-25
- Control: `observer-core-integration-20260725`
- Lattice plan: `observer-core-integration`
- 対象: Observer、dotagents、ServerManager / BugHub、AIShell、4運用host

## 結論

Observerを自作コア製品として、公開package、native diagnostics、factory wire v6、
BugHub current/history、全host scheduler、更新経路、rollbackまで正式編入した。
工場の現役管理対象は11製品であり、所有境界は次のとおり固定する。

- 自作コア10製品: Caveat、Throughline、Spotter、Lattice、gpt-connector、
  aiterm-mcp、codex-sidecar、AIShell、Observer、ServerManager
- 第三者管理1製品: MarkItDown。公開CLIだけをblack-box管理し、fork・内部patchを行わない
- 基盤toolchain 3製品: Claude Code CLI、Codex CLI、Grok Build

端末能力を報告する固定集合はServerManagerを除く10製品に基盤toolchain 3製品と
retired Oracleを加えたwire v6固定14製品である。所有製品数とwire製品数を混同しない。

## 製品・配備受入

| 面 | 受入結果 |
|---|---|
| Observer | `6a2917c55032`、`@quolu/observer@0.1.0`、tag / GitHub release `v0.1.0`、global install、native diagnostics green |
| AIShell | `b5053ac463c5`、`@quolu/aishell@0.4.7`、tag / GitHub release `v0.4.7`、global install、MCP / factory diagnostics green |
| dotagents | wire v6 client、固定14製品、Observer adapter、major別state/outbox、全OS scheduler artifact、配布symlinkを実装 |
| ServerManager | `0f12d05cd0cf`、v6 ingest / readiness / rollbackを本番配備。`FACTORY_V6_INGEST_ENABLED=true`でhealthy |
| 4 host | mac-kiteはObserver `installed/compatible 0.1.0`。main-server、fox-wsl、windows-workstationは`not_applicable/unsupported`。全host最終schedulerはv6 |
| rollback | 4 hostでv6→v5→v6を実送信し、current・history・outbox分離を確認。server `.env`退避を保持 |

live rolloutのreport ID、H operation digest、server backup、host別current/historyは
[wire v6 rollout evidence](2026-07-25-observer-wire-v6-rollout.md)を正とする。

## 修理した工場欠陥

1. AIShell release gateが未追跡payloadを見逃す欠陥を修理し、0.4.7へ公開した。
2. dotagentsのwire v6 testが`make ci`へ含まれない欠陥を修理した。
3. `agents-update`が更新後にv4 runnerへ戻す欠陥をv6既定へ修理し、
   MacのObserver / AIShell条件追加を更新回帰へ固定した。
4. ServerManager deployへ`.DS_Store`が混入する欠陥を修理した。
5. BugHub readinessがv5/v6 ingest flagを検査しない欠陥を修理した。
6. BugHub rollbackが旧`BUGHUB_SOURCE_REVISION`を復元しない欠陥を修理した。
7. 既存release evidenceのMarkdown lint違反を修理した。

## 検証

- `node --test tests/wire-v6/wire-v6.test.mjs`: 7/7 green
- `bash tests/update/cron-env.sh`: green
- `make lint-js test-factory-wire`: 15/15 green
- `make ci`: exit 0。shellcheck、Markdown lint、constitution parity、skill / hook /
  install smoke、factory wire、Control耐久・状態遷移、Lattice source cutoverを完走
- ServerManager: 98/98 green、deploy test green、本番readiness green
- AIShell: Swift test 0 failure、release gate green、公開後MCP / diagnostics smoke green

## repo衛生

2026-07-25の最終監査でローカル11 repoを`git fetch --prune`後に確認した。
aishell、aiterm-mcp、Caveat、codex-sidecar、gpt-connector、Lattice、Observer、
ServerManager、Spotter、Throughlineは未コミット差分なし。dotagentsの本wave差分は
対象限定commitとpushで収容し、計画・Lattice・Controlの完了後に未コミット差分ゼロを
再確認する。aiterm-mcpのローカルmainはcleanだがorigin/mainより2 commit behindであり、
未コミット差分ではないため本waveで無関係なfast-forwardは行わない。

## 受入判定

計画の受入条件8項目をすべて満たす。Observerを予約・未編入へ戻す生きた正典は残さず、
MarkItDownを自作製品として扱わない。wire v5と各majorの履歴・outboxはrollback資産として
保持し、暗黙変換しない。
