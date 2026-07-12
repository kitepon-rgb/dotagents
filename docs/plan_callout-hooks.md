# 呼びかけ Hook 群 — 配置ゲート・TODO ゲートの工場組み込み（設計・計画）

<!-- 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。本書が正本＝消化チェックは本書で行う。判定の正は docs/02_models.md -->

## Context（なぜやるか）

- 憲法・AGENTS.md・orchestrate スキルに配置規範（02_models.md 決定表・着手ゲート）と TODO 運用（プランは TODO を兼ねる・消化チェック・archive 退避）が明文化されているのに、**行動の瞬間に無視される**。Fable でも Sol でも同じ＝モデルの賢さの問題ではなく、規範がコンテキストの奥に沈む構造の問題。
- 既に憲法自身が答えを持っている: 「**受動規範は摩擦ゼロの既定に負ける**」（正本化ゲートの由来）。解は plan-gate-hook と同型＝**行動の瞬間に hook で文脈の最前面へ注入する**。
- 今回はこれを2系統へ横展開する:
  1. **配置ゲート**: オーケストレーション（委譲）のモデル×エフォートが聖典（02_models.md）に準じているか
  2. **TODO ゲート**: 計画文書のチェックボックス更新を怠っていないか／プランを docs/ に正本化したか
- **3系統に拡張（オーナー裁定 2026-07-12）**: 当初2系統（配置ゲート C1／TODO ゲート C2-C3）に、**着手ゲート C4** を追加。反証 #2 では「委譲すべきなのに Edit/Write で抱え込む失敗は射程外・v2」としたが、Throughline の Claude 要望＋オーナー 2026-07-11 裁定（層3）で本体へ格上げ——「検出」でなく「毎ターン注入」なら誤爆なく捕まえられる（C4 参照）。これで hook が捕まえる範囲は「着手時の配置判断」「委譲時の配置の質」「作業後のプラン更新」の3点になる。

## 調査で確定した事実（設計の前提）

### 既知の罠（caveat 実被弾済み）

- Stop hook に達成不能な完了条件 → **15+ 回の無限ループ**（reproduced）→ ブロック系は達成可能条件＋ワンショット化必須
- hook の matcher は **tool_name のみ**（payload 内容では絞れない）→ 内容判定は hook スクリプト側で
- PostToolUse の同期重 I/O は**毎 tool call に 150-300ms** 乗る → hook は軽量 jq/grep のみ、重い処理は detached
- ~~hooks は hot-reload されない~~ → **プローブ P5 で「される」と決着**（現行 Claude Code は settings.json 変更を再起動なしで反映）。caveat の旧記載は現行版で誤り＝Phase 1 で訂正する
- stdin 未消費 / stderr 出力で成功でも "Hook Error" ラベルが付く
- Codex CLI hooks: `[features].hooks` フラグ＋ディレクトリ trust 必須・async 非対応・tool 成否は payload に出ない。**`update_plan` は PreToolUse/PostToolUse 両方発火し tool_input に全 plan（step×status）が乗る**

### 現状の hook 基盤（Explore 調査済み）

- **plan-gate-hook.sh**（bin/）が唯一の規範系 hook。型: stdin 読み捨て → `hookSpecificOutput.additionalContext` に固定文言 → 常に exit 0。条件分岐・スロットル・jq 依存なし。設定断片は docs/03_settings-fragments.md L35-52（PostToolUse × matcher:"ExitPlanMode"）。
- この端末の ~/.claude/settings.json 実配線: Stop=throughline+caveat / UserPromptSubmit=throughline+caveat / PostToolUse=caveat(全ツール)+plan-gate(ExitPlanMode) / PostToolUseFailure=caveat / SessionStart=throughline / SessionEnd=throughline。
- **Codex 側**: `[features].hooks=true` 有効化済み。`~/.codex/hooks.json`（dotagents 管轄外・各ツールのインストーラが追記する方式）に throughline / caveat / **claude-spotter** が配線済み（UserPromptSubmit・Stop・SessionStart。UserPromptSubmit の注入は spotter の実出力で発火実証済み。**SessionStart は async:true 指定＝caveat 0.136.0 時点で async は skip されており発火未確認**→プローブ対象）。plan-gate 相当は未配線。プロジェクトローカル `.codex/hooks.json` も可（trust 承認必須）。
- **verify-install.sh は symlink の存在しか見ない＝settings.json / hooks.json への実配線は誰も検証していない**（手挿し忘れが検出されない穴）。config.toml 断片検証（python3 正規表現・L61-96）が「$HOME 側実ファイル検証」の既存パターン。
- docs/03 に既存の明示方針: 「**TodoWrite に hook を貼らない**（些末用途が多く alarm fatigue）」。
- 正本化ゲート・着手ゲートの一次定義は claude/CLAUDE.md（PLAN.md 原則ではない）。**codex/AGENTS.md には着手ゲート/F-A-H/配置宣言の語彙が無い**（既存の規範ズレ。verify-constitution-parity の対象5章にも入っていない）。

### TODO 放置の実態（裏取り結果 — 設計を変える発見）

