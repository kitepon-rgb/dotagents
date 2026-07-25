# Codex Wave 3 E2Eチェックリスト（4端末版・read-only下書き）

> **履歴資料:** Wave 3完了後にarchiveへ退避した当時の実行用checklistです。
> 現行の工場製品数・導入契約はREADMEと製品契約台帳を参照してください。

**task-id**: r2-e2e-checklist-draft-20260718  
**性質**: テキスト報告のみ。ファイル書込・git操作・一切の変更禁止。  
**典拠**:  

- docs/archive/plan_codex-full-support.md §7「新規 Codex session E2E」合格条件表
- docs/archive/plan_codex-full-support.md Wave 3 項目（routing smoke、hooks実火、Throughline、Spotter hook_event、gpt-connector、spotter install）
- docs/05_codex-fragments.md のrouting smoke手順（V2断片適用・verify-codex-agent-routing・handshake-only spawn・fork_turns="none"）  
- docs/archive/plan_callout-hooks.md Phase 6 INFO契約（初回INFO・同session2回目沈黙・compact後1回再武装・Stop pendingの次回1回配送）
- 端末台帳（§8）と各Wave 3 rollout実績の残件  

**4端末**: Mac（この端末）／main-server／FOX WSL2／FOX Windows native  
**分離**: 「非対話/SSH実行可能」 vs 「対話Codex session + H操作（hook trust等）が必要」  
**合格条件は典拠の文言をそのまま逆引き。典拠外の項目は一切記載しない。**

---

## 共通前提（全端末・着手前）

- `git fetch` 実行後、origin/main と一致、dirty=0、stash=0、shallow=false を確認
- `~/.codex/AGENTS.md` が実ファイルの場合のみ内容確認（退避判断はH）
- 既存 `./bin/verify-install.sh --profile official`（または legacy 選択時）で FAIL 行を記録

---

## Mac 端末

### 非対話 / SSH実行可能項目（ローカル実行で完結）

| 検証項目 | 実行コマンド | 合格条件 |
|----------|--------------|----------|
| install | `./install.sh --profile official` | `linked:` 出力に公式面（$HOME/.agents/skills）の dotagents 対象 skill symlink が正しく表示。実ファイルは SKIP ログのみ |
| config dry-run | `./bin/apply-codex-config.sh --dry-run` | routing 必須2キー（[features.multi_agent_v2] hide_spawn_agent_metadata/tool_namespace）＋ callout hook 4イベント＋orchestrate-advisory-hook＋codex-lattice-gantt-hook の差分のみ表示。差分0 または承認済み |
| spotter install（dotagents project） | `spotter install -y` | `.spotter/marker.json` 生成、Claude 5 hook / Codex 3 hook / tool-db / Throughline context default-on が設定される |
| verify-install | `./bin/verify-install.sh --profile official` | 全行 OK（FAIL行ゼロ）。factory core 8製品 CLI 存在、Caveat-Private git、MarkItDown uv tool、gpt-connector、Spotter marker、Throughline context、routing/hook canonical entry が green |
| gpt_connector 診断（read-only） | `codex mcp list --json` / `codex mcp get gpt_connector --json` | `gpt_connector` が listed/connected。任意認証依存は理由付き WARN |

### 対話セッション / H 操作必要項目（新規 Codex session + hook trust）

| 検証項目 | 実行手順 | 合格条件 |
|----------|----------|----------|
| routing smoke（implementer） | 新規 Codex session で `agent_type=implementer`、`fork_turns="none"`、agent_path=/root/implementer-smoke 等で handshake-only spawn。直後に `verify-codex-agent-routing implementer /root/implementer-smoke` | "routing-check: OK"（agent_role/model/effort/developer_instructions 一致）。sandbox は WARN 表示可（REQUIRE_SANDBOX=1 時のみ FAIL） |
| routing smoke（refuter） | 同上（refuter） | 同上（全3 role 必須） |
| routing smoke（sorter） | 同上（sorter） | 同上 |
| hooks 初回 INFO 実火 | 新規 session 開始（SessionStart X1/X5）→ plan更新（update_plan → PreToolUse X2）→ 通常 prompt（UserPromptSubmit X3/X5）→ turn 終了（Stop X4） | 各イベント初回のみ、AGENTS.md / plan 正典への短い INFO（依頼範囲拡張なし）。deny/ask/block 返却なし |
| 同 session 2回目沈黙 | 同 session 内で同一イベントを2回目発火 | 2回目以降はゼロバイト・沈黙 |
| compact 再武装 | compact 実行後、再度 UserPromptSubmit / spawn_agent で発火 | compact 後1回だけ INFO が再び出力 |
| Stop pending → 次回1回配送 | Stop で pending 保存 → 次の自然な UserPromptSubmit | pending が1回だけ UserPromptSubmit で配送 |
| Throughline 代表 smoke | 新規 session 内で `codex-capture` および `codex-handoff-smoke` を実行 | capture / handoff 成功（restore は上流 mismatch で未達でも blocker としない） |
| gpt_connector 代表 smoke | session 内で model+effort を明示した consult 実行。timeout 後 sessions 確認 | 明示エラーなし。sessions で job 回収可。FAIL/blocker なし |
| Spotter hook_event 実火 | spotter install後、新規 sessionで通常操作 | `.spotter/hook-events.jsonl` に `spotter.hook_event.v1` が記録される。`spotter codex-hook diagnostics --project <project>` で installed/compatible/canonical が確認できる |
| Claude 回帰確認 | 新規 Claude session で既存 hook / skill smoke 再実行 | 回帰なし（C1-C4 INFO契約維持、既存挙動不変） |

