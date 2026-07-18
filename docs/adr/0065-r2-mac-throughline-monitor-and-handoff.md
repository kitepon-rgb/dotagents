# ADR 0065: R2 Mac Throughline monitor修復とhandoff smokeの受入

日付: 2026-07-19

## Status

Accepted。

## Decision

MacのCodex入口で、Throughlineの現在thread capture、handoff prompt生成、VS Code monitor taskを
execution-verifiedとして受け入れる。

- defect: `.vscode/tasks.json` が削除済みNode `26.4.0` の絶対pathを保持していた。
- repair: ThroughlineのCodex `user-prompt-submit` hookをVS Code環境として実火し、製品自身の
  `ensureMonitorTaskFile` が現行Node `26.5.0` へ修復した。
- doctor: `registered but broken` から `registered` へ遷移した。
- capture: 現在thread `019f7635-8d57-7a23-8d8c-095ade3da0ce` を
  `codex:019f7635-8d57-7a23-8d8c-095ade3da0ce` としてcaptureした。
- idempotency: 同一threadへの2回目hookは追加INFOを出さず、captureを継続した。
- handoff: `fresh_thread_handoff_prompt_ready`、9 checksすべてpass、3658/12000 chars。
- monitor: 生成済みcommandをPTYで起動し、2件のCodex session表示後にexit 0で停止した。

## 境界

- 新しいCodex threadは作成していない。`codex-handoff-smoke` はprompt構築のread-only smokeだけを行った。
- `throughline install`、hook trust、global config、Throughline source repo、remote hostは変更していない。
- ローカル生成物の修復前状態は `/tmp/dotagents-throughline-tasks-before-20260719.tar` に退避した。
- VS Codeでfolderを既に開いている場合は、修復済みtaskを反映するため
  `Developer: Reload Window` を1回実行する必要がある。
- experimental restoreの上流 mismatch、callout hooks、Spotter hook event、他端末E2Eは本Decisionで閉じない。
