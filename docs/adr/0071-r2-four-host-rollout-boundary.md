# ADR 0071: R2四ホストrolloutの変更境界とWSL2例外

**Date**: 2026-07-19  
**Status**: Accepted

## Context

Lattice `factory-master` task `fm-0580` は、Mac、main-server、FOX WSL2、FOX Windows nativeを一回のR2 campaignとして現行配布版へ揃え、install/config/routing/hook/MCP/Throughline/factory reporterをhost別に受け入れる。read-only基線は `docs/r2-wave2-four-host-baseline-20260719.md` に固定した。

三remote hostは正規SSH routeで到達可能だが、repository HEADがGitHub最新より古く、Lattice 0.6.5と現行配布scriptがない。FOX WSL2ではCodex callout/advisoryのshell hookがWindows interop経由で「アプリ選択」ダイアログを増殖させる既知問題があり、当該hookは意図的に無効化されている。

## Decision

1. 三remote hostの変更は、同じ親がhostごとに直列実行する一回のH waveとして扱う。各hostで変更前にworktree clean、stashなし、shallow=falseを再確認し、`git fetch`後にfast-forward可能な場合だけ現行`origin/main`へ更新する。dirty、diverge、credential失敗はそのhostで停止し、別経路へfallbackしない。
2. 各remote hostへ正規のpackage manager面から`@quolu/lattice@0.6.5`をglobal installし、repositoryの`install.sh --profile official`と`spotter install -y`で配布面とproject markerを更新する。
3. main-serverとFOX Windows nativeは、更新後の`apply-codex-config.sh --dry-run`が正規routing・callout・advisory・Lattice hookだけの差分であることを確認してから、backup付き`--apply`を実行する。想定外差分が一件でもあればapplyしない。
4. FOX WSL2では`apply-codex-config --apply`を実行しない。routingの現状をread-only確認し、callout/advisory/Lattice shell hookの欠落を`blocked: WSL2 interop安全化待ち`としてreceiptへ明示する。`required`なrepository/Lattice/symlink/Spotter更新と、この`blocked`項目を混同しない。
5. 更新後はhostごとに`verify-install`、config dry-run、Lattice versionと`factory-diagnostics --json`、Codex MCP、Spotter diagnostics、Throughline doctor、factory reporterのread-only診断を実行する。optional認証、unsupported platform、意図的blockedは理由付きで分類し、greenへ偽装しない。
6. Macは現行配布版のread-only受入済みとし、ユーザー所有の`codex/rules/default.rules`を変更・stage・commitしない。

## H境界

remoteのfetch/pull、global NPM install、symlink再配布、home config apply、Spotter installは外部状態を変更するため、目的・影響・rollbackを提示した直後のオーナー承認後だけ実行する。hook trust、新規対話session、scheduler変更、publish、pushはこのH waveに含めない。

## Rollback

- configはapplierが生成したbackupから復元する。
- Lattice未導入hostはglobal uninstallで変更前へ戻す。
- symlinkは更新前commitの`install.sh --profile official`を明示承認された回復操作として再実行する。
- repository履歴を戻す必要がある場合は対象commitと方式を改めて提示し、`git reset --hard`等の破壊的操作を自動実行しない。

## Consequences

WSL2の既知interop欠陥を隠さず、同時に安全な配布更新まで止めずに`fm-0580`のhost別受入を進められる。interactive hook実火やWSL2 hook再有効化は、それぞれ依存関係を持つ後続taskで閉じる。
