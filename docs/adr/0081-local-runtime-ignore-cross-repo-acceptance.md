# ADR 0081: 端末ローカル生成物ignoreのcross-repo受入

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `factory-master/fm-0635`
- Repositories: Throughline、WebAICoding

## Decision

`fm-0635`が要求するThroughlineの`.agents/`とWebAICodingの`.playwright-mcp/`は、いずれも既存の独立commitで各repoの`.gitignore`へ収容され、origin/mainへpush済みである。工程表への移転後もpendingのまま残っていたため、現在のGit履歴とignore動作を再検証して完了へ移す。

| repo | canonical entry | 実装commit | 検証 |
|---|---|---|---|
| Throughline | `/.agents/` | `70e63129f34963026eb199f05a641f03423024fe` | commit実diffは`.gitignore`への3行追加だけ。`git check-ignore -v .agents/probe`が`.gitignore:34`を返す |
| WebAICoding | `.playwright-mcp/` | `2b056a58f3ade1d50733911bf8217cfc836b84fb` | commit実diffは`.gitignore`への1行追加だけ。`git check-ignore -v .playwright-mcp/probe`が`.gitignore:26`を返す |

再検証時点で両repoのHEADとorigin/mainは一致し、各commitはcurrent historyに含まれる。したがって、生成物を削除した事実ではなく、端末ローカル生成物が今後Gitの未追跡候補へ混入しない契約と実動作を受け入れる。

## Concurrent-work exclusion

再検証時には、Throughlineで`CLAUDE.md`、`README.md`、`bin/throughline.mjs`、`docs/05_codex_first_roadmap.md`、`src/cli/codex-handoff-start.mjs`と関連test、WebAICodingで`docs/publishing.md`に別作業の未コミット変更が存在した。本工程はそれらを編集、stage、commit、破棄せず、過去commitとread-only ignore probeだけを証拠にする。

## Task closure

`fm-0635`を独立した`start`→`done` transactionで閉じ、本ADRのtyped evidence descriptorを関連づける。両製品repoへ追加commitは作らず、dotagentsのLattice stateだけを更新する。
