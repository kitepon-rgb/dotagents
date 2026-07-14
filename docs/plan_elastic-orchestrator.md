# Elastic Multi-Agent Orchestrator 現状監査・設計裁定計画

Status: Phase 0 correction proposal ready (implementation not approved; owner decision pending)

## 目的

既存の統括正典を維持したまま、任意数の論理Taskを複数Executorへ配置する
backend-agnosticな制御面が本当に必要かを確定する。提案をそのまま実装せず、既存の
contract / skills / agents / hooks / CLI / installer / testsと各実行入口の実挙動を一次根拠に、
再利用、矛盾、重複、過剰設計、MVP非目標を親が裁定する。

`got-connector` という提案中の表記は、オーナー確認により現行コア製品
`gpt-connector`（MCP ID `gpt_connector`）のことである。別Executorとして登録しない。

## 着手裁定

- Phase 0 読み取り監査: `A`。sorter / refuter / 外部実行レーンを使える。
- 共通契約、依存方向、state所有、F/A/H、finalizationの最終裁定: `F`。親直轄。
- credential / login、publish / deploy、本番外部状態変更、意図的障害試験: `H`。

## 監査対象

- `shared/orchestrate/contract.md`
- `codex/skills/orchestrate/SKILL.md`
- `claude/skills/orchestrate/SKILL.md`
- `codex/agents/*.toml` / `claude/agents/*.md`
- `docs/02_models.md` と現行の生きたplan
- `bin/verify-codex-agent-routing.sh`
- `bin/onset-gate-hook.sh` / `bin/codex-callout-hook.sh`
- `.codex-sidecar.yml`
- `gpt-connector` / `aiterm-mcp` / `codex-sidecar` の正典・設定・起動・回収経路
- `install.sh` / `bin/verify-install.sh` / 関連tests

## TODO

### Phase 0A: 既存契約と重複の棚卸し

- [x] 提案中の `got-connector` を `gpt-connector` の表記揺れと確定する。
- [x] caveatと`rag/INDEX.md`を先に検索する。
- [x] 上記の監査対象を確認し、提案項目と既存機構の対応表を作る。
- [x] Task / Role / Executor / Worker Run / Finding / Decision / Approvalのうち、既に
  正典化済み・未実装・不要な重複を分類する。
- [x] 「子からの入れ子Codex禁止」は現行正典では既に撤回済みと実物確認し、
  staleな監査前提として棄却する。
- [x] Ledger / hook / Throughline / BugHub / 各製品stateの所有境界を整理し、責務逆流を検出する。

### Phase 0B: Executor実挙動と能力matrix

- [x] Codex nativeの実capacity、routing smoke、follow-up、cancel/timeout、runtime handleを確認する。
- [x] `gpt_connector`のconsultation専用契約、session回収、model/effort、timeoutを確認する。
- [x] `aiterm-mcp`のCodex/Grok/Composer session ID、継続入力、完了検出、中断、workspace、失敗分類を確認する。
- [x] `codex-sidecar`のconcurrency、worktree ownership、read-only強制、job回収、cancel/timeoutを確認する。
- [x] Claude internal agentの現行capacityと委譲契約を確認し、Codex親からの直接dispatchは
  現時点で未確認と記録する。
- [x] unknown capabilityを`true`や無制限に丸めず、一次仕様・code・実測の根拠付きmatrixを作る。

### Phase 0C: 実装前設計裁定

- [x] `git rev-parse --git-path`が通常repo / linked worktree / bare / non-git / 複数writerに適合するか実測する。
- [x] snapshot + append-only eventsの二重書きとcrash consistencyを検討し、MVPから棄却する。
- [x] 外部dependency無しのschema validation範囲とmigration責務を裁定する。
- [x] write scopeはfile/directoryに限定し、globはMVPから外すと裁定する。
- [x] independence L0–L4の機械判定範囲とAI裁定範囲を分離し、同名尺度を棄却する。
- [x] scheduler scoring、campaign/barrier、自動adapter、hook hard-failをMVPの過剰設計として棄却する。
- [x] privacy、secret、prompt/evidence保存上限、archive/cleanup/backup契約のMVP境界を裁定する。

### Phase 0D: 反証と親裁定

- [x] Find 結果をDedupし、提案の矛盾・重複・過剰設計の各指摘を独立refuterに殺させる。
- [x] 別lineageのCriticに「必要な制御面を削りすぎていないか」を監査させる。
- [x] 件数遷移、棄却理由、未確認能力、MVP非目標を記録する。
- [x] 親が修正版MVP、段階導入、受け入れ条件、不採用項目を根拠付きで提示する。
- [ ] オーナーの裁定前にLedger core / adapter / scheduler / hookを実装しない。

### Phase 1以降（Phase 0裁定後の候補、未承認）

- [ ] 承認された最小Ledgerとglobal gatesのみを独立waveで実装する。
- [ ] dogfoodで必要性が実証されたExecutor adapterを1本ずつ追加する。
- [ ] dry-run scheduler、campaign/barrier、hook advisoryはそれぞれ別裁定・別commitとする。
- [ ] 監査と中規模実装でdogfoodし、永続知識を正典/RAG/Caveat/testsへ還流する。
- [ ] 完了後に本planを`docs/archive/`へ退避する。

