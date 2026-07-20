# cf-0149 Codex hook lifecycle 実火記録

- 実施日: 2026-07-21
- 対象: `codex-full-support/cf-0149`
- 結論: Mac、main-server、FOX WSL2 の実 Codex CLI では lifecycle を受入。FOX Windows native は既知の Codex CLI toolchain blocker のため未達。

## 3入口の実測

各入口で同じ新規 Codex CLI sessionを開き、ファイル変更やtool実行を行わない4 turnを実行した。

| host | Codex session | turn 1 | 同session turn 2 | `/compact` 後 | compact後 turn 2 | repo変更 |
|---|---|---|---|---|---|---|
| Mac | `019f8136-44c0-7ba3-933e-8a85c09f2ac4` | INFO後 `CF0149_TURN1_OK` | INFOなし、`CF0149_TURN2_OK` | INFO再配送後 `CF0149_POST_COMPACT_OK` | INFOなし、`CF0149_POST_COMPACT_SILENT_OK` | lifecycle probeによる変更なし |
| main-server | `019f8136-47d2-7251-8af3-d50db678675e` | INFO後 `CF0149_TURN1_OK` | INFOなし、`CF0149_TURN2_OK` | INFO再配送後 `CF0149_POST_COMPACT_OK` | INFOなし、`CF0149_POST_COMPACT_SILENT_OK` | clean |
| FOX WSL2 | `019f8136-4e59-7641-86bd-7bcf4d278ee2` | INFO後 `CF0149_TURN1_OK` | INFOなし、`CF0149_TURN2_OK` | INFO再配送後 `CF0149_POST_COMPACT_OK` | INFOなし、`CF0149_POST_COMPACT_SILENT_OK` | clean |

各session transcriptには `type: compacted` と `context_compacted` eventが1件あり、その後の最初のturnだけUserPromptSubmit onset INFOが再配送された。Macの作業tree差分はLatticeのtask start eventだけであり、ユーザー所有の未追跡 `docs/evidence/fixtures/`には触れていない。

## 既存証拠との合成

- Stop pendingの次回1回配送とdirty→clean cleanup表示は [ADR 0107](../adr/0107-cf0283-stop-pending-cleanup-acceptance.md) でfocused smoke済み。
- 4 hostへのhook安全配布とWindows nativeでのcallout実火は [ADR 0074](../adr/0074-codex-hook-cross-host-acceptance.md) で受入済み。
- 代表skill、Throughline handoff、model・effort明示のgpt-connector consultationとtimeout後session回収は [ADR 0075](../adr/0075-r2-new-session-routing-and-connector-acceptance.md) の既存実測を再利用する。
- main-server App Remoteの初回配送・同session 2回目沈黙は [ADR 0105](../adr/0105-cf0216-main-server-remote-acceptance.md) で受入済み。

## 未達と境界

FOX Windows nativeのcompact再武装を含む新規session lifecycleだけが未達である。既存 `cf-0092` のCodex CLI models cache/toolchain blockerを解消せず、他入口の成功をWindows nativeへ代用しない。

Lattice製品は変更していない。廃止済み`codex-rc`は実行・調査・復旧していない。Mac起動時に表示された第三者MCPの起動失敗はdotagents所有adapterの欠陥と確認されていないため、本taskやmaintenance queueへ混ぜない。
