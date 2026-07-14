# Elastic Multi-Agent Orchestrator 完成計画

Status: v1 completion target confirmed by owner (2026-07-14); Phase 1B in progress

## 目的

既存の統括正典を維持したまま、任意数の論理Taskを能力の異なる複数Executorへ配置し、
全Executor横断のlineage、approach family、証拠、予算、write/worktree競合、F/A/H、resume、
親裁定、finalizationを支える実用可能なElastic Multi-Agent Orchestrator v1を完成させる。

Phase 1のControl Recordは完成品ではなく、安全な永続制御核である。v1完成はRegistry、
operator-driven adapter、dry-run placement、campaign gate、resume、複数Executor dogfood、
knowledge returnまでを縦に通した時だけ宣言する。汎用workflow engineや完全自律swarmにはしない。

`got-connector` という提案中の表記は、オーナー確認により現行コア製品
`gpt-connector`（MCP ID `gpt_connector`）のことである。別Executorとして登録しない。

## 着手裁定

- Phase 0の機械的棚卸し: `A`。sorter / refuter / 外部実行レーンを使える。
- 監査の論点設定、existence/value裁定、契約変更: `F`。親直轄。
- 共通契約、依存方向、state所有、F/A/H、finalizationの最終裁定: `F`。親直轄。
- credential / login、publish / deploy、本番外部状態変更、意図的障害試験: `H`。

## 監査頻度のオーナー裁定（2026-07-14）

- 細かな変更単位では監査を起動しない。
- TODOを完了候補にした時、親がdiff、受け入れ条件、関連test、未検証範囲を1回監査する。
- Phaseの全TODOと通常gateが完了した時、複数視点・独立反証・Critic・親裁定を含む重い監査を1回行う。
- P0/P1相当の再現問題を除き、同じTODOへ独立監査を反復しない。修正確認は親が再現手順と関連testで閉じる。

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
- [x] scheduler scoring、完全自動dispatch、汎用DAG workflow engine、hook hard-failをv1の過剰設計として棄却する。
  dry-run placement、能力別adapter、parent-declared campaign gate、advisory hookは完成範囲へ残す。
- [x] privacy、secret、prompt/evidence保存上限、archive/cleanup/backup契約のMVP境界を裁定する。

### Phase 0D: 親による直接再検証

- [x] `audit-gauntlet`由来の指摘件数、反証結果、採否を失効させる。
- [x] 元提案の29受け入れ条件を削らず、v1 matrixへ一対一で戻す。
- [x] 元提案本文を正本プランへ直接照合し、最小Task依存グラフ、phase gate、Task要件snapshot、
  H承認範囲、状態遷移receipt、Task取消とRun取消の分離を不足項目として戻す。
- [x] 各Executor能力を一次コード、現行正典、再現コマンドで再確認し、確認できないものを
  `unknown`へ戻す。
- [x] 親自身が反対仮説と破壊テストを実行し、Control Record testの反復4回目で
  fingerprint自己driftを再現した。再現できた問題だけをPhase 1Aへ送る。

### Phase 1A: Control substrateを監査greenにする

- [x] 保存manifestへWorker／Consultation／archiveのstate truth tableを強制し、不正な組合せを
  read/saveの両方で拒否する。
- [x] read-only Workerへwrite予約と分離したadmissionを追加し、`planned`からdispatch／unknown／
  terminal observationへ進める。
- [x] Taskの`consultation` modeを廃止し、論理TaskのeffectとWorker／ConsultationのRun kindを分離する。
  Critic consultationは同じTaskを参照できるようにする。
- [x] Taskへrole、lane、`depends_on`、required capabilities、isolation、context policy、validation、
  non-goals、known trapsのcanonical snapshot／参照を持たせる。依存は同一Control内の既存Taskだけを
  参照し、cycleと未完了依存のadmissionを拒否する。汎用DAG workflow engineにはしない。
