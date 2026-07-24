# ADR 0097: cf-0026 四ホスト再現可能rollout受入

## 状態

受入済み

## Decision

ADR 0096の境界に従い、現役4 host（Mac、main-server、FOX WSL2、FOX Windows native）で、
既存cloneから同じdotagents revisionを取得し、official profile配布、必須Codex設定、Spotter project配線、
install検証、代表E2Eを再現できたため、Lattice task `cf-0026` を完了とする。

| host | clone / pull | install | 必須Codex設定 | Spotter | 代表E2E |
|---|---|---|---|---|---|
| Mac | HEAD / originとも`7a82e517`、既にcurrent | official green | post dry-run差分なし | install、doctor 0 warnings、3 hooks canonical | wire-v4 5/5、Lattice overall ok、Throughline ready |
| main-server | `8bd00cff`から`7a82e517`へff-only | official green | post dry-run差分なし | install、doctor 0 warnings、3 hooks canonical | wire-v4 5/5、Lattice overall ok、Throughline ready |
| FOX WSL2 | `8bd00cff`から`7a82e517`へff-only | official green | login環境でpost dry-run差分なし | install、doctor 0 warnings、3 hooks canonical | wire-v4 5/5、Lattice overall ok、Throughline ready |
| FOX Windows native | `8bd00cff`から`7a82e517`へff-only | official green | deprecated `features.codex_hooks` 1行をbackup付き除去、post dry-run差分なし | install、doctor 0 warnings、3 hooks canonical | wire-v4 5/5、Lattice overall ok、Throughline ready |

4 hostとも最終HEADと`origin/main`は`7a82e517c9087a15d092caef3c5112b630136353`で一致した。
main-server、FOX WSL2、FOX Windows nativeは最終作業ツリーとstashが空である。Macは本taskのLattice状態、
ADR 0096〜0097とユーザー所有の未追跡`docs/evidence/fixtures/`だけを保持し、rollout由来の不明変更はない。

## 設定とrollback

Mac、main-server、FOX WSL2の`apply-codex-config --dry-run`は更新後差分なしだった。
FOX Windows nativeだけは旧`features.codex_hooks = true`の削除を示したため、その1行だけを正規applierで適用した。
backupは`C:\Users\kite_\Archives\dotagents-codex-config-20260720T103313Z.tar.gz`にあり、適用後dry-runは差分なしである。

Macの最初の並列post-gateではCodex TOML parserが10秒で一度timeoutした。直後に隔離HOMEで同じparserを実行すると
1.661秒、正規dry-run再実行もgreenで再現しなかったため、成功へ隠さず一過性の実測として記録する。
再発していない事象を新規欠陥やLattice欠陥へ読み替えない。

## Spotterと代表E2E

4 hostで`spotter install -y`を実行し、project marker、Claude 5 hooks、host別catalog、Codex 3 hooksを再生成した。
`spotter doctor`は全hostで0 warnings、Codex 3 hooksはinstalled / compatible / canonicalである。
remote 3 hostのruntime hook eventは新規session未発火のためnot-observedだが、実発火は同日ADR 0095の受入を保持し、
本taskではcloneからの配線再現とdiagnosticsを受け入れる。hook trust UIはmachine-verifiableでない別H面である。

代表E2Eとして、全hostで修正後revisionの`tests/lattice-cutover/wire-v4.test.mjs`を5/5 greenにし、
Lattice 0.8.0 native factory diagnosticsをoverall ok、Throughline 0.8.7をreadyとして直接観測した。
Spotter catalog探索中の第三者MCP 401 / 405 / spawn failureはcatalogへ明示記録されており、
dotagents配布、必須設定、Spotter自身のdoctor、wire-v4受入へ混ぜない。

## 禁止面

Lattice製品・repoは変更していない。Lattice不具合の強行修理も行っていない。
廃止済み`codex-rc`は利用、探索、導入、設定、復旧、検証のいずれも行わず、GitHub上の履歴だけを残した。
独立Codegraphも導入またはfallbackに使用していない。ユーザー所有の未追跡fixturesは読まず、変更せず、stageしない。

## 検証

- 4 host: HEAD / origin一致、remote 3 hostのstatus / stash空
- 4 host: `install.sh --profile official`、`verify-install.sh --profile official` green
- 4 host: `apply-codex-config.sh --dry-run` post差分なし
- 4 host: `spotter install -y`、`spotter doctor` 0 warnings、Codex 3 hooks canonical
- 4 host: wire-v4 focused test 5/5、Lattice overall ok、Throughline ready
- Mac: `make lint`、`make ci`、`git diff --check`
- GitHub Actions: push後の最終runで閉じる

## Rollback

Windows設定は上記tarから対象設定だけを復元できる。repo配布は直前revisionを特定した正規revertと
そのrevisionの`install.sh --profile official`で戻す。履歴改変、clone削除、暗黙fallbackは行わない。
