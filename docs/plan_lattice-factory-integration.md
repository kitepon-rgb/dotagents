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
   Lattice内蔵sensorへ統合する。**Latticeは機能的後継としてCodegraphの立ち位置を継ぐ**
   （オーナー裁定 2026-07-17・社会的位置づけを含む）。
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

### Phase L0 — ベースライン・直轄化（2026-07-17完了）

- [x] Lattice repoの同期状態（origin差分・dirty・stash）を確認し、`npm run ci`のbaselineをgreenで固定する
  - 実測: dirty/stashなし・**remoteゼロ**（54MB資産がMac 1台のみ）。オーナー承認のH操作で
    private repo `github.com/kitepon-rgb/Lattice` を作成しpush（秘密走査・tracked 807 file確認済み）。
    baseline: `npm run ci` 290/290 green＋check pass（70.1秒、ADR 0045記載値と一致）
- [x] Lattice正典を実読し、重複TODOを集約する
  - RC2 plan（`plan_lattice.md`・全72 TODO消化済み・Phase-supported・plan version stale）を
    `docs/archive/2026-07-16-plan-lattice-research-campaign-2-v1-phase-supported.md`へ退避し、
    AGENTS/PLAN/READMEの生きたリンクをRC4 plan＋本書へ更新。生きたTODOはRC4 planと本書だけになった
- [x] Lattice側RC4 planへ直轄化を反映する（依頼構造の解体・親裁定参照・fork非目標の撤回・
      Stage 0凍結不要合意とcaveat添付とlive repo init禁止・盲点定量化の焼き込み）
- [x] ADR 0046のタイミングの揺れをStage 1開始時へ統一する
- [x] ADR 0046を起草する（Lattice `docs/adr/0046-rc4-writer-target-stage-override.md`）。
      Decision 9.5のstage条件付き上書き＋Stage 1の隔離HOME・host変更コマンド禁止packet契約。
      以上4件はLattice `90a8a52`で収容・push済み
- [x] Control `lattice-integration-v1`を`init`し、risk=high・behavior lane=behavior-preservingを
      `phase-gate-record`で固定した（revision 1、resume-check `ready`・blocking 0。
      修理済みControl Record（ADR 0060後）での初の実運用Control）

### Phase L1 — RC4 Stage 0（read-only実測。書込は正規repoゼロ）

前半（batch選定〜witness実測）は2026-07-17にLattice側evidenceで消化済みだったがplan反映が漏れていた。
後半（compile判定裁定〜gate）は改良前sensorのAFFECTED_TEST_DRIFT停止で持ち越され、L2/L3完了後の
2026-07-17に改良後sensorで消化した（Phase順の入替はsensor欠陥起因・evidenceに機序記録あり）。

- [x] 題材batch（6〜10件・control-record.mjs系／adapter系／docs系混在）をactiveレーンのTODOから選定し、
      選定根拠をevidenceへ記録する。**凍結不要の運用合意**: Latticeはread-only判定のみ、dotagents側の
      消化は止めない、判定のstale化はそれ自体を実測記録とする
  - Lattice [batch定義](../../Lattice/docs/evidence/2026-07-17-rc4-stage0-batch.md)（T1〜T6・オーナーGO）
- [x] batch定義evidenceへdotagents私有caveatの該当エントリを添付する
      （`orchestrate-run-worker-run-record-approach-family-ref-null`＝`lineage.approach_family_ref: null`が
      BUDGET_UNKNOWNで拒否される、`orchestrate-run-cli-internal-error-lib`＝INTERNAL_ERRORは未適用と限らない）
  - batch定義evidence「添付caveat」節（5エントリ）
- [x] 各TODOのboundary witnessを実作成し、**作成時間・参照証拠・書けなかった項目を1件ずつ実測**する
      （丸め・事後推定禁止）
  - Lattice [witness実測](../../Lattice/docs/evidence/2026-07-17-rc4-stage0-witness-cost.md)
    （17〜36秒/件・ADR 0048真値訂正）
- [x] Codegraph indexは**Lattice側clone/copy上にだけ**作る。dotagents正規repoに`.codegraph/`は無く
      gitignore対象外のため、live repoでの`codegraph init`は書込ゼロ契約違反かつdirtyを生む
  - 前半＝Stage 0 clone（`73947b3`）、後半＝scratchpad clone（`c3640f4`）とも遵守。正規repoは無dirty
