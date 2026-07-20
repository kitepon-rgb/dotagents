# cf-0149 Codex hook lifecycle 実火記録

- 実施日: 2026-07-21
- 対象: `codex-full-support/cf-0149`
- 結論: Mac、main-server、FOX WSL2、FOX Windows native の実 Codex CLI で lifecycle を受入。Windows は Caveat 0.17.1 の正規 reinstall と stale `node_repl` command の端末設定補正後、明示hook/MCPエラーなしで再実火した。

## 4入口の実測

各入口で同じ新規 Codex CLI sessionを開き、ファイル変更やtool実行を行わない4 turnを実行した。

| host | Codex session | turn 1 | 同session turn 2 | `/compact` 後 | compact後 turn 2 | repo変更 |
|---|---|---|---|---|---|---|
| Mac | `019f8136-44c0-7ba3-933e-8a85c09f2ac4` | INFO後 `CF0149_TURN1_OK` | INFOなし、`CF0149_TURN2_OK` | INFO再配送後 `CF0149_POST_COMPACT_OK` | INFOなし、`CF0149_POST_COMPACT_SILENT_OK` | lifecycle probeによる変更なし |
| main-server | `019f8136-47d2-7251-8af3-d50db678675e` | INFO後 `CF0149_TURN1_OK` | INFOなし、`CF0149_TURN2_OK` | INFO再配送後 `CF0149_POST_COMPACT_OK` | INFOなし、`CF0149_POST_COMPACT_SILENT_OK` | clean |
| FOX WSL2 | `019f8136-4e59-7641-86bd-7bcf4d278ee2` | INFO後 `CF0149_TURN1_OK` | INFOなし、`CF0149_TURN2_OK` | INFO再配送後 `CF0149_POST_COMPACT_OK` | INFOなし、`CF0149_POST_COMPACT_SILENT_OK` | clean |
| FOX Windows native | `019f81b9-cc9f-7ed2-be81-d5a178b06326` | INFO後 `CF0149_WINDOWS_RETEST_TURN1_OK` | INFOなし、`CF0149_WINDOWS_RETEST_TURN2_OK` | INFO再配送後 `CF0149_WINDOWS_RETEST_POST_COMPACT_OK` | INFOなし、`CF0149_WINDOWS_RETEST_POST_COMPACT_SILENT_OK` | 対象repo変更なし |

各session transcriptには `type: compacted` と `context_compacted` eventが1件あり、その後の最初のturnだけUserPromptSubmit onset INFOが再配送された。Macの作業tree差分はLatticeのtask start eventだけであり、ユーザー所有の未追跡 `docs/evidence/fixtures/`には触れていない。

## 既存証拠との合成

- Stop pendingの次回1回配送とdirty→clean cleanup表示は [ADR 0107](../adr/0107-cf0283-stop-pending-cleanup-acceptance.md) でfocused smoke済み。
- 4 hostへのhook安全配布とWindows nativeでのcallout実火は [ADR 0074](../adr/0074-codex-hook-cross-host-acceptance.md) で受入済み。
- 代表skill、Throughline handoff、model・effort明示のgpt-connector consultationとtimeout後session回収は [ADR 0075](../adr/0075-r2-new-session-routing-and-connector-acceptance.md) の既存実測を再利用する。
- main-server App Remoteの初回配送・同session 2回目沈黙は [ADR 0105](../adr/0105-cf0216-main-server-remote-acceptance.md) で受入済み。

## Windows blocker の解消

- Caveat 0.17.1 は quoted Node executable に PowerShell call operator `&` を付ける修理を公開済みだったが、Windows の `hooks.json` には旧commandが残っていた。`caveat codex-hook install` を再実行し、生成されたbackup `C:\Users\kite_\.codex\hooks.json.caveat-backup-1784587629028` を保持したまま、Caveat所有3 hookだけをcanonical commandへ移行した。対話 `/hooks` では3件を個別レビューしてtrustし、UserPromptSubmit/Stopのexit code 1が消えた。
- `node_repl` は実在するWindows executableに対してcommandだけがWSL `/mnt/c/...`を指していた。`config.toml`を `C:\Users\kite_\AppData\Local\Temp\codex-config-20260721-075402.tar.gz` へtar退避し、`mcp_servers.node_repl.command` 1行だけを実在するWindows pathへ補正した。`codex mcp get node_repl` と新規session `019f81bc-cc23-7fe2-8670-66a6368e1998` の `CF0149_WINDOWS_FINAL_CLEAN_OK` でMCP起動失敗とhook失敗が出ないことを確認した。
- 修復後のlifecycle sessionでは、初回だけINFO、同session 2回目は沈黙、`/compact` 後の初回だけINFO、次回は沈黙となり、各turnのStopにも明示エラーは出なかった。他入口の成功はWindows nativeへ代用していない。

## 境界

Lattice製品は変更していない。廃止済み`codex-rc`は実行・調査・復旧していない。Mac起動時に表示された第三者MCPの起動失敗はdotagents所有adapterの欠陥と確認されていないため、本taskやmaintenance queueへ混ぜない。
