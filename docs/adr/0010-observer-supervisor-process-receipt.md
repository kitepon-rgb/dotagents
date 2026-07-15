# ADR 0010: Observer Supervisor external process受入receipt

日付: 2026-07-16

## Status

Accepted cross-repo receipt。Observerのproduction one-step coreを外部process／CLIへ接続した成果だけを受け入れる。
Codex live model request、Claude delivery、Phase O2完了を本receiptから推測しない。

## Source evidence

- repo: `/Users/kite/Developer/Observer`
- implementation commits: `77cbae4`、`4e29398`、`6d03b71`、`96ccad7`
- corrective commits: `dda8567`、`f7efa09`
- acceptance plan commit: `e2adbca`
- immutable acceptance path: `docs/adr/0069-supervisor-process-cli-acceptance.md`
- acceptance git blob: `6543870174d368496fc2b87d68930ebd5eda7b68`
- acceptance SHA-256: `5ba7a938dac2b7efaacce5f04f97843c82b173581bf11f51dd0b6ba243670564`

## Accepted contract

- target固有process lease、active watch停止監視、timeout／committedの同一process再入、model pendingのbounded poll。
- `model_result_unknown`のterminal fault化と、provider process faultによる進行中Throughline waitの即時取消。
- Throughline／Codex executable identity・version固定、Codex session initialize一回、SIGTERM→SIGKILL terminal cleanup。
- registered targetだけを使う`observer supervisor run`と、stdout result／stderr error／cancel 130のsanitized CLI契約。

## Gate

- final related: 70 PASS / 0 FAIL / 0 SKIP。
- static: `npm run check`、`git diff --check` PASS。
- full regression、live host request、credential、network、publish、deployは未実行。

## Queue transition

factory master queue 7をDONEへ進める。queue 8はlive H gateのまま維持し、承認不要で独立なqueue 9の
wire v2製品所有repo残欠陥を次のNOWとする。
