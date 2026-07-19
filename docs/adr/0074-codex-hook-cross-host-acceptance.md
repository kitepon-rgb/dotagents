# ADR 0074: Codex hookの4ホスト安全配布・実火受入記録

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `codex-full-support/cf-0282`、`codex-full-support/cf-0153`、`codex-full-support/cf-0155`、`gpt56-rewiring/gw-0100`〜`gw-0102`、`factory-master/fm-0584`
- Prior receipts: [ADR 0072](0072-r2-four-host-rollout-receipt.md)、[ADR 0073](0073-r2-sidecar-and-windows-distribution-receipt.md)

## Decision

Codex lifecycle hookの明示interpreter化、Windows native PowerShell正規形、状態ファイル安全化を4ホストへ配布し、FOX WSL2とFOX Windows nativeの実Codexでdotagents calloutを実火した。WSL2のWindows「アプリ選択」ダイアログ再発がなく、4ホストの`verify-install --profile official`がgreenであるため、WSL2 hook安全blockと他端末の設定配布工程を受け入れる。

実装点は`2f8af9c`。主要な修正履歴は`60f9ecc`、`6530168`、`4157ce6`、`6801ae5`、`7418e78`、`dbd88bf`、`2f8af9c`である。

## 正規command契約

- POSIX / WSL2: Python hookは`/usr/bin/env python3 <absolute-script> ...`、shell hookは`/bin/sh <absolute-script>`。`.sh` symlinkをdirect execしない。
- Windows native: PowerShell call operator `&`、明示interpreter絶対path、全token二重引用を使う。Codex 0.144.6はhook commandをturn shellへ渡すため、quoted executableだけでは起動にならない。
- applierは旧direct-exec、`&`なしWindows引用形、現正規形を同一hookとして認識し、matcherなしの専用entry一件へ収束させる。
- Windowsのstate安全判定はACLをOS側に委ねつつ、symlink・非regular・hardlinkを拒否する。`_open_fd`は入力を`Path`へ正規化してから既存pathを検査する。

## 4ホスト受入

| host | source / config | verify | 実火 |
|---|---|---|---|
| Mac | `2f8af9c`、POSIX canonical | official green | focused hook tests green |
| main-server | `2f8af9c`、POSIX canonical | official green | 配布・設定検査受入 |
| FOX WSL2 | `2f8af9c`、POSIX canonical | official green | Codex 0.144.6で`WSL_HOOK_OK`、最終`WSL_FINAL_OK`。UserPromptSubmit / Stopのdotagents hook Completed |
| FOX Windows native | `2f8af9c`、PowerShell `&` canonical、trust再承認 | official green | `WINDOWS_STATE_OK`。callout Completed。session hash `12b0779000c349084c17e155f25b0b406232492c87ff25a8c098ac81606f62a7`のsnapshot / onset state生成 |

適用前configは各hostの`Archives/dotagents-codex-config-*.tar.gz`へ退避した。最終Windows適用backupは`C:\\Users\\kite_\\Archives\\dotagents-codex-config-20260719T170917Z.tar.gz`である。

## WSL2再発検査

FOX WSL2の実Codex終了後、Windows processを絶対pathのPowerShellで検査した。`OpenWith`は存在せず、`ApplicationFrameHost`は既存PID 25944（2026-07-18 10:14:22開始）のみで、新規ダイアログprocessは発生しなかった。Caveat `wsl2-codex-app-server-shell-script-hooks-windows`をconfirmed / resolvedへ更新した。

## 検証

- `tests/install/clean-home.sh`: green
- `tests/hooks/codex-smoke.sh`: green
- `tests/hooks/smoke.sh`: green
- `make lint`: green
- `git diff --check`: green
- `lattice todo verify`: 完了event反映後に実行して閉じる

## 分離した既知問題

FOX WSL2にはdotagents外の既存hook `/home/kite/projects/codex-rc/scripts/codex-rc-user-prompt-hook.js` が残り、直接実行で`MODULE_NOT_FOUND`を再現した。Windows nativeでも既存のSpotter/Caveat等に失敗表示が残る。dotagents calloutはsession state生成まで証明済みであり、本受入へ混ぜない。前者はLattice maintenance taskへ登録して別waveで処理する。

Windows nativeの`node_repl` MCP path不在とmodels cacheの`supports_reasoning_summaries`警告も別問題であり、本taskの完了条件には追加しない。
