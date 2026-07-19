# Lattice TODO全転記・照合計画

**Status:** Active — Lattice wire v4 cutover / release受入中  
**作成日:** 2026-07-19  
**対象repo:** dotagents / Lattice

> 実行順と全体状態の親正本は[開発工場 統合マスター計画](plan_factory-master.md)。本書は、既存Markdown
> TODOをLatticeへ全転記・校正し、Latticeを唯一のTODO正本へ切り替えるための詳細受入TODOを所有する。
> Lattice工程表面の実装計画はLattice repoの`docs/plan_lattice_gantt.md`が正本であり、本書はその利用者・
> 移行者として必要な受入契約を定める。

## 1. 目的と成功条件

本プロジェクトのTODO管理は、最終的にLatticeを正本とする。MarkdownからLatticeへの初回変換に誤りが
生じることは想定内であり、AIが元MarkdownとLatticeのtaskを照合し、Lattice側を正すことが仕事である。
変換結果を正しいものとして受け入れたり、差異をMarkdownへ戻すfallbackにしてはならない。

現時点ではLatticeのauthoring/reconcile公開機能が不足するため、本書のMarkdown checkboxを一時台帳とする。
必要な機能をLattice本体へ実装して自ら校正作業に使い、全対象を移した後は本書自身も最後にLatticeへ移行する。
そのcutoverをもってMarkdownによる進捗管理を終了し、本書をarchiveする。

成功条件:

- [ ] 対象7文書の開始母集団656件が、Lattice上のactive taskまたは理由付きexcluded tombstoneの
  どちらか一方へ一意に対応し、source provenanceで元文書・anchorを追跡できる
- [ ] 各対応について、状態、内容、title、lane、依存、親子関係、source anchorを元Markdownと照合済みである
- [ ] 全完了・archive・明示supersededの文書やtaskを、移行・再importで復活させない
- [ ] `registered_unreconciled`から`reconciled`への遷移が機械可読で、未照合の登録を完了扱いにしない
- [ ] Latticeの全対象planで`todo verify`がgreenとなり、status・Gantt・AI向け案内が同じ正本を示す
- [ ] AIが新規作業時にLatticeの現在task、依存、校正状態を読め、Markdown checkboxを進捗正本として更新しない
- [ ] 本書自身を最後にLatticeへ移行し、全数差分検査とcutoverを経てMarkdown進捗管理を終了する

## 2. 非目標

- archive配下、全checkbox完了済み、または明示`superseded`の文書を再移行しない。
- MarkdownとLatticeを恒久的な二重正本にしない。Markdownへの書戻し・fallbackで差異を隠さない。
- 曖昧な意味をAIが推測して書き換えない。意味裁定だけはオーナーへ確認する。
- Latticeの既存v2 store bytes、digest、journalをin-placeで破壊しない。
- LatticeのCodegraph吸収情報を無視して、コード境界・依存をファイル名や行番号だけで推定しない。
- publish、global install、push、または既存dirty差分の整理を本書の非H作業に含めない。

## 3. 対象母集団と開始時baseline

開始時点でdotagents / Latticeとも`main == origin/main`。dirtyはdotagentsの
`docs/plan_lattice-factory-integration.md`とLatticeの`docs/plan_lattice_gantt.md`にある見た目改善作業だけで、
本計画の編集・照合対象外として保護する。下表の数値は開始時baselineであり、移行直前に再集計する。

| source文書 | 未完 / 完了 | 想定plan_key | 照合状態 |
|---|---:|---|---|
| [plan_bughub-factory-integration.md](plan_bughub-factory-integration.md) | 28 / 175 | `bughub-factory-integration` | 未登録 |
| [plan_codex-full-support.md](plan_codex-full-support.md) | 40 / 39 | `codex-full-support` | 未登録 |
| [plan_factory-master.md](plan_factory-master.md) | 34 / 85 | `factory-master` | 登録済み・未再照合 |
| [plan_gpt56-rewiring.md](plan_gpt56-rewiring.md) | 6 / 32 | `gpt56-rewiring` | 未登録 |
| [plan_lattice-factory-integration.md](plan_lattice-factory-integration.md) | 23 / 59 | `lattice-factory-integration` | 未登録 |
| [plan_observer-factory-integration.md](plan_observer-factory-integration.md) | 17 / 101 | `observer-factory-integration` | 未登録 |
| [queue_memory-promotion.md](queue_memory-promotion.md) | 5 / 12 | `memory-promotion-queue` | 未登録 |
| 本書（最後にのみ移行） | 作成後に再集計 | `lattice-todo-reconciliation` | 自己閉包待ち |

