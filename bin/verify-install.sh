#!/usr/bin/env bash
# verify-install: install.sh 後、リポの各エントリが $HOME 側で本リポ向き symlink に
# なっているかを自動検証する。ランブック §3「ls -la で目視」の実行可能版。
# 他端末セットアップで「実ファイル退避を忘れて正本化が静かに失敗」を検出する狙い。
# 使い方: verify-install [--profile official|legacy]
set -uo pipefail

profile=official
profile_set=false
usage() {
  cat <<'EOF'
使い方: verify-install [--profile official|legacy]

Codex skill 検証面:
  official  ~/.agents/skills （既定）
  legacy    ~/.codex/skills
EOF
}
while [ "$#" -gt 0 ]; do
  case "$1" in
    --help|-h) usage; exit 0 ;;
    --profile)
      if [ "$#" -lt 2 ] || [ "$profile_set" != false ]; then
        echo 'FAIL: --profile は一度だけ official または legacy を指定する' >&2; exit 2
      fi
      profile="$2"; profile_set=true; shift 2 ;;
    --profile=*)
      if [ "$profile_set" != false ]; then
        echo 'FAIL: --profile を重複指定できない' >&2; exit 2
      fi
      profile="${1#--profile=}"; profile_set=true; shift ;;
    *) echo "FAIL: 不明な引数: $1" >&2; usage >&2; exit 2 ;;
  esac
done
case "$profile" in official|legacy) ;; *) echo "FAIL: 不正な profile: $profile" >&2; exit 2 ;; esac

# 自身の実体を辿ってリポルートを解決（install.sh は絶対パスで symlink するので readlink は絶対）
SELF="${BASH_SOURCE[0]}"
while [ -L "$SELF" ]; do SELF="$(readlink "$SELF")"; done
REPO="$(cd "$(dirname "$SELF")/.." && pwd)"
if [ "$profile" = official ]; then
  codex_skills_dir="$HOME/.agents/skills"
  other_codex_skills_dir="$HOME/.codex/skills"
else
  codex_skills_dir="$HOME/.codex/skills"
  other_codex_skills_dir="$HOME/.agents/skills"
fi

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

verify_factory_core() {
  local project_root="${DOTAGENTS_FACTORY_PROJECT_ROOT:-$REPO}"
  local cli
  for cli in caveat throughline spotter codegraph markitdown gpt-connector aiterm-mcp codex-sidecar-mcp; do
    if command -v "$cli" >/dev/null 2>&1; then
      echo "OK  factory core CLI: $cli → $(command -v "$cli")"
    else
      echo "FAIL: factory core CLI '$cli' 不在（工場コア8製品は全端末必須）"
      fail=1
    fi
  done

  if ! command -v uv >/dev/null 2>&1; then
    echo "FAIL: uv 不在（MarkItDownの正規 tool 所有面を検証・更新できない）"
    fail=1
  elif uv tool list 2>/dev/null | grep -Eq '^markitdown([[:space:]]|$)'; then
    echo "OK  MarkItDown ownership: uv tool"
  else
    echo "FAIL: MarkItDown が uv tool 管理にない（uv tool install markitdown を実行）"
    fail=1
  fi

  if [ -d "$HOME/.caveat/own/.git" ]; then
    local caveat_remote
    caveat_remote="$(git -C "$HOME/.caveat/own" remote get-url origin 2>/dev/null || true)"
    case "$caveat_remote" in
      *Caveat-Private*) echo "OK  ~/.caveat/own → $caveat_remote" ;;
      "")
        echo "FAIL: ~/.caveat/own に origin がない（caveat sync --init を実行）"
        fail=1 ;;
      *)
        echo "FAIL: ~/.caveat/own の origin が Caveat-Private でない: $caveat_remote"
        fail=1 ;;
    esac
  else
    echo "FAIL: ~/.caveat/own はgit repoでない（caveat sync --init --repo <Caveat-Private-url> を実行）"
    fail=1
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "FAIL: python3 不在（Spotter project marker / hook / catalog を検証できない）"
    fail=1
    return
  fi

  if ! python3 - "$project_root" <<'PY'
import json
import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
marker_path = root / ".spotter" / "marker.json"
claude_settings_path = root / ".claude" / "settings.json"
catalog_paths = [
    root / ".spotter" / "tool-db.json",
    root / ".spotter" / "tool-db.codex.json",
]

