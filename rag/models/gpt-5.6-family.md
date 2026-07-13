<!--
source: openai/codex リポ models.json・latest-model.md（一次・2026-07-10 取得、前セッション調査）／
        upgrading-to-gpt-5p6-sol.md（一次・effort 公式指針）／
        core/src/client.rs（Ultra→Max マッピング）・session/multi_agents.rs（Ultra→Proactive）／
        本セッションでの再検証: ~/.codex/models_cache.json（端末実測・fetched_at 2026-07-10T15:37:32Z）・
        codex-darwin-arm64 バイナリの strings 実読（agent_roles.rs 由来のバリデーションメッセージ・
        AgentRoleToml 構造）
audit_by: ベル配下 implementer（作業委譲・2026-07-11）
fetched: 2026-07-10（前セッション一次取得）／2026-07-11（本セッション実装再検証）
confidence: 高（GA・価格・ティア語彙・effort 段階は端末実測で裏取り済み）〜中（ultra の内部委譲メカニズムは
  前セッション由来で今回未再実行）。claim ごとに below 明記。
-->

# GPT-5.6 ファミリー（Sol / Terra / Luna）

## ティア体系

番号（`5.6`）は世代、`Sol`/`Terra`/`Luna` は世代をまたぐ能力ティア。

| slug | 位置づけ | 価格（per Mtok, in/out） |
|---|---|---|
| `gpt-5.6-sol` | 旗艦（frontier agentic coding model） | $5 / $30 |
| `gpt-5.6-terra` | 中位（balanced・everyday work 向け） | $2.5 / $15 |
| `gpt-5.6-luna` | 軽量（fast and affordable） | $1 / $6 |

`gpt-5.6` は `gpt-5.6-sol` への alias とされる（**確度: 中** — 一次資料〔openai/codex リポの models.json・latest-model.md〕に記載があるとの前セッション報告だが、本セッションで端末 `~/.codex/models_cache.json` を実測した限り `gpt-5.6` という単体 slug は選択リストに現れず、実測ではなく前セッションの一次資料引用に依拠。**alias の実挙動〔`gpt-5.6` 指定時に実際に Sol へ解決されるか〕は未実測**）。

GA: 2026-07-09。コンテキストは API ≈1.05M（Sol/Terra）と Codex CLI 運用窓 372K の2系統（前セッション由来・本セッション未再検証）。

## Effort（reasoning level）

**本セッションで `~/.codex/models_cache.json`（端末実測・2026-07-10 取得）から裏取り**:

| slug | 既定 effort | 対応 effort 段階 |
|---|---|---|
| `gpt-5.6-sol` | **low** | low / medium / high / xhigh / max / ultra（6段階） |
| `gpt-5.6-terra` | **medium** | low / medium / high / xhigh / max / ultra（6段階） |
| `gpt-5.6-luna` | **medium** | low / medium / high / xhigh / max（**ultra が無い5段階**） |

**発見（前セッション未言及・本セッションで確定）**: `gpt-5.6-luna` は `ultra` に対応しない。6段階あるのは Sol と Terra のみ。Luna の既定は low でなく **medium**。

公式指針（一次: upgrading-to-gpt-5p6-sol.md）:

- 「低く始めて上げろ」（start low, escalate only when needed）
- 「xhigh/max は eval で有意差が出る難問のみ」
- 「上げる前に成功条件/ルーティング/検証ループを疑え」（effort を上げても直らない場合、そこが根本原因）

## ultra の正体

**ultra = max 推論 ＋ proactive マルチエージェント自動委譲 ON**（一次: `core/src/client.rs` の Ultra→Max マッピング、`session/multi_agents.rs` の Ultra→Proactive。前セッション調査・本セッション未再実行、**確度: 中**）。

- `~/.codex/models_cache.json` の `gpt-5.6-sol`/`gpt-5.6-terra` の effort 説明文でも "Maximum reasoning with automatic task delegation" と ultra を明記（本セッション実測で裏付け）。
- 高並列時の使用量急増につき公式警告あり（CLI v0.144.0 で導入。閾値「8スレッド」は前セッション由来で本セッション裏取り不能＝**確度: 低〜中**）。
- ultra は CLI 0.144.0+ 必須（この端末は 0.144.1・本セッション実測で確認）。

## ネイティブサブエージェント（`~/.codex/agents/<name>.toml` / `.codex/agents/`）

**本セッションで codex-darwin-arm64 バイナリ（0.144.1）に `strings -a` を当てて実装文字列から直接裏取り**（一次: `agent_roles.rs` 由来のバリデーションメッセージ群）:

