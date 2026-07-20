# ADR 0084: forklore統合済みbranchの対象限定削除

- Date: 2026-07-20
- Status: Accepted
- Lattice task: `factory-master/fm-0632`
- Classification: H
- Owner approval: このthreadの「H承認について、私は承認する」（2026-07-20）
- Operation digest: `67f8fa963fecd58b648991a94558651739275f574bfe55c74daa1861aed52b96`

## 決定

`kitepon-rgb/forklore`のremote branch
`docs/stack-auth-cloudflare-2026-06-25`だけを削除する。branch protection／lockは現在無効なため、
解除操作は行わない。他branch、default branch、repository設定は変更しない。

operation digestは次のcanonical JSON（キー昇順、末尾改行付き）のSHA-256へ束縛する。

```json
{"action":"delete_remote_branch","branch":"docs/stack-auth-cloudflare-2026-06-25","expected_default_branch":"main","expected_default_head_sha":"dd356d14499ff6eb5c269f17686e2b78f351523d","expected_head_sha":"43d0826385b423235d69e6e783086299d69e18bf","expected_protected":false,"merged_at":"2026-06-26T21:57:16Z","merged_pr":1,"repo":"kitepon-rgb/forklore","rollback":"recreate refs/heads/docs/stack-auth-cloudflare-2026-06-25 at 43d0826385b423235d69e6e783086299d69e18bf"}
```

## 根拠とpreflight

- repositoryはprivate・non-archived、default branchは`main`。
- PR #1は当該branchから`main`へ2026-06-26にmerged済み。
- branch headは`43d0826385b423235d69e6e783086299d69e18bf`。
- `main` headは`dd356d14499ff6eb5c269f17686e2b78f351523d`。
- compare結果はmerge baseがbranch head、`behind_by=0`であり、branch headは`main`へ包含済み。
- branchは`protected=false`、protectionはdisabled。
- 当該head branchを使うPRはmerged済みの#1だけ。

削除直前にもbranch名、head SHA、protection、PR状態、default branchとhead包含を再確認する。
どれかが変化していれば操作を停止し、別branchへ読み替えない。

## 影響とrollback

影響はremote branch ref 1本の削除だけ。commit objectとmerged PR履歴は`main`に保持される。

rollbackはGitHub refs APIで同名branchを削除前SHAへ再作成する。再作成後、branch headとPR参照を
read-only確認する。削除後は当該branchが404、`main` headが不変であることを受入条件とする。

## 非目標

- 他の古いbranchを同時に削除しない。
- repository archive、rename、visibility、default branch、protection、rulesetを変更しない。
- Lattice本体またはLattice製品repoを変更しない。
