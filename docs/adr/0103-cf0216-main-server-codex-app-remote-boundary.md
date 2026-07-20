# ADR 0103: cf-0216 main-server Codex App Remote受入境界

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `codex-full-support/cf-0216`
- Input: ADR 0075、ADR 0076、ADR 0095、ADR 0097、ADR 0099、ADR 0102

## Decision

`cf-0216`は、Codex Appの`main-server` Remote connectionで
`/home/kite/Developer/dotagents`を開いた一つの新規sessionへ、次の入口固有証拠を直接相関できた時だけ完了する。
main-serverのSSH CLI、他host、他Codex入口のgreenを代用しない。

1. Remote connection名、project root、新規thread ID、開始時刻
2. `/hooks`で正規hook commandを確認したUI trustとreview残数0
3. SessionStart、PreToolUse、UserPromptSubmit、Stopの代表lifecycle
4. 公式skill面の発見、明示invocation、代表暗黙invocation
5. implementer、refuter、sorterの実spawnと親routing verifier
6. 同Remote threadのThroughline captureとhandoff
7. 同threadに相関するSpotter runtime event
8. main-serverの新規Claude session回帰

既存ADRはinstall、config、version、期待値、host-level routingの前提証拠として流用する。ADR 0075、0099、0102が
入口固有でない範囲を、Remote E2Eへ拡張しない。

## H operation

オーナーは本goalでH操作を包括承認済み。本taskで使うHは、main-serverのこのprojectに対するCodex App hook trust、
新規Codex／Claude session、代表hook・skill・routing・Throughline実火だけとする。repoは着手時にcleanを確認し、
`655c915`から現行`a0e7705`へfast-forward済みである。model既定、permissions、OAuth、credential、MCP登録、
global config、service、schedulerは変更しない。

Codex App自身はComputer Useの安全制約で自動操作できない。UI専用gateをCLIやlogで成功へ丸めず、UI操作が必要な
時点で具体的な画面と確認項目をオーナーへ渡す。App logはRemote connectionの接続状態を補助証拠にできるが、trustや
新規threadの代替にはしない。

## Parallel boundary

同一repoの並列writerは置かない。独立なread-only実測を次のlaneへ分ける。

- remote readiness: main-serverのHEAD、official verify、hook／skill／Spotter／Throughline静的状態
- Claude regression: main-serverの新規Claude sessionでAGENTS、skill、agent、hook、MCPの代表回帰
- UI preparation: Codex App logのRemote接続相関と、UI実火後に読むSpotter／Throughline ledgerの基準点

Remote Codex Appの新規thread、trust、hook lifecycle、skill、routing、Throughlineは一つのthreadへ直列化する。
Latticeは同一repo writerの並列を許可する根拠に使わず、active runがないことを着手前に確認済みである。

## F / A / H

- F: 入口相関、UI trust、受入境界、worker報告の採否、Lattice state、最終Decisionは親が所有する。
- A: remote readinessとClaude回帰のread-only実測をnative workerへ委譲する。
- H: 上記の限定UI trustと新規session実火だけ。承認は受領済み。

## Acceptance

- 8項目の入口固有証拠を一つのRemote入口receiptへ結び付ける。
- main-serverの開始前後でrepo変更集合が同一である。
- `verify-install --profile official`、Spotter／Throughline diagnostics、focused gateがgreenである。
- unknown、unsupported、未実施、他入口証拠をgreenへ変換しない。

## Non-goals

- install／config apply／全host rolloutの再実行
- model、effort、permissions、OAuth、credential、MCP登録の変更
- 他host／他Codex入口、全skill、全MCP、Throughline全機能の再受入
- main-serverでunsupportedなgpt-connector live consult
- Lattice製品の修理、独立Codegraph、廃止済み`codex-rc`の利用・探索
- `docs/evidence/fixtures/`の読取・変更・収容

## Rollback

sessionとhook実火はrepoや設定を変更しない。hook trustを撤回する必要がある場合はCodex Appの正規UIだけを使い、
設定ファイルの手編集で代替しない。remote repo同期を戻す場合は、影響確認後に旧SHA `655c915`へ明示的に戻す。