- docs/ 直下の未チェック: plan_gpt56-rewiring.md=6件（他端末波及待ち＋上流仕様待ち）、queue_memory-promotion.md=15件（他リポ作業セッション待ち・6日間ノータッチ）、PLAN.md 残件=9件（H/他リポ待ち・7/5転記のまま）。
- **「チェックし忘れ」の証拠はこのリポには無い**——全て意図的なトリガー待ち。よって TODO ゲートは「チェック漏れ検出」単発でなく、①セッション開始時に生きた TODO の棚卸しを想起させる ②作業したのにプラン正本を触っていない時に呼びかける、の2方向で設計する。

### Claude Code hook イベント能力（公式 docs 実測・2026-07-11）

- **PreToolUse**: `permissionDecision:"allow"` + `additionalContext` で**非ブロック注意注入が可能**。deny も可。matcher は正規表現・MCP ツール名可（`mcp__codex-sidecar__.*`）。**Task は v2.1.63 で Agent に改名**（alias 併存＝matcher は両方書く）。
- **Stop / SubagentStop**: additionalContext と decision:"block"+reason の両対応。stdin に `stop_hook_active`、連続 block 8回 cap。
- **SessionStart / UserPromptSubmit**: exit 0 の生 stdout がそのまま context 注入（UserPromptSubmit の timeout 既定 30s）。SubagentStart は additionalContext のみ（block 不可）。
- settings.json の hook に `once:true` は無い＝スロットルは hook 側で状態ファイル自作。`async:true` / `asyncRewake:true`（exit 2 で Claude を起こす）あり。
- hook type: command のほか prompt 型・agent 型（50ターン・ツール可）が存在。
- **未確定だった3点 → 全て Phase 1 プローブで確定**（下記「プローブ結果」）。

### プローブ結果（Phase 1 実測・2026-07-12・全 green）

Claude 側（P1-P5,P7）・Codex 側（P6）を implementer 2体で並列実測（`model: sonnet, effort: 低め` の物量委譲）。設計の急所は全てクリア:

- **P1**: tool_name=`Agent`（Task でなく）。tool_input に `subagent_type`/`model`/`prompt`/`description`。Workflow は tool_input.script（JS 文字列）。→ C1 は Agent の `model` フィールドを見る。
- **P2**: 子エージェント内部の Bash も親 PreToolUse で発火・`agent_id`/`agent_type` 付与・session_id は親と共通。→ C1 のスロットル（session_id キー）が子の多重発火も自然に抑える。
- **P3（急所）**: additionalContext 単独注入は**届く**・permissionDecision 無しで権限フロー無干渉・毎回発火。到達は「ツール結果と同時〜直後」＝矯正型。→ **C1 warn 成立（deny 縮退を回避）**。
- **P4**: Stop stdin に cwd あり・CLAUDE_PROJECT_DIR あり。**副産物: 1実行で Stop が複数回発火しうる**（バックグラウンド Agent 完了点＋最終応答点、いずれも stop_hook_active=false）→ C3 の rolling baseline は「Stop 発火ごとに前回差分」を見るので、この多重発火でも差分ゼロなら沈黙＝二重発火しない。
- **P5**: **hot-reload される**（決着）。配線後の新セッション不要。user 設定変更は全稼働セッションに波及（注意）。
- **P6（Codex）**: Stop の `decision:block` は Sol の続行と指示従属を実起こし＝**X4 成立**（一次証拠ゼロだったものが埋まった）。PreToolUse deny も第一形式で実ブロック＝X2 の deny 経路可。additionalContext/UserPromptSubmit 注入も到達。**async は 0.144.1 でも非対応・trust にすら乗らない**＝X1-X4 全て async:false 必須（既存 spotter の SessionStart async:true は現状死んでる公算）。hooks はグローバル×プロジェクトローカルで**マージ実行**。update_plan shape=`plan[].{step,status}` 再確認。
- **P7**: matcher `mcp__.*` は MCP ツール名に効く。headless の ask は**自動 deny**（再試行なし・hang なし）＝C1 の ultra=ask は headless で自動拒否。Stop block の 8回 cap 実在（hang なし）。

## 設計（2視点 Plan〔A=最小・疲労回避／B=網羅・強制力〕→ 統括裁定済み）

### 設計原則

1. **沈黙が既定**: hook は条件成立時だけ喋り、準拠時は出力ゼロバイト・exit 0（plan-gate の「毎回固定文言」型は低頻度イベント専用と位置づけ、高頻度イベントには使わない）。
2. **呼びかけ＞強制、ただし機械判定の明白違反はブロック**: warn=additionalContext 単独（**permissionDecision:"allow" は併記しない**＝権限ダイアログの自動素通し事故になる）。deny は「誤検知ほぼゼロ×その場で修正可能×修正手順を文言に含む」の3条件を満たすものだけ。**オーナー領分の判断（ultra）は deny でも warn でもなく ask**＝承認ダイアログでオーナー本人に聞く。
3. **hook は判定材料の提示まで**: 意味論的裁定（役割→ティア適合）は hook に書かない。モデル名も焼き込まない（原則9）。文言は観測値（ツール名・model・effort・ファイル名・件数）を埋め込む動的生成＝同文言の学習的無視を構造的に防ぐ。
4. **既存の工場パターンに従う**: bin/ ペイロード（install.sh の bin ループが自動 symlink・**install.sh 編集不要**）＋docs/03（Claude 配線断片）／docs/05（Codex 配線断片）＋AGENTS.md オンボーディング＋verify-install.sh。状態ファイルは `${XDG_CACHE_HOME:-$HOME/.cache}/dotagents/hooks/`（自前管理領域・7日超は opportunistic GC）。
5. **エスケープ**: `DOTAGENTS_PLACEMENT_GATE=off|warn|enforce`（既定 enforce）／`DOTAGENTS_TODO_GATE=off|warn|block`（既定 block）。
6. 各スクリプト冒頭に前提行（PLAN 原則6）: `# 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。判定の正は docs/02_models.md`。実装言語は python3（verify-install が既に hard dep 化済み。jq 新規依存を作らない）。

