# 開発工場 全文書同期 最終証拠

- 記録日: 2026-07-26
- 対象: dotagents、自作コア10製品
- 工程: Lattice `factory-master` / `fm-0680`〜`fm-0686`
- Control: `factory-documentation-sync-20260726`

## 所有境界

- 開発工場はdotagents。
- 自作コア10製品はCaveat、Throughline、Spotter、Lattice、gpt-connector、
  aiterm-mcp、codex-sidecar、AIShell、Observer、ServerManager。
- MarkItDownは公開CLIだけをblack-box管理する第三者製品。
- BugHubはServerManager内部コンポーネントであり、独立製品ではない。
- CodeGraphの機能はLatticeが吸収済みであり、独立CodeGraphは現役製品に含めない。

## repo別着地

| repo | `main` の着地commit |
|---|---|
| dotagents | `22ff4dc` |
| Caveat | `08d99e1` |
| Throughline | `aa2b653` |
| Spotter | `318f55c` |
| Lattice | `d9abe33` |
| gpt-connector | `9bb33b7` |
| aiterm-mcp | `22b378b` |
| codex-sidecar | `5d2b614` |
| AIShell | `db26121` |
| Observer | `7b141ad` |
| ServerManager | `2ee247c` |

2026-07-26の最終監査で、全11 repoは`main`、`origin/main`に対してbehind 0 / ahead 0、
worktree dirty 0、stash 0だった。

## 欠陥修理と公開

Lattice manifest v2で後継revisionを作った直後、`active_revision_digest`が先行revisionを
指したままになり、`manifest_revision_binding_mismatch`を起こす欠陥を修理した。

- 修理commit: `9f59932`
- version commit: `93730d0`
- 公開version: `@quolu/lattice@0.12.28`
- npm integrity:
  `sha512-51DYeTgq/RcZgMw+xk3GG4sOSQIt41SbmCS7ivhm8LoJfA0D6b6eARWAQM/tx4J5EH/zUPv/F7gOD8dDNjdg5w==`
- tag / GitHub Release: `v0.12.28`
- global smoke: `lattice --version`が`0.12.28`、Latticeとdotagentsで
  `lattice status --json`が成功

## 検証

- Lattice focused / related test: 30件成功
- Lattice `npm run ci`: product 90 suites成功、sensor 139 files成功・3 skipped、
  2192 tests成功・37 skipped、syntax / project identity成功
- dotagents変更Markdown相対リンク検査: 全11 repoで成功
- dotagents `make lint`: 272 Markdown files成功
- dotagents focused cutover test: 5件成功
- dotagents `make ci`: 成功
- 最終Lattice cutover test: 9件成功
- `lattice-todo-inventory --verify-cutover`:
  `source_count=2`、`checkbox_count=0`
- `lattice todo verify --plan factory-master --json`:
  `snapshot_stale=false`、`reconciliation_state=reconciled`

## 統制

Control `factory-documentation-sync-20260726`は全phase gateとDecision証拠を記録後に
finalizeし、record revision 14で`archived`へ遷移した。

履歴文書は当時の記録として書き換えず、現役正典・README・進行文書・検証契約だけを
現在状態へ同期した。
