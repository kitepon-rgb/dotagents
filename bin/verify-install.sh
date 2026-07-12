#!/usr/bin/env bash
# verify-install: install.sh 後、リポの各エントリが $HOME 側で本リポ向き symlink に
# なっているかを自動検証する。ランブック §3「ls -la で目視」の実行可能版。
# 他端末セットアップで「実ファイル退避を忘れて正本化が静かに失敗」を検出する狙い。
# 使い方: verify-install   （引数不要。symlink 経由でも実体リポを解決する）
set -uo pipefail

# 自身の実体を辿ってリポルートを解決（install.sh は絶対パスで symlink するので readlink は絶対）
SELF="${BASH_SOURCE[0]}"
while [ -L "$SELF" ]; do SELF="$(readlink "$SELF")"; done
REPO="$(cd "$(dirname "$SELF")/.." && pwd)"

fail=0
check() { # check <dst> <expect_src>
  local dst="$1" exp="$2"
  if [ ! -e "$dst" ] && [ ! -L "$dst" ]; then
    echo "MISS: $dst 不在（install.sh 未実行 or 対象追加後に再実行が必要）"; fail=1; return
  fi
  if [ ! -L "$dst" ]; then
    echo "FAIL: $dst は実ファイル（退避して install.sh 再実行しないと正本が使われない）"; fail=1; return
  fi
  local tgt; tgt="$(readlink "$dst")"
  # 期待 src と完全一致で比較（末尾スラッシュ差を正規化）。$REPO 配下でも別ファイル向きは FAIL。
  if [ "${tgt%/}" != "${exp%/}" ]; then
    echo "FAIL: $dst → $tgt（期待 ${exp%/} と不一致）"; fail=1
  fi
}

# Codex の orchestrate は Claude 側の唯一の正本を参照する薄い adapter とする。
# 実ディレクトリへの複製・絶対リンク・参照先の取り違えをここで明示的に検出する。
codex_orchestrate="$REPO/codex/skills/orchestrate"
codex_orchestrate_target="../../claude/skills/orchestrate"
if [ ! -L "$codex_orchestrate" ]; then
  echo "FAIL: $codex_orchestrate は Claude 正本への相対 symlink ではない（複製を置かない）"
  fail=1
elif [ "$(readlink "$codex_orchestrate")" != "$codex_orchestrate_target" ]; then
  echo "FAIL: $codex_orchestrate → $(readlink "$codex_orchestrate")（期待 $codex_orchestrate_target）"
  fail=1
elif [ ! -d "$codex_orchestrate" ] || [ ! -r "$codex_orchestrate/SKILL.md" ] || [ ! -d "$codex_orchestrate/references" ]; then
  echo "FAIL: $codex_orchestrate の Claude 正本参照が壊れている（SKILL.md と references を読めない）"
  fail=1
fi

