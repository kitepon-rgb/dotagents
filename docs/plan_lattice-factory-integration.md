# Lattice編入・Codegraph吸収計画

**Status:** Active

**作成日:** 2026-07-17

**対象repo:** Lattice / dotagents / ServerManager

> 実行順と全体状態の親正本は[開発工場 統合マスター計画](plan_factory-master.md)。本書はLattice
> RC4遂行・Codegraph吸収・MCP面新設・wire v4の詳細受入TODOを所有するが、単独では着手順を決めない。

**関連計画:**

- Lattice repo: `docs/plan_lattice_rc4_dotagents_dogfood.md`（RC4の実行計画。本書がその親裁定を持つ）
- [Observer完成・Elastic改善](plan_observer-factory-integration.md)（wire v3固定13製品。本書のv4はその後）
- [BugHub工場統合](plan_bughub-factory-integration.md)（wire v2・Oracle退役の前例）

この文書は、Latticeを工場コア製品へ編入し、Codegraphを完全吸収・置換するまでの正本計画兼TODOである。
Latticeは2026-07-17のオーナー裁定でdotagents統括の直轄となった（それ以前の「別セッション所有・対象外」
境界は失効）。既存のwire v2固定12製品とwire v3固定13製品（Observer編入）を壊さず、Lattice編入と
Codegraph退役はwire v4の独立waveとして行う。

## 1. オーナー裁定（2026-07-17）

1. **Latticeはコア製品**。Lattice repo自体の開発・RC4遂行・正典還流をdotagents統括が直轄する。
   AGENTS.md「dotagents統括AIが自作コア製品の正規repoへ必要な修正を行い、version更新・release準備・
   publish・公開後smokeまで管理する」恒久裁定の範囲。各repoの正典・release gate・独立履歴は守る。
2. **CodegraphをLatticeへ完全吸収・置換する**。単独配線（host配線・MCP・session設定）は退役し、
   Lattice内蔵sensorへ統合する。
3. **Lattice MCP面を新設する**。現Codegraphの主用途＝session内対話的code intelligenceを継承する。
   これが無い限り退役は成立しない（現状のLatticeはCLI 6面のみ・対話query面なし・常駐なし）。
4. **Codegraphの公開面・情報量が不足したらfork＋改良する**（MIT・notice維持）。call graph外結合
   （shell・markdown・設定）の索引化が本命。**運用回避（manual witness頼み）で埋めない**——根本原因は
   sensorの表現力不足であり、憲法「その場凌ぎ・逃げの禁止」に従いツール自体を直す。
   **fork判断はStage 0の実測（witnessコスト・盲点発生頻度）を根拠にする**。勘で決めない。
5. **wire v3は固定13製品のまま凍結**。Lattice編入＋Codegraph退役はRC4 support後のwire v4独立waveで行う。
   v3へ後付けしない（v2へObserverを後付けしない既裁定と同じ原則）。
6. **退役はOracle前例に倣う**: shadow同等性実証 → host別cutover状態 → `retire`/`restore`入口 →
   BugHub履歴保持の`not_applicable`遷移。global booleanの一斉削除にしない。
7. **RC4中のdotagents実欠陥はBugHub経路**とする。Lattice source登録（親queue 22）を即着手し、
   登録完了までの暫定は常設割込ゲート＋maintenance queue経由。

## 2. 非目標（やらないこと）

- **wire v3へのLattice後付け**。v3はObserver編入の固定13製品で閉じる。
- **RC4 support前の編入着手**（台帳記録・host matrix変更・install/verify変更・コア一覧の更新）。
  未証明の依存を工場へ持ち込まない。
- **Codegraph退役の前倒し**。MCP面新設とshadow同等性gateの両方が閉じるまで、単独配線は1本も外さない。
  移行期間の二重配線は許容する。
- **自動dispatch常駐サービス化**（RC4非目標を継承）。LatticeはCLI＋driver＋MCP面であって常駐basicではない。
  ただしMCP面はsession内query提供のため必要——「常駐サービス」と「MCP server」を混同しない。
- **control-record.mjsの実分割**（RC4非目標を継承）。seam候補の判定までで、制御盤の再設計はしない。
- **Lattice研究思想（TODO graph・witness・event検証）の憲法・orchestrate正典への直接書き戻し**。
  編入は本計画を起点にし、正典への還流は編入受入後に別途裁定する。
