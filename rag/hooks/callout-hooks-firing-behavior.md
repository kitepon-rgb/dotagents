# 呼びかけ hook 群の発火挙動 — Claude Code / Codex CLI 実測リファレンス

**出典**: dotagents 呼びかけ hook 群（Claude 側 C1-C4／Codex 側 X1-X5）の Phase 1 プローブ（P1-P7）＋2026-07-12 実火観測。
**確度**: reproduced（実機実測。Claude Code 現行版・codex-cli 0.144.1・gpt-5.6-sol）。
**設計・裁定・反証の完了記録**: [archive版](../../docs/archive/plan_callout-hooks.md)（「hook が実際にどう発火するか」の実測は永続再利用するため本記事に残す）。

## なぜここにあるか

将来 hook を新設・改修する時の一次リファレンス。plan は工場の設計・進捗で役目を終えれば archive されるが、発火挙動の実測は使い回す。caveat（罠）とは役割が違う＝これは「正の実測記録」。

## 現行の dotagents 呼びかけ契約（2026-08-02 delegation gate）

- Hook は詳細な手順を再掲せず、観測事実とグローバル `CLAUDE.md` / `AGENTS.md` への短い INFO だけを返す。
- C1/X2 の委譲案内はセッション初回だけ。Oracle は C1 matcher の対象外。C1はaiterm codexの具体model/effort、Agent/Taskの具体call model（project agents directory不在時だけhome直結roleも可）、sidecar writeの明示pairまたは具体defaults pair、外部writerのscope tokenと未解放writer予約だけをdenyする。X2はspawn_agentの具体modelまたは配布先の具体fixed role（存在するeffort fieldも具体）だけを許可する。それ以外の入口・grok/composer・Workflow・read系sidecarはINFOのまま。
- denyはP10/P9/P11の閉集合に限る。scopeは `[scope:read-only]` / `[scope:write]` の一方だけで、欠如・混在はP9 deny。予約はowner-only 0700専用directoryでtemp+rename公開され、削除は手動releaseだけ（TTLなし）。非git writerは `unidentified-repo` sentinelで直列化し、破損/中間reservationはopaque busy、state確保不能は `P11_STATE_UNAVAILABLE` としてdenyする。read系・非writerのhook内部障害は理由付きINFOへ縮退する。Bashは汎用入口で構造化inputがなく委譲判定不能、sidecar read系は書込まないため直列化対象外で、ともにINFO維持する。`DOTAGENTS_PLACEMENT_GATE=off`はC1/X2のINFOとdenyをともに停止する。
- C4/X5 の着手案内はセッション初回だけで、compact 後に1回再武装する。毎 UserPromptSubmit の固定文注入はしない。
- C3/X4 は Stop で rolling baseline を判定するが、その場で context 注入や block はしない。必要時だけ pending を保存し、次の自然な UserPromptSubmit で1回配送する。
- C2/X1 の棚卸しと plan gate / X2 update_plan は、従来の命令文を正典参照の INFO に置換した。検出とスロットル自体は維持する。

以下の deny / ask / block に関する記録は、Hook API がその制御形式を受理するかを確認した当時の実測であり、現行 dotagents Hook がそれらを使うという意味ではない。

## Claude Code hook（settings.json）の実測挙動

- **PreToolUse の additionalContext 単独注入は届く**（P3）。`permissionDecision` 無しなら権限フロー無干渉・毎回発火。到達タイミングは「ツール結果と同時〜直後」＝**矯正型**（当該ツール呼び出し自体には間に合わない。文言は事後宣言を促す形にする）。
- **子エージェント内部のツールも親 PreToolUse で発火**（P2）。`agent_id`/`agent_type` 付与・`session_id` は親と共通。session_id キーのスロットルが子の多重発火も自然に抑える。
- **tool_name は `Agent`**（`Task` でなく。v2.1.63 で改名・alias 併存＝matcher は両方書く）。tool_input に `subagent_type`/`model`/`prompt`。Workflow は `tool_input.script`（JS 文字列）。
- **matcher は正規表現・MCP ツール名に効く**（`mcp__.*`）（P7）。
- **Stop は1実行で複数回発火しうる**（P4。バックグラウンド Agent 完了点＋最終応答点、いずれも `stop_hook_active=false`）。rolling baseline 方式は差分ゼロで沈黙するので二重発火に耐える。stdin に cwd・CLAUDE_PROJECT_DIR あり。
- **settings.json は hot-reload される**（P5・現行版）。配線後の新セッション不要。**user 設定変更は全稼働セッションに波及**。→ caveat `claude-code-hooks-no-hot-reload` を「バージョンで挙動変化」と訂正済み。
- **headless の ask は自動 deny**（P7・再試行なし・hang なし）。Stop block の 8回 cap 実在。
- **動的文言は実生成される**: C1は初回INFOに観測値を含め、deny時は理由コード・最小例・正典参照を3行で返す。