# install.sh の10グループと対称に検証
[ -f "$REPO/claude/CLAUDE.md" ] && check "$HOME/.claude/CLAUDE.md" "$REPO/claude/CLAUDE.md"
for d in "$REPO/claude/skills"/*/;   do [ -d "$d" ] && check "$HOME/.claude/skills/$(basename "$d")" "$d"; done
for f in "$REPO/claude/commands"/*.md; do [ -e "$f" ] && check "$HOME/.claude/commands/$(basename "$f")" "$f"; done
for f in "$REPO/claude/agents"/*.md;   do [ -e "$f" ] && check "$HOME/.claude/agents/$(basename "$f")" "$f"; done
[ -f "$REPO/codex/AGENTS.md" ] && check "$HOME/.codex/AGENTS.md" "$REPO/codex/AGENTS.md"
for d in "$REPO/codex/skills"/*/;    do [ -d "$d" ] && check "$HOME/.codex/skills/$(basename "$d")" "$d"; done
for f in "$REPO/codex/rules"/*;      do [ -e "$f" ] && check "$HOME/.codex/rules/$(basename "$f")" "$f"; done
for f in "$REPO/codex/agents"/*.toml; do [ -e "$f" ] && check "$HOME/.codex/agents/$(basename "$f")" "$f"; done
# caveat: v0.15+ manages ~/.caveat/own itself (standalone git repo → Caveat-Private).
# dotagents no longer owns it, so verify the Caveat-standard setup instead of a symlink.
if [ -d "$HOME/.caveat/own/.git" ]; then
  _cav_remote="$(git -C "$HOME/.caveat/own" remote get-url origin 2>/dev/null || true)"
  case "$_cav_remote" in
    *Caveat-Private*) echo "OK  ~/.caveat/own → $_cav_remote" ;;
    "") echo "WARN ~/.caveat/own has no 'origin' remote — run: caveat sync --init" >&2 ;;
    *) echo "OK  ~/.caveat/own → $_cav_remote (custom private remote)" ;;
  esac
else
  echo "WARN ~/.caveat/own is not a git repo — set up sync: caveat sync --init [--repo <Caveat-Private-url>]" >&2
fi
for f in "$REPO/bin"/*.sh;           do [ -e "$f" ] && check "$HOME/.local/bin/$(basename "$f" .sh)" "$f"; done

# ~/.codex/AGENTS.override.md シャドー検出: Codex は override が存在すれば AGENTS.md より
# 優先して読むため、非空の override は配布憲法（codex/AGENTS.md）を無言で無効化する。
# 空ファイルはシャドーしない（Codex 側が空なら読み飛ばす想定）ので FAIL にしない。
override_file="$HOME/.codex/AGENTS.override.md"
if [ -s "$override_file" ]; then
  echo "FAIL: ${override_file} が非空で存在（AGENTS.md より優先され配布憲法が読まれない。意図的でなければ退避）"
  fail=1
fi

# GPT-5.6 Sol/Terra はモデルカタログにより multi_agent_v2 を選ぶ。0.144.1 の v2 既定は
# agent_type/model/effort を spawn_agent schema から隠すため、role TOML が存在しても選べない。
# namespace も既定 collaboration のまま schema を拡張すると backend の reserved-schema
# 検証で拒否される組み合わせがあるため、全端末で agents へ明示移動する。
codex_config="$HOME/.codex/config.toml"
if ! command -v python3 >/dev/null 2>&1; then
  echo "FAIL: python3 不在（${codex_config} の agent routing 設定を検証できない）"
  fail=1
elif ! python3 - "$codex_config" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
if not path.is_file():
    raise SystemExit(1)
try:
    text = path.read_text(encoding="utf-8")
except (OSError, UnicodeDecodeError):
    raise SystemExit(1)
match = re.search(
    r"(?ms)^\[features\.multi_agent_v2\]\s*\n(.*?)(?=^\[|\Z)",
    text,
)
if not match:
    raise SystemExit(1)
section = match.group(1)
if not re.search(r"(?m)^hide_spawn_agent_metadata\s*=\s*false\s*$", section):
    raise SystemExit(1)
if not re.search(r'(?m)^tool_namespace\s*=\s*"agents"\s*$', section):
    raise SystemExit(1)
PY
then
  echo "FAIL: ${codex_config} に agent routing 必須断片がない（docs/05_codex-fragments.md §3 を適用）"
  fail=1
fi

# 呼びかけ hook は settings.json へ手挿しするため、symlink 検証とは別に配線を確認する。
claude_settings="$HOME/.claude/settings.json"
if [ ! -f "$claude_settings" ]; then
  echo "WARN ${claude_settings} 不在（Claude Code 未セットアップ端末）" >&2
elif ! python3 - "$claude_settings" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
try:
    with path.open(encoding="utf-8") as file:
        data = json.load(file)
except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
    print(f"FAIL: {path} の JSON パース失敗: {exc}")
    raise SystemExit(1)

required = {
    "PreToolUse": "delegation-gate-hook",
    "SessionStart": "todo-gate-hook session-start",
    "Stop": "todo-gate-hook stop",
    "UserPromptSubmit": "onset-gate-hook",
    "PostToolUse": "plan-gate-hook",
}
missing = []
for event, required_command in required.items():
    commands = (
        hook.get("command", "")
        for entry in data.get("hooks", {}).get(event, [])
        if isinstance(entry, dict)
        for hook in entry.get("hooks", [])
        if isinstance(hook, dict)
    )
    if not any(
        isinstance(command, str) and required_command in command
        for command in commands
    ):
        missing.append(f"{event}: {required_command}")

if missing:
    print("FAIL: Claude Code 必須 hook が欠落: " + "、".join(missing))
    raise SystemExit(1)
PY
then
  fail=1
fi

codex_hooks="$HOME/.codex/hooks.json"
if [ ! -f "$codex_hooks" ]; then
  echo "WARN ${codex_hooks} 不在（Codex 未セットアップ端末）" >&2
elif ! python3 - "$codex_hooks" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
try:
    with path.open(encoding="utf-8") as file:
        data = json.load(file)
except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
    print(f"FAIL: {path} の JSON パース失敗: {exc}")
    raise SystemExit(1)

required = {
    "SessionStart": "codex-callout-hook session-start",
    "PreToolUse": "codex-callout-hook pre-tool-use",
    "UserPromptSubmit": "codex-callout-hook user-prompt-submit",
    "Stop": "codex-callout-hook stop",
}
missing = []
for event, required_command in required.items():
    commands = (
        hook.get("command", "")
        for entry in data.get("hooks", {}).get(event, [])
        if isinstance(entry, dict)
        for hook in entry.get("hooks", [])
        if isinstance(hook, dict)
    )
    if not any(
        isinstance(command, str) and required_command in command
        for command in commands
    ):
        missing.append(f"{event}: {required_command}")

if missing:
    print("FAIL: Codex 必須 hook が欠落: " + "、".join(missing))
    raise SystemExit(1)
PY
then
  fail=1
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "verify-install: OK — 全エントリが本リポ ${REPO} 向き symlink"
else
  echo "verify-install: FAIL あり — 上記を退避/再 install で解消（手順は dotagents/README ランブック §2-3）"
fi
exit "$fail"
