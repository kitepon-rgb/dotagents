# 引き継ぎ — 呼びかけ hook 群（配置・TODO・着手ゲート）

<!-- 前提: Fable級統括が設計・Opus級の親が実装（2026-07-12）。次セッションはここから再開する。設計正典は docs/plan_callout-hooks.md -->

2026-07-12 の長時間セッションが生成劣化で中断したため、続きを安全に再開するための自己完結メモ。**設計・Hook 台帳・オーナー裁定の正典は [plan_callout-hooks.md](plan_callout-hooks.md)**。本書は「今どこまで終わって、次に何をするか」だけを持つ。

## 目的（この工場に何を足しているか）

規範（CLAUDE.md/AGENTS.md/orchestrate）に書いてあるのに行動の瞬間に無視される3点を、hook で文脈の最前面へ注入する:

1. **配置ゲート（C1/delegation-gate-hook）**: 委譲時のモデル×エフォートが 02_models.md に準じているか。
2. **TODO ゲート（C2-C3/todo-gate-hook）**: 起動時の棚卸し＋作業したのにプラン正本を更新していない時の呼びかけ。
3. **着手ゲート（C4/onset-gate-hook）**: 毎ターン、実装/委譲前に F/A/H ラベルと配置宣言・正本化を促す。
   Codex 側は `codex-callout-hook.sh`（X1-X5）が同型ミラー。

## 完了済み（GitHub origin/main = dcf459d に push 済み・8コミット）

| コミット | 内容 |
|---|---|
| `dcf459d` | 計画の Phase チェックを実態へ更新 |
| `0e92f8b` | docs/05 hooks.json 配線断片（未実装前提を削除・matcher 要検証に） |
| `3d8d371` | Codex 側 hook（`bin/codex-callout-hook.sh`・`tests/hooks/codex-smoke.sh` 26 green・docs/03） |
| `ccbe2c0` | `codex/AGENTS.md` レジーム変更（着手ゲート導入・効率カーブアウト） |
| `0785163` | Phase 2 Claude 側 hook 3本（delegation/todo/onset-gate-hook.sh・smoke 13 green・Makefile lint-py） |

- 実装は全て python3。`make lint` は shell=shellcheck・python=ast.parse（lint-py）で green。
- `install.sh` は `bin/*.sh` を自動 symlink（4 hook とも `~/.local/bin/` に配布済み）。
- 状態ファイルは `${XDG_CACHE_HOME:-$HOME/.cache}/dotagents/hooks/`（4 hook 共有・7日 GC）。

## 端末ローカルの状態（この Mac のみ・非コミット）

- **`~/.claude/settings.json` に Claude 側 hook 4本を配線済み**（PreToolUse=C1／SessionStart=C2／Stop=C3／UserPromptSubmit=C4）。バックアップ `~/.claude/settings.json.bak-callout-hooks` あり。**このセッションで着手ゲート・TODO ゲートの実火を実証済み**（hot-reload で即発火）。
- `~/.codex/hooks.json` への Codex hook 配線は**未実施**（次の作業）。

## 次にやること（優先順）

### 1. Codex 側 hooks.json 配線 → 実火

- 断片は [05_codex-fragments.md](05_codex-fragments.md) 「## 9.」。`~/.codex/hooks.json`（共有 append ファイル・**必ずバックアップ**）へ4イベント（session-start/pre-tool-use/user-prompt-submit/stop）を `async:false`・`timeoutSec` で追記。
- **trust 承認が必要**（対話 codex で "Trust all"）。新規 Codex セッションで実火確認。
- **配線前に matcher の実挙動を検証**: 公式 docs では PreToolUse 等に `tool_name` matcher が使える可能性あり（並列 implementer が発見）。使えれば配線側でツール名を絞り python 起動自体を減らせる（下記 fast-path 論点）。

### 2. Phase 5（検証常設と締め）

- `bin/verify-install.sh` に**配線検証**を追加（settings.json の4 hook＋既存 plan-gate、hooks.json の codex-callout。既存の config.toml 断片検証 L61-96 が python3 の型）。現状 verify-install は symlink しか見ず、手挿し忘れを検出できない穴がある。
- `AGENTS.md` オンボーディング手順5/6・`README.md` ランブックに hook 配線を1行追記。
- **他端末波及**: 各端末で pull → install → settings.json/hooks.json 断片マージ → verify → 実火1件。全端末済みで本プランと本書を docs/archive/ へ退避。

### 3. 知識還流（残り・tool が安定した状態で正確に）

- **既存 caveat の訂正**: `claude-code-hooks-no-hot-reload`（「再起動必要」）は現行版で誤り → P5 実測で「hot-reload される」。caveat_update で訂正。
- **Codex Stop hook の注入が実挙動に反映される**（P6e 実証・既存 codex-cli-hooks caveat は「観測専用」と記録＝補足する）。
- 記録済み: メモリ `long-session-generation-degrades`（生成劣化と対処）／caveat `codex-sidecar-codex-work-protocol-error-...`（worktree 回収）。

## 未解決の設計論点（実装は仕様どおり・実火/検証で詰める）

- **env は実装上2値**: `DOTAGENTS_PLACEMENT_GATE`/`DOTAGENTS_ONSET_GATE` は `off` か否かの2値のみ（計画の `off|warn|enforce` は未実装）。`DOTAGENTS_TODO_GATE` のみ `off`/`block`/既定(warn) の3値。warn モードのエスカレーションを足すか、計画を2値に合わせるか要裁定。
- **deny の warn 自動降格は deny①（日付ID）のみ**（計画は C1 全体想定）。deny②③の連呼は非現実的なので実害小だが、記述を実態へ寄せるか②③にも足すか。
- **fast-path は「python 起動後・JSON parse 前 return」**（1本 python では bash 側で起動回避不能）。重い git subprocess は避けるが python 起動コストは残る。matcher が使えれば配線側で減らせる（上記1参照）。
- **onset-gate（C4）の発火が background 通知ターンで不安定**: 実オーナー発言では発火するが、Agent 完了通知等のターンで注入されないことがあった。実害は「会話でないターンは無視してよい」範囲だが、UserPromptSubmit の発火条件を実火で要観察。
- **todo-gate stop が無関係な plan まで列挙**: 変更ファイルに `docs/plan_*.md` が無いと全 plan を挙げる（hook はどれが今の作業に関連するか判別不能）。仕様の限界。気になるなら「最近更新された plan のみ」等の絞り込みを検討。

## 再開時の作法（重要・このセッションの実被弾から）

- **生成劣化の兆候（ツール成功の捏造・grep 出力の破損・filler token 連発）が出たら、1メッセージ1ツール＋独立コマンドの数値/ハッシュ検証**（`grep -c`・`git rev-parse --short HEAD`・`echo $?`）。Edit/commit の tool 返り値を信じない。
- **全文読み取りが壊れたら Python でファイル直読み**（`python3 - <<'PY' open(p).read()`）で迂回し、置換は `CHANGED`/`NO_MATCH` を print して数値検証。
- 契約クリティカル（`codex/AGENTS.md` 等の憲法差分）は refuter を通し・単独コミット・push 前にオーナー diff レビュー。
- 詳細は端末メモリ [[long-session-generation-degrades]]。
