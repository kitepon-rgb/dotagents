# ADR 0072: R2 4ホスト rollout 受入記録

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `factory-master/fm-0580`
- Boundary: [ADR 0071](0071-r2-four-host-rollout-boundary.md)
- Control: `r2-host-rollout-20260718`

## Decision

Mac、main-server、FOX WSL2、FOX Windows nativeを一回のR2 campaignとして検証し、ADR 0071の境界どおり受け入れる。WSL2のCodex hookはinterop安全性の既知blockを維持しておりgreenではない。hook再有効化と対話session実火は後続taskで扱うため、この意図的blockを`fm-0580`の失敗へ偽装せず、host別結果として固定する。

## 受入結果

| host | dotagents | install/config | Lattice | Caveat | Throughline | `gpt_connector` | 判定 |
|---|---|---|---|---|---|---|---|
| Mac | `8365e4f`, origin差分`0/0` | `verify-install` green、config dry-run差分0 | `0.6.6`, overall `ok` | `0.17.0`, ready | `0.8.1`, schema v9, ready | enabled | accepted。ユーザー所有`codex/rules/default.rules`は未stage・未変更 |
| main-server | `8365e4f`, origin差分`0/0` | green、差分0 | `0.6.6`, overall `ok` | `0.17.0`, ready | `0.8.1`, schema v9, ready | enabled | accepted |
| FOX WSL2 | `8365e4f`, origin差分`0/0` | Codex必須hook 6件だけ既知block、config dry-runは93行の未適用差分 | `0.6.6`, overall `ok` | `0.17.0`, ready | `0.8.1`, schema v9, ready | enabled | accepted with explicit block |
| FOX Windows native | `8365e4f`, origin差分`0/0` | green、差分0 | `0.6.6`, overall `ok` | `0.17.0`, ready | `0.8.1`, schema v9, ready | enabled | accepted |

4ホストすべてでregistry版`aiterm-mcp@0.19.2`を導入し、WindowsのPTY未起動時診断を`not_applicable`ではなく`null`へ戻した公開契約を確認した。製品repoの公開証拠はaiterm-mcp `e888d07`、LatticeのWindows URL修正と公開は`75e1899` / `@quolu/lattice@0.6.6`である。

## updater証拠

- Mac final report: `5c7cd723-8792-455e-b3e3-86a4de9e27f5`
- main-server post gate / final: `c644bc05-3ce7-4a5a-8460-4b28ed6d96c6` / `b1685310-e04f-4895-83f3-96b2ee4ecc64`
- FOX Windows post gate / final: `c9f17328-e0b7-4d7f-b6a2-6d63d8460858` / `956c130b-c1c8-4541-98bd-e1af2c0b969b`
- FOX WSL2 final: `e998b900-1a2e-4ff1-a107-07014234e84d`。失敗理由は既知のCodex hook blockであり、製品診断は上表のとおりgreen。

## 作業中に判明したmaintenance

Throughlineのschema更新では、package更新直後のfactory gateより前に製品所有の明示migration経路を実行できず、初回`agents-update`が失敗した。今回は各hostのDB/WAL/SHMを退避後に`throughline status`でv8からv9へ正規migrationしたが、再発防止はLattice-native maintenance taskとして追跡する。

退避物はmain-server `/home/kite/Archives/throughline-v8-before-v9-main-server-20260719T153327Z.tar.gz`、FOX WSL2 `/home/kite/Archives/throughline-v8-before-v9-fox-wsl-20260719T153328Z.tar.gz`、FOX Windows `/c/Users/kite_/Archives/throughline-v8-before-v9-fox-windows-20260719T153328Z.tar.gz`。復旧時はThroughline停止後に対象hostの退避物を展開し、v8対応版へ戻す。

## 受入条件との対応

ADR 0071が要求するfetch/pull、global install、symlink/config、MCP、Throughline、factory reporterのread-only診断をhostごとに実行した。optional・unsupported・意図的blockedを分類し、WSL2 hookをgreenへ偽装していない。interactive hook実火、scheduler、Oracle rollback、BugHub canary、outbox復旧はこのwaveの非目標で、Lattice上の依存付き後続taskが所有する。
