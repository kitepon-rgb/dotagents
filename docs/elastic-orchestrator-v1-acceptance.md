# Elastic Orchestrator v1 受入matrix

更新日: 2026-07-15

この台帳は [完成計画](plan_elastic-orchestrator.md) の v1 受入matrix 29項目を、現行の
実装・回帰テスト・Control 証拠へ一対一に対応させる。`green` はこの文書作成時点で
静的契約と対応テストを確認できたことだけを表し、未実行の provider 実測、最終監査、
`make ci` を含意しない。`部分検証` と `未検証` は最終受入の green ではない。

`audit-gauntlet` 由来の結論は根拠に使わない。gpt-connector は Consultation であり、
Worker 件数・独立監査票・Worker 成功証拠へ数えない。

| # | Criterion | Evidence | Verdict | 未検証範囲 |
| --- | --- | --- | --- | --- |
| 1 | 工場全体の固定 `max_active_children=3` を置かず、Executor ごとの観測 capacity を使う。 | `lib/orchestrate/control-record.mjs` の Registry/placement、`tests/orchestrate/control-record.test.mjs` の Registry tri-state test。 | green（契約） | 実 provider 同時稼働での capacity 観測。 |
| 2 | 全 Executor の capacity を根拠付き `known` / `unknown` として扱う。 | `lib/orchestrate/control-record.mjs` の `registryObservationRecord`、`tests/orchestrate/control-record.test.mjs` の Registry observation test。 | green（契約） | 実 provider ごとの最新観測の再取得。 |
| 3 | gpt-connector Consultation、aiterm、codex-sidecar、Codex native を同一 Control で管理する。 | `lib/orchestrate/control-record.mjs` の Worker/Consultation record、`lib/orchestrate/executor-adapters.mjs`、`tests/orchestrate/control-record.test.mjs` の adapter round-trip test。 | 部分検証 | 4製品を同一 Control で live 接続する実測。 |
| 4 | 3件超の Task/Worker を登録・回収し、`depends_on` の cycle/ready gate を検査する。 | `lib/orchestrate/control-record.mjs` の Task admission、`tests/orchestrate/control-record.test.mjs` の Task snapshot/dependency test。 | 部分検証 | 3件超を含む実 Control の session 横断回収。 |
| 5 | 3件超の外部 Run を同時管理し、native 枠を全体上限にしない。 | `docs/plan_elastic-orchestrator.md` の Phase 7 TODO、`docs/elastic-orchestrator-v1-dogfood-discovery.md`。 | 未検証 | provider 実時間の同時実行と native 枠非依存の実測。 |
| 6 | workflow capability、capacity observation、role/effect policy を検査する。 | `lib/orchestrate/control-record.mjs` の validation、`tests/orchestrate/control-record.test.mjs` の workflow capability/role policy tests。 | green（契約） | 実 provider capability の更新時再照合。 |
| 7 | read-only Run を複数 Executor へ elastic fan-out できる。 | `docs/elastic-orchestrator-v1-dogfood-discovery.md` の read-only fan-out、`tests/orchestrate/control-record.test.mjs` の read-only admission test。 | 部分検証 | provider 実時間の並行 fan-out。 |
| 8 | 全 Executor 横断で write scope/worktree 競合を検出する。 | `lib/orchestrate/control-record.mjs` の `conflictCheck`、`tests/orchestrate/control-record.test.mjs` の linked-worktree/global conflict tests。 | green（契約） | 異なる provider の live writer 競合。 |
| 9 | 独立 worktree の代替実装を区別し、自動 merge しない。 | `lib/orchestrate/control-record.mjs` の alternative validation、`tests/orchestrate/control-record.test.mjs` の `isolated-alternative` tests。 | 部分検証 | Phase 7 の競合する代替案を実 worktree で作る dogfood。 |
| 10 | provider/model/prompt family/context policy/lineage/approach family 参照を記録する。 | `lib/orchestrate/control-record.mjs` の lineage/artifact handling、`tests/orchestrate/control-record.test.mjs` の lineage/artifact tests。 | green（契約） | 実 provider metadata の全組合せ。 |
| 11 | 別 process/Executor だけで独立監査扱いにしない。 | `lib/orchestrate/control-record.mjs` の family governance、`tests/orchestrate/control-record.test.mjs` の Dedup parent-decision test。 | green（契約） | 親による実 dogfood の独立性裁定。 |
| 12 | blocked 経路を新しい根拠なしに再投入できない。 | `lib/orchestrate/control-record.mjs` の approach family block/reopen、`tests/orchestrate/control-record.test.mjs` の governance tests。 | green（契約） | 実 Finding lifecycle での再投入。 |
| 13 | Control/Run budget を設定し、unknown usage を 0/無制限に丸めない。 | `lib/orchestrate/control-record.mjs` の budget validation、`tests/orchestrate/control-record.test.mjs` の Budget Envelope test。 | green（契約） | 実 provider usage の収集。 |
| 14 | approach family の投入上限と retry 上限を管理する。 | `lib/orchestrate/control-record.mjs` の placement policy、`tests/orchestrate/control-record.test.mjs` の family/retry placement test。 | green（契約） | 実 retry 運用での境界確認。 |
| 15 | Finding/Decision/finalization の意味は親が docs 正本で確定し、Control は参照と phase gate を持つ。 | `shared/orchestrate/control-record.md`、`lib/orchestrate/control-record.mjs` の artifact/phase gate、対応する artifact/phase tests。 | green（契約） | 最終 dogfood の親 Decision。 |
| 16 | 子の Ledger 更新を禁じ、lock/revision で競合更新を拒否する。 | `lib/orchestrate/control-record.mjs` の mutation/lock recovery、`tests/orchestrate/control-record.test.mjs` の atomic reader/lock recovery tests。 | green（契約） | 複数 host 実運用での lock recovery。 |
| 17 | 外部 Executor の失敗を暗黙 fallback で green に丸めない。 | `lib/orchestrate/executor-adapters.mjs` の failure projection、`tests/orchestrate/executor-adapters.test.mjs` の failure matrix test。 | green（契約） | 各 provider の live failure code。 |
| 18 | Executor `completed` と親 `accepted` / `rejected` を区別する。 | `lib/orchestrate/control-record.mjs` の report import/accept/reject、`tests/orchestrate/control-record.test.mjs` の strict Worker Report test。 | green（契約） | aiterm/sidecar の実 terminal evidence を伴う受入。 |
| 19 | session 横断で Task/Run/opaque handle/receipt/取消/budget/gate を復元する。 | `lib/orchestrate/control-record.mjs` の `statusBrief` / `resumeCheck`、`tests/orchestrate/control-record.test.mjs` の resume test。 | 部分検証 | Throughline handoff 後の実 session 再開。 |
| 20 | H approval ref、purpose/impact/rollback/operation digest なしに H Run を admit しない。 | `lib/orchestrate/control-record.mjs` の H admission validation、`tests/orchestrate/control-record.test.mjs` の H approval snapshot test。 | green（契約） | 親による真正性・scope の実承認判断。 |
| 21 | high-risk finalization に親指定の独立監査参照を要求する。 | `lib/orchestrate/control-record.mjs` の phase/finalization validation、`tests/orchestrate/control-record.test.mjs` の high-risk phase gate/finalization tests。 | green（契約） | 実 high-risk change の最終監査。 |
| 22 | working tree に一時 runtime state を置かない。 | `lib/orchestrate/control-record.mjs` の common-dir state handling、`tests/orchestrate/control-record.test.mjs` の atomic manifest test。 | green（契約） | 実 provider 側の一時状態は各製品所有で別途対象外。 |
| 23 | main/linked worktree で共通保存先と global conflict gate を維持する。 | `lib/orchestrate/control-record.mjs` の common-dir/global scan、`tests/orchestrate/control-record.test.mjs` の linked worktree tests。 | green（契約） | 実 main/worktree 間の provider writer。 |
| 24 | 新しい runtime dependency を原則追加しない。 | `package.json`、`lib/orchestrate/control-record.mjs`、`shared/orchestrate/control-record.md`。 | 部分検証 | この v1 wave 全体の dependency diff 監査。 |
| 25 | install、verify、routing、hooks、既存 skills、`make ci` が green である。 | `Makefile`、`tests/hooks/smoke.sh`、`tests/hooks/codex-smoke.sh`、`tests/skills/smoke.sh`、`docs/plan_elastic-orchestrator.md` の Phase 6 gate。 | 未検証 | Phase 7 修復後の一括 `make ci` と install/verify 再実行。 |
| 26 | 新 Executor を core 大改造なしに versioned adapter/handle schema/capability として追加できる。 | `lib/orchestrate/executor-contracts.mjs`、`lib/orchestrate/executor-adapters.mjs`、`tests/orchestrate/executor-contracts.test.mjs` の synthetic contract tests。 | green（契約） | 実製品 adapter 追加の migration/rollback wave。 |
| 27 | 中規模実装1件と監査1件で operator-driven 縦切りを dogfood する。 | `docs/plan_elastic-orchestrator.md` の Phase 7 TODO、`docs/elastic-orchestrator-v1-dogfood-discovery.md`。 | 未検証 | 中規模 implementation、監査、回帰、最終裁定。 |
| 28 | dogfood結果を正典、RAG、Caveat、tests の正しい所有先へ還流する。 | `docs/elastic-orchestrator-v1-dogfood-discovery.md`、`docs/elastic-orchestrator-v1-dogfood-decision.md`。 | 未検証 | RAG/Caveat と最終 knowledge return の所有先への還流。 |
| 29 | Control-level finalization 後に本 plan を `docs/archive/` へ退避する。 | `lib/orchestrate/control-record.mjs` の `finalizeControl` / `archive`、`tests/orchestrate/control-record.test.mjs` の finalization/archive tests。 | 未検証 | matrix 全件 green、Control finalization、plan の archive 移動。 |

## 受入時の判定

この表は現行の実装根拠を固定するための台帳であり、Control-level finalization や v1 完成宣言ではない。
最終判定では、`部分検証` と `未検証` の各範囲を実施して証拠を追加し、29項目すべてが green であることを
親が確認する。gpt-connector の consultation 結果は、その親判断の補助に限り、Worker 成功・独立監査・
受入票には昇格させない。
