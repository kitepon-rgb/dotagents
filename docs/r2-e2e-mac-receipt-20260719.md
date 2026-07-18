# R2 Mac Codex E2E receipt（2026-07-19・進行中）

対象: `factory-master/fm-0580`、`factory-master/fm-0585`、Control `r2-host-rollout-20260718`

## 同期・baseline

- `git fetch origin`: 成功。`main...origin/main` は `0 0`、dirty 0、stash 0、shallow=false。
- `./bin/verify-install.sh --profile official`: green。コア8製品＋Lattice、公式skill面、Spotter marker / Codex 3 hooks / Throughline context、routing / hook canonical entryを確認。
- `./bin/apply-codex-config --dry-run`: `127`（`no such file or directory`）。repo内実体は `bin/apply-codex-config.sh`、配布入口は `~/.local/bin/apply-codex-config`。README / AGENTS / Codex断片 / R2 checklistのrepo内コマンドが実体と不一致。

## Codex native routing smoke

全roleを `fork_turns="none"` のhandshake-only spawn後、親で `bin/verify-codex-agent-routing.sh` を実行した。
起動時のnative capacityは親を含め11枠で、3 smoke終了後に実装担当を同一agent pathへ再dispatchできる状態だった。

| role | agent path | 実効model / effort | verifier |
|---|---|---|---|
| implementer | `/root/routing_smoke_impl` | `gpt-5.6-terra` / `medium` | `routing-check: OK` |
| refuter | `/root/routing_smoke_refuter` | `gpt-5.6-sol` / `high` | `routing-check: OK` |
| sorter | `/root/routing_smoke_sorter` | `gpt-5.6-luna` / `low` | `routing-check: OK` |

3 roleとも `developer_instructions: applied`。sandboxは端末実効値 `danger-full-access` とrole TOMLの期待値が異なるが、正典どおりrouting判定とは分離した。

implementer子の自己申告はroleを`default`と述べたが、rollout JSONLを読む親側verifierは`agent_role: implementer`を確認した。自己申告はrouting証拠に採用しない。

## 現在の裁定

- routing 3 roleはgreen。
- repo内 `apply-codex-config` コマンド表記の不一致はWave 3のcritical pathを直接塞ぐため、P1として正規入口へ統一する。
- `--apply`、hook trust、publish、remote host変更は本receiptでは未実施。

## Throughline代表smokeとmonitor修復

- `throughline doctor --codex` で `.vscode/tasks.json` の `Throughline Monitor` が削除済みの
  `/opt/homebrew/Cellar/node/26.4.0/bin/node` を参照する `registered but broken` を検出した。
- `/tmp/dotagents-throughline-tasks-before-20260719.tar` に元ファイルを退避し、
  `TERM_PROGRAM=vscode throughline codex-hook user-prompt-submit` を現在のCodex threadへ実火した。
  Throughline自身の stale path repair により `node/26.5.0/bin/node` へ更新され、doctorは
  `registered`、nodeと `throughline.mjs` はともに存在確認済みとなった。
- 同一threadへの2回目hookは追加INFOなしで `status=ok`、`captured.status=captured`。
  `codex-handoff-smoke` は `status=ready`、9 checksすべてpass、prompt 3658/12000 charsだった。
- 生成されたmonitor commandをPTYで起動し、現在のCodex sessionを表示後、Ctrl+Cでexit 0を確認した。
- 既にVS Codeで本folderを開いている場合は、反映のため `Developer: Reload Window` を1回実行する。

## Spotter実火とCodex callout hook監査

- Spotterの3 hookは各1件登録、compatible / canonical。runtime logはparse error 0。
- この会話の連続した2 UserPromptSubmitに対応する `2026-07-18T18:07:39.621Z` と
  `18:07:43.319Z` の `spotter.hook_event.v1` はともに `success`、`pass=true`、不足toolなし。
  直近100行のうち18:00Z以降にerror/failureは無かった。
- JSONL schemaにはCodex thread IDが無いため、現在threadとの直接相関ではなく、host、event、時刻、
  連続メッセージ数による相関である。過去logのerror/skippedを現在の成功へ混在させない。
- `tests/hooks/codex-smoke.sh` は全項目green。初回INFO、2回目沈黙、compact再武装、pending生成・
  配送・削除の実装契約を隔離stateで確認した。
- native Codexで連続したfrontend出力receiptがあるのはhistoric X5初回注入まで。X2初回INFO、
  同session 2回目ゼロbyte、compact後1回、同一session Stopから次の自然なpromptへのpending 1回配送は
  未観測のため、4条件全体をgreenにはしない。
