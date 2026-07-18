# ADR 0062: R2 Mac apply-codex-config repo入口の受入

日付: 2026-07-19

## Status

Accepted。

## Decision

- repo checkout内から実行する正規入口は `./bin/apply-codex-config.sh` とする。
- `install.sh` が配布する端末入口 `~/.local/bin/apply-codex-config` は拡張子なしのまま維持する。
- AGENTS.md、README.md、docs/05_codex-fragments.md、docs/r2-e2e-checklist.mdのrepo内実行例を実体へ一致させた。
- `--apply`、hook trust、remote host設定は本Taskの対象外とし、実行していない。

## Evidence

- `./bin/apply-codex-config.sh --dry-run`: passed、出力差分なし。
- 旧表記 `./bin/apply-codex-config --` の対象4ファイル内検索: matchなし。
- `make lint`: green（markdownlint、constitution parity、skills smoke、hooks smokeを含む）。
- commit: `d18f884`（対象4pathだけをpathspec commit）。
- Control `r2-host-rollout-20260718`: retry Run `r2-mac-apply-config-entrypoint-retry-20260719` のstrict Worker Reportをimportし、親検証後にaccepted。

## Recovery record

初回Runは、予約時untrackedだった親receiptを稼働中にtracked commitしたため `WORKSPACE_DRIFT` でReport import不能となった。Reportへ親pathを偽装せず、[drift receipt](../r2-e2e-control-drift-receipt-20260719.md)どおりfailed終端した。対象変更を親が検証・commit後、clean baselineのretry Runでno-edit検証と空`changed_paths`を回収した。