## 非目標（Phase 0）

- Ledgerやschedulerを実装しない。
- Codex nativeの製品制約やprovider rate limitを迂回しない。
- worker数、多数決、別processであることを品質・独立性の代理にしない。
- 子に親の裁定、H承認、finalizationを委譲しない。
- 外部Executor固有の差を共通抽象で隠さない。
- 不明な能力を推測でRegistryへ固定しない。

## Phase 0の完了条件

- 一次根拠付きExecutor capability matrixがある。
- 既存機構の再利用表と、提案の矛盾・重複・過剰設計の裁定がある。
- 独立反証を生き残った修正版MVPと、明示的な非目標がある。
- オーナーが実装へ進むかを裁定できる。

## Phase 0監査結果

### 故障仮説と再現性

| ID | 故障 | 裁定 |
|---|---|---|
| F1 | timeout後の同一Task重複発行 | 現行契約は防止を要求するが、複数入口横断の一覧はない |
| F2 | 同一workspaceのwriter scope競合 | 現行契約は非交差を要求するが、機械的横断検査はない |
| F3 | timeout／圧縮／再開後にruntime handleを失う | 今回の長期作業と引継ぎ失敗で、会話外の回収記録が必要と確認 |
| F4 | Executorのcompletedを親のacceptedと誤認 | 現行契約は分離済み、機械stateは未実装 |
| F5 | F/Hまたは相談レーンをwriterへ誤配置 | 現行正典・hookは警告できるが、意味判断は親が保持すべき |
| F6 | セッション再開が親の会話記憶へ依存 | Throughline引継ぎ不成立とcontext圧縮で実在を確認 |

文書テンプレートだけではF3/F6のruntime handleと状態不明を保持できない。一方、汎用
workflow engineはF1〜F6の解決に不要である。したがって、意味と裁定は既存文書を正本の
まま維持し、忘却・重複・競合・状態不明・誤受入だけを支える薄いControl Recordを候補とする。

### 既存機構の再利用と所有境界

| 対象 | 現在の正本 | Control Recordが所有してよいもの |
|---|---|---|
| F/A/H、Role、フェーズ、反証、最終裁定 | `shared/orchestrate/contract.md`、各skill、`docs/02_models.md` | 識別子と参照だけ。意味をschemaへ複製しない |
| Taskの目的・TODO・非目標・Decision・Finding | 対象projectの`docs/`とgit履歴 | task ID、checkbox／文書参照、短いdecision refだけ |
| gpt-connector job | gpt-connectorのproduct-owned state | consultation kind、slug、last observed state/timeだけ |
| aiterm session | aiterm/tmux session | session ID、agent kind、workspace、last observed state/timeだけ |
| codex-sidecar run/worktree | codex-sidecar durable run manifest | idempotency key、run/worktree参照、last observed state/timeだけ |
| Codex native child | Codex親session | agent ID、role、last observed state/timeだけ |
| BugHub | ServerManager/BugHub | Control Recordのruntime stateを保存しない |
| Throughline | Throughline | batonの代用・状態保存先にしない |

Control Recordは各製品のsession/job状態、認証、cancel、migrationを複製しない。opaque handleを
使って所有製品へ再照会する。恒久知識、承認そのもの、親の意味裁定も所有しない。

### Executor capability matrix

`confirmed`は一次コード・正典・実測で確認した能力、`unknown`は推測で埋めない能力である。

| 入口 | lane / confirmed | structural restriction | unknown / current verification |
|---|---|---|---|
| Codex native | externalではない密結合worker。agent ID、follow-up、interrupt、role routing | 自動worktree隔離なし。roleのsandbox指定は親実効permissionと別 | config `max_threads=10`に対し現session実効は親込み4。capacity固定不可。実行確認済み |
| gpt-connector | consultation専用。caller既知slug、`consult`、`sessions`、model/effort検証 | repo write、shell、worker、explicit cancel、暗黙fallbackは非対応 | rate limit／account capacityはunknown。今回consult成功 |
| aiterm | Codex/Grok/Composerの対話TUI。session ID、継続入力、agent_done、C-c、close | read-only強制・worktree隔離・batch exit status保証なし | concurrency/rate limitはunknown。0.12.3公開packageで3agent smoke済み。現sessionのMCP processは0.12.2 |
| codex-sidecar | read-only workflow、writer専用worktree、durable start/result/cancel/recover | 対話TUI・Grok/Composer非対応 | concurrency/provider quotaはunknown。read-only実行確認済み、writer未確認 |
| Claude internal | Claude親のAgent/Workflow/CLI契約、role文書 | Codex親から直接dispatchする共通入口ではない | capacity、status/cancel/follow-up API、実行確認はcurrent Codex sessionではunknown |

`gpt-connector`はExecutor RegistryのWorker Runへ登録しない。相談記録として明示的に別種別にする。
Claude internalはClaude appendixの親固有入口であり、MVPのCodex dispatch adapter対象外とする。