- [x] Task文書全体OIDへの結合をやめ、親が固定したcanonical admission snapshotとdigestを保存する。
  意味・成功条件はdocs正本のまま維持する。
- [x] boundedなlineage fact（parent/root assignment、provider、model、prompt family、context policy、
  input digest、approach family ref、shared finding refs）を保存し、独立性scoreは作らない。
- [x] dispatch／terminal／result／verification evidenceをtyped descriptorとして永続化し、内容本体・
  prompt・secret・巨大logは保存しない。
- [x] 各mutationのactor、operation、subject、previous／next state、evidence descriptorをboundedで
  immutableなtransition receiptとして同じatomic manifestへ保存する。別`events.jsonl`を二重正本にしない。
- [x] Executorを固定enumからversioned `adapter_id / contract_version / instance_id / handle_schema_id`
  envelopeへ移し、未知adapterのdispatchはfail closed、read-only status/exportは可能にする。
- [x] workflow単位のcapabilityを表現し、codex-sidecarのread-only同期workflowとdurable writerを
  同一能力へ丸めない。
- [x] 最小Budget Envelope（Run／Consultation／外部Run／wall time／costの上限とunknown）を持つ。
  自動価格最適化は行わない。
- [x] Control-level finalizationにobjective、受入matrix、最終監査、回帰、knowledge returnの参照を
  必須化し、個別Task finalizationだけでarchiveできないようにする。
- [x] H Taskはpurpose、impact、rollback、対象operation digest、承認参照、承認／失効時刻のsnapshotを
  必須にし、対象外operationへ流用できないようadmissionで照合する。真正性の最終確認は親が保持する。
- [x] role/effect policyをsnapshotし、sorter／refuter／verifierのwrite、未承認integrator write、
  Fの外部writeを拒否する。roleの意味正本は既存agent／skill文書のままにする。
- [x] bounded Control continuation／retentionを設計し、256件到達後のpoison、archived ID永久予約、
  active global conflict見落としを防ぐ。
- [x] 同一worktreeは安全な帰属機構が完成するまで単一writerを維持する。別worktreeの代替案は
  `isolated-alternative`として明示する。
- [x] fingerprintのscope外index guard、ignored成果物拒否、全`GIT_*`除去、fatal UTF-8、
  POSIX owner/mode、Windows未検証時fail closedを実装する。
- [x] 全manifest scan後にglobal ID、assignment immutable tuple、active writer conflictを再検証する。
- [x] owner publication/release、manifest commit、new-control parent directory sync、durability metadata、
  `COMMIT_OUTCOME_UNKNOWN`をfault injection付きtestで固定する。
- [x] `bin/orchestrate-run.mjs`へ実行bitを付け、CLI入力由来のlimit errorをtyped metadataでexit 2へ分類する。
- [x] 全`GIT_*`環境変数を除去し、`git --no-optional-locks`で`git status`の任意index refreshによる
  fingerprint自己driftを止める。失敗再現後、Control Record 20 testsを5回連続greenで確認した。
- [x] 独立refuterが再現したscope外file mode driftをfingerprintで拒否する。
- [x] 独立refuterが再現した257件目Controlの自己poisonをcommit前のcapacity gateで拒否する。
- [x] Phase 1Aの全test、`make ci`、installer／verifyをgreenにし、独立refuterでP0/P1なしを確認する。

### Phase 1B: Operator-driven vertical slice

- [x] read-only Executor Registry observationを実装する。能力・capacityは`true | false | unknown`、
  根拠、version、観測時刻、expiry、verification stageを持ち、製品stateの正本にはしない。
- [x] Task要件、F/A/H snapshot、capability、budget、lineage、write/worktree conflictを照合する
  deterministic dry-run placementを実装する。自動scoreや意味的順位付けはしない。
- [x] 親が候補を選び、reservation proposalをControlへ記録してから手動dispatchできるようにする。
- [x] `status --brief`、`resume-check`、unresolved／unknown／uncollected一覧を実装し、HEAD、dirty、
  worktree generation、opaque handle、evidence retentionを再確認する。