## Codex CLI hook（hooks.json）の実測挙動

- **hooks.json は共有 append ファイル**（throughline/caveat/spotter/codex-callout が同居）。グローバル `~/.codex/hooks.json` × プロジェクトローカル `.codex/hooks.json` で**マージ実行**（P6）。編集時は必ずバックアップ。
- **matcher が無い**＝stdin 先頭 grep の fast-path で対象外ツールを python3 起動前に弾く（同期 150-300ms 税対策）。
- **async 非対応**（0.144.1 でも）。`async:true` エントリは `skipping async hook … async hooks are not supported yet` 警告付きで skip される。**全エントリ `async:false` 必須**。実例: spotter の SessionStart（async:true）は skip 確定＝Codex では起動時注入が死ぬ（codex-callout は全 async:false ゆえ無影響）。
- **trust 承認必須**（対話 codex で "Trust all"）。`codex exec` は未信頼 hook を発火しない（`--dangerously-bypass-hook-trust` でも directory trust は越えない）。
- **Stop の `decision:block` は挙動へ反映される**（P6・X4 成立）。Codex は停止せず続行し reason に従属（Claude 側 Stop block と同型）。PreToolUseの `{"decision":"deny","reason":"..."}` も実ブロックする。→ 「Codex hook は観測専用」は誤り。caveat `codex-cli-hooks-posttooluse-payload-omits-tool-outcome…` に補足済み。
- **update_plan は Pre/PostToolUse 両方発火**・tool_input に3状態プラン（`plan[].{step,status=pending|in_progress|completed}`）＝プラン瞬間の唯一の観測点。
- **PostToolUse payload に tool 成否は出ない**（exit code/status なし。失敗 apply_patch は PostToolUse すら出ない）。同 caveat 参照。
- **X5 着手ゲート実火**（2026-07-12）: `UserPromptSubmit hook (completed)` として着手ゲート全文が Codex コンテキストへ注入（画面表示・Codex 自身も到達を確認）。
- **X1 session-start 実火**（2026-07-12）: snapshot 副作用を記録。棚卸し文言は 24h スロットルで設計どおり沈黙。

## dotagents 呼びかけ hook の状態ファイル形式

場所: `${XDG_CACHE_HOME:-$HOME/.cache}/dotagents/hooks/`（Claude/Codex 4 hook 共有・7日 opportunistic GC・自前管理領域）。

| ファイル名 | 内容 | 用途 |
|---|---|---|
| `<session_id>.<repo_hash>.snapshot` | 2行＝porcelain の SHA1＋HEAD sha | Claude C2/C3 の rolling baseline |
| `<session_id>.<repo_hash>.codex-snapshot` | 同上 | Codex X1/X4 の rolling baseline |
| `<session_id>.placement-warn` | 空 | C1 初回委譲 INFO の session スロットル |
| `<session_id>.codex-placement-info` | 空 | Codex X2 初回委譲 INFO の session スロットル |
| `<session_id>.onset-info` | 空 | Claude C4 初回案内 INFO の session スロットル |
| `<session_id>.codex-onset-info` | 空 | Codex X5 初回案内 INFO の session スロットル |
| `<session_id>.todo-pending` | INFO 文字列 | Claude C3 から次の UserPromptSubmit への1回配送 |
| `<session_id>.codex-pending` | INFO 文字列 | Codex X4 から次の UserPromptSubmit への1回配送 |
| `<repo_hash>.stocktake` | 空 | 棚卸し（C2/X1）の 24h スロットル（repo パスキー） |
| `errors.log` | 1行/件 | fail-open 記録（parse 不能時。stderr 禁止の代替＝憲法のフォールバック明示要件） |
| `writer-reservations/<sha256(common_dir)>.json` | common_dir/tool/session_hint/created_at/dispatch_id | C1 write宣言の同一repo排他予約。owner-only専用directoryでtemp+rename公開、手動releaseのみ、TTLなし・通常GC対象外。 |

- porcelain が空（クリーン）の SHA1 は `da39a3ee5e6b4b0d3255bfef95601890afd80709`（空文字列の SHA1）。実測 snapshot でこの値なら「作業なし」。
- repo_hash はリポルートパスのハッシュ（例: dotagents=`6c870a0ad555`）。同一リポの複数セッションが同じ stocktake スロットルを共有。

## 関連

- 設計・裁定・反証: [archive版](../../docs/archive/plan_callout-hooks.md)
- caveat: `claude-code-hooks-no-hot-reload`（hot-reload 訂正）・`codex-cli-hooks-posttooluse-payload-omits-tool-outcome…`（Stop 制御反映の補足）・`codex-hooks-require-pascalcase-config-keys-and-transcript-backed-exit-codes`・`claude-code-hook-error-false-label`（stdin 未消費/stderr で偽 Hook Error）
