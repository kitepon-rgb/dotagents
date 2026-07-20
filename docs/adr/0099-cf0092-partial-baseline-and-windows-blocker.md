# ADR 0099: cf-0092 部分baselineとWindows blocker

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `codex-full-support/cf-0092`
- Boundary: ADR 0098

## Decision

`cf-0092`は完了にしない。Mac CodexはADR 0093の既存直接証拠を採用し、Mac Claude、main-server
Codex、FOX WSL2 Codexの新規session baselineは今回の直接receiptとして受け入れる。一方、FOX Windows
native Codexは新規session `019f7f3e-bc93-79d1-ad2b-04fa4bdaf988`を一度だけ開始でき、skillsとrepo
変更集合不変までは確認したが、同sessionのresumeがCodex CLI 0.144.6のmodels cache schema error後に
完了しなかった。rollout transcriptにもagents、MCP、hooksを裏づけるtool resultがないため、推測や静的設定で
補完しない。

この失敗はADR 0082でdotagentsのToDo対象外と裁定済みの基盤toolchain本体の欠陥と同じ境界にある。
Codex CLI、cache、host設定は修理せず、新しいdotagents maintenance ToDoも作らない。Lattice本体と
廃止済み`codex-rc`にも触れない。`cf-0092`はWindows nativeの同一新規sessionで4面を直接回収できるまで
blockedとする。

## Baseline matrix

| 入口 | session相関 | skills | agents | MCP | hooks | 裁定 |
|---|---|---|---|---|---|---|
| Mac Codex | ADR 0093 | observed | observed | observed | observed | 既存直接証拠を採用 |
| Mac Claude TUI | `08b5c115-76ec-4d5d-b61d-b81e9f0f6a3b` | observed | observed | observed、auth-requiredを保持 | configured | 受入 |
| main-server Codex | `019f7f3d-a4a4-7dc3-9db2-fe5291b9f895` | observed | observed | observed、Latticeは未inspection | unknown | unknownのまま受入 |
| FOX WSL2 Codex | `019f7f3e-6523-7251-b040-77fe2e55e029` | observed | observed | observed | unavailable | unavailableのまま受入 |
| FOX Windows native Codex | `019f7f3e-bc93-79d1-ad2b-04fa4bdaf988` | observed | 未回収 | 未回収 | 未回収 | blocker |

## Evidence

- Mac Codex: `docs/adr/0093-cf0023-new-codex-session-acceptance.md`
- worker reports and executor receipts: Control `cf0092-five-entry-baseline-20260720`
- Windows native blocker digest: `66be70fa5da0ac6ee3b8f00dcda515b4625d7890a9310a32e798ae1f2684c6f6`
- toolchain scope: `docs/adr/0082-non-core-product-error-scope.md`

4 workerはいずれもrepoを変更せず、開始前後の変更集合を維持した。ユーザー所有
`docs/evidence/fixtures/`は読まず、変更していない。

## Resume condition

FOX Windows nativeの正規Codex CLIで新規sessionを一度だけ開始し、その同一sessionへskills、agents、
MCP、hooksの実測結果を直接相関できること。既知failure、unsupported、unknownはそのまま記録してよいが、
観測自体が欠ける面をgreenへ丸めない。

## Rollback

host設定と製品は変更していないためrollbackはない。本Decisionの取り消しは、上記resume conditionを満たす
新しい直接証拠を得て`cf-0092`をunblockした時だけ行う。