- [x] `lattice plan compile`のconflict/wave/unknown判定を親が1件ずつ妥当／過剰serial／見逃しで裁定し、
      **見逃し0件を確認する**（見逃しは即refute条件）
  - **2026-07-17完了**: Lattice
    [compile判定裁定](../../Lattice/docs/evidence/2026-07-17-rc4-stage0-compile-adjudication.md)。
    request A（T1+T2+T4）dispatchable＝conflict 3件全て妥当・waves `[[T1,T4],[T2]]`妥当・過剰serial 0・
    独立grep全数照合で**見逃し0**。request B（全6件）BOUNDARY_UNKNOWN＝unknown分類一致6/6。
    witness束縛の作法3点（共有writeの両own・covering query必須・同一targetは単一query_id）を実測で確定
- [x] call graph非可視結合（shell hooks・markdown憲法・巨大単一file）がwitnessで表現できたかを個別記録し、
      **Codegraph盲点の発生頻度を定量化する**（L2 fork判断の一次データ）
  - 前半実測がADR 0047/0048のfork判断一次データ。後半でmd主体は`codegraph_empty` typed unknown、
    shell結合は(c2)クラス実例3件のまま（L2裁定どおり・再燃条件はStage 1実測）
- [x] Stage 0 gate: witnessコスト閾値・unknown率・判定一致率を実測に基づき確定・記録し、
      Stage 1 targetを裁定する
  - **2026-07-17裁定**（compile判定裁定evidence §7）: witness≤3分/件・drift写経0・dispatchable系
    unknown率0・判定一致100%維持。Stage 1 target＝dotagents disposable cloneへ直行、dispatchable
    3 TODO×capacity 2×2 waves最小構成。unknown期待クラスは混載せずrequest分割（whole-request
    gatingのため）

### Phase L2 — Codegraph吸収・sensor改良

- [x] L1実測を根拠にfork要否を裁定する（予断で決めない）
  - **2026-07-17裁定: fork＝吸収する**（オーナー裁定・Lattice [ADR 0047](../../Lattice/docs/adr/0047-codegraph-absorption-and-sensor-ownership.md)）。
    Stage 0実測（数値はLattice [ADR 0048](../../Lattice/docs/adr/0048-stage0-ground-truth-correction.md)で訂正済み）:
    `control-record.mjs`の真値7件（推移的import閉包＋動的import）に対しdepth=1→3件（偽陰性4）・
    depth=5（既定）→12件（真陽性6・偽陽性6・偽陰性1）で、**真値を返すdepthが存在しない**。
    HEAD `04ab45c` 実ビルド再測定でv1.4.1と出力同一＝欠陥健在。depth=1の「正解」はimport追跡でなく
    名前一致フォールバックの偶然（`imports`辺0本・`reject`名の`calls`辺8本）。
    **パラメータ調整では原理的に直らない**。0047の「upstream 3ヶ月停止」は誤り（現役repo）で、
    却下は残り2理由（depth無効・契約緩和拒否）で立つ。
- [x] fork時: MIT license notice・attribution（fork時点のupstream commitを記録）を維持し、
      fork repoの所有・release・version契約を台帳へ先行記録する。upstream追従方針
      （cherry-pick基準）を吸収実装時に明文化する（ADR 0048 Decision 4）
  - **2026-07-17完了**: license/attribution/吸収時点commit（04ab45c）は吸収commit
    （Lattice `ce16412`）の`sensor/NOTICE`で維持済み。追従方針（選択的cherry-pick・
    取込基準3種・migration採番の振替・必要駆動監視・追従記録欄）はLattice `c09c32c`で
    NOTICEへ明文化。**台帳先行記録は吸収裁定（ADR 0047）により対象消滅**——独立fork repoは
    作られずsensorはLattice repo内部のため、所有・release・version契約はLattice本体の
    台帳エントリに包含される。それは編入waveの仕事であり、本計画の禁止事項
    「RC4 support前の台帳記録」に従いL6で行う
