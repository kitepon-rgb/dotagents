# 02_models — 役割→モデル×エフォートの決定表（唯一の参照点）

<!-- 前提: 2026-07-11 更新（GPT-5.6 / Grok 4.5 世代）。バージョン固定禁止（PLAN 原則9）。モデル名をこの表以外＋公認例外（codex/agents/*.toml・.codex-sidecar.yml）に書き散らさない -->

方針: skill・agents・委譲契約・スクリプトは**役割名**でモデルを指し、具体名への解決はこの表だけが担う。世代交代時は**この1枚＋公認例外2種を更新して push すれば全端末が追従**する。更新トリガーはオーナーの宣言（PLAN 原則6）。

背骨: **判断はティアで買い、粘りは effort で買う**（「中位×xhigh」より「旗艦×low」が安くて強い——GPT-5.6 公式指針）。**配置に迷ったら安い方・採用に迷ったら棄却**（前者はエスカレーションで取り返せる、後者の混入は取り返せない——別物なので混同しない）。**親のモデル×エフォートはオーナーの領分**（規範・AI はピンを打ち替えない。事実と推奨の提示まで。規範が縛るのは子の配置だけ）。

## 消費枠（4つ。レート予算の分散が最優先）

| 枠 | 入口 | 特徴 |
|---|---|---|
| Anthropic | Claude Code 本体・Agent/Workflow・`sonnet`/`haiku` | 統括の窓＝有限資源。物量を流さない |
| OpenAI **Codex** | codex CLI・codex-sidecar MCP・Codex ネイティブ子 | 物量の第一柱 |
| OpenAI **ChatGPT** | **Oracle**（`oracle.consult`・MCP 入口限定・API 課金禁止） | Codex 枠と別勘定。実読不要の純推論はここが最得 |
| xAI | grok CLI・aiterm の grok/composer agent | 完全独立枠。物量の第二柱＋並列 finder |

## ティア語彙（この表だけがモデル名を持つ）

| ティア | 解決規則（latest 型） | 2026-07-11 時点の解決例 | コスト感 |
|---|---|---|---|
| Claude 主 | セッション主モデル（model 省略＝継承） | オーナー指定（Opus 4.8 / Fable 5） | Anthropic 枠 |
| Claude 中／軽 | floating alias `sonnet` / `haiku` | Sonnet 5 / Haiku 4.5 | Anthropic 枠 |
| Codex 旗艦 | OpenAI 現行旗艦 | `gpt-5.6-sol` | 5（$5/$30 per Mtok） |
| Codex 中位 | OpenAI 現行バランス枠（旧 mini 相当） | `gpt-5.6-terra` | 2.5（$2.5/$15） |
| Codex 軽量 | OpenAI 現行軽量枠（分類/抽出/高スループット） | `gpt-5.6-luna` | 1（$1/$6） |
| xAI 万能 | xAI 現行旗艦 | `grok-4.5`（effort は low/medium/high の3段のみ） | $2/$6・トークン効率4〜5倍 |
| xAI 物量 | xAI 現行コーディング特化 | `grok-composer-2.5-fast`（effort 非対応） | 速い・判断力低 |

## 決定表（役割→ティア×effort×入口。既定は写すだけ・外れる方を要正当化）

| 役割 | Claude レーン | Codex レーン | xAI レーン | Oracle レーン（ChatGPT 枠） |
|---|---|---|---|---|
| 統括・会話（親） | **オーナー指定** | **オーナー指定**（旗艦単体・proactive OFF を推奨） | — | — |
| 裁定・契約クリティカル | 主 直轄（F） | 親 直轄・直前だけ effort を上げる | —（難関形式推論は不向き） | 裁定の材料に consult 可 |
| 監査・発見（finder・数で押す層） | `sonnet`×low・Workflow で明示 | 中位=`gpt-5.6-terra`×medium・codex_auditor/explore | **`grok-4.5`**・grok_agent / `grok -p`（並列 finder に好適） | — |
| 反証・検証（リポ実読あり） | 主 継承×high・refuter | 旗艦=`gpt-5.6-sol`×high・refuter 定義 / codex_risk_check | —（ハルシ増・形式推論弱） | — |
| セカンドオピニオン（実読不要の純推論） | — | — | `grok-4.5` 可（実務的専門判断は首位級） | **第一選択**: `oracle.consult`（chatgpt-pro-heavy） |
| 設計（並列 Plan） | 主 継承×medium〜high | 旗艦×medium・codex_opinion | `grok-4.5`・実務判断の別視点 | 設計意見の別視点 |
| 実装物量（第一選択・外部枠） | —（外部へ） | **中位=`gpt-5.6-terra`×medium**・codex_work / implementer 定義 | **`grok-composer-2.5-fast`＝並ぶ第一選択**（仕様固定＋検証コマンド必須の委譲契約を厳守） | —（Oracle は書けない） |
| 実装物量（次善・Claude 枠） | `sonnet`×low〜medium・implementer | — | — | — |
| 軽作業・分類・抽出 | `haiku`×low（次善） | 軽量=`gpt-5.6-luna`×low・sorter 定義 / codex_generate | composer 可 | — |
| 第三者レビュー | — | 旗艦×medium・codex_review（契約クリティカル差分は high） | — | 差分を貼れる規模なら併用可 |

**入口は呼び手で決まる**: 上の Codex/xAI レーン入口（sidecar MCP・aiterm の *_agent）は**親が Claude の時**の入口。**親が Codex の時は、子はネイティブ委譲（`~/.codex/agents/*.toml`）一択**——aiterm や MCP 経由で入れ子の codex を起動しない（遅い・壊れやすい・並列/深さ/使用量制御に乗らない）。

**入口の既知の事実（2026-07-11）**:

- **codex-sidecar は端末 config.toml の model/effort 行を隔離 home に正確に継承する**。`model` / `modelReasoningEffort`（low〜xhigh のみ。ultra/max 無し）を**毎回明示**するか、対象リポの `.codex-sidecar.yml` defaults に落とす（dotagents は defaults=中位×medium 設定済み）。隔離 home に AGENTS.md はコピーされない＝sidecar 子は委譲契約プロンプトで統制する。
- **aiterm `codex_agent` は `model`/`reasoning_effort` 引数対応（2026-07-11 改修・v0.11.0 として npm 公開済み。端末反映は `npm i -g aiterm-mcp`）**: 引数は CLI 引数＋managed config ピン上書きで端末ピンより優先。省略時は端末 config 継承のままで、**起動応答が実効 model/effort と出所（引数/端末config継承/CLI既定）を明示**する（effort=ultra は警告付き）＝決定表どおり毎回 model×effort を明示して呼ぶ。
- **aiterm の grok/composer は隔離設計（OAuth のみ共有）**＝ピン継承問題なし。`grok_agent` の既定は `grok-4.5`（`model` 引数で上書き可・stale な `grok-build` は 2026-07-11 廃止）。**grok の `--effort` は headless（`grok -p`）専用で対話 TUI では無視される**＝grok/composer への `reasoning_effort` 指定は aiterm が起動前に明示エラーで拒否する。
- grok はこの端末で**認証済み**（2026-07-11 時点・tier 4）。
- **Codex の `/model` ピッカー選択は config.toml へ永続書き込みされる**（再ピン仕様）。だから子は継承に依存しない（上記の構造で遮断済み）。

## エフォートのエスカレーションゲート

**上げる前に3問**（どれかが No なら、上げても直らない＝先にそれを直す）:

1. 成功条件・検証コマンドを渡したか（曖昧なら仕様を直す）
2. 役割と入口が決定表の行と一致しているか（違えばルーティングを直す）
3. 「green まで自走」「前提の再検証」を契約に書いたか

**上げ方の規律**: 1回に動かすのは「ティア」か「effort」の片方だけ・effort は1段ずつ。**xhigh / max は既定禁止**（high との有意差を実測できた時のみ・理由記録）。**ultra は既定禁止・オーナー明示要求時のみ**（ultra＝max 推論＋proactive 自動委譲 ON＝子を自動量産。使用量急増の公式警告あり）。

**下げゲート**: 仕様固定・機械判定可能な作業（着手ゲート A 相当）は1段下げを試してよい（下げも1段ずつ）。

**品質エスカレーションは統括の裁量（安さは既定であって強制ではない）**: 委譲物を検証して品質に納得しない時、統括の判断で上位（`sonnet` → `opus` → 主モデル自身／Terra → Sol）へ引き上げて再実行してよい。「安く済ませる」より「正しく仕上げる」が上位。エスカレーションした事実と理由は残す。

## 委譲の実行ツール

- **非対話の一括委譲・独立レビュー → codex-sidecar MCP**: `codex_work`（隔離 worktree で実装）・`codex_review`・`codex_explore`・`codex_opinion`・`codex_risk_check`・`codex_auditor`・`codex_generate`。**model/effort は毎回明示 or `.codex-sidecar.yml` defaults**（上記入口事実）。
- **対話で外部エージェントを駆動 → aiterm**: `codex_agent`・`grok_agent`・`composer_agent`（対話 TUI を永続端末に起動→ `pty_read`/`pty_send`）。上記の入口事実（継承・stale・effort 無視）に注意。
- **非対話の xAI 物量 → `grok -p`（headless）**: `--effort low|medium|high` はここでのみ有効。
- **セカンドオピニオン → `oracle.consult`**（MCP 入口限定・`preset: "chatgpt-pro-heavy"`。API engine 禁止＝`OPENAI_API_KEY` を作らない）。

## 指定の作法

- Claude Code 内では **floating alias（`sonnet` / `haiku` / `opus`）のみ使用**。日付付き model ID を書いた時点で規約違反。
- Agent / Workflow の **model 省略（＝主モデル継承）が許されるのは検証・反証・裁定系のみ**。finder・整形・物量は `model` と `effort` を決定表どおり**毎回明示**する——親が最上位のとき全子が張り付く継承の罠を踏まない。
- Codex に floating alias が無いため、`codex/agents/*.toml` と `.codex-sidecar.yml` は具体 slug を持つ**公認例外**（各ファイル冒頭の前提行が原則6 の grep に載る）。
- 外部 CLI のバージョンは pin しない。CLI 自体は `agents-update`（週次）で latest 追従。

## 世代交代時の更新手順

1. オーナーが交代を宣言する。
2. この表の「解決例」列＋ティア語彙を更新して push。
   - **2′. 公認例外の同時更新**: `codex/agents/*.toml` の `model` 行と `.codex-sidecar.yml` の defaults を**同一コミット**で更新（`grep -rn "前提:" claude/ codex/ docs/ .codex-sidecar.yml` が列挙する）。
3. 前提行 grep で旧世代前提の資産を原則6で再検討（残す／作り直す／廃止の提案→オーナー承認）。
4. 各端末の `~/.codex/config.toml` 親既定はオーナー領分（docs/05_codex-fragments.md の事実提示を参照）。
