# ADR 0098: cf-0092 5入口session baseline境界

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `codex-full-support/cf-0092`
- Inputs: ADR 0075、0076、0079、0093、0097

## Decision

`cf-0092`の「各現役入口」は、既存のaccepted ledgerが確定した次の5入口だけとする。

1. Mac Codex
2. main-server Codex
3. FOX WSL2 Codex
4. FOX Windows native Codex
5. Macの通常ユーザー設定を読むClaude TUI

Desktop、IDE、managed Claude launcherを別入口として推測追加しない。Mac CodexはADR 0093で
skills、agents、MCP、hooksを同じ新規sessionへ相関済みなので再実行しない。残る4入口だけを新規sessionで
補測し、入口ごとに4面の観測値とsession相関を保存する。

FOX WSL2のV2 agent面は既存裁定どおり`gpt-5.6-sol`をsession限定で明示し、端末既定modelは変更しない。
FOX Windows nativeの既知hook failureやunsupported面はbaselineへそのまま記録し、greenへ丸めない。

## F / A / H

- F: 5入口の確定、既存証拠の採否、4面の受入、Lattice state、最終Decisionは親が所有する。
- A: Mac Claude、main-server Codex、FOX WSL2 Codex、FOX Windows native Codexの新規session実測を、
  repo read-onlyの4 workerへ分割する。
- H: 新しいcredential、OAuth、trust変更は行わない。既存ログイン済みsession入口のread-only実測だけを行う。

4 workerは相互に独立したhost／runtimeだけを観測し、repoへ書き込まない。証拠文書とLattice更新は親が直列に
集約する。Lattice本体repo／productと廃止済み`codex-rc`は探索・変更しない。

## Acceptance

- 5入口すべてについて、新規sessionに相関したskills、agents、MCP、hooksのbaselineが直接証拠または
  既存の直接証拠で埋まる。
- optional、unsupported、既知failure、未検証を成功へ変換しない。
- worker前後でrepoの変更集合が不変であり、ユーザー所有`docs/evidence/fixtures/`へ触れない。
- 親が証拠matrixを確認し、focused gate、`lattice todo verify`、CIをgreenにして閉じる。

## Non-goals

- 全skillのfrontmatter／明示・暗黙invocation網羅（`cf-0106`）
- 各入口のAGENTS／SESSIONS／Spotterを含む全E2E（`cf-0146`）
- hook lifecycle全組合せ、Throughline restore、gpt-connector再consult
- Lattice製品の修理、独立Codegraphの復活、`codex-rc`の利用・探索

## Rollback

host設定は変更しない。証拠を受け入れられない場合は当該入口を未達のまま残し、`cf-0092`を完了させない。