- **任意repoでの成功率・ownership自動発見のclaim**（RC3 Non-goalを継承）。
- **fork前のCodegraph本体改造**。fork裁定（L2）が閉じるまでは第三者製品として正規CLI/SDKのみ使う。

## 3. Phase依存と着手分類

```text
L0 ベースライン（直轄化・CI green・現状固定）
  → L1 RC4 Stage 0（read-only実測 → fork判断の根拠データ）
    → L2 Codegraph fork裁定＋改良（call graph外結合の索引化）
      → L3 Lattice MCP面新設（session code intelligence継承）
    → L4 RC4 Stage 1（隔離clone閉ループ・H）
      → L5 RC4 Stage 2（正規着地・H）→ support/refute裁定
        → L6 編入wave（native diagnostics・台帳・adapter・matrix・install/verify）
          → L7 wire v4（shadow同等性gate → Codegraph退役 → cutover → rollback drill）

並行レーン: Q22 BugHub source登録（ServerManager repo・L1と独立・親queue 22）
前提: L7は親計画のJ1（wire v3）完了後。L5の着地窓はqueue 20 campaign・R3 finalization・J1と排他。
```

**F/A/H分類と配置宣言**（[02_models.md](02_models.md)の決定表どおり。上振れる方を要正当化）:

| 区分 | 対象 | 配置（ティア, effort, 入口） |
|---|---|---|
| F | wire v4 schema・Lattice公開CLI/MCP契約・event schema・退役裁定・fork裁定 | 主直轄。**契約クリティカルは最上位=`fable`をスポット諮問／`fable`×high refuter 1回** |
| F | 設計の別視点 | 相談役＝Codex旗艦`gpt-5.6-sol`×medium・`codex_opinion`（親と異provider） |
| A | Codegraph改良実装・MCP面実装・adapter・fixture・test | `gpt-5.6-terra`×medium・`codex_work` ／ `sonnet`×low〜medium・implementer（対等候補・quota残で選ぶ） |
| A | 監査・finder | `sonnet`×low ＋ `grok-4.5`並列finder |
| — | Phase gate検証 | 主継承refuter ＋ クロスprovider 1回（`codex_review`／`codex_risk_check`・契約クリティカル差分はhigh） |
| H | Stage 1/2の全actual dispatch batch、各hostのMCP登録/解除、BugHub本番schema変更・canary、publish、push | オーナー承認後のみ |

## 4. 実行TODO（本計画がTODOを兼ねる）

### Phase L0 — ベースライン・直轄化

- [ ] Lattice repoの同期状態（origin差分・dirty・stash）を確認し、`npm run ci`のbaselineをgreenで固定する
- [ ] Lattice `docs/plan_lattice.md`・`docs/00_product-contract.md`・ADR 0044/0045を実読し、
      本計画との重複TODOを移管理由付きで閉じるか本書へ集約する
- [ ] Lattice側RC4 plan（`docs/plan_lattice_rc4_dotagents_dogfood.md`）へ直轄化を反映する:
      「Lattice側統括→dotagents側統括への依頼」構造を解体し、本書の裁定を親として参照させる
- [ ] RC4 planのADR 0046起草時点の揺れ（header「RC4開始時」vs 本文「Stage 1開始時」）を
      Stage 1開始時へ統一する。Stage 0はDecision 9.5非抵触のため先行してよい
- [ ] ADR 0046（Decision 9.5のstage条件付き上書き）を起草する。**Stage 1の必須条件として
      隔離HOMEとhost変更コマンド禁止（`install.sh`・`spotter install`・`apply-codex-config`・
      `mcp add`系）をpacket契約へ焼き込む**
- [ ] Control `lattice-integration-v1`を`init`し、risk=high・behavior lane（L0〜L1は
      behavior-preserving）を`phase-gate-record`で固定してからTask記録へ進む

### Phase L1 — RC4 Stage 0（read-only実測。書込は正規repoゼロ）

- [ ] 題材batch（6〜10件・control-record.mjs系／adapter系／docs系混在）をactiveレーンのTODOから選定し、
      選定根拠をevidenceへ記録する。**凍結不要の運用合意**: Latticeはread-only判定のみ、dotagents側の
      消化は止めない、判定のstale化はそれ自体を実測記録とする
- [ ] batch定義evidenceへdotagents私有caveatの該当エントリを添付する
      （`orchestrate-run-worker-run-record-approach-family-ref-null`＝`lineage.approach_family_ref: null`が
      BUDGET_UNKNOWNで拒否される、`orchestrate-run-cli-internal-error-lib`＝INTERNAL_ERRORは未適用と限らない）
