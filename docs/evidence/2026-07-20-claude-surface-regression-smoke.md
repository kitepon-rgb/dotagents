# Claude surface 回帰smoke受入

- Date: 2026-07-20
- Control: `codex-ready-wave-20260720-1459`
- Lattice tasks: `cf-0027`, `cf-0152`
- Lane: behavior-preserving

## 受入範囲

`tests/skills/smoke.sh`へ、現在配布するClaude surfaceの静的契約を追加した。

- skills: `auto-deploy-on-push`、`gpt-connector`、`orchestrate`
- commands: `auto-deploy-on-push`、`polish-github`
- agents: `implementer`、`refuter`
- 各入口の存在、必須frontmatter、代表的な入口契約を検査する。
- agent frontmatterは必須キーだけを要求し、`model`や`tools`などの追加キーを許容する。
- retired `audit-gauntlet` のskill／command／agentが再収録されていないことを検査する。

## 検証

- `bash tests/skills/smoke.sh`: `skills smoke: OK`
- `make lint`: green
  - ShellCheck
  - Python syntax checks
  - Markdownlint: 165 files、0 errors
  - constitution parity
  - skills smoke
  - Claude hooks smoke: `ALL PASS`
  - Codex hooks smoke: `ALL PASS`
- `git diff --check -- tests/skills/smoke.sh`: green

実装workerの専有worktreeと親workspaceの差分を親が照合した。関連gateで検出したSC2016は、
Markdown内バッククォートをliteralとして照合する2行へ局所disableを追加して解消した。

## 境界

このreceiptが閉じるのは、Claude skill／command／agent／hookの回帰smoke追加だけである。
全host実session、全入口E2E、他製品疎通、最終archive条件までは主張しない。
Lattice本体・Lattice製品repo・ユーザー所有の未追跡`docs/evidence/fixtures/`は変更していない。
