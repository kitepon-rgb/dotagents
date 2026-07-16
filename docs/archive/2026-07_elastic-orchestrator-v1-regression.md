# Elastic Orchestrator v1 regression evidence

- 実行日: 2026-07-15
- 対象: `d8bea93`以降の最終監査修正候補
- ユーザー所有dirty: `rag/INDEX.md`、`rag/wsl-relay-recovery/`、`tmp/`を検証対象・編集対象から除外

## 完了済みgate

| Gate | 結果 |
| --- | --- |
| `node --test tests/orchestrate/*.test.mjs` | 107/107 pass |
| `make lint` | pass |
| `git diff --check` | pass |
| `make ci` | pass。Orchestrator 107/107を含む全gate完走 |

最終監査修正、Throughline／capacity／knowledge return文書、cache symlink negative testを加えた後に
`git diff --check`、`make lint`、`make ci`を再実行した。`make ci`はconstitution parity、Markdown、
skills、hooks、clean HOME install、factory diagnostics、factory reporter／scan、Orchestrator全testを含む。

## 境界回帰

- Task／Control finalizationはactive child、未裁定completed、未release campaign、未完了phase gate、
  retained document digest不一致を拒否する。
- resume-checkは同一path・同一SHA-256の旧decisionだけを最大256 commit、総64 MiBの範囲で
  `retained-history`とし、legacy provider URI型decisionはopaque＋review-requiredへ送る。
- external failure、timeout、login-required、unsupported modelを成功やfallbackへ丸めない。
