# Lattice ToDo archive
Plan: gpt56-rewiring
Batch: ledger-cutover-20260719
Revision: 9de93632895970fccc52dc9b4cf302a4e79b233bde699620af2e0234dc0b331e

- [ ] git pull → `~/.codex/AGENTS.md`が実ファイルなら意図確認・退避（価値ある共通行は`shared/constitution.md`、Codex固有行は`codex/AGENTS.delta.md`へPRし、生成物を更新）
- [ ] `./install.sh` → `./bin/verify-install.sh` OK（override 非空があれば FAIL 名指しに従う）
- [ ] docs/05 §3 の V2 routing 必須断片適用（custom role の個別 `[agents.<name>]` 登録は不要）
- [ ] Codex 新セッション実測（schema に `agent_type`／`fork_turns="none"`／3 role の routing-check）
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
  - [x] `hide_spawn_agent_metadata = false`＋`tool_namespace = "agents"` を全端末必須断片にする
  - [x] `task_name` と `agent_type`、`fork_turns="none"` の役割を Codex 規範・端末設定正典へ焼き込む
  - [x] role 適用後の `agent_role / model / effort / sandbox` を実セッションから照合する
  - [x] 実作業は handshake-only spawn → 実効値照合 → follow-up task の2段階に限定し、
  - [x] `make lint` → `install.sh` → `verify-install.sh` → 新規 Codex セッションで
- [x] **routing verifierのCRLF偽陰性修正（2026-07-17 LiveTR実利用で再現）**:
- [ ] **別論点（上流）**: spawn 応答へ実効 role/model/effort/sandbox を載せる。role の `sandbox_mode` を
- [x] **憲法過剰圧縮の是正（2026-07-11）**: Codex 固有差分の分離時に共通原則まで削った問題を解消する
  - [x] `claude/CLAUDE.md` を基準に人格・応対・五原則・調査・計画・権限・大規模変更・git・報告を `codex/AGENTS.md` へ復元
  - [x] 差分を Codex のモデル配置・委譲レーン・shell 入口・push 制約に限定（2026-07-14にnative／external execution／consultationへ拡張）
  - [x] CLAUDE 側の「短い専用憲法がよい」という誤方針を撤回
  - [x] README 追従、diff 監査、lint・install・verify、新規セッション実読確認
- [ ] 他端末波及（下記チェックリスト）
