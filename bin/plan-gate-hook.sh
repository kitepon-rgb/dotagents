#!/usr/bin/env bash
# plan-gate-hook: Claude Code の PostToolUse(ExitPlanMode) フック本体。
# プラン承認直後にレーン別の計画作法をモデルへ案内する。
# 配線は各端末の ~/.claude/settings.json に手挿し（正典: docs/03_settings-fragments.md）。
# 案内文言はこの1ファイルに集約＝git pull で全端末へ伝播する。
# 契約: 常に exit 0・stdout に valid JSON（hookSpecificOutput.additionalContext）。
# 依存なし（jq 不要）。文言に " と \ と生改行を含めないこと（printf で JSON 直書きのため）。
# 設計・TODO: docs/archive/2026-07_plan-gate-hook.md
set -uo pipefail

# フックへ渡る stdin(JSON) は本フックでは未使用。読み捨てて writer 側の SIGPIPE を避ける。
cat >/dev/null 2>&1 || true

# additionalContext = モデルへ注入される正本化リマインダ（文言の集約点）。
# " \ 生改行を含めない（下の printf で JSON 文字列へ直書きするため）。
context='INFO: プランが承認されました。統括レーン（計画に組込済みの中断・多段の受入連鎖・複数repo書込調整・裁定証跡のいずれかが確定する戦役）なら、保存先と進捗管理はグローバル CLAUDE.md / AGENTS.md「計画文書の作法」に従います。それ以外の通常レーンは会話上の成功条件や内蔵planだけで足ります。このINFO自体は作業範囲を拡張しません。'

printf '{"continue":true,"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' "$context"
exit 0
