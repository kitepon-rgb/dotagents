# ADR 0069: Lattice status v3 hook受入

- 状態: Accepted
- 日付: 2026-07-19
- Control: `lattice-wire-v4-cutover-20260719`
- Task: `dotagents-status-v3-hook`

## 文脈

Latticeのsuccessor revision導入後は、hookが従来のstatus v1/v2だけでなく、revision identityとreconciliation状態を持つ`lattice.todo_status.result.v3`を厳密に解釈する必要がある。旧schemaの互換を崩さず、未知形状をfail-closedにすることがcutoverの前提である。

## 決定

`lib/lattice-hook.py`のstatus解釈をv1/v2/v3対応とし、v3では各plan memberの`reconciliation_state`、`revision_digest`、`reconciliation_digest`をexact shapeとして検証する。

- `reconciled`は両digestを必須とする。
- `registered_unreconciled`は両digestを`null`に限定する。
- v1/v2の既存shapeと表示契約は維持する。
- v3ではhook出力にreconciled/unreconciled件数を追加する。
- Claude/Codex両hook smokeでv1/v2/v3を検証する。

## 受入証拠

- `bash tests/hooks/smoke.sh`: pass
- `bash tests/hooks/codex-smoke.sh`: pass
- `make lint`: pass
- `git diff --check`: pass
- 対象差分: `lib/lattice-hook.py`、`tests/hooks/smoke.sh`、`tests/hooks/codex-smoke.sh`

## 帰結

dotagents hookはLattice status v3のreconciliation identityを消費できる。NPM公開、global install、実工程smokeは別の高リスク受入境界として残し、この決定だけで公開完了とは扱わない。