### 裁定メモ（A/B の割れと根拠）

- **「表に無い slug は deny」（B案）→ warn に格下げ**: Agent ツールの `model:"fable"` 等、ティア語彙表のバッククォート slug に載らない正当な値が実在＝誤 deny の反例あり。deny は誤検知ゼロの2種のみに限定。
- **「セッション初回委譲時の配置宣言リマインダ」（B案）→ 採用**: A案の「違反時のみ」は要求の核（呼びかけ）を落とす。model 省略の適否は機械判定不能——だからこそ「問いかけ」が正しい形。セッション1回×動的文言で疲労を抑える。
- **SessionStart 棚卸し（A案は不採用・B案は採用）→ リポ×日次スロットル付きで採用**: オーナーの実痛点は「docs/ が未消化に見える」こと。A案の懸念（静的内容の反復）はスロットルで殺す。C3 のスナップショット副作用も SessionStart に要るため配線自体は必須。
- **Codex 展開（A案=全見送り）→ 棄却、フェーズ分離で採用**: オーナーが「Fable だろうが Sol だろうが同じ」と明言＝片輪は要求違反。ただし配置系の強制はプローブ結果（deny 尊重可否）依存とし、確実に価値が出る「正本化ゲートの Codex ミラー（update_plan 初回）」を主役に置く。
- **xhigh/max（A案=warn 対象）→ 初回リマインダ文言内の注意に格下げ**: 02 は「有意差実測時のみ・理由記録」＝正当化つき使用が合法で、理由の有無は機械判定不能。ultra だけ ask（「オーナー明示要求時のみ」と規約が明記＝権限所在が機械判定可能）。

### Hook 台帳（Claude 側）

#### C1: `bin/delegation-gate-hook.sh`（配置ゲート）

- **イベント×matcher**: `PreToolUse` × `"Agent|Task|Workflow|mcp__codex-sidecar__codex_.*|mcp__aiterm__(codex|grok|composer)_agent|mcp__oracle__consult"`（Task/Agent は改名 alias 併記。**oracle もオーナー裁定で監視対象**＝ChatGPT 枠も委譲入口の一つ）
- **射程の限定（反証 #2 反映・過大広告しない）**: C1 が守るのは「委譲する時の配置の質」。**「委譲すべきなのに統括が抱え込む」失敗（実被弾 2026-07-05 は Edit/Write で発生＝委譲ツール未使用）は matcher 上見えない＝本 hook の射程外**。抱え込み検出（Stop 時に統括の直接編集量を報告する等）は v2 候補としてやらない表に記載。
- **判定3段**（上から評価・最初の1つだけ出力。**deny①②の検査対象は model/effort フィールド値のみ**——プロンプト本文は見ない。stale-canon 監査のように「日付付き ID をプロンプト内で言及する」正当作業を誤爆させない）:
  - **deny①**: model フィールド値が日付付き ID パターン（`-20[0-9]{6}` 等）→ 規約明文違反・誤検知ゼロ
  - **deny②**: `mcp__aiterm__codex_agent` で model / reasoning_effort 欠落 → 「毎回明示」の明文違反＋端末ピン継承の実害経路（grok/composer は aiterm 側が構造で解決済み＝対象外）
  - **deny③（オーナー裁定 2026-07-12 で追加）**: `mcp__oracle__consult` で封印パラメータの指定（`preset:"chatgpt-pro-heavy"`・`browserModelLabel`・`modelStrategy:"select"`）または `engine:"api"` → 06_oracle-mcp.md の封印明文＋API 課金禁止（正典と直近コミット 614d722 が既に Claude 側の暴走経路として遮断済み＝hook はその機械化）。誤検知ゼロ・標準形 `engine:"browser"` は素通し
  - **ask**: effort 系の値が `ultra` → オーナー明示要求時のみの規約。permissionDecision:"ask" でオーナー本人へ
  - **warn（セッション初回の委譲時に1回だけ）**: 違反が無くても、最初の委譲ツール呼び出しで配置宣言リマインダを注入。**注意: PreToolUse 注入は当該呼び出し自体には間に合わない（モデルが読むのはツール結果と同時が最速）＝warn は「今の委譲を事後宣言させ、以後を正す」矯正型**。文言もその形にする（反証 #4）