- [x] Task cancellationと個別Run cancellationを別operation／stateとして実装し、Task取消が
  Executor上のRunを自動cancelしたふりをしない。Run cancel要求とterminal観測も分離する。
- [x] TaskからExecutor別Delegation Packetとstrict Worker Report templateを生成し、report importを検証する。
- [x] parent-declared campaign gate（members、all-terminal、audit-required、parent-release）を実装する。
  gateは後続Runを自動起動せず、未充足reservationを拒否するだけにする。
- [x] `orchestrate` skillへ使用条件、小タスク除外、init→record→place→observe→resume→finalize→archiveの
  最小lifecycleを追加する。

Phase gate（2026-07-14）: 2視点のFind、独立refuterのexistence/value反証とCritic、親裁定を1回実施した。
CLI列挙の`control-finalize`欠落だけをP3の正典同期漏れとして採用・修正し、P0/P1と受入阻害はなし。
親の通常gateと独立再実行はいずれもControl Record 59件greenで、実Executor接続はPhase 2へ送る。

### Phase 2: Executor adapters

- [x] 共通coreへ一枚岩lifecycleを強制せず、能力別optional interfaceを定義する。
- [x] 手動`worker-run-record → admit-worker`でもTask isolationを検査し、placementを経由しない
  `dedicated-worktree`回避を拒否する。
- [x] codex-sidecar: durable `work`のdispatch／observe／collect／recoverと隔離worktreeを実装する。
- [x] Codex native: routing smoke済みhandle、follow-up、interrupt、親host tool呼出しのpacket／observation
  projectionを実装する。Node CLIがhost内部APIを持つふりをしない。
- [x] aiterm: Codex／Grok／Composerのsession ID、agent kind、workspace、interactive follow-up、
  timeout後の同session回収を実装する。read-only強制やexit statusを捏造しない。
- [ ] gpt-connector: Worker adapterではなくConsultation adapterとして`consult / sessions`、既知slug、
  model/effort、timeout後回収を実装する。
- [ ] Claude internal: Claude appendixから同じControl schemaへprojectionし、Codex親から未確認の
  直接dispatchを実装済みに見せない。
- [ ] adapterごとにcredential不足、rate limit、timeout、non-zero／malformed report、workspace消失、
  unsupported capabilityをtyped failureとして検証する。

### Phase 3: Placementとadmission

- [ ] Registry observation、Budget Envelope、approach family上限、retry上限、integration capacityから
  eligible／ineligible候補と決定論的理由を返す。
- [ ] capacity unknownを無制限扱いせず、soft limit超過を親reviewへ送る。
- [ ] read-only低リスクでもv1は親release後だけdispatchする。F write、H、高リスクwriteは自動dispatchしない。
- [ ] provider障害時のfallbackは新しいRun／Decision参照として明示し、元失敗をgreenへ丸めない。

### Phase 4: Campaign／Barrier

- [ ] Discovery、Refutation、Design、Implementation、Final Audit campaignを親宣言gateとして表現する。
- [ ] `baseline → discovery → design → safety_net → implementation → behavior_change? → integration →
  knowledge_return → complete`のphase gateを実装する。baseline evidence、design Decision、
  高リスク時のsafety-net evidence、behavior-preserving／behavior-change laneの整合を形式検査する。
- [ ] Finding／Approach／Gap／Decisionの意味はdocs artifactが正本とし、ControlはID、digest、参照、
  status projectionだけを持つ。
- [ ] approach family上限、blocked/reopen条件、context sharing policyを記録し、同一系列の言い換え投入を抑える。
- [ ] Dedup／独立性充足／Findingの実在性・価値は親AIが裁定し、コードは票数で正しさを決めない。

### Phase 5: Advisory hooks

- [ ] dogfoodで高精度に取得できたactive Control、unknown Run、未回収report、write conflict、H参照不足、
  capacity警告だけを短く注入する。
