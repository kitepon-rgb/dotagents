# ADR 0102: cf-0106 公式skill invocation受入

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `codex-full-support/cf-0106`
- Boundary: ADR 0101
- Evidence: `docs/evidence/2026-07-20-cf0106-skill-invocation-acceptance.json`

## Decision

ADR 0080で公式Codex user skill面へ固定した6件は、frontmatter、明示invocation、代表暗黙invocationの
直接証拠が揃ったため受け入れる。

| lane | 受入結果 |
|---|---|
| static | 6件すべてexactな`name`と非空`description`を持ち、新規sessionの公式面にも6件だけが現れた |
| explicit A | `auto-deploy-on-push`、`gpt-connector`、`oracle`が選択され、各固有gateを回答した |
| explicit B | `orchestrate`、`polish-github`、`run-observer-parent-watch`が選択され、各固有gateを回答した |
| implicit | skill名を含まないGitHub公開面の監査依頼が`polish-github`を選び、GO前の変更なしで止まった |

全laneでtoolによる外部操作はなく、workerによるrepo変更もない。optional、非推奨、rollback専用の位置付けは
そのまま維持し、通常greenへ変換していない。

## Recovery record

implicit laneの初回sessionは`--ephemeral`で、`polish-github`の選択は観測できたものの最終応答が保存されず、
同じthreadもresume不能だった。この試行を成功証拠には数えていない。元packetの自然文promptを変えず、保存可能な
新規sessionを一度だけ作成して直接証拠を回復した。以後は同じthreadだけをresumeした。

## Focused verification

- 6件のfrontmatter exact name／非空description: pass
- 6件の明示invocationとskill固有gate: pass
- `polish-github`代表暗黙invocationとGO前変更なし: pass
- 各lane開始前後のrepo変更集合: unchanged
- Lattice製品repo: 未変更
- 廃止済み`codex-rc`: 未使用・未探索

## Rollback

配布物、設定、外部状態は変更していない。本Decisionを戻す場合は、このADRと証拠JSONを撤回し、Lattice taskを
正規reopenする。
