# ADR 0076: R2端末状態分類台帳

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `factory-master/fm-0586`
- Inputs: [ADR 0072](0072-r2-four-host-rollout-receipt.md)、[ADR 0074](0074-codex-hook-cross-host-acceptance.md)、[ADR 0075](0075-r2-new-session-routing-and-connector-acceptance.md)

## Decision

現役4 hostの状態を、`verified`、`H-completed`、`H-authorized-pending`、`optional`、`unsupported`、`actionable-failure`へ分離する。H操作が包括承認済みであることと、実行・検証済みであることを同一視しない。`optional`や`unsupported`をgreenへ丸めず、actionable failureはToDo単位でLattice maintenance laneへ登録する。

## 分類語彙

| 状態 | 意味 |
|---|---|
| `verified` | 対象hostで実行し、期待結果を証拠化済み |
| `H-completed` | UI承認・host設定・外部操作を実行し、結果とrollbackを記録済み |
| `H-authorized-pending` | オーナー承認はあるが、後続工程でまだ実行していない |
| `optional` | 契約上なくても合格。未認証・未導入理由を保持する |
| `unsupported` | そのhost / entry / versionでは構造的に非対応。欠落やpassへ変換しない |
| `actionable-failure` | 対応可能な欠陥または設定不整合。所有taskを必ず持つ |

`blocked`は依存または外部条件により着手不能な状態だけに使う。単なる未実施、任意、非対応、承認済み未実行には使わない。

## host ledger

| host / entry | verified | H-completed | H-authorized-pending | optional / unsupported | actionable-failure |
|---|---|---|---|---|---|
| Mac Codex / Claude | official install、Codex hook実火、3 role routing、gpt_connector consult回収、thread handoff、Spotter project event | Claudeの`gpt_connector.sessions`を今回のみ許可、VS Code新thread deep link | scheduler定常運用等の`fm-0593`後続H | managed Claude launcherのisolated settingsではhost MCPを検証しない。Claude bannerの認証待ちMCP 3件は今回のrequired面外 | Spotter `SessionEnd / E_UNREACHABLE`=`fm-0647`、Claude既定model不整合=`fm-0648` |
| main-server Ubuntu | official install、Codex hook、3 role routing、parent verifier、factory gate | 適用前backupとhost config反映 | scheduler / canary等の後続H | 個別UI trustを機械検証できない面は`unverified`のまま保持 | 現critical-pathを塞ぐfailureなし |
| FOX WSL2 Ubuntu | official install、明示model V2 sessionで3 role routing、callout実火、Windowsアプリ選択再発なし | hook再有効化と実host smoke | scheduler / rollback drill等の後続H | 端末既定`gpt-5.5`の`multi_agent_v1`はV2 canonical agent path受入に`unsupported`。既定modelはオーナー領分なので変更しない | 外部stale hookの`MODULE_NOT_FOUND`=`fm-0646` |
| FOX Windows native | official install、PowerShell `&` canonical dotagents hooks、state生成、3 role routing | Codex hook trust再承認、config backup | scheduler / BugHub canary等の後続H | Lattice runtimeはWindows nativeで構造的`unsupported`。CLI presenceと混同しない | Throughline hook=`fm-0649`、Spotter hook=`fm-0650`、Caveat hook=`fm-0651`、`node_repl` WSL path=`fm-0652`、models cache drift=`fm-0653` |

## Windows実測の分離

FOX Windows nativeのCodex 0.144.6で新規read-only sessionを実行した。dotagents calloutは`Completed`だったが、UserPromptSubmit / Stopの他3 hookは`Failed`だった。`hooks.json`を照合すると、Throughline、Spotter、CaveatのNode commandは先頭のquoted executableへPowerShell call operator `&`を持たず、dotagents canonical commandだけが`&`を持っていた。3製品を1件の曖昧なWindows問題へまとめず、所有repo別taskへ分けた。

同sessionではmodels cacheの`supports_reasoning_summaries`欠落とrefresh child process timeoutも再現した。`codex mcp get node_repl`はWindows native上でcommandを`/mnt/c/.../node_repl.exe`と報告した。これらもhook failureと混ぜず、別taskで追跡する。

## H・blockedの現在地

オーナーは本campaignのH操作を承認済みだが、未実行のscheduler、rollback drill、BugHub canary、outbox復旧、全host E2Eは`H-authorized-pending`である。`fm-0593`は本ADR作成時点まで`fm-0586`依存でactive / unmetだった。`fm-0586`完了後は依存が解けるため、blockedとして固定せず次の実行工程へ進める。

## 受入

- hostごとの実施・H・optional・unsupported・failureが同じ列へ混在していない。
- actionable failure 8件は`fm-0646`〜`fm-0653`としてLatticeへ登録済み。
- live Markdown checkboxへ工程状態を戻していない。archive ledgerはnarrative参照のみで、状態正本はLatticeである。
- `lattice todo verify`はstate event反映後に再実行して閉じる。