try:
    marker = json.loads(marker_path.read_text(encoding="utf-8"))
except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
    print(f"FAIL: Spotter marker を読めない: {marker_path}: {exc}")
    raise SystemExit(1)
context = marker.get("auditorContext")
context = context if isinstance(context, dict) else {}
command = context.get("command")
if marker.get("markerVersion") != "2" or context.get("mode") != "throughline":
    print("FAIL: Spotter marker は markerVersion=2 / auditorContext.mode=throughline でない")
    raise SystemExit(1)
if not isinstance(command, str) or not os.path.isabs(command):
    print("FAIL: Spotter Throughline connector の command が絶対パスでない")
    raise SystemExit(1)

try:
    settings = json.loads(claude_settings_path.read_text(encoding="utf-8"))
except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
    print(f"FAIL: Spotter Claude hook 設定を読めない: {claude_settings_path}: {exc}")
    raise SystemExit(1)
required = {
    "SessionStart": "session-start",
    "UserPromptSubmit": "user-prompt",
    "PreToolUse": "pre-tool-use",
    "Stop": "stop",
    "SessionEnd": "session-end",
}
missing = []
for event, subcommand in required.items():
    matches = [
        hook
        for entry in settings.get("hooks", {}).get(event, [])
        if isinstance(entry, dict)
        for hook in entry.get("hooks", [])
        if isinstance(hook, dict)
        and isinstance(hook.get("command"), str)
        and "spotter.mjs" in hook["command"]
        and f"hook {subcommand}" in hook["command"]
    ]
    if len(matches) != 1:
        missing.append(f"{event}: hook {subcommand}（{len(matches)}件）")
if missing:
    print("FAIL: Spotter Claude canonical hook が欠落/重複: " + "、".join(missing))
    raise SystemExit(1)

for path in catalog_paths:
    try:
        json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        print(f"FAIL: Spotter host別catalogを読めない: {path}: {exc}")
        raise SystemExit(1)
print(f"OK  Spotter project: {root}（marker v2 / Throughline context / Claude 5 hooks / host別catalog）")
PY
  then
    fail=1
  fi

  if command -v spotter >/dev/null 2>&1; then
    local diagnostics
    diagnostics="$(mktemp)"
    if spotter codex-hook diagnostics --project "$project_root" >"$diagnostics" 2>/dev/null \
      && python3 - "$diagnostics" <<'PY'
import json
import sys
from pathlib import Path

try:
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
    print(f"FAIL: Spotter Codex diagnostics のJSONを読めない: {exc}")
    raise SystemExit(1)
required = ("sessionStart", "userPromptSubmit", "stop")
if data.get("availability") != "available":
    print(f"FAIL: Spotter Codex hook availability={data.get('availability')!r}")
    raise SystemExit(1)
if data.get("readiness") not in {"configured-unverified", "ready"}:
    print(f"FAIL: Spotter Codex hook readiness={data.get('readiness')!r}")
    raise SystemExit(1)
for key in required:
    if data.get("installedHooks", {}).get(key) != "installed":
        print(f"FAIL: Spotter Codex hook {key} が installed でない")
        raise SystemExit(1)
    validation = data.get("validation", {}).get(key, {})
    if not (
        validation.get("registered") is True
        and validation.get("compatible") is True
        and validation.get("misconfigured") is False
        and validation.get("canonical") is True
        and validation.get("issues") == []
    ):
        print(f"FAIL: Spotter Codex hook {key} が canonical でない")
        raise SystemExit(1)
print("OK  Spotter Codex 3 hooks: installed / compatible / canonical")
PY
    then
      :
    else
      echo "FAIL: spotter codex-hook diagnostics が不合格"
      fail=1
    fi
    rm -f "$diagnostics"
  fi

  if [ ! -x "$HOME/.local/bin/oracle-mcp-stable" ]; then
    echo "FAIL: Oracle canonical wrapper が実行不能: $HOME/.local/bin/oracle-mcp-stable"
    fail=1
  else
    echo "OK  Oracle canonical wrapper: $HOME/.local/bin/oracle-mcp-stable"
  fi
}

