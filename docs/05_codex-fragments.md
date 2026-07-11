# 05_codex-fragments — Codex 端末設定（`~/.codex/config.toml` 等）の推奨断片カタログ

<!-- 前提: GPT-5.6 世代（2026-07 時点）。defaults の正は docs/02_models.md。本ファイルの体裁・構成は
     docs/03_settings-fragments.md（Claude Code settings.json の推奨断片カタログ）を踏襲する -->

`~/.codex/config.toml` は端末固有（コミットしない）。このファイルは「各端末で貼る断片」のカタログであり、適用は手動で行う。スキーマの根拠は [公式 Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference#configtoml)・[公式 Subagents 文書](https://learn.chatgpt.com/docs/agent-configuration/subagents)と、`codex --version` 0.144.1（2026-07-11 時点）の `openai/codex` tag `rust-v0.144.1` 実装。端末バイナリの `strings -a` と実セッション rollout も突合し、未再現の主張には確度を明記する。

## 1. 親既定モデル×エフォート（オーナー領分・情報提供のみ）

**AI はピンを打ち替えない**。以下は事実の提示のみで、適用可否・タイミングはオーナー判断。

- 現状（この端末・2026-07-11 時点）: `~/.codex/config.toml` は `gpt-5.6-sol` × `ultra` にピン済み（実測: `grep -E '^model|^model_reasoning_effort' ~/.codex/config.toml`）。
- **ultra の事実**: ultra = 最大推論（max 相当）＋ proactive な自動マルチエージェント委譲 ON。使用量急増の公式警告（CLI 0.144.0 以降・並列スレッド数閾値。閾値の具体値はローカル裏取り不能＝確度: 中、前セッション由来）。
- **公式指針（`~/.codex/models_cache.json` 実測・2026-07-10 取得）**: `gpt-5.6-sol` の `default_reasoning_level` は **low**、`gpt-5.6-terra` は **medium**。「低く始めて上げろ」に沿う既定値。
- 推奨値の提示（適用はオーナー判断）: 旗艦×low または旗艦×medium。proactive 自動委譲を意図せず踏みたくない場合は ultra を避ける。

## 2. 再ピン問題

TUI/アプリの `/model` 選択（モデルピッカー）は `config.toml` へ**永続書き込み**される仕様。この端末では `gpt-5.5/high` → `xhigh` → `gpt-5.6-sol/ultra` と変遷した実測あり＝断片を一度適用しても、次に `/model` を触れば上書きされる。

- **点検**: `grep -E '^model|^model_reasoning_effort' ~/.codex/config.toml`
- **戻し手順**:
  1. バックアップ: `cp ~/.codex/config.toml ~/.codex/config.toml.bak-$(date +%Y%m%d)`
  2. 該当2行（`model = "..."` / `model_reasoning_effort = "..."`）を編集
  3. 妥当性確認: `codex exec 'echo ok'` が正常終了すること

## 3. ネイティブ custom agent の必須設定と実効値ゲート

[公式 Subagents 文書](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents)どおり、
`~/.codex/agents/*.toml` は personal custom agent として自動探索される。このリポの
`implementer` / `refuter` / `sorter` に `[agents.<name>]` の個別登録は不要。

ただし GPT-5.6 Sol/Terra が選ぶ MultiAgent V2 には、role 定義の探索とは別の入口バグがある。
Codex 0.144.1 の実装では `hide_spawn_agent_metadata` の既定値が `true` で、単なる表示抑制ではなく
`spawn_agent` schema から `agent_type / model / reasoning_effort / service_tier` の4入力を削除する。
その状態の `task_name` は `/root/...` のタスクパス名を作るだけで、同名 custom agent を選ばない。
今回の実被弾では3子すべて `agent_role = null` となり、親の Sol×xhigh を継承した。

全端末で以下を必須適用する。`tool_namespace = "agents"` は、拡張した schema を既定の
`collaboration` namespace に置いた時に backend の reserved-schema 検証で 400 になる組み合わせを避ける。

```toml
[features.multi_agent_v2]
hide_spawn_agent_metadata = false
tool_namespace = "agents"
```

注意:

- 既存セッションの tool schema は変わらない。適用後は**必ず新規セッション**で確認する。
- `features list` が `multi_agent_v2 = false` を表示しても、Sol/Terra のモデルカタログ指定が V2 を選ぶため、上記断片は必要。
- `fork_turns` の V2 既定は `all`。これは full-history fork となり、`agent_type / model / reasoning_effort` を指定すると起動前に拒否される。custom role の spawn は必ず `fork_turns = "none"` を明示する。
- `task_name` を role selector として使わない。`agent_type = "implementer"` のように明示する。
- 最初の message は routing smoke だけにし、本作業を渡さない。起動後に
  `verify-codex-agent-routing <role> <agent-path>` で `agent_role / model / effort /
  developer_instructions` を照合し、green の時だけ follow-up task を渡す。sandbox は実効値を別表示し、
  一致まで要求する時だけ `CODEX_AGENT_ROUTING_REQUIRE_SANDBOX=1` を付ける。
- 現行 spawn 応答は実効 role/model/effort/sandbox を返さないため、上記スクリプトが rollout JSONL を読む。

**未解決の上流バグ（2026-07-11）**: 0.144.1 は role config 適用後に親 turn の live
permission profile を子へ再適用するため、custom agent の `sandbox_mode` を親 sandbox で上書きする。
実際、V1 で role/model/effort/developer instructions が正しく適用された過去の implementer 子も
`sandbox_policy = danger-full-access` だった。これは公式文書の「custom agent ごとに sandbox を override
できる」と不一致。ただし今回の role/model/effort 誤配線とは別論点なので、既定の routing 判定からは分離し、
`CODEX_AGENT_ROUTING_REQUIRE_SANDBOX=1` の時だけ差を FAIL にする。

グローバル `[agents]` の `max_threads` / `max_depth` は既定値で足りるため明示しない。
委譲モード（proactive / explicit-request-only 相当）の独立キーもなく、実効 mode は model/effort 側から
決まる。`agents.max_threads` と `features.multi_agent_v2.max_concurrent_threads_per_session` を混同しない。

実装根拠: [`MultiAgentV2Config` の hidden 既定](https://github.com/openai/codex/blob/rust-v0.144.1/codex-rs/core/src/config/mod.rs)、[`spawn_agent` schema から4入力を除く処理](https://github.com/openai/codex/blob/rust-v0.144.1/codex-rs/core/src/tools/handlers/multi_agents_spec.rs)、[role 適用後に親 permission profile を再適用する処理](https://github.com/openai/codex/blob/rust-v0.144.1/codex-rs/core/src/tools/handlers/multi_agents_common.rs)。上流既報は [#31814](https://github.com/openai/codex/issues/31814)（hidden routing）・[#20077](https://github.com/openai/codex/issues/20077)（full-history 既定）。

## 3b. oracle MCP（ChatGPT Chat枠セカンドオピニオン・全端末推奨）

Chat枠（Work枠と別勘定）の第二意見を Codex 親からも使えるようにする。**素の `oracle-mcp` でなくラッパー必須**（undici EINVAL ガード＋画面外 Chrome。理由と運用の正典は [06_oracle-mcp.md](06_oracle-mcp.md)）:

```toml
[mcp_servers.oracle]
command = "/Users/kite/.local/bin/oracle-mcp-stable"
```

適用は下記 7 の TOML 冪等適用手順で。事前に `./install.sh` でラッパーが `~/.local/bin` に入っていること。

## 4. `project_doc_fallback_filenames = ["CLAUDE.md"]`（任意・副作用明記）

CLAUDE.md しか無いリポ（このリポ含む）に指示を届かせるための設定。`project_doc_fallback_filenames` と `project_doc_max_bytes` は config.toml のキーとして実在確認済み（実装文字列に両キー名が連続して実在）。

副作用3点:

1. **Codex は `@import` を展開しない**（生テキスト注入）。CLAUDE.md 側で `@AGENTS.md` のような import 構文を書いていても、Codex はそれを解決せずそのまま読む。
2. **グローバル `~/.codex/` には効かない**。グローバル指示の候補は `AGENTS.override.md` → `AGENTS.md` の順で最初に見つかった非空1ファイル固定（実装文字列で `AGENTS.override.md` の直後に `AGENTS.md` が続く並びを確認・`core/src/agents_md.rs` 由来）。`project_doc_fallback_filenames` はプロジェクト側の doc 探索にのみ効く。
3. **連結全体で `project_doc_max_bytes` を分け合う**。実装に `project doc exceeds remaining budget; truncating`（`remaining_bytes` フィールドあり）という切り詰めメッセージが実在＝複数ファイルを跨いだ合算予算方式であることを確認。デフォルト値の具体的なバイト数（前セッション由来の情報では 65536）は今回の再検証では裏取りできず（strings 探索で拾えたのは無関係な SQLite 定数）＝**確度: 低、要再確認**。

## 5. `AGENTS.override.md` の無言シャドー（地雷警告）

`AGENTS.override.md`（非空）が存在すると、上記2の候補順により `AGENTS.md` は**無言でシャドー**される（エラーにならない）。dotagents の `verify-install.sh` はこれを名指しで検出する設計（`docs/plan_gpt56-rewiring.md` 実装チェックリスト該当）。

## 6. プロファイル例（任意）

`--profile <name>` は 0.134+ で別ファイル方式に変更済み。実装文字列に「`profile` is a legacy config selector and can no longer be written; use `--profile <name>` with `<name>.config.toml` instead」「Layer `$CODEX_HOME/<name>.config.toml` on top of the base user config」を確認——単一 `config.toml` 内の `profile = "..."` / `[profiles.xxx]` はもう書き込めないレガシー扱いで、`~/.codex/<name>.config.toml` を作りベース設定の上にレイヤーする方式が現行仕様。

```bash
# 例: 実装物量用プロファイル
cp ~/.codex/config.toml ~/.codex/work.config.toml
# work.config.toml 側で model/model_reasoning_effort だけ上書き
codex --profile work
```

用途別切替＝オーナーの手動運用を楽にする道具（AI は作成を強制しない）。

## 7. TOML 冪等適用手順

jq が使えない（TOML）ため、以下の手順で安全に適用する:

1. バックアップ: `cp ~/.codex/config.toml ~/.codex/config.toml.bak-$(date +%Y%m%d)`
2. 既存確認: `grep -nE '^<key>' ~/.codex/config.toml`（既にあれば手編集で上書き、無ければ追記）
3. 編集（Edit 相当の操作。手挿し）
4. 起動確認: `codex exec 'echo ok'` が正常終了すること（TOML 構文エラーがあれば起動時に失敗する）

## 8. 旧 `~/.codex/AGENTS.md` の退避・置換手順

1. **実ファイルか symlink か確認**: `ls -la ~/.codex/AGENTS.md`（symlink なら dotagents の `codex/AGENTS.md` を指しているはずで対応不要）。
2. 実ファイルなら中身を読み、**価値ある行があれば** dotagents の `codex/AGENTS.md` へ PR（この判断はオーナー確認を要する＝勝手に統合しない）。
3. tar 退避してから削除: `tar czf ~/.codex/AGENTS.md.bak-$(date +%Y%m%d).tar.gz -C ~/.codex AGENTS.md && rm ~/.codex/AGENTS.md`
4. `./install.sh` を再実行し、symlink が張られることを確認: `readlink ~/.codex/AGENTS.md` が dotagents の `codex/AGENTS.md` を指すこと。
