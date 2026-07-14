# プラン: GPT-5.6 世代対応オーケストレーション再配線

> 実行順と全体状態の親正本は[開発工場 統合マスター計画](plan_factory-master.md)。残る他端末routing確認はCodex全対応Wave 3と同じhost receiptで閉じ、本書単独で端末rolloutを反復しない。

<!-- 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。モデル×エフォートの正は docs/02_models.md -->

正本（このファイルが TODO を兼ねる）。設計経緯の完全版はセッションプラン（2026-07-10〜11、Plan 2視点→統括裁定→refuter 反証→オーナー裁定3件）に基づく。

## Context（なぜやるか）

GPT-5.6 世代（Sol/Terra/Luna）と Grok 4.5 / Composer 2.5 の登場で、モデル配置の正典が旧世代（gpt-5.5・grok-build）のまま腐った。さらに:

1. **最上位張り付き**: `~/.codex/config.toml` が Sol×ultra にピンされ、ultra＝「max 推論＋proactive 自動委譲」なので最上位モデルが最上位の子を自動量産していた。Claude 側も ultracode の子が親モデルを既定継承する同型問題。
2. **Codex 親が憲法に従わない**: `~/.codex/AGENTS.md` は Claude 中心憲法への直接 symlink で、aiterm 既定など Codex に有害な指示が混在していた。解消時に専用憲法を約2KBへ過剰圧縮し、人格・応対・調査・計画・権限・変更作法まで落とした二次事故も発生した。
3. **判断基準の不在**: モデル×エフォートの決定表がなく、親の賢さ頼み。日常の親は Claude=Opus 4.8 / Codex=Sol（設計者 Fable より弱い）なので、判断は表とゲートに焼き込む必要がある。

## 設計の背骨（5行）

1. **プロンプトより構造で縛る**: config ピン解除でなく、sidecar defaults・役割別サブエージェント TOML・呼び出し時明示引数という構造で子の配置を固定。
2. **判断はティアで買い、粘りは effort で買う**: 「中位×xhigh」より「旗艦×low」。標語: **配置に迷ったら安い方・採用に迷ったら棄却**。
3. **親は選ばず、引く**: 弱い親でも決定表を「写すだけ」で正しい配置。上振れ（上位ティア・xhigh 以上・ultra・物量への主モデル継承）は要正当化。
4. **親のモデル×エフォートはオーナーの領分**（2026-07-10 裁定）: 規範・AI はピンを打ち替えない。事実と推奨値の提示まで。規範が縛るのは子の配置だけ。
5. **消費枠は4つ**（2026-07-10/11 裁定、現行入口へ更新）: Anthropic／OpenAI-Codex／OpenAI-ChatGPT（gpt-connector）／xAI。実読不要の純推論は `gpt_connector` の `consult` を第一選択とし、caller既知slugで model+effort を明示する。物量は Terra/Composer、並列 finder は grok-4.5。専用Chromeとproduct-owned stateを使い、timeout後はsessionsで追跡する。Oracle・APIへの暗黙fallbackは禁止し、Oracleはv1互換または手動rollback時だけ明示する。

## 調査で確定した事実（要点。詳細は rag/models/ の2記事）

- **GPT-5.6**（2026-07-09 GA）: `gpt-5.6-sol`（旗艦 $5/$30）/`gpt-5.6-terra`（中位 $2.5/$15）/`gpt-5.6-luna`（軽量 $1/$6）。effort=low/medium/high/xhigh/max/ultra、**Sol の既定は low**（公式「低く始めて上げろ」「max を無条件推奨するな」）。**ultra＝max 推論＋proactive 自動委譲 ON**（使用量急増の公式警告）。ネイティブサブエージェント: `~/.codex/agents/<name>.toml`（`name`/`description`/`developer_instructions` **3必須**・欠落や綴りミスは起動 warning のみで無言無効化）。
- **xAI**（2026-07-08 GA）: `grok-4.5`（$2/$6・500k・effort low/medium/high のみ・実務判断は首位級だが難関SWE/形式推論は弱い・ハルシ増）／`grok-composer-2.5-fast`（effort 非対応・物量特化・判断力低）。この端末は認証済み（tier 4）。
- **refuter 反証で判明（max_threadsのみ2026-07-13訂正）**: codex-sidecar は端末 config の model/effort 行を**正確に継承する**（＝Sol×ultra ピンが sidecar 委譲へ波及していた）。`.codex-sidecar.yml` が無いと sidecar 自体が CONFIG_NOT_FOUND。`[agents]` に委譲モードのキーは無い（effort から自動導出）。当時の `agents.max_threads` 起動エラー説は再現未実施で、現行公式仕様が公開設定として明記したため撤回。`/model` ピッカーは config.toml へ**再ピン永続化**する。aiterm の grok/composer は隔離設計（OAuth のみ共有）で継承問題なし。

