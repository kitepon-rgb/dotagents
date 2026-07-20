# ADR 0096: cf-0026 四ホスト再現可能rollout境界

## 状態

実行境界を確定

## Decision

Lattice task `cf-0026` は、現役4 host（Mac、main-server、FOX WSL2、FOX Windows native）で、
既存cloneを起点に次の一連を同じrevisionから再現し、host別の直接証拠で受け入れる。

1. `git fetch`後のclean・branch・upstream・divergence確認と`git pull --ff-only`
2. `./install.sh --profile official`による正規symlink配布
3. `apply-codex-config --dry-run`で対象を限定した後の必須Codex設定適用
4. `spotter install -y`によるdotagents project marker・hook・catalog配線
5. `verify-install --profile official`、routing、Spotter、factory diagnostics、代表read-only E2E

cloneが存在しない、dirtyまたはdivergeしている、実ファイルと配布先が衝突する、dry-runが契約外の設定を示す、
credentialが不足するhostでは強行せず停止する。既存cloneの削除・移動・再cloneは行わない。

## Parallel placement

変更前監査はhost間で独立したread-only作業なので、routing確認済みnative sorter 4件へ並行委譲する。
workerはrepo、home設定、remote refsを変更せず、観測結果だけをWorker Reportへ返す。
`fetch`、`pull`、install、config適用、Spotter installは包括H承認を持つ親だけがhost別の前提確認後に行う。

## 対象外

- Lattice製品・repoの修理または改良。欠陥を見つけた場合はdotagentsの既存工程ToDoへ一度だけ記録する
- 廃止済み`codex-rc`の利用、探索、導入、設定、復旧、検証。履歴はGitHubだけに残す
- 独立Codegraphの導入またはfallback
- Codexのmodel、effort、permission、OAuth、hook trustの変更
- ServerManager / BugHub、全skill実火、Throughline capture/restore/handoffの別task受入
- ユーザー所有の未追跡`docs/evidence/fixtures/`

## H操作とrollback

親は各hostで目的、影響、戻し方を明示してから、cleanかつfast-forward可能なcloneだけを更新する。
Codex設定はapplierが作るbackupを保持し、差分が正規のrouting 2キー、dotagents callout hook 4イベント、
SessionStart advisoryとLattice工程案内に限定される場合だけ適用する。Spotter配線はSpotter自身のinstallerに所有させる。

問題時は履歴改変や暗黙fallbackを行わない。repoは直前revisionを特定して正規のrevertまたは再rolloutを行い、
home設定はhost別backupから対象ファイルだけを復元する。symlinkは受入済みrevisionの`install.sh`で再配布する。

## 完了判定

4 hostすべてについて、同一dotagents revision、official profile、必須設定、Spotter project配線、
`verify-install`と代表E2Eがgreen、またはhost matrixで定義済みの明示的非適用であることを示す。
未観測、古い証拠、actionable failureをgreenへ丸めない。最終的にfocused/related gate、`make ci`、
GitHub Actionsを通し、受入ADRとtyped evidenceをLattice taskへ結び付ける。
