# ADR 0101: cf-0106 skill invocation受入境界

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `codex-full-support/cf-0106`
- Input: ADR 0080

## Decision

`cf-0106`の「全対象skill」は、ADR 0080で公式Codex user skill面へ固定した次の6件だけとする。

1. `auto-deploy-on-push`
2. `gpt-connector`
3. `oracle`
4. `orchestrate`
5. `polish-github`
6. `run-observer-parent-watch`

端末固有skill、system skill、plugin提供skillを推測追加しない。各`SKILL.md`のfrontmatterを静的に確認し、
6件すべてをMac正規Codex CLIの新規sessionから明示invocationする。代表暗黙invocationは、skill名を含まない
GitHub公開面の監査依頼が`polish-github`を選び、GO前に監査だけで止まることを直接確認する。

## Parallel boundary

4つのread-only laneへ分ける。

- static: 6件のfrontmatterと配布面一意性
- explicit A: `auto-deploy-on-push`、`gpt-connector`、`oracle`
- explicit B: `orchestrate`、`polish-github`、`run-observer-parent-watch`
- implicit: skill名を含まない公開OSS監査依頼

各laneは別の新規Codex sessionを一度だけ作り、repo、設定、credential、GitHub、外部serviceを変更しない。
明示invocationはskillを読み、選択skill名と最初の安全gateを回答するだけに限定する。consult送信、Observer watch、
deploy、GitHub設定変更、Control作成は行わない。read-only worker同士なのでLattice runの同一repo並列writer制約には
該当しない。

## F / A / H

- F: 対象6件、prompt境界、直接証拠の採否、Lattice state、最終Decisionは親が所有する。
- A: 4 laneのread-only実測をnative workerへ委譲する。
- H: 外部状態変更は行わない。包括承認は本taskで不要な操作へ拡張しない。

## Acceptance

- 6件すべてのfrontmatterにexactな`name`と非空`description`がある。
- 6件すべてが新規sessionの明示invocationで選択され、skill固有の安全gateを回答する。
- skill名を含まない代表依頼が`polish-github`を暗黙選択し、GO前の変更を行わない。
- 各laneのsession ID、sanitized transcript digest、開始前後のrepo変更集合不変を保存する。
- optional／非推奨／rollback専用を通常greenへ変換しない。

## Non-goals

- 全host／全入口のskill E2E（`cf-0146`）
- hook、MCP、Throughline、Spotterの全E2E
- external consult、deploy、Observer production watch、GitHub変更
- Lattice製品の修理、独立Codegraph、廃止済み`codex-rc`の利用・探索

## Rollback

read-only実測なのでhost rollbackはない。証拠が不足するlaneは未達として残し、別sessionの静的値で補完しない。