- **沈黙**: 上記いずれにも該当しない（＝2回目以降の準拠した委譲）／stdin パース不能（fail-open。ただし `~/.cache/dotagents/hooks/errors.log` へ1行記録＝フォールバック明示の憲法要件。stderr は禁止のまま）／`DOTAGENTS_PLACEMENT_GATE=off`
- **スロットル**: warn はセッション1回（session_id キー）。**compact 後は warn 状態をクリアして再武装**（SessionStart source=compact で発火。注入済みリマインダは要約で消えるため——長時間統括セッションこそ主戦場・反証 #7）。deny/ask はスロットルなしだが、**同一ツール×同一 model 値の deny はセッション3回で warn に自動降格**（headless パイプラインでの deny 連呼＝Stop 15回ループの再演を初版から封じる・反証 #12）
- **文言**:
  - warn（ツール別に分岐・sidecar の時は defaults を正当経路として言及〔反証 #13〕）: 「【配置ゲート】このセッション初の委譲（<ツール>: model=<値|省略>, effort=<値|未指定>）。この委譲の配置宣言が未提示なら、今ここで1行書く（例: `A: 役割=実装物量 →〔Codex 中位×medium×codex_work〕`）。以後の委譲は 02_models.md 決定表の行を写して宣言してから渡す。Agent/Workflow の model 省略が許されるのは検証・反証・裁定系のみ（sidecar は .codex-sidecar.yml defaults も正当経路）。xhigh/max は要正当化。迷ったら安い方。以後は明白違反時のみ通知する。」
  - deny①: 「【配置ゲート・ブロック】model "<値>" は日付付き model ID＝規約違反(02_models.md 指定の作法)。floating alias（sonnet/haiku/opus）か現行ティア語彙に替えて再実行すれば通る。」
  - deny②: 「【配置ゲート・ブロック】codex_agent は model×reasoning_effort の毎回明示が規約(02_models.md 入口の既知の事実)。省略は端末ピン（旗艦×ultra 等）を継承する。両引数を明示して再実行すれば通る。」
  - deny③: 「【配置ゲート・ブロック】oracle.consult に封印パラメータ（<検出値>）が指定された。標準形は engine:"browser" のみ・モデル/Effort はアカウント現在値で走る（06_oracle-mcp.md）。封印指定を外して再実行すれば通る。API engine は課金経路のため禁止。」
  - ask: 「effort=ultra は max 推論＋proactive 自動委譲 ON＝子を自動量産(02_models.md エスカレーションゲート「オーナー明示要求時のみ」)。この依頼にオーナーの明示要求が実在する場合のみ承認してください。」

#### C2: `bin/todo-gate-hook.sh session-start`（TODO 棚卸し想起）

- **イベント**: `SessionStart`（source=startup|clear で棚卸し・resume|compact は snapshot 側の処理のみ＋compact は C1 warn 再武装）
- **副作用（常時・沈黙）**: cwd の **リポルートを解決**し、`git status --porcelain` ハッシュ＋ **HEAD sha** を **session_id×リポルート** キーで snapshot（C3 の判定材料）。**既に同キーの snapshot があれば上書きしない**（compact でベースラインを消さない・反証 #7）
- **発火条件**: cwd が git repo ∧ `docs/plan_*.md` または `docs/queue_*.md` が存在 ∧ 未チェック残 or 「全消化なのに archive 未退避」あり ∧ **このリポで直近24h以内に棚卸し未表示**（repo パスキーの日付スロットル）
- **文言**（生 stdout・動的）: 「【TODO 棚卸し】docs/ の生きたプラン: <plan_foo.md（未消化 N・最終更新 D 日前）・queue_bar.md（残 M）…>。<全消化済みで archive 未退避: plan_baz.md>。このセッションで消化した項目はチェックを入れ、役目を終えた文書は docs/archive/ へ。7日以上動いていない項目は「トリガー待ち」の明記があるか確認し、無ければ裁定をオーナーに仰ぐ。」

#### C3: `bin/todo-gate-hook.sh stop`（プラン正本の更新忘れ）— **オーナー裁定済み: 毎ターン×warn**

- **イベント**: `Stop`（サブエージェントでは SubagentStop に変換される＝誤爆面が狭いことを docs で確認済み）
- **発火モデル（rolling baseline・オーナー裁定 2026-07-12）**: **毎ターンの Stop で「前回 Stop 時点との差分」を判定**し、「このターンで新しく作業した（porcelain ハッシュ変化 OR HEAD 移動）のにプラン正本が動いていない」ターンだけ発火。判定後に baseline を今回値へ更新。会話だけのターン・プランを触ったターンは沈黙。
- **発火条件（全 AND）**: ①`stop_hook_active`=false ②このターンの新規差分あり（rolling baseline 比較。porcelain 単独不可＝コミット済み作業を見逃す・反証 #1） ③`docs/plan_*.md` が存在 ④差分ファイル（dirty＋新規コミットのパス）にプラン系が含まれない ⑤**現在の cwd のリポルートが baseline キーと一致**（リポ跨ぎ cd の偽陽性封じ・反証 #6。baseline 不在時は今回値を記録して沈黙） ⑥`DOTAGENTS_TODO_GATE` が off でない
- **強度**: **warn（additionalContext）が既定**＝停止は止めない。`DOTAGENTS_TODO_GATE=block` で 1ターン1回の block へ昇格可（無視が続く実測が出た時のエスカレーション経路。block 時も stop_hook_active＋ターン内1回で無限ループ構造は不可能）
- **文言**: 「【TODO ゲート】このターンで作業した（<差分の要約: N ファイル/コミット M>）が、docs/ のプラン正本（<plan_*.md>）が動いていない。消化した項目があればチェックを更新（完遂なら docs/archive/ へ退避）。この作業がプラン対象外なら、その旨を1行オーナーへ報告してから次へ。」

