# プラン: GPT-5.6 世代対応オーケストレーション再配線

<!-- 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。モデル×エフォートの正は docs/02_models.md -->

正本（このファイルが TODO を兼ねる）。設計経緯の完全版はセッションプラン（2026-07-10〜11、Plan 2視点→統括裁定→refuter 反証→オーナー裁定3件）に基づく。

## Context（なぜやるか）

GPT-5.6 世代（Sol/Terra/Luna）と Grok 4.5 / Composer 2.5 の登場で、モデル配置の正典が旧世代（gpt-5.5・grok-build）のまま腐った。さらに:

1. **最上位張り付き**: `~/.codex/config.toml` が Sol×ultra にピンされ、ultra＝「max 推論＋proactive 自動委譲」なので最上位モデルが最上位の子を自動量産していた。Claude 側も ultracode の子が親モデルを既定継承する同型問題。
2. **Codex 親が憲法に従わない**: `~/.codex/AGENTS.md` は 20KB の Claude 中心憲法への symlink で遵守が薄く、aiterm 既定など Codex に有害な指示も混在。
3. **判断基準の不在**: モデル×エフォートの決定表がなく、親の賢さ頼み。日常の親は Claude=Opus 4.8 / Codex=Sol（設計者 Fable より弱い）なので、判断は表とゲートに焼き込む必要がある。

## 設計の背骨（5行）

1. **プロンプトより構造で縛る**: config ピン解除でなく、sidecar defaults・役割別サブエージェント TOML・呼び出し時明示引数という構造で子の配置を固定。
2. **判断はティアで買い、粘りは effort で買う**: 「中位×xhigh」より「旗艦×low」。標語: **配置に迷ったら安い方・採用に迷ったら棄却**。
3. **親は選ばず、引く**: 弱い親でも決定表を「写すだけ」で正しい配置。上振れ（上位ティア・xhigh 以上・ultra・物量への主モデル継承）は要正当化。
4. **親のモデル×エフォートはオーナーの領分**（2026-07-10 裁定）: 規範・AI はピンを打ち替えない。事実と推奨値の提示まで。規範が縛るのは子の配置だけ。
5. **消費枠は4つ**（2026-07-10/11 裁定）: Anthropic／OpenAI-Codex／OpenAI-ChatGPT（Oracle）／xAI。実読不要の純推論は Oracle 第一選択、物量は Terra/Composer、並列 finder は grok-4.5。

## 調査で確定した事実（要点。詳細は rag/models/ の2記事）

- **GPT-5.6**（2026-07-09 GA）: `gpt-5.6-sol`（旗艦 $5/$30）/`gpt-5.6-terra`（中位 $2.5/$15）/`gpt-5.6-luna`（軽量 $1/$6）。effort=low/medium/high/xhigh/max/ultra、**Sol の既定は low**（公式「低く始めて上げろ」「max を無条件推奨するな」）。**ultra＝max 推論＋proactive 自動委譲 ON**（使用量急増の公式警告）。ネイティブサブエージェント: `~/.codex/agents/<name>.toml`（`name`/`description`/`developer_instructions` **3必須**・欠落や綴りミスは起動 warning のみで無言無効化）。
- **xAI**（2026-07-08 GA）: `grok-4.5`（$2/$6・500k・effort low/medium/high のみ・実務判断は首位級だが難関SWE/形式推論は弱い・ハルシ増）／`grok-composer-2.5-fast`（effort 非対応・物量特化・判断力低）。この端末は認証済み（tier 4）。
- **refuter 反証で判明**: codex-sidecar は端末 config の model/effort 行を**正確に継承する**（＝Sol×ultra ピンが sidecar 委譲へ波及していた）。`.codex-sidecar.yml` が無いと sidecar 自体が CONFIG_NOT_FOUND。`[agents]` に委譲モードのキーは無い（effort から自動導出）＋`agents.max_threads` は multi_agent_v2 有効時に起動エラー化する地雷。`/model` ピッカーは config.toml へ**再ピン永続化**する。aiterm の grok/composer は隔離設計（OAuth のみ共有）で継承問題なし。

## 決定表（docs/02_models.md へ収容済みが正。ここは要旨）

役割→〔ティア×effort×入口〕を Claude／Codex／xAI／Oracle の4レーンで規定。要点: 実装物量の第一選択は **Terra×medium（codex_work / implementer.toml）と Composer 2.5**（並列）、並列 finder は **grok-4.5**、実読不要の純推論・独立視点は **Oracle**、反証・裁定は**旗艦×high か Claude 主モデル**。**入口は呼び手で決まる**: Codex 親の子はネイティブ委譲一択（aiterm/MCP 経由の入れ子 codex 禁止）。

## 実装チェックリスト