開始時合計は未完153、完了503、全656である。除外は`docs/archive/`の28件、明示supersededの
`plan_callout-hooks.md`、archive参照だけを残す`plan_elastic-orchestrator.md`である。将来の再棚卸しでは、
「archive配下」「全完了」「明示superseded」を除外条件として機械的にも確認する。

現storeは`factory-master`のみで、110 tasks、hard dependencies 67、snapshotはdone 83 / pending 24 /
in-progress 3、imported 86、`evidence_unverified` 0である。これは移行済みの証明ではなく、Phase 5で
sourceとのtask-level再照合を要する開始点である。

## 4. F/A/H分類と配置

| 区分 | 対象 | 配置・受入 |
|---|---|---|
| F | todo schema/event、公開CLI、reconcile契約、Latticeを正本にするcutover | 親直轄。契約criticalな変更ごとに独立refuterを通す |
| F | source provenance、digest互換、idempotency、fail closed、除外・復活防止 | 親直轄。既存v2 read/write互換を実証して受入 |
| A | 仕様固定後のCLI・fixture・migration実装、大量task照合、一覧抽出 | workerへ委譲可。範囲・入力・期待差分・検証を固定し、親が受入 |
| A | Codegraph吸収情報を使うコード境界・依存候補のread-only抽出 | workerへ委譲可。意味裁定やstore更新は親へ戻す |
| H | version決定、npm publish、global install、push、実host設定・MCP変更 | 実行時に目的・影響・rollbackを示してオーナー承認後のみ |

## 5. 並列方針

- Latticeがauthoring/reconciliationを正常に扱えるまでは、同一repoのwriterを一人に直列化する。
- source Markdownのread-only棚卸し、anchor抽出、差分候補の監査は並列でよい。ただしstore更新を伴わせない。
- Lattice repoとdotagents repoは、変更対象・受入gateが非交差のwaveだけ並列化できる。
- `docs/plan_lattice-factory-integration.md`とLattice `docs/plan_lattice_gantt.md`の既存見た目改善dirtyは、
  本計画の全waveから除外し、revert・整形・巻込み・状態変更をしない。

## 6. 実行TODO

### Phase 0 — baseline・棚卸し

- [x] dotagents / Latticeの`main == origin/main`、対象外dirty、編集境界を開始時baselineとして記録する
- [x] 対象7文書、未完153 / 完了503 / 全656、archive 28件、superseded / archive参照の除外を確定する
- [x] 番号付きGFM checkboxを含む全checkbox抽出で、BugHub planの旧集計が29件不足していたことを訂正する
- [x] 現storeが`factory-master`のみで110 tasks、67 hard dependencies、done 83 / pending 24 / in-progress 3、imported 86、`evidence_unverified` 0であることを記録する
- [x] dotagents内の`lattice.todo_extraction.v1|v2`を検索し、実artifactが`docs/migration/g4-extraction-factory-master.json`の1件だけ、`lattice.todo_migrate_result.v1`保存物がゼロであることを確認する。残る6 plan＋queueは抽出artifact生成から必要と記録する
- [x] Lattice公開todo CLIが`status`、`verify`、`snapshot --rebuild`、`gantt`、`migrate`だけであることを監査する
- [x] 公開authoring / revise / reconcile CLIがなく、内部APIには`appendTodoEvent(start/block/unblock/done/reopen等)`と`createSuccessorTodoPlan`があることを記録する
- [x] description / priority / owner / acceptance / 親子 / reconciled状態が現schemaにないことを記録する
- [x] `lattice todo status`の実時間5回が2.83〜4.26秒で、dotagents `lib/lattice-hook.py`の固定2秒timeoutが起動案内失敗を再現することを記録する
- [x] 本書を一時台帳として作成する