#### C4: `bin/onset-gate-hook.sh`（着手ゲート注入）— オーナー裁定 2026-07-12 新設（Throughline 要望・層3 と符合）

- **背景**: C1（配置ゲート）は委譲ツールが呼ばれた時しか発火せず、「委譲すべきなのに Edit/Write で抱え込む」失敗（2026-07-05／2026-07-11 実被弾）を捕まえられない＝反証 #2 で v2 送りにした穴。Throughline の Claude 要望＋オーナー 2026-07-11 裁定（層3・メモリ `canon-consultation-before-placement`）で本体へ格上げ。着手ゲートの一次定義は claude/CLAUDE.md:59。
- **目的（2層）**: ①**抱え込み防止**＝統括の窓（有限レート予算）を守る。手足仕事（テスト・設定・一括置換・仕様固定の実装）を自分で書かず既定 A＝委譲へ。②**偽準拠防止**＝配置宣言を 02_models.md を開いて file:line 引用で写す（暗記の例文丸写しで sonnet/haiku・aiterm・grok・composer が抜けた 2026-07-11 の再発を潰す）。
- **イベント×matcher**: `UserPromptSubmit`（matcher なし・毎ターン）。**発火点の裁定経緯**: 「Edit|Write 初回」案は (a) ソース/プラン編集の区別が file_path 判定で脆く腐る (b) Edit を待つと着手判断に遅い、の二重欠点でオーナー指摘により棄却。UserPromptSubmit＝実装のどんな形（Edit/委譲/Bash 直）より前・ファイルを見ないので区別問題が消える。caveat の毎ターン注入と同型。
- **強度**: **warn（生 stdout が context 注入）。deny 不可**——「着手ゲートを踏んだか」は会話に書くテキスト行為で機械判定不能＝deny するとループ（Stop 15回の型）。plan-gate と同じ「常に通す・思い出させるだけ」。
- **頻度**: **毎ターン**（着手ゲート＝毎ユニット、が憲法 claude/CLAUDE.md:59「実装の前に毎回・単発ユニットでも」の要求。当初検討した「セッション1回」は憲法より緩い＝棄却）。スロットルなし・compact 再武装も不要（毎ターン出るため自然回復）。
- **共存**: 既存 caveat/throughline の UserPromptSubmit と hooks はマージ実行（P2/P5 実証）。
- **文言（毎ターン・薄いトリガー型・配置＋正本化の2点）**: 「【着手ゲート】この依頼で実装・委譲・オーケストレーションに入るなら、手を動かす前に: (1) orchestrate スキルと docs/02_models.md を**開いて**、作業を F/A/H でラベルし配置（ティア×effort×入口）を決定表の該当行を **file:line 引用付き**で1行宣言する（既定は A＝委譲、自分で書く(F)なら理由を1行）。(2) プランは docs/ に正本化したか（会話・TodoWrite の使い捨てで済ませない）。調査・会話・小さな単発修正だけのターンは無視してよい。」
- **文言の設計判断**: (a) 決定表レーンの列挙（sonnet/haiku・aiterm・grok・composer）は文言に焼かない——「開け」で代替＝原則9（モデル名を散らさない・世代交代で腐らせない）＋偽準拠潰し（開いて引用しろと言えば暗記の丸写しが構造的に不可能）。(b) **正本化ゲート（プランを docs/ に）も含める（オーナー裁定 2026-07-12・変更）**——既存 plan-gate（ExitPlanMode）は「プランモードでプランを承認した時」しか出ないため、**プランモードを飛ばして実装に入る時の正本化漏れは毎ターンの C4 でしか捕まえられない**。当初「重複だから除く」としたのは近視眼だった。
- **エスカレーション**: `DOTAGENTS_ONSET_GATE=off|warn`（既定 warn）。
- **Codex ミラー**: X5 として codex-callout-hook に同型を足す（UserPromptSubmit・毎ターン・同文言。P6f で UserPromptSubmit 注入到達を確認済み）。

### Hook 台帳（Codex 側 — `bin/codex-callout-hook.sh` サブコマンド分岐）

Codex hooks.json に matcher は無い＝**stdin 先頭 grep の fast-path で対象外ツールを python3 起動前に即 exit 0**（同期150-300ms 税対策）。trust 承認必須・async 非対応。