- [ ] hookをstate machine本体やH認証にせず、誤検出時はhard failへfallbackせずadvisoryへ戻す。

### Phase 6: 共通化と追加契約

- [ ] Codex／Claude appendixが同じControl Coreを利用し、親固有のdispatch手段だけを分離できることを確認する。
- [ ] 新Executor fixtureを一つ追加し、core schemaの大改造なしでadapter／handle validator／capabilityを
  登録できることを証明する。
- [ ] README、overview、installer、verify、skill、CLI help、rollbackを同期する。

### Phase 7: Dogfood／完成

- [ ] 10件以上のread-only Worker Runを複数Executor・複数lineageで実行し、Dedup→反証→親裁定を通す。
- [ ] codex-sidecar隔離worktreeと別Executorの競合する代替案を作り、自動mergeせず親が一案を採用する。
- [ ] Codex nativeの実効最大枠と、aiterm、codex-sidecar、gpt-connector consultationを同時利用し、
  全体がnative枠へ制限されないことを示す。
- [ ] 親sessionをThroughline handoffで終了・再開し、active/unknown Run、base SHA、report、Decisionを回収する。
- [ ] 中規模実装1件と監査1件で全縦切りを通し、既存回帰、敵対的最終監査、knowledge returnを完了する。
- [ ] v1受入matrixを全件greenにし、Control-level finalization後に本planを`docs/archive/`へ退避する。

## v1非目標

- 完全自動dispatch loop、daemon、汎用DAG workflow engine、retry DSLを作らない。Taskの最小
  `depends_on`とacyclic／ready gateはv1へ含める。
- provider横断の自動score／価格最適化、rate-limit迂回、無制御fan-outを行わない。
- Codex nativeの製品制約やprovider rate limitを迂回しない。
- worker数、多数決、別processであることを品質・独立性の代理にしない。
- 子に親の裁定、H承認、finalizationを委譲しない。
- 外部Executor固有の差を共通抽象で隠さない。
- 不明な能力を推測でRegistryへ固定しない。
- independence scalar、quorum、自動意味分類、Finding severityの機械裁定を作らない。
- SQLite、イベントソーシング、Web UI、分散lock、複数host協調、自動merge/deployをv1へ入れない。
- H承認の電子署名や親／子のOS-level認証を実装済みに見せない。
- 同一worktree非交差writerは帰属可能な安全機構が実証されるまで解禁しない。

## Phase 0の完了条件

- 一次根拠付きExecutor capability matrixがある。
- 既存機構の再利用表と、提案の矛盾・重複・過剰設計の裁定がある。
- 親の直接再現と反対仮説検証を通った修正版v1と、明示的な非目標がある。
- オーナーが実装へ進むかを裁定できる。

## Phase 0直接調査結果

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
| Codex native | externalではない密結合worker。host tool schemaにagent ID、follow-up、interruptがある | 自動worktree隔離なし。roleのsandbox指定は親実効permissionと別 | config `max_threads=10`に対し現session実効slotは親込み4。capacity固定不可。routing smokeは今回未再実行 |
| gpt-connector | 0.3.1の配布codeにconsultation用`consult`／`sessions`、model/effort結果がある | repo write、shell、worker、explicit cancel、暗黙fallbackは非対応 | Codexへregistered。rate limit／account capacity／live consultationは今回未再実行 |
| aiterm | 0.12.3の配布codeにCodex/Grok/Composer TUI、session ID、継続入力、agent_done、C-c、closeがある | read-only強制・worktree隔離・batch exit status保証なし | Codexへregistered。concurrency/rate limit／live 3-agent実行は今回未再実行 |
| codex-sidecar | 0.3.7の配布codeにread-only workflowとdurable work start/result/cancel/recoverがある | 対話TUI・Grok/Composer非対応。durable workは明示opt-in | Codexへregistered。concurrency/provider quota／live read/writeは今回未再実行 |
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

