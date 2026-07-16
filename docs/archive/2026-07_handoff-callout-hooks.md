# 引き継ぎ — 呼びかけ hook 群（配置・TODO・着手ゲート）

> **2026-07-16 supersession**: このhandoffは完了済み実装の履歴であり、旧「既定A＝委譲」「常時docs正本化」は現行規範ではない。現在の義務はグローバルCLAUDE.md／AGENTS.md「作業レーンと統制」を参照する。

<!-- 前提: Fable級統括が設計・Opus級の親が実装（2026-07-12）。次セッションはここから再開する。設計正典は docs/plan_callout-hooks.md -->

2026-07-12 の長時間セッションが生成劣化で中断したため、続きを安全に再開するための自己完結メモ。**設計・Hook 台帳・オーナー裁定の正典は [plan_callout-hooks.md](../plan_callout-hooks.md)**。本書は「今どこまで終わって、次に何をするか」だけを持つ。

## 目的（この工場に何を足しているか）

規範（CLAUDE.md/AGENTS.md/orchestrate）への参照を、反復命令にならない短い INFO として必要な時だけ提示する:

1. **配置案内（C1/delegation-gate-hook）**: セッション最初の委譲時だけ、配置契約の正典を INFO で案内する。引数検査や deny / ask はしない。
2. **TODO 案内（C2-C3/todo-gate-hook）**: 起動時の棚卸しを INFO で返し、更新忘れ候補は Stop で pending 保存して次の自然な入力へ1回配送する。
3. **着手案内（C4/onset-gate-hook）**: セッション初回と compact 後だけ、作業規範の所在を INFO で案内する。
   Codex 側は `codex-callout-hook.sh`（X1-X5）が同型ミラー。

## Phase 1-5 完了時点の履歴

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

- **`~/.claude/settings.json` に Claude 側 hook 4本を配線済み**（PreToolUse=C1／SessionStart=C2／Stop=C3／UserPromptSubmit=C4）。バックアップ `~/.claude/settings.json.bak-callout-hooks` あり。新しい初回 INFO 契約を smoke で検証済み。
- **`~/.codex/hooks.json` に Codex hook 4本を配線済み**（SessionStart/PreToolUse/UserPromptSubmit/Stop＝X1-X5。2026-07-12 10:37・バックアップ `hooks.json.bak-calloutgate-20260712-103754`）。既存 throughline/caveat/spotter と共存 appendし、実火確認済み。

## 次にやること（優先順）

### 1. ✅ Codex 側 hooks.json の実火確認（完了・2026-07-12 11:41）

- 配線は 10:37 完了、実火は 11:41 に確認済み（codex-cli 0.144.1・gpt-5.6-sol）。当時は X5 の旧全文注入と X1 snapshot を実測した。その後 Phase 6 で全文注入を廃止し、初回 INFO・同セッション2回目沈黙・compact 再武装・Stop pending の次回1回配送へ変更して smoke 済み。新契約の他端末実火は残タスク。
- 副次実測: 既存 spotter の SessionStart（async:true）は `skipping async hook` で skip 確定（codex-callout は全 async:false ゆえ無影響）。
- matcher の実挙動検証は fast-path 最適化の論点として残す（現状 async:false・stdin 先頭 grep で対象外ツールを弾く実装で稼働中）。

### 2. Phase 5（検証常設と締め）

- [x] `bin/verify-install.sh` に**配線検証**を追加（settings.json の4 hook＋既存 plan-gate、hooks.json の canonical codex-callout、routing 必須キー、選択 skill 面）。手挿し忘れは FAIL で名指しする。
- [x] `AGENTS.md` オンボーディング手順5/6・`README.md` ランブックを profile / applier / verify 契約へ更新。
- **他端末波及**: 各端末で pull → `./install.sh --profile official` → Claude `settings.json` 断片マージ / Codex applier の dry-run→承認済み apply → `./bin/verify-install.sh --profile official` → 実火1件。全端末済みで本プランと本書を docs/archive/ へ退避。

### 3. 知識還流（残り・tool が安定した状態で正確に）

- **既存 caveat の訂正**: `claude-code-hooks-no-hot-reload`（「再起動必要」）は現行版で誤り → P5 実測で「hot-reload される」。caveat_update で訂正。
- **Codex Stop hook の注入が実挙動に反映される**（P6e 実証・既存 codex-cli-hooks caveat は「観測専用」と記録＝補足する）。
- 記録済み: メモリ `long-session-generation-degrades`（生成劣化と対処）／caveat `codex-sidecar-codex-work-protocol-error-...`（worktree 回収）。

## 旧設計の未解決論点（Phase 6 INFO化で解消済み）

- `DOTAGENTS_*_GATE=off` だけを無効化値として扱う。旧 `DOTAGENTS_TODO_GATE=block` の昇格は廃止済み。
- C1 の個別パラメータ検査と deny / ask は廃止済み。初回委譲 INFO だけを返す。
- **fast-path は「python 起動後・JSON parse 前 return」**（1本 python では bash 側で起動回避不能）。重い git subprocess は避けるが python 起動コストは残る。matcher が使えれば配線側で減らせる（上記1参照）。
- **onset-gate（C4）**: セッション初回＋compact 後1回だけの INFO に変更済み。background 通知ターンでの反復注入は設計対象外になった。
- **todo-gate stop が無関係な plan まで列挙**: 変更ファイルに `docs/plan_*.md` が無いと全 plan を挙げる（hook はどれが今の作業に関連するか判別不能）。仕様の限界。気になるなら「最近更新された plan のみ」等の絞り込みを検討。

## 再開時の作法（重要・このセッションの実被弾から）

- **生成劣化の兆候（ツール成功の捏造・grep 出力の破損・filler token 連発）が出たら、1メッセージ1ツール＋独立コマンドの数値/ハッシュ検証**（`grep -c`・`git rev-parse --short HEAD`・`echo $?`）。Edit/commit の tool 返り値を信じない。
- **全文読み取りが壊れたら Python でファイル直読み**（`python3 - <<'PY' open(p).read()`）で迂回し、置換は `CHANGED`/`NO_MATCH` を print して数値検証。
- 契約クリティカル（`codex/AGENTS.md` 等の憲法差分）は refuter を通し・単独コミット・push 前にオーナー diff レビュー。
- 詳細は端末メモリ [[long-session-generation-degrades]]。