### Phase 1 — authoring / reconciliation契約とADR追補

- [x] Lattice repoで`todo revise`を1 planのfull desired-state successor発行に限定し、patch、部分CRUD、
  Markdown fallback、再migrationを禁止する境界をADR 0055へ固定する
- [x] `lattice.todo_revision.v1`、`todo_plan.v3`の`parent_task_id`、`todo_event.v2` genesis、
  `carry | reset_pending | removed`、source inventory＋excluded tombstone、
  `registered_unreconciled→reconciled`をexact schemaとして定義する
- [x] predecessor CAS、legacy v1/v2 bytes・digest・journal不変、plan単位all-or-nothing、
  deterministic retry / crash recovery、typed errorをfail closed契約として定義する
- [x] Codegraph吸収後のsensor / graph情報は依存候補の補助根拠に限定し、source / plan / store digestを
  置き換えない入力境界を定義する
- [x] Opus refuterの反証を受け、対象656件すべてをactive taskまたは理由付きexcluded tombstoneへ
  一意対応させる成功条件と、初回revisionの非目標を確定する

初回revisionの非目標は`command_id`、multi-plan atomic、TODO MCP、dry-run、merge、
description / acceptance / priority / owner、start / block / unblock / done / reopenの公開transition verbである。
これらはfactory校正を成立させるG5最小面へ混ぜず、必要時に後続ADRで扱う。

### Phase 2 — safety test、実装、CI

- [x] ADR 0055のfixtureを先行し、v1 event raw bytes、v3 plan / v2 genesis dispatch、state carry / reset / removed、
  source inventory完全性、reconcile、重複・復活拒否のred testを固定する
- [x] v3 planとv2 genesis reader / writerを追加する。ただし既存v1/v2 store bytes / digest / journalを
  in-place変更せず、reader・migration・rollback互換を検証する
- [x] Lattice本体へ`todo revise`公開CLI、successor transaction、projection、status / verifyの
  reconciliation表示を実装する
- [x] stale predecessor、source digest不一致、anchor drift、全完了・archive・superseded除外、依存削除、
  crash point、exact retry / 異bytes conflictのfixtureを実装する
- [x] focused、related、`npm run ci`を通し、契約critical差分はクロスprovider反証を受ける

### Phase 3 — release / install

- [x] version、changelog、pack smoke、tarball install smoke、rollback手順をLattice repoで準備する
- [ ] H承認後にpublishし、registry install smokeを通して対象hostへglobal installする
- [ ] 公開後に`lattice todo status`、`verify`、`migrate`、authoring / reconcile CLIのsmokeを実施し、versionと契約を記録する

### Phase 4 — dotagents hook timeout・案内契約

- [x] `lib/lattice-hook.py`の固定2秒timeoutをCLI 5秒へ、Claude/Codex外側hookを6秒へ置換する。cache / store直読は追加しない
- [x] 遅い成功を起動案内失敗として扱わず、timeout、CLI failure、invalid response、未導入、storeなし、正常応答を区別する
- [ ] hookのfocused testと`make lint`、関連hook smoke、`verify-install`を通し、Lattice正本へのAI向け案内を検証する
  - 2026-07-19親再検証: focused smoke 2本、`tests/install/clean-home.sh`、`make lint`はgreen。実host設定applyと実host `verify-install`はH未実施のため、本項は未完のまま。

### Phase 5 — source別登録・task-level校正