---

## main-server（Ubuntu 26.04）

### 非対話 / SSH実行可能項目

| 検証項目 | 実行コマンド | 合格条件 |
|----------|--------------|----------|
| install（SSH経由） | `ssh main-server "cd ~/Developer/dotagents && ./install.sh --profile official"` | Mac と同じ linked: 出力 |
| config dry-run（SSH経由） | `ssh main-server "cd ~/Developer/dotagents && ./bin/apply-codex-config.sh --dry-run"` | routing＋callout hook 差分のみ。差分0 または H承認済み apply |
| spotter install（SSH経由） | `ssh main-server "cd ~/Developer/dotagents && spotter install -y"` | marker / hooks / Throughline context 設定完了 |
| verify-install（SSH経由） | `ssh main-server "cd ~/Developer/dotagents && ./bin/verify-install.sh --profile official"` | 全 OK（factory core 8製品、gpt-connector、Spotter、Throughline 等 green） |
| gpt_connector 診断（SSH経由） | `ssh main-server "cd ~/Developer/dotagents && codex mcp list --json && codex mcp get gpt_connector --json"` | Connected（Chrome 不在時は理由付き WARN） |

### main-server対話セッション / H 操作必要項目

| 検証項目 | 実行手順 | 合格条件 |
|----------|----------|----------|
| hook trust | main-serverの対話Codex CLIでプロジェクトを開き、`/hooks`からcallout / advisory / Spotter 3 hookをreviewしてtrust。続けてCodex App Remoteの新規threadで実火 | CLI trust完了＋App Remote実火（H）。App／IDEへ`/hooks`を送らない（ADR 0104） |
| routing smoke（3 role） | Codex App remote または SSH CLI で新規 session。agent_type=xxx + fork_turns="none" で handshake-only spawn → `verify-codex-agent-routing <role> /root/...`（3回） | 3 role すべて "routing-check: OK" |
| hooks 初回INFO / 2回目沈黙 / compact再武装 / Stop pending配送 | 同上 session で SessionStart / update_plan / prompt / Stop を順に発火 | Phase 6 INFO 契約どおり（初回INFO・2回目沈黙・compact後1回・pending 1回配送） |
| Throughline 代表 smoke | 同 session 内で codex-capture / codex-handoff-smoke | capture/handoff 成功 |
| gpt_connector 代表 smoke | 同 session 内で明示 model+effort consult + sessions 確認 | 明示エラーなし |
| Spotter hook_event 実火 | spotter install 後、同 session で操作 | spotter.hook_event.v1 記録 + diagnostics green |
| Claude 回帰 | Claude Code で新規 session smoke | 回帰なし |

---

## FOX WSL2（Ubuntu 26.04）

### 非対話 / SSH実行可能項目（ProxyJump 経由）

| 検証項目 | 実行コマンド | 合格条件 |
|----------|--------------|----------|
| install（SSH経由） | `ssh -J windows-workstation fox-wsl "cd /home/kite/Developer/dotagents && ./install.sh --profile official"` | linked: 公式面正 |
| config dry-run（SSH経由） | 同上 `... && ./bin/apply-codex-config.sh --dry-run` | routing＋callout 差分のみ |
| spotter install（SSH経由） | 同上 `... && spotter install -y` | marker/hooks/Throughline context |
| verify-install（SSH経由） | 同上 `... && ./bin/verify-install.sh --profile official` | 全 OK（factory core 8製品等 green） |
| gpt_connector 診断（SSH経由） | 同上 `codex mcp list/get` | Connected（Chrome 不在時は WARN） |

### WSL2対話セッション / H 操作必要項目