- [ ] 各TODOのboundary witnessを実作成し、**作成時間・参照証拠・書けなかった項目を1件ずつ実測**する
      （丸め・事後推定禁止）
- [ ] Codegraph indexは**Lattice側clone/copy上にだけ**作る。dotagents正規repoに`.codegraph/`は無く
      gitignore対象外のため、live repoでの`codegraph init`は書込ゼロ契約違反かつdirtyを生む
- [ ] `lattice plan compile`のconflict/wave/unknown判定を親が1件ずつ妥当／過剰serial／見逃しで裁定し、
      **見逃し0件を確認する**（見逃しは即refute条件）
- [ ] call graph非可視結合（shell hooks・markdown憲法・巨大単一file）がwitnessで表現できたかを個別記録し、
      **Codegraph盲点の発生頻度を定量化する**（L2 fork判断の一次データ）
- [ ] Stage 0 gate: witnessコスト閾値・unknown率・判定一致率を実測に基づき確定・記録し、
      Stage 1 targetを裁定する

### Phase L2 — Codegraph fork裁定・改良

- [ ] L1実測を根拠にfork要否を裁定する。**「不足していない」なら第三者利用のまま進み、fork しない**
      （裁定を予断で決めない）。fork するなら理由・改良範囲・upstream追従コストの引受をADRへ記録する
- [ ] fork時: MIT license notice維持、fork repoの所有・release・version契約を台帳へ先行記録する
- [ ] **call graph外結合の索引化**を実装する（shell script・markdown・設定fileの意味的依存をグラフへ写す）。
      対象・非対象を明文化し、witness自動導出がどこまで広がったかをL1のbaselineと同じ尺度で再実測する
- [ ] 改良の受入は「witness手書きコストがL1実測比で有意に下がったこと」を数値で示す。
      下がらないなら改良を成功扱いしない
- [ ] focused gate → 関連gate → Lattice `npm run ci` green

### Phase L3 — Lattice MCP面新設

- [ ] MCP面の公開契約を設計・裁定する（F）: tool面（`codegraph_explore`相当の後継）、schema、
      versioned JSON、error意味論、既存CLI 6面との責務分離。**契約クリティカル＝`fable`スポット諮問＋
      `fable`×high refuter 1回＋クロスprovider `codex_opinion` 1回**
- [ ] 「常駐サービス化はしない」非目標とMCP server提供の両立を明文化する（MCP serverはsession寿命の
      stdio server であり、自動dispatch常駐basicとは別物）
- [ ] MCP面を実装し、index不在project・未対応host・Lattice非稼働時の振る舞いを明示する
      （**fail closedを既定にし、暗黙fallbackで成功扱いしない**）
- [ ] 親別matrix（Claude親・Codex親）での登録・疎通をisolated HOMEで検証する
- [ ] focused／関連gate green

### Phase L4 — RC4 Stage 1（disposable clone・H）

- [ ] ADR 0046 commit後にControlを更新し、H task承認snapshotを記録する
- [ ] **隔離HOMEでexecutorを実行する**。executor packetで`install.sh`・`spotter install`・
      `apply-codex-config`・`mcp add`系の実行を禁止する（cloneはオンボーディング正典＝host変更手順を
      搬送し、clone内`install.sh`実行はhost symlinkをtmpdirへ向けて廃棄後にdangling化させる）
- [ ] dotagents disposable clone（tmpdir配下・正規repo不着地）で実小粒タスクの閉ループを完遂する:
      観測→競合→hold→carry-over→vN+1→redispatch→受入。注入competition 1件以上＋自然発生も記録
- [ ] control-record.mjs級の巨大file交差ケースを意図的に含め、Latticeの答え（serial判定／seam候補）と
      親の納得度を記録する
- [ ] artifact v3をatomic発行し、artifact-only verification green
- [ ] Stage 2 gate: 境界事故0・受入品質・witnessコスト再実測（L2改良の効果を実戦で確認）

### Phase L5 — RC4 Stage 2（正規着地・H）＋ support/refute裁定

- [ ] 着地窓をオーナーと合意する。**queue 20 campaign実施窓・R3 wire v2 finalization・J1 wire v3実装waveと
      排他**（同一ファイル群のwriter一本化）。lib/factory・schemas・docs/factory-*へ交差するpatchは
      v2 finalization receiptを失効させるためhold対象
- [ ] batchごとにH gate承認を記録し、着地は**親のreview→pathspec commit経路のみ**（Latticeが直接
      commit/pushしない）。着地後は複数端末リポの掟どおり速やかにpushする