## 決定表（docs/02_models.md へ収容済みが正。ここは要旨）

役割→〔ティア×effort×入口〕を Claude／Codex／xAI／OpenAI-ChatGPT（gpt-connector）の4レーンで規定。要点: 実装物量の第一選択は **Terra×medium（codex_work / implementer.toml）と Composer 2.5**（並列）、並列 finder は **grok-4.5**、実読不要の純推論・独立視点は **`mcp__gpt_connector__consult`**（相談であり委譲ではない。caller既知slug、model+effort明示、専用Chrome、product-owned state、timeout後sessions）、反証・裁定は**旗艦×high か Claude 主モデル**。Oracle・APIの暗黙fallbackは禁止し、Oracleはv1互換／手動rollbackに限定する。**2026-07-14 supersession**: Codex親の子をnative一択とした旧決定は撤回し、native／external execution（codex-sidecar・aiterm Codex/Grok/Composer）／consultation（gpt-connector）の三レーンを使う。

## 実装チェックリスト

- [x] git fetch 照合・Oracle dirty 行の分離コミット（752f387、当時Oracle。現行標準はgpt-connector）
- [x] 本ファイルの正本化（正本化ゲート）
- [x] step0: Codex CLI 更新 0.143.0→0.144.1＋ `codex features list` 記録（multi_agent=stable/true・multi_agent_v2=under development/false）
- [x] **F 直轄** `docs/02_models.md`: ティア語彙（slug 併記）・4レーン決定表・エスカレーションゲート・入口注記・世代交代手順 step2′
- [x] **F 直轄** `codex/AGENTS.md` 新規（当初は約2KBへ過剰圧縮。2026-07-11 に共通憲法を復元し、Codex 固有差分だけを分離）
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
- [x] 実測（残）: sidecar の model 明示＋defaults フォールバック——`codex-sidecar diagnostics`（dry-run）で実測。引数なし→ defaults の terra×medium に解決（端末 Sol×ultra ピンは不漏出・modelPolicy.source=explicit）／`--model gpt-5.6-sol --model-reasoning-effort high` → 指定どおり解決（2026-07-11）
- [x] caveat 登録 4件（ultra の正体／override 無言シャドー／grok --effort headless 専用／sidecar のピン継承）
- [x] pathspec コミット → push
- [x] aiterm 改修依頼リスト4件を aiterm プロジェクトへ起票（aiterm-mcp `docs/10_gpt56-model-alignment-plan.md`・コミット 17c46ae・push 済み。2026-07-11）
- [x] **事故是正（2026-07-11）**: VS Code の `multi_agent_v2` で `spawn_agent` から
  `agent_type` が隠れ、`task_name` を role 名と誤認した結果、3子すべてが親の
  Sol×xhigh を継承した問題を解消する
  - [x] `hide_spawn_agent_metadata = false`＋`tool_namespace = "agents"` を全端末必須断片にする
  - [x] `task_name` と `agent_type`、`fork_turns="none"` の役割を Codex 規範・端末設定正典へ焼き込む
  - [x] role 適用後の `agent_role / model / effort / sandbox` を実セッションから照合する
    `verify-codex-agent-routing` を追加する
  - [x] 実作業は handshake-only spawn → 実効値照合 → follow-up task の2段階に限定し、
    不一致なら本タスクを渡さない
  - [x] `make lint` → `install.sh` → `verify-install.sh` → 新規 Codex セッションで
    implementer/refuter/sorter の E2E smoke を green にする