if [ "${DOTAGENTS_FACTORY_CORE_ONLY:-0}" = 1 ]; then
  verify_factory_core
  exit "$fail"
fi

# Codex の orchestrate は製品固有の実ディレクトリとし、製品中立の共通契約を参照する。
# Claude 本文の複製や symlink への後退をここで明示的に検出する。
codex_orchestrate="$REPO/codex/skills/orchestrate"
shared_orchestrate_contract="$REPO/shared/orchestrate/contract.md"
if [ -L "$codex_orchestrate" ] || [ ! -d "$codex_orchestrate" ]; then
  echo "FAIL: $codex_orchestrate は製品固有の実ディレクトリではない（Claude 側への symlink を置かない）"
  fail=1
elif [ ! -r "$codex_orchestrate/SKILL.md" ]; then
  echo "FAIL: $codex_orchestrate/SKILL.md を読めない"
  fail=1
elif [ ! -r "$shared_orchestrate_contract" ]; then
  echo "FAIL: $shared_orchestrate_contract を読めない"
  fail=1
elif ! grep -Fq '../../../shared/orchestrate/contract.md' "$codex_orchestrate/SKILL.md"; then
  echo "FAIL: $codex_orchestrate/SKILL.md が共通契約を参照していない"
  fail=1
fi

# install.sh の配布グループと対称に検証
[ -f "$REPO/claude/CLAUDE.md" ] && check "$HOME/.claude/CLAUDE.md" "$REPO/claude/CLAUDE.md"
for d in "$REPO/claude/skills"/*/;   do [ -d "$d" ] && check "$HOME/.claude/skills/$(basename "$d")" "$d"; done
for f in "$REPO/claude/commands"/*.md; do [ -e "$f" ] && check "$HOME/.claude/commands/$(basename "$f")" "$f"; done
for f in "$REPO/claude/agents"/*.md;   do [ -e "$f" ] && check "$HOME/.claude/agents/$(basename "$f")" "$f"; done
[ -f "$REPO/codex/AGENTS.md" ] && check "$HOME/.codex/AGENTS.md" "$REPO/codex/AGENTS.md"
for d in "$REPO/codex/skills"/*/; do
  [ -d "$d" ] || continue
  skill_name="$(basename "$d")"
  check "$codex_skills_dir/$skill_name" "$d"
  if [ -e "$other_codex_skills_dir/$skill_name" ] || [ -L "$other_codex_skills_dir/$skill_name" ]; then
    echo "FAIL: Codex skill ${skill_name} が反対 profile 面にも存在（${other_codex_skills_dir}/${skill_name}）"
    fail=1
  fi