- [ ] **グラフ構築のcorrectnessを改良する**（実測が特定した原因箇所。優先順）:
      - [x] (a) 経路実在を検証しない名前一致フォールバックとconfidence非永続化を直す（偽陽性の除去）
        — **2026-07-17完了**（Lattice `da438ca`）。実装は2層設計: ①migration v9で
        `edges.confidence`/`edges.resolved_by`列を永続化 ②file-level依存射影
        （`getDependentFilePaths`等）に corroboration filter（経路非検証戦略
        exact-match/fuzzy/instance-method/function-refのみのfile pairを除外。
        `kind='imports'`は常にcorroborated・適用はimportが唯一の束縛手段である
        js/ts/pythonのsource限定＝Go/Java/C#/Swiftのambient package参照は不問）
        ③resolution Strategy 3には異言語族ゲートのみ追加（py↔js等。同一言語の
        クロスファイル名前一致はZustand action・#359・#764・#1240・RN/Expoブリッジ
        等の設計済み機能が依存するためresolutionでは殺さない）。
        実測: affected 12件(TP6/FP6/FN1)→5件(FP0)
      - [x] (b) JS/TS extractionに動的import/require処理を追加（偽陰性の除去）
        — **2026-07-17完了**（Lattice `5498945`）。`extractCall`（2走査経路の唯一の
        合流点。visitNodeフック前例では関数本体内へ届かない）にJS/TS限定分岐、
        定数畳み込み（リテラル/template/同一ファイルconst束縛再帰/join・resolve/
        import.meta.dirname・__dirname）、解決不能は衝突不可能センチネルで
        unresolved可視化。`resolveViaImport`に相対specifier限定のraw-text解決分岐を
        追加（拡張子なし`require('./x')`と静的import生specifierの既存の穴を同時に修理）
      - [ ] (c) call graph非可視の結合（spawn・shell・markdown・設定）を索引化する
        - [x] (c1) spawn系（JS/TSのchild_process起動）— **2026-07-17完了**（Lattice `6c82461`）。
          新edge kind `invokes`（`resolved_by='spawn-path'`・confidence 0.95）。束縛検証付き検出
          （`spawn`/`spawnSync`/`execFile`/`execFileSync`/`fork`。`exec`系のshell文字列解析は
          スコープ外と明記）＋(b)の定数畳み込み再利用＋resolver専用ゲート。親レビューで
          implementer成果からFPクラス1件（名前一致Strategy 3へのフォールバックで
          `spawn('git')`→同名シンボル誤edge）を検出し、再現テスト付きで修理済み。
          オラクル: `affected bin/orchestrate-run.mjs`＝真値6件exact一致（FP0/FN0・真値は
          親が独立grep確認）、`control-record.mjs` 7件回帰なし
        - [x] (c2) shell・markdown・設定 — **作らない（オーナー裁定 2026-07-17）**。
          根拠: ①編集競合の検出はwitnessの書込宣言の交差で行われsensorグラフと独立＝
          shell/markdownの編集競合は(c2)なしで検出される ②漏れるのはaffectedテストの
          自動観測のみで、manual witnessで補う運用が既存（RC3制約記録） ③実害実例は
          shell結合3件（`tests/install/clean-home.sh`・`tests/hooks/smoke.sh`→
          `bin/orchestrate-run.mjs`、`tests/skills/smoke.sh`→`executor-adapters.mjs`）と
          少ない。**再燃条件**: Stage 1実測で見落とし起因の実害（回すべきテストの見逃し等）が
          有意に出たら再評価する
- [x] 改良の受入は数値で示す: **ADR 0048の訂正後真値（7件・判定方法論固定済み）に対し`affected`が
      exact一致**すること、かつwitnessコストがL1実測比で有意に下がること。
      どちらも満たさないなら改良を成功扱いしない
      — 前半は**2026-07-17達成**: dotagents clone（`73947b3`）再indexで
      `affected lib/orchestrate/control-record.mjs` = 真値7件とexact一致
      （FP0/FN0）。動的経路は `helpers.mjs →(imports/file-path/0.95)→
      control-record.mjs` の実在辺で裏付け確認済み（名前一致の偶然でない）。
      — 後半も**2026-07-17達成**（Lattice
      [L2比較evidence](../../Lattice/docs/evidence/2026-07-17-l2-witness-cost-comparison.md)・`e954a8f`）:
      Stage 0同一ターゲット3系がすべて真値とexact一致（T1系7件・T2系0→6件・T4系2→3件でFN解消）。
      コスト低減の実体は「drift調査60秒/周の消滅」＋「偽陽性写経以外に通らない非dispatchable
      行き止まりの解消」＋「T2系の表現不能→直接記載可能」。成立範囲はimport／動的import／spawn
      結合クラスで、(c2)クラスは残件のとおり
