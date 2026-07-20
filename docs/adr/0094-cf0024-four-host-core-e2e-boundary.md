# ADR 0094: cf-0024 四ホスト・コア8製品E2E受入境界

## 状態

受入境界を確定

## Decision

Lattice task `cf-0024` は、現役4 host（Mac、main-server、FOX WSL2、FOX Windows native）について、
次の各面をhost別の直接観測または同日付の保持済みreceiptへ結び付けて受け入れる。

1. Caveat、Throughline、Spotter、MarkItDown、gpt-connector、aiterm-mcp、codex-sidecar、Latticeのpresenceとversion
2. `docs/factory-host-product-matrix.md`どおりのClaude親・Codex親connector状態
3. dotagents projectに限定したSpotter install / diagnostics / hook発火
4. Throughline contextと正規diagnostics
5. Lattice提供`codegraph_*`互換ABI、MarkItDown、gpt-connector、aiterm、sidecarの代表read-only E2E

既存ADR 0072、0073、0075、0076、0086と同日付の製品別evidenceは再利用できるが、古いversion・HEAD・
間接証拠を現在値へ読み替えない。不足はhost別に`verified`、`optional`、`unsupported`、
`H-authorized-pending`、`actionable-failure`へ分離する。

## Parallel placement

Mac、main-server、FOX WSL2、FOX Windows nativeの証拠収集は相互独立かつread-onlyなので、
routing確認済みnative sorter 4件へ並行委譲する。同一repo writerは存在せず、Lattice runは不要である。
各workerは正規host routeだけを使い、remote fetch/pull、package更新、config変更、hook実火、
ファイル編集、commit、pushを行わない。

親権限がsorterのread-only sandbox指定を上書きしているため、Packetで書込禁止を重ね、親がdispatch前後の
workspace状態とWorker Reportを照合する。placementが同一registry観測の複数候補を曖昧と判定した場合は、
次のrouting済み固定handleだけを親が選ぶ。

- `/root/cf0024_mac_audit`
- `/root/cf0024_server_audit`
- `/root/cf0024_wsl_audit`
- `/root/cf0024_windows_audit`

## 非目標

- ServerManager / BugHub連携（`cf-0025`）
- 全hostのclone/pullからの完全再現（`cf-0026`）
- 全Codex skill実火（`cf-0106`）
- Throughline capture/restore/handoff全体（`cf-0125`）
- Lattice製品・repoの変更
- 独立Codegraphまたは廃止済み`codex-rc`の利用・探索・復活

## H境界

read-only監査後にremote更新、global package更新、symlink再配布、home config適用、Spotter installが必要なら、
オーナーの包括H承認を適用する。実行直前にhost、目的、影響、backup / rollbackを改めて明示し、
dirty、diverge、credential失敗、想定外dry-run差分があるhostでは停止する。

## 完了判定

4 hostすべてを一枚のmatrixで評価し、8製品と代表E2Eの各セルに直接根拠または明示的な非適用理由を持たせる。
未観測・古い証拠・actionable failureをgreenへ丸めない。必要な更新後はhost別focused gate、dotagentsの
`verify-install` / `make lint` / `make ci`、GitHub Actionsを通し、不変ADRとtyped evidenceをLatticeへ登録する。

## Rollback

本Decision時点ではrepoの本ADRとLattice task start以外に変更はない。監査で受入不能ならtaskを未完了で残す。
後続H変更のrollbackはhost別backupと正規package managerを使い、履歴改変や暗黙fallbackは行わない。
