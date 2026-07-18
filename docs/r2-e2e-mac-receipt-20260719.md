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