- [x] focused gate → 関連gate → Lattice `npm run ci` green
  - **2026-07-17時点green（(c1)まで反映）**: root node:test 290/290・sensor vitest
    147 files/2476 passed/fail 0・check pass・ci exit 0。gate実行でP1級既存欠陥を発見・修理:
    吸収commit `ce16412`以降、root ciの無指定globがsensor/__tests__のvitest専用TSテストを
    拾い恒常failしていた（Lattice `ae1f9dd`でtest/へスコープ＋sensor vitestを`test:sensor`
    としてciへ正式編入）。L2に追加変更が入ったら再実行して閉じ直す

### Phase L3 — Lattice MCP面新設

- [x] MCP面の公開契約を設計・裁定する（F）: tool面（`codegraph_explore`相当の後継）、schema、
      versioned JSON、error意味論、既存CLI 6面との責務分離。**契約クリティカル＝`fable`スポット諮問＋
      `fable`×high refuter 1回＋クロスprovider `codex_opinion` 1回**
  - **2026-07-17完了**: Lattice [ADR 0049](../../Lattice/docs/adr/0049-lattice-mcp-surface-contract.md)
    （`32f0383`）Accepted。作法どおり3枚のガードレールを全部通した——fable諮問9指摘・
    codex_opinion 7反対（3件は理由付き棄却）・fable refuter反証6件（全採用）。中核裁定:
    tool面は8 tool同名維持（改名ADR起票をL7 cutover受入条項へ固定）、**製品同一性の分離**
    （version名前空間化`-lattice.N`・global状態dir分離・hello二分法＝refuterが検出した
    「同一versionでの無言cross-product attach」「第三者`stop --all`の越境kill」
    「self-update直後の正当な旧daemon全滅」の3重大欠陥の根治）、外部通信遮断のv1受入条件化
    （upstream self-upgrade・既定ON telemetryの無効化）、typed degradation
    （direct切替事由の列挙制・DB破損系fail closed・mode機械可読化）、別bin `lattice-mcp`、
    併走期間のhost単位排他とoffline record/replay比較
- [x] 「常駐サービス化はしない」非目標とMCP server提供の両立を明文化する（MCP serverはsession寿命の
      stdio server であり、自動dispatch常駐basicとは別物）
  - **2026-07-17裁定済み**（ADR 0049 Decision 9: session寿命stdio＋refcount/idle-timeout自動終了の
    cache工程・書込範囲の限定列挙）。00_product-contract.mdへの追記は実装waveで行う（ADR Consequences）
- [x] MCP面を実装し、index不在project・未対応host・Lattice非稼働時の振る舞いを明示する
      （**fail closedを既定にし、暗黙fallbackで成功扱いしない**）
  - [x] wave1（2026-07-17・Lattice `34cac18`）: 製品同一性の分離（version `1.4.1-lattice.1`・
        sentinel起動時fail・daemon registry `~/.lattice/sensor/`・socket `lattice-sensor-` prefix）＋
        外部通信遮断（update-check/upgrade/telemetry/beta-signup無効化）。smoke実測: serverInfoが
        lattice版を名乗り、daemon recordはLattice側registryのみへ書込。ci green（root 290・
        sensor 2476・exit 0）
  - [x] wave2（2026-07-17・Lattice `dcd5b70`）: 別bin `lattice-mcp`（内部daemon再invoke受理・
        exit契約・stdout純度テスト）・`codegraph_status`のmode/reason機械可読化・hello二分法
        （異製品`foreign-product`はfail closed・同製品版差は`version-skew` degrade）・
        DB open失敗の`IndexOpenError`化（index不在guidanceはDecision 6のまま維持）。
        検収実測: sensor vitest 2481 passed/fail 0・bin integration green・ci exit 0。
        親レビュー特記: workerがOOMガードバイパス（lattice-mcpがCLI経由のNode 25.x V8対策を
        通らない）をスコープ外発見として別タスク化——L3残検証と合わせて扱う
- [x] 親別matrix（Claude親・Codex親）での登録・疎通をisolated HOMEで検証する
  - **2026-07-17完了**: Claude親=isolated HOMEで`claude mcp add lattice -- node …/bin/lattice-mcp.mjs`
    →`claude mcp list`で**✔ Connected**（live MCP handshake実証）。Codex親=isolated HOMEで
    `codex mcp add`→`codex mcp list`でenabled登録確認（Codex sessionでのlive疎通は実端末適用の
    H検証時に併せて行う）。実端末への登録はH（L6/L7）のまま