- [ ] 移行直前に、コードフェンス外の番号付き項目を含むGFM checkbox全件を再集計し、baselineとの差分と除外理由を記録する
- [ ] [plan_factory-master.md](plan_factory-master.md): 既存110 tasksをsource taskへ再対応付けし、抜け、重複、誤分割、title、status、lane、dependency、source anchorを校正する
- [ ] [plan_bughub-factory-integration.md](plan_bughub-factory-integration.md): 登録後、task-level mappingと状態・依存・内容を校正する
- [ ] [plan_codex-full-support.md](plan_codex-full-support.md): 登録後、task-level mappingと状態・依存・内容を校正する
- [ ] [plan_gpt56-rewiring.md](plan_gpt56-rewiring.md): 登録後、task-level mappingと状態・依存・内容を校正する
- [ ] [plan_lattice-factory-integration.md](plan_lattice-factory-integration.md): 登録後、task-level mappingと状態・依存・内容を校正し、既存dirtyを変更しない
- [ ] [plan_observer-factory-integration.md](plan_observer-factory-integration.md): 登録後、task-level mappingと状態・依存・内容を校正する
- [ ] [queue_memory-promotion.md](queue_memory-promotion.md): 登録後、task-level mappingと状態・依存・内容を校正する
- [ ] 各sourceについて、抜け、重複、誤分割、title、status、lane、dependency、source anchorを機械検査とAI実読の双方で照合する
- [ ] 意味が一意に決まらない差異だけを、候補・根拠・影響を添えてオーナーへ確認する
- [ ] 校正済みtaskだけを`reconciled`へ遷移し、未照合・不一致・blockedを完了へ丸めない

### Phase 6 — 自己閉包・cutover・archive

- [ ] 本書の全TODOをLatticeへ移行し、本書自身の`plan_key`とtask-level mappingを校正する
- [ ] 全対象のsource task数、Lattice task数、除外数、重複数、未照合数の差分検査を通す
- [ ] Lattice `todo verify`、`status`、`gantt`を実行し、正本・依存・校正状態・AI向け案内が一致することを確認する
- [ ] 正典と案内をLattice正本へcutoverし、Markdown checkboxを進捗管理に使わないことを固定する
- [ ] Markdown進捗管理を終了し、本書をarchiveする

### Phase gate

- [x] Lattice: `npm run ci`、authoring / reconcile focused・related tests、pack / install smokeを通す
- [ ] dotagents: focused tests、`make lint`、`make ci`、`verify-install`を通す
- [ ] schema / event / CLI / cutoverはクロスprovider reviewを通し、AI照合手順と既知の罠をRAG / caveat / 正典へ還流する

## 7. 既知の罠

- **権威性と正確性の混同:** Latticeへ登録済みでも、sourceと照合されるまで正しいとは限らない。
- **Markdown fallback / 二重正本化:** 差異をMarkdownの再編集で解消せず、Lattice taskを校正する。
- **import再実行による重複:** source digest・anchor・idempotencyなしに再実行しない。
- **行番号drift:** 行番号単独をidentityにせず、anchor・内容digest・周辺文脈を併用する。
- **checkbox集計漏れ:** 行頭`- [ ]` / `- [x]`だけを数えると、BugHub planの`0b. [ ]`等の番号付きGFM checkboxを落とす。機械集計はコードフェンス外のGFM checkbox全形式を扱い、source実読で照合する。
- **全完了 / archivedの復活:** 対象選別とimportの両方で除外し、完了をpendingへ丸めない。
- **exact-key / digest互換破壊:** schema追加はversioned migrationで行い、v2のbytes・digest・journalを保持する。
- **cold statusの2秒超過:** 2秒固定timeoutを成功/失敗判定に使わず、観測済み遅延と失敗を区別する。
- **他者dirtyの巻込み:** 既存の見た目改善差分を編集・整形・revert・commit対象に含めない。

## 8. 検証表