- **X1 `session-start`**: C2 ミラー（出力は additionalContext 契約）＋ snapshot
- **X2 `pre-tool-use`**（update_plan / spawn_agent のみ拾う）:
  - **update_plan 初回かつ step 数 ≥4** → **正本化ゲートの Codex ミラー**（Claude 側 plan-gate にしか無かった片輪を埋める・セッション1回）。**docs/03「TodoWrite に貼らない」方針との差分理由を明示**（反証 #9）: Claude 側は ExitPlanMode という「意図的なプラン承認・低頻度」の発火点があるから TodoWrite を避けられる。Codex に等価イベントは無く、update_plan が唯一の観測可能なプラン瞬間＝最近傍。些末用途は step 数下限で素通しする。文言: 「【正本化ゲート発火】内蔵プラン（update_plan）を作った。実装に入る前にプランの正本を対象プロジェクトの docs/ に置く（チェックボックス付き＝TODO を兼ねる）。使い捨てで済ませるなら「なぜ docs/ に正本化しないか」を1行名指ししてから。正本なし・理由なしで実装を始めない（AGENTS.md 計画文書の作法）。」
  - **update_plan 全 step completed** → TODO 消化呼びかけ（レア発火・セッション1回): 「【TODO ゲート】内蔵プランを全消化した。docs/ のプラン正本にチェックを反映し、完遂なら docs/archive/ へ退避。正本の無い作業なら、正本化しない理由が宣言済みか確認。」
  - **spawn_agent 検査**（プローブ④=deny 尊重可否の結果で deny or pending 送り）: agent_type 欠落（routing 断片未適用の兆候）／model 日付 ID。
- **X3 `user-prompt-submit`**: pending drain（X2 で deny 不可だった違反を次プロンプトで注入・pending 空なら常時沈黙）＋ **X5 着手ゲート注入を相乗り**（C4 ミラー・毎ターン・同文言）
- **X4 `stop`**: C3 ミラー（**毎ターン×warn・rolling baseline**＝オーナー裁定に追従）。**成立前提「Codex Stop hook の注入が実際に挙動へ反映される」は工場内に一次証拠ゼロ**（caveat 実測は観測専用の記録）＝プローブ P6 で最初に確認し、不可なら X4 は落として X3 pending 経路に降格（反証 #8）

### 規範側の同時修正（hook が空振りしないための地ならし）

- **codex/AGENTS.md の委譲レジーム変更（オーナー裁定 2026-07-12: (b) を採択）**: 現行の「委譲はユーザー明示許可制・親直既定」（L58/L61/L65 周辺）を廃し、Claude 側と対称の**着手ゲート**へ書き換える——コードを書く前に F/A/H ラベル＋配置1行宣言、**既定は A＝ネイティブ子への委譲**（`~/.codex/agents/*.toml` の role をそのまま使う・02_models.md 決定表準拠）、親直するなら理由1行を要正当化。**変えないもの**: ①proactive 自動委譲は引き続き OFF（ultra 封印と同根＝「規範上の委譲既定」と「モデルの自動スポーン機能」は別物） ②ネイティブ委譲一択（aiterm/MCP 経由の入れ子 codex 禁止） ③`verify-codex-agent-routing` green までは handshake-only spawn の規律。**注意**: parity 対象5章の外なので verify-constitution-parity は壊れないが、これは**憲法差分＝契約クリティカル（F・統括直轄）**。差分単独のコミットに分け、push 前にオーナーが diff を目視レビューする工程を必須にする。OpenAI 枠の使用量増はオーナー了承済みの帰結として明記。
- bin/plan-gate-hook.sh L9 の stale ポインタ（`docs/plan_plan-gate-hook.md` → 実体は `docs/archive/2026-07_plan-gate-hook.md`）を相乗り修正。
- プローブで hot-reload 矛盾（caveat「再起動必要」vs docs/03「ライブ反映」vs 公式「file watcher」）を決着させ、負けた側の正典を更新。

### 強制力の段階表（4問すべて Yes の時だけ deny/block）

(1) 判定は決定的か (2) 修正はそのターンで完了できるか (3) 承認権限は AI 側にあるか（オーナー領分なら ask） (4) 発火は違反時のみか（正常フローでも発火し得るなら warn）

| 段階 | 適用 |
|---|---|
| silent（既定） | 全 hook の非該当時・スロットル済み |
| warn（additionalContext・動的文言） | C1 初回委譲リマインダ（セッション1回・compact 再武装）／C2・X1 棚卸し（リポ×24h）／X2 正本化・全消化（セッション1回）／**C3・X4 TODO ゲート（毎ターン・rolling baseline）**／**C4・X5 着手ゲート（毎ターン UserPromptSubmit・条件付き文言）** |
| ask | effort=ultra（C1） |
| deny | C1 deny①②③（日付 ID／codex_agent 引数省略／oracle 封印パラメータ・API engine）／X2 spawn_agent（プローブ結果依存） |
| block（エスカレーション経路のみ） | C3/X4 を `DOTAGENTS_TODO_GATE=block` で昇格した時だけ（既定は warn） |

### やらない表（検討して落としたもの）

