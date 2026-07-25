# 工場全文書同期・コア製品修理証拠

- 日付: 2026-07-26
- 対象: dotagents、自作コア10製品
- 管理区分: 自作コア10製品＋第三者管理製品MarkItDown＋基盤toolchain 3件
- 工程正本: Lattice `factory-master` fm-0680〜fm-0686
- 裁定証拠: ADR 0126、Control `factory-documentation-sync-20260726`

## 基準と棚卸し

全11repoで`git fetch origin`、branch、ahead/behind、dirty、stash、各repoの
AGENTS.md／CLAUDE.md、package version、最新tagを確認した。開始時に所有者不明のdirtyや
stashはなく、aiterm-mcpとServerManagerだけを`--ff-only`で最新mainへ追従した。

現役文書の主なdriftは次のとおりだった。

- dotagents READMEとproject layoutが旧8製品にMarkItDownを混在させ、
  AIShell／Observer／ServerManagerを落としていた。
- Caveat／Throughline／Spotter／gpt-connectorの公開version・release状態が古かった。
- aiterm-mcpは0.19.2公開後も0.18.1とClaude live承認待ちを現役状態としていた。
- codex-sidecarは独立CodeGraphの導入・利用を現役導線としていた。
- ObserverのThroughline要件は最低版だけが現行版に見える表記だった。
- ServerManagerの現役wire v6 fixed14とBugHubの製品内所有境界が入口文書から不明瞭だった。
- 完了済みWave 3 checklistが`docs/`直下に残っていた。

ADR、受入証拠、archive、旧wire契約、Lattice内の未配布上流sensor資料は当時の事実を
保持する履歴面なので、現行状態へ書き換えず、現役文書との境界だけを明示・維持した。

## repo別反映とpush

| repo | commit | 反映 |
|---|---|---|
| Caveat | `08d99e1` | 工場境界、0.17.1公開状態 |
| Throughline | `aa2b653` | 工場境界、0.8.7公開状態、Observer feed完了 |
| Spotter | `318f55c` | 工場境界、1.4.28公開状態 |
| Lattice | `eaa6b8a`, `9f59932`, `93730d0`, `d9abe33` | 工場境界、manifest v2修理、0.12.28、廃止名gate |
| gpt-connector | `9bb33b7` | 工場境界、0.4.9、wire v6 fixed14 |
| aiterm-mcp | `22b378b` | 工場境界、0.19.2、Claude live受入完了 |
| codex-sidecar | `5d2b614` | 工場境界、Lattice sensor正規導線 |
| AIShell | `db26121` | 工場境界と対応host |
| Observer | `7b141ad` | 工場境界、Throughline `>=0.6.3`／現行0.8.7 |
| ServerManager | `2ee247c` | 工場境界、BugHub内部所有、wire v6 fixed14 |

10製品の各commitは個別に`origin/main`へ通常push済み。force、履歴改変、未所有変更の
巻込みは行っていない。

## 発見したコア欠陥と公開

Lattice 0.12.27のmanifest v2 storeでsuccessor revisionを通常適用すると、
manifest memberの`active_revision_digest`だけがpredecessorを指したまま残り、直後の
readが`manifest_revision_binding_mismatch`で停止した。`applyTodoRevision`がmanifest v2で
新revision digestを同じactivationへ書くよう修理し、専用回帰を追加した。

- focused: 1/1 pass
- related `test/todo-revision-writer.test.mjs`: 30/30 pass
- `npm run ci`: rc=0。製品90 suite、sensor 139 files／2,192 tests pass、
  syntax・project identity pass
- npm: `@quolu/lattice@0.12.28`, `latest=0.12.28`
- integrity:
  `sha512-51DYeTgq/RcZgMw+xk3GG4sOSQIt41SbmCS7ivhm8LoJfA0D6b6eARWAQM/tx4J5EH/zUPv/F7gOD8dDNjdg5w==`
- Git tag／Release: `v0.12.28`
- global install: `lattice --version` = `0.12.28`
- 公開後smoke: dotagentsとLatticeで`lattice status --json`がtyped stateを返した

rollbackはnpmをunpublishせず`latest`を0.12.27へ戻し、対象端末へ0.12.27を再installする。

## 文書gate

- 全11repo: `git diff --check` pass
- 変更Markdownの相対link検査: 全11repo pass
- 現役面の旧製品数、MarkItDown誤分類、独立CodeGraph導線、失効承認待ちを再検索
- dotagents `make lint`: markdownlint 272 filesを含めrc=0
- Latticeのactive contract廃止名gate: pass

dotagentsの最終`make ci`、Control finalization、fm-0686完了、最終clean／ahead-behind監査は
最終証拠へ分離する。
