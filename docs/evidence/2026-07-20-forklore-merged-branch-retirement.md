# forklore 統合済み branch 終活証拠

## 結論

2026-07-20、`kitepon-rgb/forklore` の統合済み remote branch
`docs/stack-auth-cloudflare-2026-06-25` だけを削除した。対象 commit、PR #1、default branch
`main` は保持されている。

## 操作契約

- Control: `forklore-branch-retirement-20260720`
- 工程: `factory-master/fm-0632`
- 承認・判断: `docs/adr/0084-forklore-merged-branch-retirement.md`
- 操作: `DELETE repos/kitepon-rgb/forklore/git/refs/heads/docs/stack-auth-cloudflare-2026-06-25`
- operation digest: `67f8fa963fecd58b648991a94558651739275f574bfe55c74daa1861aed52b96`
- rollback: `refs/heads/docs/stack-auth-cloudflare-2026-06-25` を
  `43d0826385b423235d69e6e783086299d69e18bf` で再作成する

## 実行直前 preflight

| 検査 | 観測値 | 判定 |
|---|---|---|
| target branch head | `43d0826385b423235d69e6e783086299d69e18bf` | 固定値と一致 |
| branch protection | `protected=false` | unlock不要 |
| main head | `dd356d14499ff6eb5c269f17686e2b78f351523d` | 固定値と一致 |
| PR #1 | `merged_at=2026-06-26T21:57:16Z` | merge済み |
| PR head | `43d0826385b423235d69e6e783086299d69e18bf` | targetと一致 |
| compare `target...main` | `ahead_by=250`, `behind_by=0` | targetはmainに完全包含 |
| merge base | `43d0826385b423235d69e6e783086299d69e18bf` | target headと一致 |
| branch inventory | SHA-256 `2443963690002261b7869f9273476a9515fdd8819b8139c76e34549831683499` | target 1件 |

全条件一致後に、固定したDELETEを1回だけ実行した。unlock操作は行っていない。

## postflight

| 検査 | 観測値 | 判定 |
|---|---|---|
| target branch endpoint | `HTTP 404` | 削除済み |
| target branch inventory count | `0` | 削除済み |
| main head | `dd356d14499ff6eb5c269f17686e2b78f351523d` | 不変 |
| PR #1 state | `closed` | 不変 |
| PR #1 merged_at | `2026-06-26T21:57:16Z` | 不変 |
| PR #1 head | `43d0826385b423235d69e6e783086299d69e18bf` | commit参照を保持 |
| branch inventory | SHA-256 `ba9d451b8e3b4e30a258f427ebcc95b4f4c909be0efeab0a378efca95288f857` | targetなし |

## 非変更

- `forklore` のdefault branch、commit、PR、release、設定は変更していない。
- `dotagents` では証拠・工程状態だけを更新する。
- Lattice本体・Lattice repo・Lattice実装は変更していない。