- [ ] 最低3 batch（うち1つは並列2 TODO以上同時進行）を事故0で着地し、wall-clock・rework・手戻りを実測保存する
- [ ] 着地ごとにdotagents正規gate（`make lint`／`make ci`）green・境界事故0を確認する
- [ ] Phase gate: full CI・**`fable`×high refuter 1回**・クロスprovider検証1回・support/refute ADR・
      知識還流（caveat／rag）
- [ ] **refuteなら編入・退役は発動しない**。correction planを立てて本計画のL6以降を凍結する

### Phase L6 — 編入wave（RC4 supportで閉じた場合のみ）

- [ ] **Lattice native factory diagnostics**を実装する（version・schema version・overall・check ID・
      秘密なしJSON・非0意味論）。自作製品の必須要件であり、dotagents側adapterより先行する
- [ ] **opt-in runtime error store**（ack／cursor／retention、collection/reporting分離）を実装する
- [ ] 配布形態を裁定する（npm package化 or repo直CLI）。npmなら`bin/agents-update.sh`のPACKAGESへ追加し、
      `tests/factory-core/smoke.sh`のgrep count強制を同一waveで更新する
- [ ] `docs/factory-product-contracts.md`へLattice台帳を記録する（repo・所有・自作区分・version入口・
      正規diagnostics・state/schema/migration・runtime error・host/connector期待・修正先）
- [ ] dotagents側adapter＋privacy negative fixtureを実装する
- [ ] `docs/factory-host-product-matrix.md`へLattice行を追加する。**FOX Windows nativeはClaude/Codex/Grokの
      3 toolchainすべてunsupported＝executor依存のLattice runtimeが構造的に動かない**。gpt-connector行45型の
      分離（CLI presenceはrequired／runtime面はunsupported）を使い、matrix:17「8製品は全現役hostへ常備」
      原則の改訂要否を裁定する
- [ ] install/verify（`bin/verify-install.sh`のCLI必須listほか）を更新する
- [ ] コア一覧の更新: 第10枠はObserver予約済み（wire v3）。**Latticeは第11**として
      PLAN.md／AGENTS.md／README.mdを更新する（Codegraph退役完了までは入替でなく追加）

### Phase L7 — wire v4（Codegraph退役）

- [ ] 親計画のJ1（wire v3固定13製品）完了を確認してから着手する
- [ ] **shadow同等性gate**（Oracle前例331行の型）: session内code intelligenceの代表タスクを
      Lattice MCP経由と現行Codegraph MCP経由で同一入力shadow比較し、**同等以上を実証する**。
      判定者・fixture・受入基準を事前に定義する。満たせない用途が残るなら**部分退役に留め、残存配線を明示する**
- [ ] wire v4を設計する（固定製品集合の変更＝wire major）。`docs/factory-reporter-runbook.md` §11の
      server-first・別endpoint・dual-run・canary後retireに従う
- [ ] `lib/factory/contract.mjs`のV4_PRODUCT_IDS、`lib/factory/v4.mjs` adapter、
      `schemas/factory-report-v4.schema.json`（exact keys）、`tests/factory-scan`／`factory-reporter`系の
      集合deepEqualを同一waveで更新する
- [ ] host別cutover状態と`retire-codegraph`／`restore-codegraph`入口を実装する（global booleanにしない）
- [ ] 消費者ゼロ確認: `rg -a`＋索引併用。**削除検証ツール自身がcodegraphである**ため、
      `shared/constitution.md:68`・`docs/01_project-layout.md:41`の道具指名をLattice MCPへ差し替える
      （憲法は`shared/constitution.md`を編集し`node bin/render-global-constitution.mjs --write`で生成物を更新。
      生成物を直接編集しない）
- [ ] 退役点の全数消化: `docs/05_codex-fragments.md`（両親matrix・addコマンド・疎通規則）、
      README.md 109/161/168/231、AGENTS.md 23/36、PLAN.md 13、`bin/agents-update.sh:83`、
      `bin/verify-install.sh:68`、`bin/factory-reporter-v2-schedule-runner.mjs:126`のrequired
- [ ] BugHub履歴は物理削除せず`not_applicable`遷移。server期待matrixから外す時期と旧report受理期間を明示する
- [ ] 各現役hostのMCP解除（H・Mac／main-server／FOX WSL2の3host。Windows nativeは親不在のため
      npm global撤去とmatrix期待変更のみ）