- [ ] **別論点（上流）**: spawn 応答へ実効 role/model/effort/sandbox を載せる。role の `sandbox_mode` を
  親 permission profile で上書きする 0.144.1 の仕様／文書不一致を解消する
- [x] **憲法過剰圧縮の是正（2026-07-11）**: Codex 固有差分の分離時に共通原則まで削った問題を解消する
  - [x] `claude/CLAUDE.md` を基準に人格・応対・五原則・調査・計画・権限・大規模変更・git・報告を `codex/AGENTS.md` へ復元
  - [x] 差分を Codex のモデル配置・委譲レーン・shell 入口・push 制約に限定（2026-07-14にnative／external execution／consultationへ拡張）
  - [x] CLAUDE 側の「短い専用憲法がよい」という誤方針を撤回
  - [x] README 追従、diff 監査、lint・install・verify、新規セッション実読確認
- [ ] 他端末波及（下記チェックリスト）

## H（オーナー領分）

- `~/.codex/config.toml` の親既定（現在 Sol×ultra）: AI は変更しない。05 の事実提示を見てオーナーが判断。再ピン仕様（/model 選択が永続化）に注意。
- Claude 親のモデル（現在 fable[1m]）: 同上。

## aiterm への改修依頼（aiterm プロジェクト側で対応・2026-07-11 裁定）

**→ 全4件消化済み（2026-07-11・aiterm-mcp コミット 38a33f3・回帰183件 green・実起動検証済み。詳細は aiterm-mcp docs/10）**。実装結果: 3ツールに `model` 引数（grok 既定は `grok-4.5` へ）、codex managed config は引数の model/effort でピン上書き＋起動応答に実効値と出所（引数/端末config継承/CLI既定）を常時明示（effort=ultra は警告付き）、grok/composer への `reasoning_effort` 指定は起動前に明示エラー（headless 専用の旨を返す）。**v0.11.0 として npm 公開済み（2026-07-11・GitHub Release/MCP Registry 再登録込み）**。各端末は `npm i -g aiterm-mcp` で反映（この Mac は反映済み。他端末は「他端末波及チェックリスト」に準ずる）。

1. `codex_agent` に `model` 引数を追加（現状渡す手段なし）
2. codex の端末 config 丸ごとコピーによるピン継承の明示化（model/effort を引数で上書き可能に）
3. `grok_agent` のハードコード `--model grok-build` を現行 `grok-4.5` へ（ライブカタログに不在の stale 名）
4. `reasoning_effort` enum の実態合わせ（grok=low/medium/high のみ・composer=非対応・対話 TUI では `--effort` 無視）

## 他端末波及チェックリスト（端末ごと）

- [ ] git pull → `~/.codex/AGENTS.md` が実ファイルなら意図確認・退避（価値ある行は codex/AGENTS.md へ PR）
- [ ] `./install.sh` → `./bin/verify-install.sh` OK（override 非空があれば FAIL 名指しに従う）
- [ ] docs/05 §3 の V2 routing 必須断片適用（custom role の個別 `[agents.<name>]` 登録は不要）
- [ ] Codex 新セッション実測（schema に `agent_type`／`fork_turns="none"`／3 role の routing-check）

## 検証（end-to-end）

`make lint` green／`./install.sh` の linked 出力／`./bin/verify-install.sh` OK／Codex 起動ログに「Ignoring malformed agent role definition」無し／新規セッションの `spawn_agent` に `agent_type` が存在／3 role を `fork_turns="none"` で handshake-only spawn／`verify-codex-agent-routing` が全件 green／sidecar `codex_explore` の model 明示と defaults フォールバック両確認。

## リスク（要点）

他端末の実ファイル SKIP（→verify が名指し）／override 無言シャドー（→非空検出）／toml 必須キー欠落の無言無効化（→3必須焼き込み＋実 spawn 検証）／再ピン永続化（→子は継承非依存の構造で遮断）／`agents.max_threads` とホスト側concurrency slotsの混同（→公式既定6/1を記録し、新規sessionで実効値を検証）／toml・sidecar defaults の具体名が世代交代で腐る（→前提行＋02 手順 step2′＋原則6 grep）。
