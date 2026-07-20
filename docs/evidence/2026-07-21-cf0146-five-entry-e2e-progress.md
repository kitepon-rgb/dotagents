# cf-0146 現役5入口の新規session E2E進捗

- 実施日: 2026-07-21
- 対象: `codex-full-support/cf-0146`
- 入口正本: [Codex全対応計画 §8](../plan_codex-full-support.md#8-端末台帳)
- 結論: tracked証拠だけでは完了入口は0/5。4入口は一部の面だけ実測済み、FOX Windows native CLIは基盤toolchain blockerにより追加でblocked。

## 入口別の証拠

| 入口 | AGENTS | SKILLS | HOOKS | SESSIONS | Spotter | 判定 |
|---|---|---|---|---|---|---|
| Mac 対話CLI | 実読済み | 明示・暗黙invocation済み | lifecycle済み。入口固有PreToolUse/Stop pendingなし | resume済み。Throughline restore mismatch | 新規session IDとのevent相関なし | `partial` |
| main-server 対話CLI | 直接記録なし | tracked ADRは要約止まり | lifecycle済み。入口固有Stop pendingなし | Throughline handoffなし | 同session時間窓のevent相関あり | `partial` |
| main-server App Remote | 直接記録なし | skill/routing実火 | Stop pending済み。compact再武装なし | host shell handoffのみ、restore未達 | Remote thread IDとのevent直接相関なし | `partial` |
| FOX WSL2 対話CLI | 直接記録なし | tracked ADRは要約止まり | lifecycle済み。入口固有PreToolUse/Stop pendingなし | Throughline handoffなし | 新規promptのevent実火済み | `partial` |
| FOX Windows native 対話CLI | 未回収 | skillsだけ部分回収 | dotagents calloutだけ実火 | resume未達 | 新規Codex event未達 | `blocked` |

主要な直接証拠は次のとおり。

- Mac新規session 6面: [ADR 0093](../adr/0093-cf0023-new-codex-session-acceptance.md)
- Mac skill明示・暗黙invocation: [ADR 0102](../adr/0102-cf0106-skill-invocation-acceptance.md)
- main-server App Remote: [ADR 0105](../adr/0105-cf0216-main-server-remote-acceptance.md)
- main-server CLI runtime: [runtime receipt](2026-07-21-cf0216-main-server-codex-cli-runtime.json)
- WSL2 baselineとWindows境界: [ADR 0099](../adr/0099-cf0092-partial-baseline-and-windows-blocker.md)
- Mac・main-server・WSL2 hook lifecycle: [cf-0149 progress](2026-07-21-cf0149-codex-hook-lifecycle-progress.md)
- Mac・main-server・WSL2 Spotter: [cf-0150 progress](2026-07-21-cf0150-spotter-cross-host-progress.md)

## 未達と境界

FOX Windows nativeではCodex CLI 0.144.6のmodels cache schema error後に同一新規sessionのresumeが完了せず、agents・MCP・hooksの直接証拠を回収できない。既存`cf-0092`がこのblockerを所有する。基盤toolchain本体はdotagentsの修理・maintenance登録対象外である。

Windows以外も入口固有の不足を持つ。汎用focused smoke、別入口、累計ledger、trackedでないworker receiptを合格証拠へ代用しない。したがって`cf-0146`全体をWindowsだけのblockerとして過小評価せず、上表の不足をすべてblock理由へ残す。

Lattice製品は変更していない。廃止済み`codex-rc`は実行・調査・復旧していない。ユーザー所有の未追跡`docs/evidence/fixtures/`は読まず、変更・stageもしない。