- [ ] rollback drill（wire v4送信停止・前release復帰・一時切戻し）を分離して実証する。
      **一時切戻しでCodegraphを正規コアへ戻さない**（Oracle前例の作法）
- [ ] Phase gate: full CI・独立反証・knowledge return・Control finalize → 本計画を`docs/archive/`へ

### 並行レーン Q22 — BugHub source登録（親queue 22）

- [ ] ServerManager側でLatticeを報告元sourceとして登録する（adapter／schema／認証）。
      **重大度は報告元＝Latticeの製品契約が決める**既存意味論を維持する
- [ ] 読み取り専用集約・`resolve`／`reopen`・`/ai`の既存契約を壊さない
- [ ] 本番BugHubへのschema変更・canaryはH承認後（目的・影響・rollbackを説明してから）

## 5. 既知の罠

1. **witness手書きコストがRC3で最重量**。probe導出で回避した部分は実戦で使えない場面がある。
   Stage 0の実測がgate閾値を決める（事後確定＝自己都合の閾値設定リスクがあるため、根拠を必ずevidenceへ）。
2. **call graph外結合はCodegraphに写らない**（shell・markdown・設定）。見逃しはrefute条件なので、
   **疑わしきはunknown宣言で止める（fail closed）**。これがL2改良の本命対象。
3. **control-record.mjsはほぼ全TODOと交差する**。過剰serialは失敗ではないが、価値提案が「全部直列」に
   なるならそれ自体がStage 1 gateの判定材料。
4. **BSD/macOS前提shellが多い**（BSD `date`の`%N`罠＝RC3で実被弾。caveat `macos-bsd-date-n-3n-literal-iso-timestamp`）。
   executor packetの`verifier_refs`へ環境依存コマンドを入れない。
5. **clone搬送のhost汚染vector**: cloneはCLAUDE.md→@AGENTS.mdの生きたオンボーディング正典を運び、
   Claude executorが自動読込する。`install.sh:38`はHERE解決＋`ln -sfn`のため、clone内実行でhostの
   `~/.claude`系symlinkがtmpdirを向き、clone廃棄後にdangling化する。L4の必須条件で塞ぐ。
6. **live repoでの`codegraph init`禁止**。dotagentsに`.codegraph/`は無くgitignore対象外＝dirtyを生む。
7. **RC3評価残はRC4で自動的に直らない**（fsync耐久性・並行発行競合・多epoch CLI replay等。ADR 0045 Decision 4）。
   必要になった段階でmaintenance queueへ。
8. **第10製品枠はObserver予約済み**（wire v3）。Latticeを「第10」と書かない。Codegraph退役完了までは第11。
9. **Oracle退役自体がrollback drill未完**（親計画Wave 8残件）。2件目の退役（Codegraph）を開始する前に
   1件目を閉じるかはL7着手時にオーナー裁定する。
10. **RC3の実証強度を誇張しない**: dogfoodは使い捨てfixture・単一provider・既知注入conflict・
    閉ループ1回完遂の範囲。実timeout観測は未実施。「任意repoで動く」の証明ではない。

## 6. 検証

| 対象 | コマンド／手段 |
|---|---|
| Lattice | `npm run ci`（RC3 baseline: 290 test green）、`npm run check`、artifact-only verification |
| dotagents | `make lint`、`make ci`（Codex CLI隔離HOME testを含む）、`./bin/verify-install.sh --profile official` |
| RC4 artifact | 保存bytesからの独立再計算（manifest digest shasum照合・改竄検出テスト） |
| MCP面 | 親別matrixでの登録・疎通をisolated HOMEで、index不在・未対応hostのfail closed挙動込み |
| shadow同等性 | 代表タスクのLattice MCP経由 vs Codegraph MCP経由の同一入力比較（L7で基準を事前定義） |
| Phase gate | 主継承refuter＋クロスprovider 1回。契約クリティカルは`fable`×high refuter |

## 7. 未裁定（オーナー領分・着手前に確認する）

- [ ] **WIP計数の解釈**: 憲法「active WIPは本筋1件＋緊急割込み1件まで」を、Lattice戦役とdotagents戦役の
      並走でオーナー単位で数えるかproject単位で数えるか。L5着地窓の設計に先行して必要
- [ ] **Oracle rollback drill未完のまま2件目の退役を始めるか**（L7着手時）
- [ ] **Lattice配布形態**（npm publish or repo直CLI）。L6の更新経路・install/verify設計が従属する