| 対象 | 検証 | 合格条件 |
|---|---|---|
| schema / event | migration、v2 reader、digest / journal fixture | 既存v2を破壊せず、新fieldをfail closedに検証できる |
| authoring CLI | transition、revise、add / remove、depends_on fixture | idempotentで不正遷移・参照破壊・partial failureを拒否する |
| reconciliation | source digest / anchor drift、重複、除外、復活fixture | `reconciled`が一意に対応し、未照合を成功にしない |
| Codegraph吸収情報 | sensor / graph根拠付き依存候補照合 | コード境界を行番号・名称一致だけで決めない |
| Lattice release | CI、pack、registry / global install、公開後smoke | 公開CLIとstore契約が一致する |
| dotagents hook | cold / warm status、timeout、未導入、失敗、未照合 | 遅い成功を失敗扱いせず、AIへ正しい次行動を案内する |
| 全数cutover | コードフェンス外の全GFM checkbox集計、task数差分、verify、status、gantt、AI実読 | 対象全件が一意対応し、Markdown進捗管理を終了できる |

## 9. 初回着手結果（2026-07-19）

開始時に対象7文書と153未完 / 503完了 / 全656を確定した。BugHub planの`0b. [ ]`等の番号付きcheckboxを
旧来の行頭bullet限定集計が29件落としていたため、コードフェンス外の全GFM checkboxを対象に訂正した。Lattice storeには`factory-master`だけが登録され、
110 tasks・67 hard dependencies・snapshot done 83 / pending 24 / in-progress 3・imported 86・
`evidence_unverified` 0である。`lattice todo status`は実時間5回で2.83〜4.26秒を要し、dotagents hookの
固定2秒timeoutは案内失敗を再現した。

dotagents内の`lattice.todo_extraction.v1|v2`検索では、実artifactは
`docs/migration/g4-extraction-factory-master.json`の1件だけで、plan本文中のschema文字列はartifactではない。
`lattice.todo_migrate_result.v1`の保存物はゼロである。したがって残る6 plan＋queueは、抽出artifact生成から
開始する必要がある。

Phase 4の親受入では、workerが`tests/install/clean-home.sh`のstale-timeout negative test後の復元値を旧5秒のまま
残していたため、timeout=6期待の直後verifyが失敗した。復元値を6秒へ修正し、focused smoke 2本、clean-home、
`make lint`、許可path限定の`git diff --check`を再実行してgreenを確認した。

公開todo CLIにはstatus / verify / snapshot --rebuild / gantt / migrateしかなく、authoring、revise、
reconcileの公開面がない。内部にはevent追加とsuccessor作成があるが、description、priority、owner、
acceptance、親子、reconciled状態を表すschemaがない。この不足機能はLattice本体へ実装し、本計画の
校正作業で実使用して受入れる。

## 10. 中断handoff（2026-07-19）

オーナー指示で作業を中止し、次セッションへ引き継ぐ。

- 確定した目的: 登録後はLatticeがTODO正本であり、Markdownは照合元とする。削除、re-migrate、Markdownへのfallbackは禁止する。
- 訂正済み母集団: 現役7文書は未完153 / 完了503 / 全656。BugHubの番号付きcheckboxを旧集計が29件落としていた。
- 現store: `factory-master`は110 tasks、done 83 / pending 24 / in-progress 3、dependencies 67、sequence 86。内部整合はgreen。現行Markdownとの差は、新規未登録6件（`fm-0546`、`fm-0547`、`fm-0548`、`fm-0549`、`fm-0637`、`fm-0639`候補）、anchor null 2件（`fm-0584`、`fm-0594`）、依存前段pendingなのに後段in-progressのambiguousな2系列（`fm-0584→0585`、`fm-0586→0593`）である。明示除外3件（`fm-0375`、`fm-0396`、`fm-0480`）を復活させない。
- 採用した最小契約: `todo revise`のfull desired-state successor、state carry / reset_pending / removed、`plan.v3`は`parent_task_id`だけ、plan-levelの`registered_unreconciled→reconciled`、active＋excluded tombstone＝source全数、successor crash-retry。初回非目標はcommand_id、multi-plan atomic、MCP、dry-run、merge、description、acceptance。transition verbsは後続とする。
- Opus refuterはこの最小契約を支持した。成功条件は「全656件がactive taskまたは理由付きexclusion tombstone」であることへ訂正が必要。
- ADR 0055 draftはmain未反映。隔離worktreeの`/var/folders/v4/ntdd_q2d10q962kq3cfx8lr00000gn/T/Lattice-codex-sidecar-M6Sx0g/docs/adr/0055-todo-revision-and-source-reconciliation.md`にある。内容は親が実読済みだが、mainへコピー・commitしていない。
- dotagents hook変更: CLI timeout 5秒、外側6秒、timeout / CLI failure / invalid responseを分離した。focused smoke 2本、clean-home、make lint、diff checkはgreen。実host settings apply / verify-installはH未実施。
- dotagentsの今回変更: 新規本plan、`lib/lattice-hook.py`、`docs/03_settings-fragments.md`、`docs/05_codex-fragments.md`、`bin/apply-codex-config.sh`、`bin/verify-install.sh`、`tests/hooks/smoke.sh`、`tests/hooks/codex-smoke.sh`、`tests/install/clean-home.sh`。既存dirtyの`docs/plan_lattice-factory-integration.md`は別の見た目作業であり、今回触れていない。
- Lattice mainの見た目改善dirty / untrackedは別作業であり、今回触れていない。次セッション開始時にstatusを実読する。
- commit、push、publish、global install、settings applyは一切未実施。
- Fableはrate limitで使用不可であるため、契約反証はOpusを使用する。
- aiterm managed Claudeはpermission UIで停止するため、次回のread-only反証はnative Agent refuterを優先する。