### Phase 1A安全核（v1の内部段階）

Phase 1Aはbackend-agnostic runtimeやworkflow engineではなく、**Orchestration Control Record**へ
縮小する。ただし、これはv1完成品ではない。Registry、adapter、placement、campaign、resume、
dogfoodを縦に通す後続Phaseを同じ完成計画に含める。

1. 対象projectのdocs TODOを正本とし、Control Recordは`task_id`と文書参照を持つ。
2. 論理Taskと一回のRunを分離する。同じTaskの再試行は新Run、仕様変更は新Task。
3. Runは`worker`と`consultation`を区別する。`gpt-connector`はconsultationだけ。
4. Worker stateは`planned / admitted / dispatched / running / unknown / completed / failed / cancelled`。
   `admitted`はControl Record上のadmissionだけが成立し、Executor実在は未確認である。read Runも
   admissionを通るが、global write reservationを持つのはwrite Runだけである。Consultationには
   `admitted`を設けない。
   Executor固有raw stateとopaque handleを別に保持し、`completed`と親`accepted/rejected`を分ける。
5. repo/worktree identity、read/write scope、active writer ownershipを記録する。scopeはrepo相対の
   literal file/directoryだけ。glob、symlink先repo外、repo外writeは拒否する。
6. 能力は`true / false / unknown`、根拠種別、観測version/time、installed / registered /
   verified / execution-verifiedを保持する。静的capacity整数を真実にしない。
7. 永続化は単一のatomic `manifest.json`を唯一の一時正本とする。snapshot + events、SQLite、
   migration frameworkはMVPから外し、`schema_version`だけ初日から持つ。
8. 保存先候補は`<absolute git common dir>/dotagents/orchestrate/controls/<control-id>/manifest.json`。
   working tree、Throughline、各Executor state directoryには置かない。
9. 親だけが更新する。初期CLIは`init / status / task-record / worker-run-record /
   consultation-record / admit-worker / observe / conflict-check / accept / reject /
   task-finalize-record / recover-lock / archive`の手動記録・検証に限定する。
10. Phase 1AのCoreはdispatch、poll、cancel、retryを行わない。製品全体のadapter、placement、
    campaign、hookは後続PhaseでControl Coreの外側へ追加する。

### 永続棄却とPhase 1A限定の延期

- 永続棄却: 汎用workflow engine、scheduler scoring、cost/rate最適化、意味判定するdynamic registry。
- 全Executorへ共通`prepare/dispatch/poll/collect/followup/cancel`を強制するadapter抽象。
- `Finding / Decision / Approval`の汎用台帳化。文書正本への参照だけにする。
- snapshot + append-only eventsの二重正本、初期SQLite、汎用migration framework。
- 独立性`L0–L4`。既存のClaude配置層L0–L4と衝突する。lineage事実だけ記録し親が裁定する。
- hook hard-fail、LedgerによるF/H意味裁定、approval engine、子によるfinalization。
- gpt-connectorのWorker Executor登録、Claude internalのCodex親からの未確認dispatch。
- 自動stale lock削除、Executor失敗の暗黙fallback、unknown capabilityのtrue扱い。
- Phase 1A限定の延期: Registry observation、operator-driven adapter、dry-run placement、campaign gate、
  advisory hook。これらはv1完成範囲からは棄却せず、Phase 1B以降で実装する。

### 監査結果の失効（2026-07-14）

`audit-gauntlet`は過大な結果を出すため、オーナー裁定で使用廃止・削除した。同skillを使った指摘件数、
反証結果、採否は本計画の根拠として扱わない。完成範囲は、オーナーが提示した元提案の29条件、
OpenAI CDC promptの一次資料、現repoと各Executorの実測契約から直接導く。個別の欠陥は親が実ファイル、
実コマンド、再現テストで確認できたものだけをTODOへ残し、未再確認の指摘は未確認へ戻す。

