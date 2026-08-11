# fm-0699 Windows本番Task Scheduler受入

実施日: 2026-08-11

オーナー承認後、SSHの`windows-workstation`をWindows native PowerShellとして識別して実施した。WSL側の`bash`は使用していない。

## 配備

- FOXのdotagentsを`100f9fc`へfast-forwardした。
- Windows nativeの既存配布方式に合わせ、次の3入口をPowerShellのsymbolic linkとして追加した。
  - `agents-update-schedule-runner`
  - `agents-update-scheduler`
  - `factory-deployment-contract`
- `agents-update-scheduler install --dry-run`で、専用task、現在SID、`InteractiveToken`、`LeastPrivilege`、Nodeとrunnerの絶対path、rollbackを確認した。
- 承認済みの`agents-update-scheduler install --apply`を実行した。
- `status --apply`と`Get-ScheduledTask`の双方で`dotagents-agents-update`が`Ready`であることを確認した。
- XML先頭は`255,254`（UTF-16LE BOM）。control directoryのDACLは継承遮断、`FOX\kite_`のAllow/FullControl 1件だけだった。

Rollbackは`agents-update-scheduler uninstall --apply`。taskだけを外し、report/outboxは削除しない。

## 実scheduled task smoke

- `Start-ScheduledTask -TaskName dotagents-agents-update`で本番taskを1回起動した。
- `agents-update end`を確認した。
- 更新処理は`update=success`。
- batch token: `974480b0-1381-4c4d-918e-7fb713ea48b6`
- fresh v7 report: `026d19e6-d8b5-45c9-a965-ab70a777d4b4`
- delivery receiptは同じreport IDとbatch tokenを保持しており、BugHub受理を確認した。
- Task Schedulerの`LastTaskResult`は`1`。これは更新失敗ではなく、post-update gateが現在の製品健全性問題6判定をfail-closedで検出したためである。

Windowsでの6判定は、4つの製品面に集約される。

- Caveat: `native_diagnostics` failと`compatibility=incompatible`（sync remote mismatch、Codex hooks未導入）
- Throughline: `codex_hooks` failと`compatibility=incompatible`
- aiterm-mcp: `runtime_error_store` unverified
- codex-sidecar: native diagnostics unverified

この結果により、scheduler、最小PATH、実batch token、fresh report、BugHub deliveryの閉包は実機で成立し、既存の製品状態は成功へ丸めず検出された。

## BugHub確認

- `/readyz`: HTTP 200、全6 check pass。factory ingestは今回のWindows v7 reportを観測した。
- 現役4hostはすべて15製品、`contract_version=7.0`。
  - `fox-wsl`: `2026-08-11T10:17:06.288Z`
  - `mac-kite`: `2026-08-11T10:17:12.810Z`
  - `main-server`: `2026-08-11T10:17:05.109Z`
  - `windows-workstation`: `2026-08-11T10:48:32.073Z`

残存状態はmatrixの`repair_repository`で所有先を分離した。主なhighの継続はCaveat（Caveat repo）、Throughline（Throughline repo）、toolchain last-update（dotagents）、macのgpt-connector（gpt-connector repo）。unverifiedは各製品repo（Spotter、aiterm-mcp、codex-sidecar、ServerManager）に帰属する。今回の修理対象外の製品本体をdotagentsへ複製せず、BPR5をLatticeへ戻していない。
