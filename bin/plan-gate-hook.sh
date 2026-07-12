#!/usr/bin/env bash
# plan-gate-hook: Claude Code の PostToolUse(ExitPlanMode) フック本体。
# プラン承認直後に「正本化ゲート」（グローバル CLAUDE.md「計画文書の作法」）を
# モデルのコンテキストへ注入し、承認プランを対象プロジェクトの docs/ へ正本化させる。
# 配線は各端末の ~/.claude/settings.json に手挿し（正典: docs/03_settings-fragments.md）。
# リマインダ文言はこの1ファイルに集約＝git pull で全端末へ伝播する。
# 契約: 常に exit 0・stdout に valid JSON（hookSpecificOutput.additionalContext）。
# 依存なし（jq 不要）。文言に " と \ と生改行を含めないこと（printf で JSON 直書きのため）。
# 設計・TODO: docs/archive/2026-07_plan-gate-hook.md
set -uo pipefail

# フックへ渡る stdin(JSON) は本フックでは未使用。読み捨てて writer 側の SIGPIPE を避ける。
cat >/dev/null 2>&1 || true

# additionalContext = モデルへ注入される正本化リマインダ（文言の集約点）。
# " \ 生改行を含めない（下の printf で JSON 文字列へ直書きするため）。
context='INFO: プランが承認されました。プランの保存先、チェックボックスによる進捗管理、完了後の archive 方針は、グローバル CLAUDE.md / AGENTS.md「計画文書の作法」を参照。このINFO自体は、依頼されていない文書作成や作業範囲の拡張を要求しません。'

printf '{"continue":true,"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' "$context"
exit 0