done
for f in "$REPO/codex/rules"/*;      do [ -e "$f" ] && check "$HOME/.codex/rules/$(basename "$f")" "$f"; done
for f in "$REPO/codex/agents"/*.toml; do [ -e "$f" ] && check "$HOME/.codex/agents/$(basename "$f")" "$f"; done
for f in "$REPO/bin"/*.sh; do
  if [ -e "$f" ]; then
    installed="$HOME/.local/bin/$(basename "$f" .sh)"
    check "$installed" "$f"
    if [ ! -x "$installed" ]; then echo "FAIL: 配布CLIが実行不能: $installed"; fail=1; fi
  fi
done
for f in "$REPO/bin"/*.mjs; do
  if [ -e "$f" ]; then
    installed="$HOME/.local/bin/$(basename "$f" .mjs)"
    check "$installed" "$f"
    if [ ! -x "$installed" ]; then echo "FAIL: 配布CLIが実行不能: $installed"; fail=1; fi
  fi
done

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
    r"(?m)^\[features\.multi_agent_v2\](?:[ \t]+#[^\n]*)?[ \t]*\n(?s:(.*?))(?=^\[|\Z)",
    text,
)
if not match:
    raise SystemExit(1)
section = match.group(1)
if not re.search(r"(?m)^hide_spawn_agent_metadata\s*=\s*false(?:[ \t]+#.*)?[ \t]*$", section):
    raise SystemExit(1)
if not re.search(r'(?m)^tool_namespace\s*=\s*"agents"(?:[ \t]+#.*)?[ \t]*$', section):
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
import os
import sys
from pathlib import Path

path = Path(sys.argv[1])
try:
    with path.open(encoding="utf-8") as file:
        data = json.load(file)
except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
    print(f"FAIL: {path} の JSON パース失敗: {exc}")
    raise SystemExit(1)

required = (
    ("PreToolUse", "delegation-gate-hook"),
    ("SessionStart", "todo-gate-hook session-start"),
    ("Stop", "todo-gate-hook stop"),
    ("UserPromptSubmit", "onset-gate-hook"),
    ("PostToolUse", "plan-gate-hook"),
)
missing = []
for event, required_command in required:
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

home = Path(os.environ["HOME"]).expanduser().resolve()
advisory = (home / ".local/bin/orchestrate-advisory-hook").resolve(strict=False)
relevant = []
canonical = []
for entry in data.get("hooks", {}).get("SessionStart", []):
    if not isinstance(entry, dict):
        continue
    for hook in entry.get("hooks", []):
        if not isinstance(hook, dict) or not isinstance(hook.get("command"), str):
            continue
        command = hook["command"]
        normalized = Path(str(home) + command[1:] if command.startswith("~/") else command).expanduser().resolve(strict=False)
        if "orchestrate-advisory-hook" in command:
            relevant.append(hook)
        if normalized == advisory:
            canonical.append(hook)
expected = {"type": "command", "command": None, "timeout": 5}
if len(relevant) != 1 or len(canonical) != 1 or set(canonical[0]) != {"type", "command", "timeout"} or canonical[0].get("type") != expected["type"] or canonical[0].get("timeout") != expected["timeout"]:
    print("FAIL: Claude SessionStart の orchestrate-advisory-hook は canonical command / type=command / timeout=5 の1件である必要がある")
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
import os
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
    "SessionStart": ("session-start", 10),
    "PreToolUse": ("pre-tool-use", 5),
    "UserPromptSubmit": ("user-prompt-submit", 5),
    "Stop": ("stop", 10),
}
missing = []
hook_path = str(Path(os.environ["HOME"]).expanduser().resolve() / ".local/bin/codex-callout-hook")
for event, (subcommand, timeout) in required.items():
    matches = [
        hook
        for entry in data.get("hooks", {}).get(event, [])
        if isinstance(entry, dict)
        for hook in entry.get("hooks", [])
        if isinstance(hook, dict) and hook.get("command") == f"{hook_path} {subcommand}"
    ]
    if len(matches) != 1 or matches[0] != {
        "type": "command",
        "command": f"{hook_path} {subcommand}",
        "timeoutSec": timeout,
        "async": False,
        "statusMessage": None,
    }:
        missing.append(f"{event}: codex-callout-hook {subcommand} の正規 entry")

if missing:
    print("FAIL: Codex 必須 hook が欠落: " + "、".join(missing))
    raise SystemExit(1)
PY
then
  fail=1
fi

# Orchestrate advisory はSessionStartへ一件だけの追加INFOであり、既存calloutとは別entryで保持する。
if [ -f "$codex_hooks" ] && ! python3 - "$codex_hooks" <<'PY'
import json
import os
import sys
from pathlib import Path

try:
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
except (OSError, UnicodeDecodeError, json.JSONDecodeError):
    raise SystemExit(1)
path = str(Path(os.environ["HOME"]).expanduser().resolve() / ".local/bin/orchestrate-advisory-hook")
expected = {"type": "command", "command": path, "timeoutSec": 5, "async": False, "statusMessage": None}
matches = [
    hook
    for entry in data.get("hooks", {}).get("SessionStart", [])
    if isinstance(entry, dict)
    for hook in entry.get("hooks", [])
    if isinstance(hook, dict) and hook.get("command") == path
]
raise SystemExit(0 if matches == [expected] else 1)
PY
then
  echo "FAIL: Codex SessionStart に orchestrate-advisory-hook の正規 entry がない"
  fail=1
fi

if [ "${DOTAGENTS_SKIP_FACTORY_CORE:-0}" != 1 ]; then
  verify_factory_core
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "verify-install: OK — profile=${profile}、全エントリが本リポ ${REPO} 向き symlink"
else
  echo "verify-install: FAIL あり — profile=${profile}。上記を退避/再 install で解消（手順は dotagents/README ランブック §2-3）"
fi
exit "$fail"
