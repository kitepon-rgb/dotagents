# Lattice編入plan final reconciliation

- Date: 2026-07-20
- Plan: `lattice-factory-integration`
- Lattice release: `@quolu/lattice@0.8.0`
- Lattice commits: `1f79182`（実装）、`4c208a4`（公開証拠）
- dotagents commits: `7a79778`（active run配線）、`13bffd8`（割込み状態保全）

## Pending stateと現実の照合

| task | 判定根拠 |
|---|---|
| `lf-0168`, `lf-0187` | spawn結合索引化はLattice `6c82461`。shell／Markdown／configを根拠なくgraph化しない裁定を維持 |
| `lf-0299`, `lf-0311` | 実store Gantt、network 0、keyboard・狭幅focused、store bytes不変。オーナー確認「工程表の見え方はまぁOK」 |
| `lf-0317` | SessionStart／Stop／settings配線をisolated HOMEとdotagents full CIで受入 |
| `lf-0324` | `lattice-todo-inventory --verify-cutover`がlive checkbox 0を確認。憲法へLattice唯一正本を反映 |
| `lf-0475` | wire v3前提完了後にwire v4を実施 |
| `lf-0476` | ADR 0060、Lattice 0.8.0、`.lattice/runs/`、list／resume／close／abandon、advisory実repo smoke |
| `lf-0484`, `lf-0486` | wire v4 fixed 12製品、Lattice必須・Codegraph拒否、exact schema／adapter／tests |
| `lf-0489`, `lf-0490`, `lf-0494` | 4 hostで旧package・command・process・daemon・MCP・update経路0。履歴／attributionだけを保持 |
| `lf-0497`, `lf-0498` | BugHubはCodegraph `not_applicable`履歴を保持し、4 active hostをLattice 0.7.3 canaryで受理 |
| `lf-0500` | 下記rollback drillで旧package復旧可能性とbackup実在を確認。恒久配線は0 |
| `lf-0502` | Lattice／dotagents full gate、cross-provider refutation、knowledge return、plan archiveを完了 |
| `lf-0555` | ADR 0060と共通strict timestamp validator。実在しない暦日をruntime／seamでreject |
| `lf-0598` | WIPをproject別で増枠せず、同じオーナー依頼のactive thread全体で数えると共通憲法へ明記 |
| `lf-0600` | オーナーがCodegraph即時撤去を最優先裁定し、Oracle drill未完を待機理由にしない判断を実行 |

## Rollback drill

隔離prefix `/tmp/lattice-codegraph-rollback.0Zk5de`へ`@colbymchenry/codegraph@1.4.1`を導入し、
隔離commandが`1.4.1`を返すことを確認した。Macのowner-only backupにはpre-cutoverの`config.toml.bak`、
`.claude.json.bak`、daemon record群が存在する。drill後に隔離prefixを削除し、global packageとPATH commandが
ともに不在（exit 1）のままであることを再確認した。rollback入口をinstaller、updater、MCP、daemonへ残していない。

## Final gates

- Lattice focused: 81 passed / 0 failed
- Lattice full: root green、sensor 2414 passed / 37 skipped、syntax green
- dotagents: `make lint`、`make ci` green
- npm: `@quolu/lattice@0.8.0`、shasum `e44d53068a19420923dbb6df53d4ae2dd2c78ae2`
- global smoke: version 0.8.0、実repo active表示→resume→abandon→event verify→active 0
- plan本体は`docs/archive/plan_lattice-factory-integration.md`へ退避し、live pathはTODOを持たないpointerだけを残した