### 保存先実測

2026-07-14に通常repo、既存linked worktree 3件、temp bare repo、non-git directoryで実測した。

- `git rev-parse --git-path dotagents/orchestrate/...` はmainでは`.git/...`、linked worktreeでは
  `.git/worktrees/<name>/...`へ解決され、worktree間で分断される。global conflict管理には不適格。
- `git rev-parse --path-format=absolute --git-common-dir` はmainと全linked worktreeで同じ
  common git directoryを返す。clone内の共有候補はこちら。
- bare repoでもgit-pathは解決するが、working treeを必要とするwriter Taskは成立しない。
- non-gitでは失敗する。MVPは暗黙fallbackせず、非対応または明示`--state-dir`の別裁定とする。
- 複数parent writerは自動stale lock削除を行わない。短時間のatomic lockをfail-closedで取得し、
  crash残留はstate整合を確認した親の明示recoveryだけで解除する。

### 修正版MVP候補（オーナー裁定待ち）

名称は`Elastic Orchestrator`のまま将来像として残すが、Phase 1はbackend-agnostic runtimeや
workflow engineではなく、**Orchestration Control Record**に縮小する。

1. 対象projectのdocs TODOを正本とし、Control Recordは`task_id`と文書参照を持つ。
2. 論理Taskと一回のRunを分離する。同じTaskの再試行は新Run、仕様変更は新Task。
3. Runは`worker`と`consultation`を区別する。`gpt-connector`はconsultationだけ。
4. 共通stateは`planned / dispatched / running / unknown / completed / failed / cancelled`まで。
   Executor固有raw stateとopaque handleを別に保持し、`completed`と親`accepted/rejected`を分ける。
5. repo/worktree identity、read/write scope、active writer ownershipを記録する。scopeはrepo相対の
   literal file/directoryだけ。glob、symlink先repo外、repo外writeは拒否する。
6. 能力は`true / false / unknown`、根拠種別、観測version/time、installed / registered /
   verified / execution-verifiedを保持する。静的capacity整数を真実にしない。
7. 永続化は単一のatomic `manifest.json`を唯一の一時正本とする。snapshot + events、SQLite、
   migration frameworkはMVPから外し、`schema_version`だけ初日から持つ。
8. 保存先候補は`<absolute git common dir>/dotagents/orchestrate/runs/<run-id>/manifest.json`。
   working tree、Throughline、各Executor state directoryには置かない。
9. 親だけが更新する。初期CLIは`init / status / task-record / run-record / observe /
   conflict-check / accept / reject / recover-lock / archive`の手動記録・検証に限定する。
10. 自動dispatch、poll、cancel、retry、scheduler、adapter、campaign、barrier、hook連携は行わない。

### 棄却・延期

- 汎用Task Graph／workflow engine、scheduler scoring、cost/rate最適化、dynamic registry。
- 全Executorへ共通`prepare/dispatch/poll/collect/followup/cancel`を強制するadapter抽象。
- `Finding / Decision / Approval`の汎用台帳化。文書正本への参照だけにする。
- snapshot + append-only eventsの二重正本、初期SQLite、汎用migration framework。
- 独立性`L0–L4`。既存のClaude配置層L0–L4と衝突する。lineage事実だけ記録し親が裁定する。
- hook hard-fail、LedgerによるF/H意味裁定、approval engine、子によるfinalization。
- gpt-connectorのWorker Executor登録、Claude internalのCodex共通adapter化。
- 自動stale lock削除、Executor失敗の暗黙fallback、unknown capabilityのtrue扱い。

### 監査遷移

- native refuter: `Find 11 → Dedup 7 → existence/value反証 7 → 生存7`。runtime core全延期案。
- gpt-connector Critic: 薄いControl Recordの必要性を支持し、scheduler等をP2へ棄却。
- aiterm Grok independent design: 文書テンプレート先行、manifest/Ledger延期案。
- 親裁定: F3/F6が実タスクで再現済みのため文書だけでは不足。ただし7件のP1指摘のうち、
  二重正本、偽抽象、尺度衝突、hook権限逆流、stale前提は採用し、上記MVPへ縮小した。

## 修正版Phase 1の受け入れ条件（実装承認後のみ）

1. docs TODO、各Executor state、Control Recordのownerを各フィールドで一意に説明できる。
2. active/unknown Runとopaque handleを新しい親sessionがmanifestだけから列挙できる。
3. timeoutをfailed扱いせず、所有Executorへの再照会前に同じTaskを再発行しない。
4. 同一git common directoryの全worktree／全active runを横断してwriter候補を検査できる。
5. Executor completedだけではacceptedにならず、親の検証参照が必須である。
6. `gpt-connector`をwrite/workerへ、未確認入口をwriterへ配置できない。
7. manifest更新はatomicで、不正schema・競合writer・残留lockをfail-closedにする。
8. prompt全文、secret、巨大output、製品内部stateを複製しない。
9. scheduler、adapter、hook、campaign、event logを実装していない。
10. unit test、linked worktree integration test、crash/lock recovery test、既存`make ci`がgreen。