- [x] git fetch 照合・Oracle dirty 行の分離コミット（752f387）
- [x] 本ファイルの正本化（正本化ゲート）
- [x] step0: Codex CLI 更新 0.143.0→0.144.1＋ `codex features list` 記録（multi_agent=stable/true・multi_agent_v2=under development/false）
- [x] **F 直轄** `docs/02_models.md`: ティア語彙（slug 併記）・4レーン決定表・エスカレーションゲート・入口注記・世代交代手順 step2′
- [x] **F 直轄** `codex/AGENTS.md` 新規（約2KB・鉄則6条＋モデル節＋git＋報告。具体名なし・02 ポインタ・小径修正例外・入れ子 codex 禁止）
- [x] **F 直轄** `claude/CLAUDE.md`: 着手ゲートに配置1行宣言＋Codex 親規範ポインタ＋「親はオーナー領分」
- [x] **F 直轄** `claude/skills/orchestrate/`: SKILL.md に継承の罠＋「配置はゲートで宣言」、workflow-templates.md 冒頭差し替え
- [x] **A 委譲** `codex/agents/{implementer,refuter,sorter}.toml`（実バイナリで3必須キー・warning 無言無効化を裏取りの上作成）
- [x] **A 委譲** `.codex-sidecar.yml`（実装スキーマ裏取りで `project` 必須キーを発見・追加。defaults=terra×medium・safety_profile=generic・presets）
- [x] **A 委譲** `docs/05_codex-fragments.md`（8章。再検証で確度を明記: project_doc_max_bytes 既定値=確度低・max_threads 事故機序=確度中）
- [x] **A 委譲** `rag/models/gpt-5.6-family.md`・`xai-grok45-composer25.md`＋INDEX 2行（新発見: luna は ultra 非対応の5段・既定 medium）
- [x] **A 委譲** `install.sh`・`bin/verify-install.sh`（override 非空シャドー検出込み）・`.markdownlint-cli2.jsonc`
- [x] **A 委譲** `AGENTS.md`・`README.md`・`docs/00_overview.md`・`docs/01_project-layout.md` 追従（統括レビューで手順6の因果誤り1件を修正）
- [x] `codex/rules/default.rules` 1行目（旧 Iron Rules 生成 allow）削除
- [x] ゲート: `make lint`（0 errors）→ `./install.sh`（新リンク4本）→ `./bin/verify-install.sh`（OK）
- [x] 実測: `~/.codex/AGENTS.md` → codex/AGENTS.md 張替確認／malformed role warning 無し／**明示委譲で implementer spawn・子が toml どおり gpt-5.6-terra で応答**（親 luna×low から）／通常 exec で自動委譲不発火
- [ ] 実測（残）: sidecar の model 明示＋defaults フォールバック（本セッションは codex-sidecar MCP 未登録のため次の Claude セッションで実測）
- [x] caveat 登録 4件（ultra の正体／override 無言シャドー／grok --effort headless 専用／sidecar のピン継承）
- [x] pathspec コミット → push
- [ ] aiterm 改修依頼リスト4件を aiterm プロジェクトへ（下記）
- [ ] 他端末波及（下記チェックリスト）

## H（オーナー領分）

- `~/.codex/config.toml` の親既定（現在 Sol×ultra）: AI は変更しない。05 の事実提示を見てオーナーが判断。再ピン仕様（/model 選択が永続化）に注意。
- Claude 親のモデル（現在 fable[1m]）: 同上。

## aiterm への改修依頼（aiterm プロジェクト側で対応・2026-07-11 裁定）

1. `codex_agent` に `model` 引数を追加（現状渡す手段なし）
2. codex の端末 config 丸ごとコピーによるピン継承の明示化（model/effort を引数で上書き可能に）
3. `grok_agent` のハードコード `--model grok-build` を現行 `grok-4.5` へ（ライブカタログに不在の stale 名）
4. `reasoning_effort` enum の実態合わせ（grok=low/medium/high のみ・composer=非対応・対話 TUI では `--effort` 無視）

## 他端末波及チェックリスト（端末ごと）

- [ ] git pull → `~/.codex/AGENTS.md` が実ファイルなら意図確認・退避（価値ある行は codex/AGENTS.md へ PR）
- [ ] `./install.sh` → `./bin/verify-install.sh` OK（override 非空があれば FAIL 名指しに従う）
- [ ] docs/05 の断片適用（`[agents]` は設定不要。親既定はオーナー領分）
- [ ] Codex 新セッション実測（role warning 無し・委譲実測）

## 検証（end-to-end）

`make lint` green／`./install.sh` の linked 出力／`./bin/verify-install.sh` OK／Codex 起動ログに「Ignoring malformed agent role definition」無し／「implementer に委譲して」で terra×medium が spawn／sidecar `codex_explore` の model 明示と defaults フォールバック両確認。

## リスク（要点）

他端末の実ファイル SKIP（→verify が名指し）／override 無言シャドー（→非空検出）／toml 必須キー欠落の無言無効化（→3必須焼き込み＋実 spawn 検証）／再ピン永続化（→子は継承非依存の構造で遮断）／multi_agent_v2 既定 ON 化で `agents.max_threads` 設定端末が起動不能（→そもそも設定しない）／toml・sidecar defaults の具体名が世代交代で腐る（→前提行＋02 手順 step2′＋原則6 grep）。
