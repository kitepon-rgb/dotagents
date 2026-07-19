# R2 Wave 2 四ホスト read-only 基線 receipt（2026-07-19）

## 対象と境界

- Lattice task: `fm-0580`
- Control: `r2-host-rollout-20260718`
- 対象: Mac、main-server、FOX WSL2、FOX Windows native
- この receipt は変更前の read-only 観測だけを固定する。remote の `git fetch` / pull、global install、symlink 再配布、config apply、Spotter install、hook trust は未実施。

## 正規接続経路

| host | 正規入口 | repository |
|---|---|---|
| Mac | local | `/Users/kite/Developer/dotagents` |
| main-server | `ssh main-server` | `/home/kite/Developer/dotagents` |
| FOX WSL2 | `ssh -J windows-workstation fox-wsl` | `/home/kite/Developer/dotagents` |
| FOX Windows native | `ssh windows-workstation`。shell script は `C:\Program Files\Git\bin\bash.exe -lc` で実行 | `C:\Users\kite_\Documents\Program\dotagents` |

旧入口 `ssh kite@ubuntu`、`ssh -J windows fox-wsl`、`ssh windows` を用いた既存 worker run の接続失敗は製品不良ではなく route 不一致である。上表の正規入口では三ホストとも到達した。

## 観測結果

基線時点の GitHub `origin/main` は `81163cbc2338eb6acbb5ed7bab0c884a9726905b`。

| host | Git / worktree | 配布・CLI | config / verify | 判定 |
|---|---|---|---|---|
| Mac | HEAD=`81163cbc...`、origin/main一致。ユーザー所有の `codex/rules/default.rules` だけdirty | `lattice` 0.6.5を含む現行配布 | `apply-codex-config --dry-run` 差分0、`verify-install --profile official` OK、`lattice factory-diagnostics --json` 5 checks OK | `required: accepted`。dirtyファイルは本wave対象外として保全 |
| main-server | HEAD=`d53bd55f...`。worktree clean、stashなし、shallow=false。remote fetch前のため追跡表示0/0は鮮度証拠に使わない | 既存core CLIとMarkItDownあり。`lattice`および新しい配布script群なし | dry-runはcanonical advisory等の追加差分、verify FAIL | `required: update needed` |
| FOX WSL2 | HEAD=`f30f14f7...`。worktree clean、stashなし、shallow=false。login shellでは既存core CLIとMarkItDownを確認 | `/home/kite/.npm-global/bin` に既存core CLI。`lattice`なし | dry-runはcallout/advisory追加差分、verify FAIL。ただしcallout/advisory欠落は既知interop対策による意図的状態 | repo/Lattice/symlinkは`required: update needed`。callout/advisory再適用は`blocked: WSL2 interop安全化待ち` |
| FOX Windows native | HEAD=`f30f14f7...`。worktree clean、stashなし、shallow=false | `%APPDATA%\npm` に既存core CLI、uv/MarkItDownあり。`lattice`と新しい配布script群なし | Git Bash経由dry-runはcanonical hook順序とadvisory追加だけ、verify FAIL | `required: update needed` |

## WSL2 固有裁定

`docs/plan_callout-hooks.md` に記録された Windows の「アプリ選択」ダイアログ無限増殖を再発させないため、FOX WSL2 の Codex callout/advisoryは意図的に無効のまま維持する。`apply-codex-config` が interpreter 明示起動またはnode shimへ安全化され、Windowsダイアログ非発生の実火が確認されるまでは、dry-runに差分が出ても無条件applyしない。この欠落だけを `fm-0580` の通常install失敗へ混同しない。

## 次のH操作境界

三remote hostで必要なのは、最新remote取得とfast-forward確認、現行repository反映、`@quolu/lattice@0.6.5` global install、official profile再配布、期待差分だけのconfig apply、Spotter project install、その後のfocused diagnosticsである。WSL2のcallout/advisory、hook trust、新規対話session、scheduler変更はこの非対話waveから除外する。

rollbackは、config applierが作るbackupからの復元、Lattice未導入hostではglobal uninstall、symlinkは更新前commitの`install.sh`による再配布を基本とする。repository履歴を戻す必要が生じた場合は別途対象commitと方式を提示し、破壊的なresetを自動実行しない。