| 案 | 落とした理由 |
|---|---|
| TodoWrite / TaskCreated への hook | docs/03 の既存方針（alarm fatigue）。TaskCreated は v2 候補としてオーナー裁定待ちに記載のみ |
| Workflow script 内の model/effort 解析 | script 文字列解析は重く、検証系の model 省略は正規の作法＝誤検知が構造的に不可避。orchestrate 雛形側の規律が既に強い |
| grok/composer の引数検査 | aiterm v0.11.0 が構造で解決済み（不正 effort は起動前エラー・既定が決定表の行そのもの） |
| sidecar の model 省略 warn | .codex-sidecar.yml defaults が公認バックストップ。C1 初回リマインダが間接カバー |
| 「表に無い slug」の deny／stale-slug 注意 | deny は `fable` 等の正当値で誤爆する反例あり。warn 格下げ案も、現行 slug 集合の取得機構（焼き込み=原則9違反／02 実行時パース=結合と重さ）が自家撞着するため **v1 では丸ごと落とす**（反証 #5）。再訪条件: stale slug 起因の誤配置が実際に観測されたら「readlink 自己解決→02 パース・失敗時は沈黙」を明文機構として v2 検討 |
| ~~統括の抱え込み検出（Stop 時に直接編集量を報告）~~ | → **C4（着手ゲート注入）として本体へ格上げ**（オーナー裁定 2026-07-12）。「編集量の検出」でなく「毎ターン UserPromptSubmit で無条件に着手ゲートを注入」に転換したことで、ヒューリスティック誤爆を回避しつつ反証 #2 の穴を塞いだ |
| C4 の "ソース編集 vs プラン編集" の file_path 判定 | 拡張子/パスのリストは腐る・境界ケース（docs/02_models.md 更新・.claude/settings.json 編集）で誤判定。UserPromptSubmit 発火にしてファイルを一切見ないことで問題ごと消した（オーナー指摘）|
| 役割→ティア適合の意味論裁定（agent 型 hook） | 原則9違反（slug 焼き込み）または速度 fatigue。再訪条件: warn 無視が月複数回オーナー指摘になったら agent 型 advisory を検討（deny 権限は与えない） |
| 「プラン正本が存在しないリポ」への Stop 催促 | 大半のリポ・雑務セッションで誤爆＝ノイズ源。プラン創設の呼びかけは既存 plan-gate（ExitPlanMode）と X2 正本化ミラーが担う |
| 未チェック残 N 件の Stop 催促 | 実態（トリガー待ち）に反する純ノイズ。棚卸し（C2）の「7日以上動いていない項目の裁定確認」が代替 |

## 実装計画（TODO を兼ねる）

### Phase 0 — 正本化

- [x] git fetch 照合 → `docs/plan_callout-hooks.md` に本設計を正本化（前提行つき）→ pathspec コミット（930011d）

### Phase 1 — 実測プローブ（完了・2026-07-12）

- [x] P1: Agent(Task)/Workflow の tool_input 実フィールド名 → tool_name=`Agent`・`subagent_type`/`model`/`prompt`
- [x] P2: サブエージェント内部ツールにも親 PreToolUse 発火・`agent_id`/`agent_type` 付与・session_id 共通
- [x] P3（急所）: additionalContext 単独注入は届く・権限フロー無干渉・毎回発火 → C1 warn 成立
- [x] P4: Stop stdin に cwd・CLAUDE_PROJECT_DIR あり。1実行で Stop 複数回発火しうる（rolling baseline は差分ゼロで沈黙）
- [x] P5: hot-reload される（決着）→ caveat 訂正が残タスク
- [x] P6: Codex Stop block 成立（X4）・deny 効く・async 非対応（全 async:false）・update_plan shape 確認
- [x] P7: matcher は MCP 名に効く・headless の ask は自動 deny・Stop 8回 cap 実在
- [x] caveat 還流: hot-reload 訂正（`claude-code-hooks-no-hot-reload`＝バージョンで挙動変化と明記）・Codex Stop 注入到達（`codex-cli-hooks-posttooluse…` に「観測専用ではない」補足）／⏳ rag（hook 発火事実）は未

### Phase 2 — Claude 側ペイロード（A ラベル: 仕様固定の実装物量→外部枠委譲、文言と判定条件は F=統括直轄）

- [x] `bin/delegation-gate-hook.sh`（C1）＋空打ちテスト
- [x] `bin/todo-gate-hook.sh`（C2/C3）＋空打ちテスト
- [x] `bin/onset-gate-hook.sh`（C4・毎ターン UserPromptSubmit・条件付き文言）＋空打ちテスト
- [x] plan-gate-hook.sh L9 stale ポインタ修正
- [x] `make lint` → `./install.sh`（linked 3本確認）
- 実装ノート: hook は python3。既存 shellcheck が python shebang を SC1071 で弾くため Makefile に lint-py（ast.parse）を新設し lint-sh は shell スクリプトのみへ。tests/hooks/smoke.sh 新設（XDG_CACHE_HOME 隔離・13ケース）。sidecar は PROTOCOL_ERROR で集約失敗も成果物は worktree 保持→統括が回収・レビュー・smoke green で採用。

### Phase 3 — Claude 側配線・実火

- [x] docs/03 に配線断片4種（PreToolUse／SessionStart／Stop／UserPromptSubmit＝C4）＋env 説明を追記
- [x] この端末の settings.json へ jq 冪等マージ（バックアップ→追加→妥当性）→ P5 の結果に従い新セッション
- [x] 実火観測: 準拠委譲で沈黙／日付 ID で deny→修正で通過／ultra で ask／棚卸し注入／コードのみコミット→block 1回→チェック更新→通過
- [x] pathspec コミット（docs/03 は 3d8d371 で push 済み）