| 検証項目 | 実行手順 | 合格条件 |
|----------|----------|----------|
| hook trust | WSL2側の対話Codex CLIで`/hooks`からtrust承認（Windowsダイアログ注意）。Appはtrust後の実火だけ | trust 完了。**現時点で callout/advisory は一時無効化（interop バグ既知）**。interop 安全化後に再適用・再確認 |
| routing smoke（3 role） | WSL2 Codex CLI で新規 session。handshake-only spawn + `verify-codex-agent-routing <role> /root/...`（3回） | 3 role "routing-check: OK" |
| hooks 初回INFO 等実火 | 同 session でイベント発火（interop 安全化後） | Phase 6 INFO 契約（初回INFO・沈黙・再武装・pending配送） |
| Throughline 代表 smoke | 同上 | capture/handoff 成功 |
| gpt_connector 代表 smoke | 同上 | 明示 consult 成功、sessions 確認可 |
| Spotter hook_event 実火 | spotter install 後 | spotter.hook_event.v1 記録 |
| Claude 回帰 | Claude で新規 session | 回帰なし |

**特記事項（archive/plan_callout-hooks.md Phase 5 より）**: WSL2 interop 安全化（interpreter 明示起動等）完了まで Codex callout/advisory は意図的に無効。verify-install が advisory 不在 FAIL を出すのは既知の一時状態。

---

## FOX Windows native

### 非対話 / SSH実行可能項目（またはローカル PowerShell / CMD）

| 検証項目 | 実行コマンド | 合格条件 |
|----------|--------------|----------|
| install | `ssh windows-workstation` から `C:\Program Files\Git\bin\bash.exe -lc 'cd /c/Users/kite_/Documents/Program/dotagents && ./install.sh --profile official'`（native symlink 有効） | linked: 公式面正。LF/UTF-8/MSYS path 差は CI 吸収済み |
| config dry-run | 同じGit Bash入口で `./bin/apply-codex-config.sh --dry-run` | routing＋callout 差分のみ |
| spotter install | 同上 `spotter install -y` | marker / Codex 3 hook canonical |
| verify-install | 同上 `./bin/verify-install.sh --profile official` | 全 OK（factory core、Caveat-Private 205件、gpt-connector、Spotter、Throughline context 等 green） |
| gpt_connector 診断 | 同上 `codex mcp list/get` | Connected（Oracle wrapper 修正済み確認） |

### Windows native対話セッション / H 操作必要項目

| 検証項目 | 実行手順 | 合格条件 |
|----------|----------|----------|
| hook trust | windows-workstationのnative対話Codex CLIで`/hooks`からtrust承認。Appはtrust後の実火だけ | trust 完了（App SSH 赤表示は既知・通常 SSH を正規入口とする） |
| routing smoke（3 role） | 新規 native Codex session。agent_type + fork_turns="none" で handshake-only spawn → `verify-codex-agent-routing <role> /root/...`（3回） | 3 role "routing-check: OK" |
| hooks 初回INFO / 2回目沈黙 / compact再武装 / Stop pending配送 | 同 session で SessionStart / update_plan / prompt / Stop を発火 | Phase 6 INFO 契約どおり |
| Throughline 代表 smoke | 同 session 内で codex-capture / codex-handoff-smoke | capture/handoff 成功 |
| gpt_connector 代表 smoke | 同 session 内で明示 model+effort consult + timeout 後 sessions 確認 | 明示エラーなし |
| Spotter hook_event 実火 | spotter install 後、同 session で操作 | spotter.hook_event.v1 記録 + diagnostics green |
| Claude 回帰 | Claude Code 新規 session | 回帰なし |

**特記事項（archive/plan_codex-full-support.md Wave 3 実績より）**:

- Windows 実機差（LF/UTF-8/native symlink/Task Scheduler）は CI 固定済み。
- App の赤表示は `remote_codex_lookup` の PowerShell 既定シェル不整合。無効化して通常 SSH を使用。
- 週次 Task Scheduler の agents-update 存在確認。

---

## 完了条件まとめ（全端末共通・§7 典拠）

- AGENTS_MD / CONFIG / SKILLS / MCP_SERVER_CONFIG / SUBAGENTS / HOOKS / SESSIONS の各合格条件を新規 Codex session で満たす
- HOOKS: trust 済み 4イベントで「初回 INFO・2回目沈黙・compact 後1回再武装・Stop pending の次回1回配送」を確認
- SESSIONS: Throughline/handoff 代表 smoke 成功
- 各端末で implementer/refuter/sorter の routing smoke が全 green
- Spotter project ごとに marker/hook/Throughline context 確認＋`spotter.hook_event.v1` 実火
- gpt_connector は model+effort 明示＋timeout後 sessions 確認で明示エラーなし
- Claude 側に回帰なし
- 任意 MCP/OAuth は未認証を理由付き WARN として可（H 手順を記録）

**本チェックリストは典拠に忠実に作成。実行時は各端末で順に実施し、結果を記録すること。**
