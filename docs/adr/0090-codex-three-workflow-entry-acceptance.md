# ADR 0090: Codex 主要3 workflow入口の受入

## 状態

受入済み

## 対象

Lattice `codex-full-support/cf-0021` の「Claude の主要 workflow 3件」は、現行正典と
`audit-gauntlet` 廃止履歴から次の3件に確定した。

| workflow | Claude入口 | Codex正規入口 |
|---|---|---|
| `orchestrate` | `claude/skills/orchestrate` | `codex/skills/orchestrate` |
| `auto-deploy-on-push` | Claude skill + command | `$auto-deploy-on-push` |
| `polish-github` | `claude/commands/polish-github.md` | `$polish-github` |

`audit-gauntlet` はオーナー裁定で廃止済み、`gpt-connector` は consultation lane、Oracleは
互換・rollback専用であり、この3件へ含めない。

## 受入内容

`tests/skills/smoke.sh` が次を固定する。

- 3件のCodex skill、frontmatter、`agents/openai.yaml`、`$skill` default promptが存在する。
- READMEのClaude/Codex対応表が3件の正規入口を示す。
- `polish-github` はClaude command正本を読み、読めない時に要約で代行せずエラーにする。
- Codex面に廃止済み `audit-gauntlet` が存在しない。
- 3件のCodex skill本文に `AskUserQuestion`、Plan mode、Task/Todo/Agent/Workflow関数形など
  Claude固有入口が混入しない。

## 検証

- `bash tests/skills/smoke.sh`: `skills smoke: OK`
- `git diff --check`: 成功
- 実装commit: `48af5cc` (`tests/skills/smoke.sh`のみ)

新規sessionでの全対象skill明示 invocation と代表暗黙 invocation は、別のLattice task
`cf-0106` が所有する。本受入はその動的E2Eを先取り完了せず、静的な正規入口と誤配線防止を閉じる。

## 非実施

- Claude/Codex skill本体の変更
- 廃止済み `audit-gauntlet` の復活
- Lattice製品またはLattice repoの変更