次の一手:

1. 両repoでfetch / statusを実行し、他者dirtyを保護する。
2. ADR 0055 draftを再読し、Lattice mainへ新規ファイルとして移す。見た目dirtyと非交差にする。
3. ADRをplanへ反映し、Phase 1を閉じる。
4. 隔離worktreeでred testsから始め、revise基盤を実装する。現successorをそのまま公開しない。
5. `factory-master`の110件を最初に校正し、旧state / journal bytes不変を検証する。
6. 残り6 plan＋queueをmigrate→revise→reconciledへ進める。
7. H前で停止し、publish / global install / settings applyの目的・影響・rollbackを提示する。

開始時に読むファイル:

- 本書
- ADR 0055 draft
- Lattice ADR 0053
- Lattice `src/todo-store.mjs`、`src/todo-contracts.mjs`、`src/todo-cli.mjs`
- dotagents `docs/migration/g4-extraction-factory-master.json`

## 11. 再開後handoff（2026-07-19）

AIShell 0.2.0へのtask再接続が必要なため、再開した原子的作業の現在地を保存して停止する。

- ADR 0055はLattice mainへ他のdirtyと交差させずコピーし、`d98d538`（`docs: TODO revise契約をADRで固定`）としてcommit済み。pushは未実施。
- 実装用worktreeは`/Users/kite/Developer/Lattice-wt-todo-revision`、branchは`kitepon-rgb/lattice-todo-revision`、baseは`d98d538`。
- Codex親がCodex子を呼ぶ入口はnative subagentを既定とし、aitermのCodex launcherは具体的な隔離・durable session等が必要な例外だけにするCodex限定規範を`codex/AGENTS.delta.md`と`codex/skills/orchestrate/SKILL.md`へ反映した。共通正典には入れていない。生成test 5/5、generator check、`make lint`はgreen。
- Node公開契約は上限を一律に閉じず、実被弾のあるNode 25.xだけを穴にする。Latticeは`>=22.13 <25 || >=26`、sensorは`>=20.0.0 <25.0.0 || >=26.0.0`へ変更中。Lattice guard・sensor CLIは共通の`isNode25Affected`で25だけを拒否する。
- Node契約はredを確認後に実装した。Node 24 focusedはsensor 10/10、Lattice 12/12 green。実Node 26.5でもoverride無しの`codegraph --version`、sensor 10/10、Lattice 12/12がgreen。実装前にNode 26.5でsensor全suite 147 files pass / 3 skipped、2487 pass / 37 skippedも確認済み。
- Lattice full `npm run ci`は440/441で非green。唯一の失敗は新規worktreeがCodegraph未初期化のため`control-compiler.integration`の証拠statusが`absent`になったこと。変更由来と決めつけず、次taskで正規に`codegraph init` / indexして同じCIを再実行する。
- Node契約の未commit変更は上記worktree内のpackage / lock 4ファイル、sensor guard / CLI / test 3ファイル、Lattice guard / factory diagnostics / test 4ファイル。既存Lattice mainの見た目改善dirtyには触れていない。
- AIShell `runtime_status`は`isPaused: true`を返した。現taskの旧MCPには0.2.0の`runtime_open_manager`が公開されていないため回避せず停止した。次taskは最初に`runtime_status`を確認し、停止中または許可root不足なら`runtime_open_manager`を使う。