## Phase 1Aの受け入れ条件

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

## Elastic Orchestrator v1受け入れmatrix

元提案の29条件を削除せず、実製品契約へ合わせて次の検証可能な条件へ修正する。

1. [ ] 工場全体へ固定`max_active_children=3`を置かず、Executorごとの観測capacityを使う。
2. [ ] Codex nativeだけでなく、全Executor固有のcapacityを`known | unknown`と根拠付きで扱う。
3. [ ] gpt-connector consultation、aiterm、codex-sidecar、Codex nativeのRun／Consultationを同一Controlで管理できる。
4. [ ] 3件を超えるTaskとWorker Runを登録・回収でき、最小`depends_on`のcycle／ready gateを検査できる。
5. [ ] 3件を超える外部Runを同時に管理し、native枠が全体上限にならない。
6. [ ] workflow単位のcapability、capacity observation、role/effect policyを検査できる。
7. [ ] read-only Runを複数Executorへelastic fan-outできる。
8. [ ] 全Executor横断でwrite scope／worktree競合を検出できる。
9. [ ] 独立worktree上の代替実装を区別し、自動mergeしない。
10. [ ] provider、model、prompt family、context policy、lineage、approach family参照を記録できる。
11. [ ] 別process／別Executorというだけで独立監査扱いしない。
12. [ ] blocked経路は新しい機序・不変量・構成の参照なしに再投入できない。
13. [ ] Control／Run budgetを設定し、unknown usageを0や無制限に丸めない。
14. [ ] approach familyごとの投入上限とretry上限を管理できる。
15. [ ] Finding／Decision／finalizationの意味は親がdocs正本で確定し、Controlは参照とphase gateだけを持つ。
16. [ ] 子のLedger更新禁止は委譲契約として維持し、lock／revisionで競合更新を拒否する。
17. [ ] 外部Executor失敗を暗黙fallbackでgreenへ丸めない。
18. [ ] Executor completedと親accepted/rejectedを区別できる。
19. [ ] sessionをまたいでTask、Run、opaque handle、transition receipt、取消状態、budget、gateを復元できる。
20. [ ] H承認参照とpurpose／impact／rollback／operation digestなしにH対象Runをadmitできず、真正性とscopeは親が再確認する。
21. [ ] high-risk finalizationに親が指定した独立監査参照を要求できる。
22. [ ] working treeへ一時runtime stateを置かない。
23. [ ] main／linked worktreeで共通保存先とglobal conflict gateが壊れない。
24. [ ] 新しいruntime dependencyを原則追加しない。
25. [ ] install、verify、routing、hooks、既存skills、`make ci`がgreen。
26. [ ] 新Executorをcoreの大改造なしにversioned adapter／handle schema／capabilityとして追加できる。
27. [ ] 中規模実装1件と監査1件でoperator-driven縦切りをdogfoodする。
28. [ ] dogfood結果を正典、RAG、Caveat、testsの正しい所有先へ還流する。
29. [ ] Control-level finalization後、本planを既存規則どおり`docs/archive/`へ退避する。

## v1完成と将来拡張の境界

v1完成には、Control Core、Registry Observation、budget／lineage、dry-run placement、Codex native／
codex-sidecar／aiterm／gpt-connector consultationのoperator-driven adapter、campaign gate、resume、
dogfood、回帰、knowledge returnを含む。

完全自動dispatch loop、provider横断score最適化、一般DAG、retry DSL、independence score、quorum、
SQLite／event sourcing、daemon、Web UI、分散lock、複数host協調、自動merge／deploy、H承認の電子署名は
将来拡張であり、v1完成を妨げない。

物理的な`events.jsonl`はv1へ入れない。atomic manifestをcurrent truthとし、必要な履歴はboundedな
typed evidence／revision receiptとして同じtransactionへ保存する。別event fileを導入する場合は、
authoritative order、crash consistency、replay、retentionを独立計画で証明する。