- 実際のエラー文言列（`PATH`/`ROLE` は可変部分のプレースホルダー）: 「agent role file at PATH must contain a TOML table」→「agent role file at PATH must define a non-empty `name`」→「agent role ROLE must define a description」→「agent role file at PATH must define `developer_instructions`」→「PATH.developer_instructions cannot be blank」。
- つまり **`name`・`description`・`developer_instructions` の3つが必須**（`name` と `developer_instructions` は非空必須、`description` は非空チェック文言は確認できず存在必須のみ確度中）。欠落・綴りミスは「Ignoring malformed agent role definition:」という warning ログのみで無言無効化（実装文字列に完全一致するログ文言を確認）。
- キー: `name` / `description` / `model` / `model_reasoning_effort` / `sandbox_mode` / `developer_instructions`。加えて構造体 `AgentRoleToml` には `config_file` と `nickname_candidates` という追加フィールドが実在（`nickname_candidates` は「ASCII 文字・数字・空白・ハイフン・アンダースコアのみ」「重複禁止」という制約バリデーション文言あり。任意フィールドと推定・本カタログの3ファイルでは未使用）。
- `sandbox_mode` の有効値は実装文字列で `read-only` / `workspace-write` / `danger-full-access` の3種を確認。
- 公式 Subagents 文書は `~/.codex/agents/*.toml` の自動探索を明記する。個別 `[agents.<name>]` 登録はこのリポの3 role には不要。
- **MultiAgent V2 の入口事故（2026-07-11 実測）**: 0.144.1 の `MultiAgentV2Config` は `hide_spawn_agent_metadata = true` が既定で、`spawn_agent` schema から `agent_type / model / reasoning_effort / service_tier` を削除する。`task_name` はタスクパス生成専用で role 解決しない。3子で `agent_role = null`、親 Sol×xhigh 継承を確認。必須対処は `[features.multi_agent_v2] hide_spawn_agent_metadata=false`＋`tool_namespace="agents"`、新規セッション、`agent_type=<role>` 明示。
- V2 の `fork_turns` 既定は `all` → full-history fork。role/model/effort override と併用すると `reject_full_fork_spawn_overrides` が拒否するため、custom role は `fork_turns="none"` が必須。
- **sandbox の別バグ（source＋rollout 実測、確度: 高）**: `apply_role_to_config` の後に `apply_spawn_agent_runtime_overrides` が親 turn の permission profile を再適用する。このため role の `sandbox_mode` は親 sandbox で上書きされる。V1 の implementer 成功対照でも role/model/effort/developer instructions は適用された一方、sandbox は親の `danger-full-access` のままだった。公式文書の agent 別 sandbox override と不一致。
- 現行 spawn 応答は実効 role/model/effort/sandbox を返さない。`verify-codex-agent-routing` が rollout の `session_meta` / `turn_context` / developer message を照合し、role/model/effort/developer instructions の不一致なら本作業を渡さない。sandbox は別表示し、明示的な厳格モードでだけ必須化する。
- `[agents]` の委譲モードキーは config.toml 側に不在（effort から自動導出。詳細は [[../../docs/05_codex-fragments.md]] §3）。`max_threads`=6・`max_depth`=1 が公式既定値で、どちらも公開設定。旧版の「`multi_agent_v2` 有効時に `agents.max_threads` を明示すると起動エラー」という説は再現未実施のまま現行公式仕様と矛盾したため撤回した。Desktop／サービスがより低い実効上限を課す場合はある（[[../codex/subagent-thread-limits.md]]、2026-07-13訂正）。

## Codex CLI 呼び出し

- `-m` / `--profile <name>`（`~/.codex/<name>.config.toml` を base config の上にレイヤー。本セッションで実装文字列「Layer `$CODEX_HOME/<name>.config.toml` on top of the base user config」を確認。単一 config.toml 内の legacy `profile = "..."` / `[profiles.xxx]` はもう書き込めない仕様変更済み）
- `-c model_reasoning_effort=...`
- TUI `/model`（**config.toml へ永続書き込み＝再ピン仕様**。前セッションの実測に基づく）
- グローバル指示は `AGENTS.override.md` → `AGENTS.md` の最初の非空1ファイル・積層不可（一次: `core/src/agents_md.rs`。本セッションで実装文字列中に両ファイル名がこの順で連続するのを確認）

## sidecar 連携

codex-sidecar は端末 config の `model`/`model_provider`/`model_reasoning_effort` 行だけを隔離 home に継承する（一次: `codex-sidecar-core/dist/app-server-client.js` の `minimalCodexConfig`。本セッションで `codex-sidecar-core/dist/config.js` を実読し `.codex-sidecar.yml` の必須キー `project`（非空文字列）を新規発見——前セッションの仕様認識には無かった）。`.codex-sidecar.yml` が無いと `CONFIG_NOT_FOUND`。`defaults.model_reasoning_effort` は `low`/`medium`/`high`/`xhigh` のみ受理（`ultra`/`max` はスキーマ外＝本セッションで `codex-sidecar-core/dist/config.js` の `MODEL_REASONING_EFFORTS` 定数から確認）。

## ベンチマーク

- Terminal-Bench 2.1 SOTA 主張（公式間接・本セッション未再検証）。
- 「Sol 88.8%/Sol Ultra 91.9%」は二次資料のみ。SWE-bench Verified の公式値は未公表（2026-07-10 時点・前セッション調査）。
- openai.com / help.openai.com は本セッションでも 403 想定でアクセス未実施（前セッションの制約を踏襲）。一次資料はスニペット・端末実測ファイルに依拠。

## 関連

- [[../../docs/02_models.md]] — 役割→ティア×effort 決定表（この記事の要点を反映済み）
- [[../../docs/05_codex-fragments.md]] — Codex 端末設定断片（V2 role routing・実効値ゲート・再ピン問題・AGENTS.override.md シャドー）
- [[../../docs/plan_gpt56-rewiring.md]] — 本記事の元になった設計プラン（正本）
