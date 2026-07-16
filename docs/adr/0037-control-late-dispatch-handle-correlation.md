# ADR 0037 — Placement後に確定するdispatch handleの相関

- Status: Accepted
- Date: 2026-07-16
- Scope: Control Record v25のPlacement予約とnative dispatch相関

## 再現

Observer P5-1b4dのnative test Workerを正規順で`placement-reserve`、`worker-admit`、dispatchした。
Placement候補ではspawn前のため`executor_handle=null`だったが、dispatch観測で
`{agent_path: "/root/claude_agent_fixture"}`を記録すると、予約時のcandidate digestと現在Runの
materialized candidateが一致しなくなり、Controlは`placement reservation candidate digest is invalid`で
revision 38から更新不能になった。

## Decision

予約時点のhandleとdispatch相関handleを同じ不変事実として扱わない。既存v25 schemaと、予約時から
handleがある経路のcandidate digestは変更しない。

予約handleが`null`で、dispatch時に初めてhandleを得た場合だけ、`worker-observe`のdispatch receiptへ
次のcanonical digestを保存する。

- `worker_run_id`
- executor envelope
- `workflow_id`
- `executor_handle`

manifest検証は、現在handleを含む従来candidate digestを第一候補とする。それが一致せず、予約時の
`null` handleを復元したcandidate digestが一致する場合は、上記dispatch相関digestも完全一致する時だけ
受理する。したがって、保存handleの差替え、別Run／別executorへの付替え、receipt digestの改竄は
fail closedとなる。既存のsubject digestなし`worker-observe` receiptは継続読取するが、`null`予約からの
遷移証明には使えない。

## Acceptance

- 修正前fixture: focused 0/1、`placement reservation candidate digest is invalid`を再現。
- 修正後fixture: focused 1/1 green。予約→admit→dispatch→statusを完走し、handle／receipt改竄を拒否。
- Control Record関連gate: 95/95 green。
- 静的gate: `make lint-js` green。
- 実Control: `observer-p5-1b4-claude-caller-20260716` revision 38→39でdispatch相関を保存し、
  revision 40で同じWorker Reportをstrict importした。
- full regressionは工場Phase完了時に一度だけ実行する。

## Non-goals

- Control schema v26やrate-aware selector decisionを先取りしない。
- handleの暗黙fallback、別handleへの再bind、workerの再dispatchを許可しない。
- Observer、Aiterm、Latticeの製品設計を本変更へ持ち込まない。