次taskの直近順序:

1. AIShell 0.2.0の`runtime_status`→必要なら`runtime_open_manager`で、dotagentsとLattice worktreeの許可root・稼働を確立する。
2. Lattice worktreeをCodegraph初期化・indexし、Node 24の`npm run ci`を再実行する。
3. Node 25限定blockの外部根拠とNode 26実測をdotagents `rag/`へ保存し、INDEXへ追記する。
4. Node契約変更をpath限定でcommitし、Controlのdesign gateを進める。
5. ADR 0055に従い、`todo revise`のred testsと実装へ進む。

## 12. wire v4 cutover実装現在地（2026-07-19）

- Lattice隔離worktree `/Users/kite/Developer/Lattice-wt-todo-revision` の
  `kitepon-rgb/lattice-todo-revision` は`origin/main`より10 commits先行、behind 0である。
- `lattice.todo_revision.v1`の非循環plan version、successor revision transaction、manifest CAS、
  exact retry、6 crash point recovery、revision artifact bindingを実装済みである。
- `todo revise --plan --input`、status result v3、verify result v2を実装し、v2 genesisから後続v1 eventへ
  遷移するreader/writer互換を確認済みである。
- carryはpending / in-progress / blocked / done / historical import evidenceを保存し、reset / source-seededは
  pending化する。removed taskについてもsuccessorから除外し、predecessor v1 journalとevidenceを
  バイト不変で保存するfocused testを追加した。さらにstale predecessor、anchor drift、archive / superseded /
  全完了tombstone、依存削除時のreset強制を直接fixture化し、revision writer 18/18がgreenである。
- dotagents `lib/lattice-hook.py`はstatus v1/v2/v3のexact shapeを受理し、v3のreconciliation stateと
  digest nullabilityをfail-closedに検証する。Claude/Codex hook smokeと`make lint`はgreenで、
  [ADR 0069](adr/0069-lattice-status-v3-hook-acceptance.md)へ親Decisionを固定した。
- Control `lattice-wire-v4-cutover-20260719`でhook taskとAITerm/Grokのread-onlyクロスprovider refuterを
  revision 12までにfinalizeした。監査はPASS、確定欠陥0件で、親がdiff・focused test・full gateと再照合して受け入れた。
- Lattice 0.6.0へversion bumpし、root changelogとrollback手順を追加した。`npm run ci`、pack、隔離prefixへの
  tarball install、同梱binaryによるdotagents実storeのstatus v3 / verify v2 smokeはgreenである。
- managed Claude監査は、読み取り専用`git log`でClaude Code permission UIが出た際に、
  turn相関を維持した承認応答面がAITermにないため中断した。成功扱いせず、AITerm maintenance候補とする。
- AITerm永続PTYの`wait:true`が、未読bufferに残った古いmark sentinelを現在commandの完了として返す事象を
  Lattice / dotagentsのfull gateで再現した。親は最新processと終了markerを照合して誤判定を防いだが、
  AITerm maintenance waveでoperation固有sentinelへ修正する。罠DBへ
  `aiterm-pty-read-wait-mark-sentinel-command`と`aiterm-managed-claude-session-permission-ui`をprivate記録した。
- 未完了はH承認後のpush / publish / registry install / global install / host設定、公開後実工程smoke、
  Phase 4の実host `verify-install`、Phase 5〜6の全数校正とcutoverである。
