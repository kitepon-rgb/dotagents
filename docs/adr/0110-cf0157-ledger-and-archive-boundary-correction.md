# ADR 0110: cf-0157 端末台帳・archive境界の訂正受入

- Status: Accepted
- Date: 2026-07-21
- Scope: Lattice `codex-full-support/cf-0157`
- Supersedes: `docs/evidence/2026-07-21-cf0157-host-ledger-and-plan-archive.json` の無条件`accepted`解釈

## Decision

端末台帳の4 host／5 entry分類と、完了した`gpt56-rewiring`および
`callout-hooks`の履歴文書を`docs/archive/`へ移した事実を受け入れる。
ただしarchiveは実装計画の履歴保存であり、移管後の端末横断受入まで完了したことを意味しない。
再開された実機受入はLattice `codex-full-support`の各taskが引き続き所有する。

現行の`docs/plan_codex-full-support.md`に残っていた独立Codegraphの現在形は、
LatticeがCodegraphを完全吸収した現正典へ訂正した。現役コア8製品の当該枠はLatticeであり、
独立Codegraphはretired／not_applicableの履歴だけを保持する。

以上により、`cf-0157`の責務を「台帳完成、完了した旧実装planのarchive、後続工程の
Latticeへの明示移管」に限定して完了とする。`cf-0024`、`cf-0281`、`cf-0282`などの
未完了を、本taskのarchiveによってgreenへ拡張しない。

## 検証

- `docs/plan_gpt56-rewiring.md`: archiveへの互換stubで、進行中正本ではない
- `docs/plan_callout-hooks.md`: 端末横断の後続受入をLatticeへ移管済みと明記
- `docs/archive/plan_gpt56-rewiring.md`: 履歴本文あり
- `docs/archive/plan_callout-hooks.md`: 履歴本文あり
- `docs/archive/plan_lattice-factory-integration.md`: 正規archiveあり
- 現役製品台帳: Latticeを含み、独立Codegraphを含まない

Lattice製品repoは変更していない。廃止済み`codex-rc`は利用していない。