### Phase 4 — Codex 側

- [x] **codex/AGENTS.md 委譲レジーム変更**（(b) 裁定: 親直既定→着手ゲート・A＝ネイティブ委譲既定へ書き換え。F 直轄・単独コミット・**push 前にオーナー diff レビュー**・verify-constitution-parity green）
- [x] `bin/codex-callout-hook.sh`（X1-X5・fast-path・P6 結果で分岐）＋空打ち（3d8d371・codex-smoke 26 green）
- [x] docs/05 に hooks.json 冪等 append 断片の節を新設
- [x] この端末の ~/.codex/hooks.json へ append（10:37・バックアップ bak-calloutgate-20260712-103754）／⏳ 実火は新規 Codex セッションで未確認
- [x] pathspec コミット（codex hook=3d8d371・docs/05=0e92f8b で push 済み）

### Phase 5 — 検証常設と締め

- [x] verify-install.sh に配線検証（Claude 側配線＝既存 plan-gate 含む・Codex 側エントリ。python3 断片検証の既存型）（39f3a77・make lint green・実行 OK）
- [ ] AGENTS.md 手順5/6・README ランブック1行追記
- [ ] `make lint` → `./install.sh` → `./bin/verify-install.sh` 全 green → pathspec コミット → オーナー GO → push
- [ ] 知識還流（caveat/rag）・プラン正本のチェック消化
- [ ] 他端末波及チェックリスト（pull → install → 断片マージ → verify → 実火1件）— 全端末済みでプランを archive へ

## 検証方法

- **空打ち**: fixture 行列（日付 ID→deny／codex_agent 引数省略→deny／ultra→ask／クリーン初回→warn・permissionDecision 無し／同 session 2回目→ゼロバイト／stop_hook_active→沈黙／plan 無しリポ→沈黙 等）を here-doc で流し、全ケース exit 0・stderr 空・valid JSON を assert。
- **実火**: 上記 Phase 3/4 の観測項目。**第一の合格条件は「準拠した通常セッションで何も出ないこと」**。回帰: plan-gate・caveat・throughline の既存 hook が従来どおり発火。
- **常設**: verify-install の配線検証（手挿し忘れの穴を既存 plan-gate ごと塞ぐ）。

## リスクと開いた問い

- P3（additionalContext 単独注入）が不可なら C1 の呼びかけ設計は過半が落ち、deny のみへ縮退（プローブを最初に置く理由）。
- PreToolUse deny に cap が無い＝同一入力連呼の可能性 → 文言に修正手順必須＋実火で3連 deny 観測時は自前 cap 追加。
- C3 の誤検知（雑務 dirty）は「1回上限＋理由1行でも通る2択」で被害を1停止に限定。邪魔なら DOTAGENTS_TODO_GATE=warn で観察。
- ~/.codex/hooks.json は他ツールと同居の共有 append ファイル＝適用手順にバックアップ必須を明記。フォーマット破壊は verify-install が検出。
- Windows/MSYS 端末の ~/.cache 可用性は他端末波及時に確認。

## 敵対的反証ラウンド（実施済み・2026-07-12）

refuter 1体（主継承）に計画全文を攻撃させた。重傷8・かすり傷7 → 全件裁定して本文へ反映済み（C3 の HEAD 条件・snapshot の repo キー・compact 再武装・warn 事後形・stale-slug 落とし・deny 自動降格 cap・fail-open の記録・X4/async のプローブ昇格・codex 委譲既定の裁定事項化・射程限定の明示）。引用事実の照合は全弾生存（行番号・件数まで一致確認）。

## オーナー裁定（2026-07-12）

1. TODO ゲート: **毎ターン×warn**（rolling baseline。block は env 昇格の予備経路）
2. 配置ゲートの強制力: **deny＋ask 採択**。かつオーナー指摘により **oracle.consult を監視対象に追加**（deny③: 封印パラメータ・API engine）
3. Codex 展開: **同一リリースで両輪**
4. Codex 親の委譲既定: **(b) レジーム変更**＝着手ゲート・委譲既定へ書き換え（F 直轄・単独コミット・push 前オーナー diff レビュー）
5. **着手ゲート C4 新設**（Throughline 要望・層3 と符合）: **毎ターン UserPromptSubmit・warn・条件付き文言・判断は Claude 委任**。発火点は Edit|Write でなく UserPromptSubmit（ソース/プラン区別が脆い＋Edit は着手判断に遅い、で棄却）。**文言は配置宣言＋正本化の2点**（当初「配置に絞る」としたが、plan-gate はプランモード承認時しか出ず、モードを飛ばした実装の正本化漏れは C4 でしか捕まらないため正本化も含める）。Codex ミラー X5 も同型。
6. **頻度の一貫性**（メタ裁定・2026-07-12）: TODO ゲート（C3）で「毎ターン」と裁定した基準を、新規 hook（C4）の設計で引き継がず「セッション1回」から再提案して議論が往復した＝**この hook 群が潰す失敗（既に決まった方針が次の局面で蒸し返される）を設計中に実演**。今後「〜ゲートの頻度」は既定で**毎ターン**を出発点とし、緩める側を要正当化にする。
