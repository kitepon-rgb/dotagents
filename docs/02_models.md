# 02_models — 役割→モデル×エフォートの決定表（唯一の参照点）

<!-- 前提: 2026-08-11 更新（Claude 5 / GPT-5.6 / Grok 4.5 世代）。バージョン固定禁止（PLAN 原則9）。モデル名をこの表以外＋公認例外（codex/agents/*.toml・.codex-sidecar.yml）に書き散らさない -->

方針: skill・agents・委譲契約・スクリプトは**役割名**でモデルを指し、具体名への解決はこの表だけが担う。世代交代時は**この1枚＋公認例外2種を更新して push すれば全端末が追従**する。更新トリガーはオーナーの宣言（PLAN 原則6）。

背骨: **判断はティアで買い、粘りは effort で買う**。ただし「上位ティア×低 effort が常に安くて強い」「軽量×高 effort が常に得」のどちらも一般則にしない。曖昧さ・長期判断・失敗コストが大きいほどティアを上げ、仕様固定・機械検証可能・局所的な作業ほど安いティアへ寄せて effort を与える。代表タスクの成功率・総トークン・所要時間で比較する。**配置に迷ったら安い方・採用に迷ったら棄却**（前者はエスカレーションで取り返せる、後者の混入は取り返せない——別物なので混同しない）。**親のモデル×エフォートはオーナーの領分**（規範・AI はピンを打ち替えない。事実と推奨の提示まで。規範が縛るのは子の配置だけ）。

## 消費枠（4つ。レート予算の分散が最優先）

| 枠 | 入口 | 特徴 |
|---|---|---|
| Anthropic | Claude Code 本体・Agent/Workflow・`sonnet`/`haiku` | 統括の窓＝有限資源。quota残を見つつ`sonnet`へ実装・finderを配ってよい |
| OpenAI **Codex** | codex CLI・codex-sidecar MCP・Codex ネイティブ子 | 物量の第一柱 |
| OpenAI **ChatGPT** | **gpt-connector**（MCP ID `gpt_connector`・API fallback禁止） | Codex 枠と別勘定。実読不要の純推論はここが最得。Oracleは互換・rollback専用 |
| xAI | grok CLI・aiterm の grok/composer agent | 完全独立枠。物量の第二柱＋並列 finder |

## ティア語彙（この表だけがモデル名を持つ）

| ティア | 解決規則（latest 型） | 2026-08-11 時点の解決例 | API 定価（入力/出力、per Mtok） |
|---|---|---|---|
| Claude 主 | セッション主モデル（委譲時も同値のaliasを明示する＝省略継承は不可） | オーナー指定（現行の通常上位は Opus 5） | Opus 5: $5/$25 |
| Claude 最上位 | floating alias `fable` | Fable 5 | $10/$50・**スポット限定** |
| Claude 上位 | floating alias `opus` | Opus 5 | $5/$25 |
| Claude 中位 | floating alias `sonnet` | Sonnet 5 | **$2/$10（8月10日に恒久化）** |
| Claude 軽量 | floating alias `haiku` | Haiku 4.5 | $1/$5 |
| Codex 旗艦 | OpenAI 現行旗艦 | `gpt-5.6-sol` | $5/$30 |
| Codex 中位 | OpenAI 現行バランス枠（旧 mini 相当） | `gpt-5.6-terra` | **$2/$12（7月30日から20%減）** |
| Codex 軽量 | OpenAI 現行軽量枠（分類/抽出/高スループット） | `gpt-5.6-luna` | **$0.20/$1.20（7月30日から80%減）** |
| xAI 万能 | xAI 現行旗艦 | `grok-4.5` | $2/$6（200K超は別料金） |
| xAI 物量 | Grok CLI の現行コーディング特化 | `grok-composer-2.5-fast`（effort 非対応） | OAuth/契約枠。API単価と直比較しない |

価格は各社の標準 API 定価で、Claude Code・Codex・Grok CLI の subscription quota そのものではない。ただし OpenAI は Terra/Luna の値下げを Codex と ChatGPT Work の credit 消費にも反映した。Sonnet 5 は新 tokenizer により同じ入力が旧世代の約1.0〜1.35倍の token になるため、単価低下をそのまま request 単位の値下げ率にしない。provider 間の公表 benchmark も harness が違うため、横並び順位を配置根拠にしない。根拠と取得日は [GPT-5.6](../rag/models/gpt-5.6-family.md)、[Claude 5](../rag/models/claude-5-family.md)、[Grok 4.5](../rag/models/xai-grok45-composer25.md) に置く。

### 参考指標（選定の答えではない）

2026-08-11 の Artificial Analysis Index v4.1.1（9種の知識・科学推論・coding・terminal・agentic task の合成）では、各社の高 effort 条件が Opus 5=63、Fable 5=62（Opus 4.8 fallback 込み）、Sol=61、Terra=57、Grok 4.5=56、Sonnet 5=55、Luna=52。**これは「幅広い思考力」や人間との設計対話を測る尺度ではない**。ただし Luna×max が Sonnet 5×max に近い task 達成帯へ入ることと、Luna の局所実装 preset を試す価値の傍証にはなる。

実リポジトリの issue 解決に絞る SWE-bench Pro snapshot では、Fable 5=80.0%、Grok 4.5=64.7%、Sol=64.6%、Terra=63.4%、Sonnet 5=63.2%（unverified）、Luna=62.7%。こちらも agent harness と effort が揃わないため絶対順位にはせず、**何を測る benchmark かを選んでから数字を見る**。数値・status・限界は [benchmark snapshot](../rag/models/benchmark-snapshot-20260811.md) に置く。

## 決定表（役割→ティア×effort×入口。既定は写すだけ・外れる方を要正当化）

### provider配置の原則

- **Observerは親と同じprovider family**: Codex親にはCodex、Claude親にはClaudeを置く。同じアプリのUXと近い思考様式による伴走が目的であり、継続的な反証役として扱わない。
- **親の相談役は原則として異なるprovider**: Codex親はClaude主モデル、Claude親はCodex旗艦を第一候補にし、provider固有の盲点を補う。相談役はWorkerやObserverへ混ぜない。
- **一般Workerは適格候補間でrate-aware配置**: role、能力、独立性、F/A/Hを満たす候補だけを残し、残quotaを配置判断に使う。quota取得不能・stale時に架空値や暗黙fallbackで配置を成功扱いしない。Observerは自作コア製品へ編入済みだが、配置roleは親伴走専用であり、一般Worker・Consultation・Control票へ混ぜない。旧検討履歴は[archive済みObserver計画](archive/plan_observer-factory-integration.md)に置く。
- **Phase検証はクロスprovider**: Phase完了時の重い検証は、Claude親の成果をCodex（`codex_review`／`codex_risk_check`）が、Codex親の成果をClaude（`claude -p`）が1回検証する。TODO単位ではやらず親確認で足りる。指摘の採用・棄却は統括が裁定する。

役割と配置関係の機械可読な対応は`lib/orchestrate/placement-policy.mjs`（`dotagents.placement-policy.v1`）が固定し、
fixtureがadapter catalogのconsultation laneおよびControl schema v26のconnector enumとの整合を検証する。

| 役割 | Claude レーン | Codex レーン | xAI レーン | ChatGPT レーン |
|---|---|---|---|---|
| 統括・会話（親） | **オーナー指定** | **オーナー指定**（旗艦単体・proactive OFF を推奨） | — | — |
| 裁定・契約クリティカル | 主 直轄（F）。**主が最上位でない時は最上位=`fable` をスポット諮問**（下記「最上位のスポット呼び」） | 親 直轄・直前だけ effort を上げる | —（難関形式推論は不向き） | 裁定の材料に consult 可 |
| 監査・発見（finder・数で押す層） | `sonnet`×low・Workflow で明示 | 中位=`gpt-5.6-terra`×medium・codex_auditor/explore | **`grok-4.5`**・grok_agent / `grok -p`（並列 finder に好適） | — |
| 反証・検証（リポ実読あり） | 主 同値明示×high・refuter。**契約クリティカル範囲は最上位=`fable`×high をスポットで明示** | 旗艦=`gpt-5.6-sol`×high・refuter 定義 / codex_risk_check | —（ハルシ増・形式推論弱） | — |
| セカンドオピニオン（実読不要の純推論） | — | — | `grok-4.5` 可（実務的専門判断は首位級） | **第一選択**: `gpt_connector`（command=`gpt-connector-mcp`。正典は [06_gpt-connector.md](06_gpt-connector.md)） |
| 設計（並列 Plan） | 主 同値明示×medium〜high | 旗艦×medium・codex_opinion | `grok-4.5`・実務判断の別視点 | 設計意見の別視点 |
| 実装物量（外部枠） | —（Claude枠の行と対等候補） | **中位=`gpt-5.6-terra`×medium**・codex_work / implementer 定義 | **`grok-composer-2.5-fast`**（仕様固定＋検証コマンド必須の委譲契約を厳守） | —（ChatGPT second-opinion laneは実装を担わない） |
| 実装物量（Claude 枠・外部枠と対等） | `sonnet`×low〜medium・implementer | — | — | — |
| 局所コーディング（仕様固定・focused testあり） | `sonnet`×medium（次善） | **軽量=`gpt-5.6-luna`×max**・implementer。探索・設計判断まで混ぜない | composer 可 | — |
| 軽作業・分類・抽出 | `haiku`×low（次善） | 軽量=`gpt-5.6-luna`×low・sorter 定義 / codex_generate | composer 可 | — |
| 第三者レビュー | — | 旗艦×medium・codex_review（契約クリティカル差分は high） | — | 差分を貼れる規模なら併用可 |

### 入口と使い分け

- **Codex親の三レーン**: ① native subagent＝repo密結合の通常作業、② external execution＝codex-sidecar（隔離・非対話）とaiterm（対話・永続PTY・別vendor枠）、③ consultation＝gpt-connector（相談専用）。nativeの同時枠上限を工場全体の上限にせず、Codex親から入れ子Codexを起動してよい。
- **委譲の安全・回収・受入契約は[委譲契約](../shared/orchestrate/delegation-contract.md)が正本**。external writerに使えるのは execution-verified（installed→registered→verified→execution-verified の最終段）だけ。
- **codex-sidecar**（非対話一括: `codex_work`/`codex_review`/`codex_explore`/`codex_opinion`/`codex_risk_check`/`codex_auditor`/`codex_generate`）: 端末 config.toml の model/effort を隔離 home に継承する＝`model`/`modelReasoningEffort`（low〜xhigh のみ）を**毎回明示**するか対象repoの`.codex-sidecar.yml` defaults に落とす（dotagents は中位×medium 設定済み）。C1 write gateで明示等価なのは、callの両field、またはdefaultsの `model` と `model_reasoning_effort` がともに具体値の時だけで、単なるYAML存在・空defaultsは許可しない。隔離 home に AGENTS.md はコピーされない＝子は委譲契約プロンプトで統制する。
- **aiterm**（対話: `codex_agent`/`grok_agent`/`composer_agent`）: codex_agent は`model`/`reasoning_effort`引数が端末ピンより優先され、起動応答が実効値と出所を明示する＝決定表どおり毎回明示して呼ぶ。レーンの運用型（完了受信・レーン構成・親専任）は[aiterm-dispatch](../shared/orchestrate/aiterm-dispatch.md)が正。grok/composer は隔離設計（OAuth のみ共有）。grok の`--effort`は headless（`grok -p`）専用で、対話TUIへの effort 指定は aiterm が起動前に拒否する。
- **Codex native routing の罠**（`agent_type`隠蔽・`fork_turns`既定・sandbox再適用・routing smoke手順）の正典は[05_codex-fragments.md](05_codex-fragments.md)。`/model`ピッカー選択は config.toml へ永続書込されるため、子は継承に依存しない。
- **`claude-native` Worker adapter（O3）は projection のみ**＝execution-verified 未満であり writer へ使わない（契約正本は`shared/orchestrate/executor-adapters.md`）。
- **Consultation多provider化（O3・v26）**: Codex親→Claude相談は`claude-native@consult-v1`（同一UUID resume・全tool無効）、Claude親→Codex相談は`codex-sidecar@consult-v1`（`codex_opinion`・handleなし同期）をControl schema v26のtyped `consultation_handle`で記録できる（[ADR 0045](adr/0045-o3-consultation-multiprovider-schema.md)）。adapterはprojectionのみで実model live dispatchは未実施＝live H gate後に運用へ入れる。ChatGPT相談（gpt-connector）の第一選択は不変。

## エフォートのエスカレーションゲート

**上げる前に3問**（どれかが No なら、上げても直らない＝先にそれを直す）:

1. 成功条件・検証コマンドを渡したか（曖昧なら仕様を直す）
2. 役割と入口が決定表の行と一致しているか（違えばルーティングを直す）
3. 「green まで自走」「前提の再検証」を契約に書いたか

**上げ方の規律**: 失敗後の再配置では、1回に動かすのは「ティア」か「effort」の片方だけ・effort は1段ずつ。最初から決定表の preset に置く場合はこの段階上げを要求しないため、仕様固定の局所コーディングは `Luna×max` へ直接置ける。`Luna×max` は dotagents の配置裁定であり、OpenAI 公式の個別推奨ではない。公式は `max` を品質優先の難しい workload 用とし、`xhigh` と代表タスクで比較するよう求めている。

**xhigh / max を全役割の既定にはしない**。Opus 5 は high から始め、長時間の難しい coding/agentic work では xhigh、token 制約を外す価値がある時だけ max。Sol/Terra は medium を均衡点とし、測定で品質差が出た時だけ上げる。**ultra は「すごく大変」な作業だけ**（設計と実装が絡む大物の全面再設計・多面監査・難しい移行の一発勝負。定型実装・調査は max 以下。ultra＝max 推論＋proactive 自動委譲 ON＝子を自動量産。使用量急増の公式警告あり）。

**下げゲート**: 統括レーンで委譲すると裁定した仕様固定・機械判定可能な作業（A相当）は1段下げを試してよい（下げも1段ずつ）。

**品質エスカレーションは統括の裁量（安さは既定であって強制ではない）**: 委譲物を検証して品質に納得しない時、統括の判断で上位（`sonnet` → `opus` → **最上位ティア**／Terra → Sol）へ引き上げて再実行してよい。「安く済ませる」より「正しく仕上げる」が上位。エスカレーションした事実と理由は残す。梯子の頭は「主モデル自身」ではない——**主が最上位でない世代の時、主の上にもう一段ある**（次節）。

### 最上位のスポット呼び（親が最上位でない時）

親のティアはオーナー領分であり、最上位より下（例: 主=Opus・最上位=Fable）になることがある。この時、**品質を親のティアの当たり外れに委ねない**ために、最上位を「常用の親」ではなく**スポットの子**として呼ぶ:

- **呼ぶ場面は契約クリティカルだけ**（F相当＝認可・トランザクション・公開契約・schema/wire・依存方向・本番操作・履歴修復）。設計裁定は諮問1回、Phase gateの反証は`fable`×high の refuter 1回。
- **常用しない**。通常の統括・会話・実装・finder・整形は親と決定表どおりの子で回す。最上位を常時親にするのと同義になった時点で、この規定は目的を失う（枠を焼き切る）。
- **相談役と混同しない**。相談役（Consultation）は親と異なるprovider＝Claude親ならCodex旗艦が第一候補。最上位スポットはClaude枠内の品質エスカレーションであり、別レーンとして扱う（`shared/orchestrate/contract.md`「知能の配置原則」）。
- **呼んだ事実と理由を残す**（統括レーンではControlのDecision証拠、通常レーンでは報告に1行）。

## 指定の作法

- Claude Code 内では **floating alias（`fable` / `opus` / `sonnet` / `haiku`）のみ使用**。日付付き model ID を書いた時点で規約違反。
- Agent / Workflow の委譲は全役割で `model` と `effort` を**毎回明示**する——親と同値の指定は可、省略（＝主モデル継承）は不可（正典は`shared/orchestrate/delegation-contract.md`最低安全契約）。親が最上位のとき全子が張り付く継承の罠を踏まない。
- Codex に floating alias が無いため、`codex/agents/*.toml` と `.codex-sidecar.yml` は具体 slug を持つ**公認例外**（各ファイル冒頭の前提行が原則6 の grep に載る）。
- 外部 CLI のバージョンは pin しない。CLI 自体は `agents-update`（週次）で latest 追従。

## 世代交代時の更新手順

資産見直しをカレンダー駆動にしない。判断の定期化は形骸化するためであり、判断を要しない機械的衛生作業（メモリ棚卸し・rag Lint）だけを月次で回してよい。各資産の冒頭には前提行を1行仕込む（例: `前提: Fable級統括／Sonnet級実装者（2026-07 時点）`）。オーナーの世代交代宣言後、`grep -rn "前提:"`で再検討対象を機械列挙するためである。

1. オーナーが交代を宣言する。
2. この表の「解決例」列＋ティア語彙を更新して push。
   - **2′. 公認例外の同時更新**: `codex/agents/*.toml` の `model` 行と `.codex-sidecar.yml` の defaults を**同一コミット**で更新（`grep -rn "前提:" claude/ codex/ docs/ .codex-sidecar.yml` が列挙する）。
3. 前提行 grep で旧世代前提の資産を原則6で再検討（残す／作り直す／廃止の提案→オーナー承認）。
4. 各端末の `~/.codex/config.toml` 親既定はオーナー領分（docs/05_codex-fragments.md の事実提示を参照）。