- [x] focused／関連gate green
  - **2026-07-17時点green**: wave2検収でLattice `npm run ci` exit 0（root 294 tests・
    sensor vitest 2481 passed・check pass）。L3成果はLattice `32f0383`（ADR 0049）・
    `34cac18`（wave1）・`dcd5b70`（wave2）

### Phase L4 — RC4 Stage 1（disposable clone・H）

**2026-07-17完遂**。一次記録はLattice
[Stage 1 evidence](../../Lattice/docs/evidence/2026-07-17-rc4-stage1-dogfood.md)・
artifact `v3`（16 check green）／`v3-hold`（17 check green）・Control `lattice-rc4-dotagents-v1`
（H task finalize済み・rev 3）。

- [x] ADR 0046 commit後にControlを更新し、H task承認snapshotを記録する
  - Control `lattice-rc4-dotagents-v1` init（risk=high・behavior-preserving）＋H task
    `RC4-S1-stage1-dogfood-v1`（オーナー承認2026-07-17「OK 進めてくれ」snapshot）
- [x] **隔離HOMEでexecutorを実行する**。executor packetで`install.sh`・`spotter install`・
      `apply-codex-config`・`mcp add`系の実行を禁止する（cloneはオンボーディング正典＝host変更手順を
      搬送し、clone内`install.sh`実行はhost symlinkをtmpdirへ向けて廃棄後にdangling化させる）
  - 隔離HOMEは認証不能（credential取扱いは統括権限外・classifier遮断は正）のためオーナー裁定
    「2でいい」でLattice [ADR 0050](../../Lattice/docs/adr/0050-stage1-executor-isolation-implementation.md)
    の実装形へ確定: subagent executor＋packet `isolation_contract`（禁止コマンド焼き込み・
    artifact機械検証）＋dispatch前後のhost fingerprint境界検証＋diff observer。残余リスク
    （読取の帰属不能）はL5 refuter確認対象
- [x] dotagents disposable clone（tmpdir配下・正規repo不着地）で実小粒タスクの閉ループを完遂する:
      観測→競合→hold→carry-over→vN+1→redispatch→受入。注入competition 1件以上＋自然発生も記録
  - round 1（TA/TB/TC）: conflict serialization実証・3/3受理。round 2（TD/TF）: 注入
    scope_violation→hold {TD}/continue {TF}→vN+1→carry-over受理→redispatch受理。
    自然発生の記録＝TD executorの実API障害をunknownとして同一handle回収
- [x] control-record.mjs級の巨大file交差ケースを意図的に含め、Latticeの答え（serial判定／seam候補）と
      親の納得度を記録する
  - TA×TB＝3,711行`control-record.test.mjs`共有write→serial判定。親裁定＝妥当・過剰serialなし・
    見逃し0
- [x] artifact v3をatomic発行し、artifact-only verification green
  - `v3`＝16 check・`v3-hold`＝17 check（hold replay含む）いずれもgreen（Lattice `43c8351`）
- [x] Stage 2 gate: 境界事故0・受入品質・witnessコスト再実測（L2改良の効果を実戦で確認）
  - 境界事故0（dotagents正典dirty 0・`~/.claude`/`~/.agents`無変化・機械判定）・receipt 5/5
    accepted・drift/写経0でwitnessは支配項にならず（支配項はexecutor 61〜512秒/件）。
    **Stage 2進行可**。着地窓（L5）はオーナー合意待ち

### Phase L5 — RC4 Stage 2（正規着地・H）＋ support/refute裁定

- [x] 着地窓をオーナーと合意する。**queue 20 campaign実施窓・R3 wire v2 finalization・J1 wire v3実装waveと
      排他**（同一ファイル群のwriter一本化）。lib/factory・schemas・docs/factory-*へ交差するpatchは
      v2 finalization receiptを失効させるためhold対象
