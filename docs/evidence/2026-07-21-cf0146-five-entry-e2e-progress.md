# cf-0146 現役5入口の新規session E2E受入

- 実施日: 2026-07-21
- 対象: `codex-full-support/cf-0146`
- 入口正本: [Codex全対応計画 §8](../plan_codex-full-support.md#8-端末台帳)
- 結論: 5/5入口でAGENTS・SKILLS・HOOKS・SESSIONS・Spotter監査を入口固有に確認した。

## 入口別結果

| 入口 | AGENTS / SKILLS | HOOKS | SESSIONS | Spotter | 判定 |
|---|---|---|---|---|---|
| Mac 対話CLI | ベル・日本語、公式skill面と明示/暗黙invocation | lifecycle全契約green | 新規・resume、closed session restore 2 cycleとも5/5/5 | Codex event実火、parse/runtime errorなし | `accepted` |
| main-server 対話CLI | session `019f81ce-8f43-7b53-b376-8bdcef297d9e`で実読 | 4/4/4、エラーなし | Throughline ready/current thread一致 | event 113、Codex 60、parse/runtime error 0 | `accepted` |
| main-server App Remote | thread `019f8058-c640-7b11-b51a-14b9b920e892`で実読・skill明示/暗黙実火 | trusted、UserPrompt/Stop実火 | multi-turn継続、Stop capture、context refresh ready | Spotter developer context配送をtranscriptで確認 | `accepted` |
| FOX WSL2 対話CLI | session `019f81c9-41c0-7412-9bfe-8404c673a7d5`で実読 | 4/4/4、エラーなし | Throughline ready/current thread一致 | event 61、Codex 15、parse/runtime error 0 | `accepted` |
| FOX Windows native 対話CLI | session `019f81e1-6914-7a12-a855-f3cb2f153d00`でベル・日本語と6 skill実読 | 4/4/4、SessionStart完了、timeout/invalid JSON再発なし | 新規sessionとresume IDを回収 | v1.4.28、event 42、parse/runtime error 0 | `accepted` |

## Windows blockerの解消

旧Windows sessionではSpotter SessionStartの5秒超過と、dotagents Lattice案内の非ASCII JSONが
同時に失敗していた。次の所有境界で修理した。

- Spotter `1.4.28` (`c137c3e`): SessionStart timeoutを30秒へ変更し、旧5秒設定を診断・再installで正規化。
  local 533 tests（531 pass / 2 platform skip）、68-file pack、GitHub Actions run `29787330046` 6/6、
  npm `latest`、tag / GitHub Release、4 host配布を確認した。
- dotagents `dd08248`: `lib/lattice-hook.py`のCodex JSONをASCII安全化し、hook smokeを更新。
  Windowsには最終dotagents push前の同一差分を先行配布したため、cloneは当該1ファイルだけ一時dirtyである。
  最終push後のpullで同一blobへ収束する。

修理後のWindows新規sessionでは、起動時に`SessionStart hook (completed)`を確認し、旧
`hook timed out after 5s`と`invalid session start JSON output`はどちらも出なかった。read-only E2Eは
`CF0146_WINDOWS_E2E_1428_OK`で完了した。

## 証拠境界

- App Remoteはmain-server上のrollout JSONLを直接検索し、同一threadのAGENTS/skill実読、trusted hooks、
  Throughline current thread/DB一致、Spotter context、multi-turn完了を確認した。UI上のINFO可視性だけを
  合格条件へ過大拡張していない。
- deeperなThroughline capture/restore/handoff品質は代表試験`cf-0125`が所有する。各入口の
  `SESSIONS`は新規sessionの成立、継続、入口で利用可能なcapture/context相関を確認した。
- Lattice製品は変更していない。廃止済み`codex-rc`は実行・調査・復旧していない。
- ユーザー所有の未追跡`docs/evidence/fixtures/`は読まず、変更・stageしていない。