- [x] batchごとにH gate承認を記録し、着地は**親のreview→pathspec commit経路のみ**（Latticeが直接
      commit/pushしない）。着地後は複数端末リポの掟どおり速やかにpushする
  - 2026-07-18完了: 前段でP1欠陥（receiptにpatch本文なし）を発見・Lattice `b61ee3d`で即時修理→
    着地run `v4-landing`（5/5受理・19 check green）→ 親が全5 patch実読review → batch H task 3件
    （approval snapshot・Control rev 4-9でfinalize）→ pathspec commit→push。一次記録はLattice
    [Stage 2着地evidence](../../Lattice/docs/evidence/2026-07-18-rc4-stage2-landing.md)
- [x] 最低3 batch（うち1つは並列2 TODO以上同時進行）を事故0で着地し、wall-clock・rework・手戻りを実測保存する
  - batch1=TC（`e117ac5`）・batch2=TD+TF並列受理対（`8a3befd`）・batch3=TA+TB conflict対統合
    （`b248c46`）。事故0（apply失敗0・test fail 0・逸脱file 0）。着地本体≈15分・rework≈16分
    （patch捕獲欠陥起因の再走・実測）
- [x] 着地ごとにdotagents正規gate（`make lint`／`make ci`）green・境界事故0を確認する
  - batchごとfocused＋lint PASS、最終`make ci` exit 0（隔離HOME Codex検証含む）
- [x] Phase gate: full CI・**`fable`×high refuter 1回**・クロスprovider検証1回・support/refute ADR・
      知識還流（caveat／rag）
  - 2026-07-18完了: full CI両repo green・refuter=**条件付きsupport**（核心数値は独立再検証で全裏付き・
    反証条件4種不成立）・クロスprovider（codex_review指摘2件採用→契約正典へresume-check envelope例外
    明記＋testコメント訂正）・caveat 1件還流（rag該当なし＝外部仕様調査なしでスキップ）。
    一次記録はLattice [L5 Phase gate evidence](../../Lattice/docs/evidence/2026-07-18-rc4-l5-phase-gate.md)、
    裁定はLattice [ADR 0051](../../Lattice/docs/adr/0051-rc4-phase-gate-support.md)（claim境界・
    lane裁定・残余リスク恒久化条件を含む）。Control `lattice-rc4-dotagents-v1` finalize・archive済み
- [x] **refuteなら編入・退役は発動しない**。correction planを立てて本計画のL6以降を凍結する
  - supportで閉じたため不発動。L6凍結解除（ADR 0051 Decision 1）

### Phase L6 — 編入wave（RC4 supportで閉じた場合のみ→2026-07-18 support確定・着手可）

- [ ] **Lattice編入パッケージ要件を文書化する**（RC4 planからのcarry-over・ADR 0051 Decision 6）:
      CLI 6面の安定契約（ADR 0044 Decision 8）、schema一覧、run store／artifact規約、
      executor adapter契約、Codegraph同梱方針（正規CLI/SDK・MIT notice維持）。
      **ADR 0051 Decision 5の残余リスク恒久化条件**（subagent executor形態は公開repo内容のみ・
      秘匿情報は隔離HOME回帰が前提）を編入契約へ含める
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

### Maintenance queue（非クリティカル欠陥。Phase通常TODO後・Phase監査前のmaintenance wave一回で処理）

2026-07-18にRC4 plan（Lattice `docs/archive/plan_lattice_rc4_dotagents_dogfood.md`）から移管。所有repoはすべてLattice:

- [ ] sensor: Lua/Luau/Rubyの`require()`検出が`visitNode`フック実装のため関数本体内requireを拾えない
      （偽陰性・JS/TSと同型の穴）。対処は`extractCall`合流点への移設。最小再現: 関数内`require 'mod'`を
      indexしimports辺が出ないこと（所有: Lattice sensor/）
- [ ] CLI: `lattice plan compile`のtyped失敗が`cli_error.v1`の`code`/`message`だけを出し、compile resultの
      `detail`（BOUNDARY_UNKNOWNのunknown内訳等）を落とす。対処候補: `cli_error.v1`へ`detail`追加
      （schema変更＝ADR 0044 Decision 8のenvelope正式化と同時に裁定）（所有: Lattice src/runtime-cli.mjs）
- [ ] artifact: `patches_bound_to_accepted_receipts`検査がpath照合のみ（保存`checkpoint_digest`未検証・
      receipt content digestとの突合なし）＝patch取り違え・破損がpath一致なら通る。digest照合へ強化
      （ADR 0051 Decision 4。所有: Lattice src/rc4-stage1-dogfood.mjs系）

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
