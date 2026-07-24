#!/usr/bin/env bash
# install profile と apply-codex-config を実 HOME に触れず検証する。
set -euo pipefail

# install.sh 外で作る symlink fixture も Windows では native symlink にする。
case "$(uname -s)" in MINGW*|MSYS*) export MSYS=winsymlinks:nativestrict ;; esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OFFICIAL_HOME="$(mktemp -d)"
LEGACY_HOME="$(mktemp -d)"
EXTERNAL_CODEX_HOME="$(mktemp -d)"
BAD_CODEX_HOME="$(mktemp -d)"
SYMLINK_CODEX_HOME="$(mktemp -d)"
SYMLINK_TARGETS="$(mktemp -d)"
TRANSACTION_CODEX_HOME="$(mktemp -d)"
VERIFY_FIXTURE="$(mktemp -d)"
trap 'rm -rf "$OFFICIAL_HOME" "$LEGACY_HOME" "$EXTERNAL_CODEX_HOME" "$BAD_CODEX_HOME" "$SYMLINK_CODEX_HOME" "$SYMLINK_TARGETS" "$TRANSACTION_CODEX_HOME" "$VERIFY_FIXTURE"' EXIT
PYTHON_BIN=python3

fail() { echo "FAIL: $*" >&2; exit 1; }
assert_link() {
  if [ ! -L "$1" ] || [ "$(readlink "$1")" != "$2" ]; then
    fail "$1 が $2 向き symlink でない"
  fi
}
seed_config() {
  mkdir -p "$1/.codex"
  cat >"$1/.codex/config.toml" <<'EOF'
model = "keep-me"

[features]
hooks = true
codex_hooks = true
EOF
  cat >"$1/.codex/hooks.json" <<'EOF'
{"hooks":{"SessionStart":[{"matcher":"stale-lattice","hooks":[{"type":"command","command":"~/.local/bin/codex-lattice-gantt-hook session-start","timeoutSec":99,"async":true}]}],"Stop":[{"hooks":[{"type":"command","command":"/custom/keep stop"}]},{"matcher":"never-match","hooks":[{"type":"command","command":"~/.local/bin/codex-callout-hook stop","async":true}]}]}}
EOF
}
apply_config() { HOME="$1" CODEX_HOME="$1/.codex" "$PYTHON_BIN" "$1/.local/bin/apply-codex-config" "$2"; }
verify() { HOME="$1" DOTAGENTS_SKIP_FACTORY_CORE=1 "$ROOT/bin/verify-install.sh" --profile "$2"; }
assert_stop_count() {
  "$PYTHON_BIN" - "$1" <<'PY'
import json
import sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
commands = [
    hook.get("command")
    for entry in data["hooks"]["Stop"]
    for hook in entry.get("hooks", [])
    if isinstance(hook, dict)
]
raise SystemExit(0 if sum(command.endswith("codex-callout-hook stop") for command in commands if isinstance(command, str)) == 1 else 1)
PY
}

seed_config "$OFFICIAL_HOME"
mkdir -p "$OFFICIAL_HOME/.claude/skills" "$OFFICIAL_HOME/.claude/commands" \
  "$OFFICIAL_HOME/.agents/skills" "$OFFICIAL_HOME/.codex/skills"
ln -s "$ROOT/claude/skills/audit-gauntlet" "$OFFICIAL_HOME/.claude/skills/audit-gauntlet"
ln -s "$ROOT/claude/commands/audit-gauntlet.md" "$OFFICIAL_HOME/.claude/commands/audit-gauntlet.md"
ln -s "$ROOT/codex/skills/audit-gauntlet" "$OFFICIAL_HOME/.agents/skills/audit-gauntlet"
ln -s "$ROOT/codex/skills/audit-gauntlet" "$OFFICIAL_HOME/.codex/skills/audit-gauntlet"
if HOME="$OFFICIAL_HOME" "$ROOT/install.sh" --profile official --profile official >/dev/null 2>&1; then
  fail 'install が重複 profile を受理した'
fi
if HOME="$OFFICIAL_HOME" "$ROOT/install.sh" --profile unknown >/dev/null 2>&1; then
  fail 'install が不正 profile を受理した'
fi
if HOME="$OFFICIAL_HOME" "$ROOT/bin/verify-install.sh" --unknown >/dev/null 2>&1; then
  fail 'verify が未知引数を受理した'
fi
HOME="$OFFICIAL_HOME" "$ROOT/install.sh" --profile official
[ ! -L "$OFFICIAL_HOME/.claude/skills/audit-gauntlet" ] || fail '廃止済みClaude skill linkを除去しない'
[ ! -L "$OFFICIAL_HOME/.claude/commands/audit-gauntlet.md" ] || fail '廃止済みClaude command linkを除去しない'
[ ! -L "$OFFICIAL_HOME/.agents/skills/audit-gauntlet" ] || fail '廃止済みofficial Codex skill linkを除去しない'
[ ! -L "$OFFICIAL_HOME/.codex/skills/audit-gauntlet" ] || fail '廃止済みlegacy Codex skill linkを除去しない'
before_config="$(cat "$OFFICIAL_HOME/.codex/config.toml")"
before_hooks="$(cat "$OFFICIAL_HOME/.codex/hooks.json")"
if apply_config "$OFFICIAL_HOME" --unknown >/dev/null 2>&1; then
  fail 'applier が未知引数を受理した'
fi
dry_run="$(apply_config "$OFFICIAL_HOME" --dry-run)"
[ -n "$dry_run" ] || fail 'dry-run が差分を出さない'
[ "$(cat "$OFFICIAL_HOME/.codex/config.toml")" = "$before_config" ] || fail 'dry-run が config を書き換えた'
[ "$(cat "$OFFICIAL_HOME/.codex/hooks.json")" = "$before_hooks" ] || fail 'dry-run が hooks を書き換えた'
[ ! -d "$OFFICIAL_HOME/Archives" ] || fail 'dry-run が backup を作った'
apply_config "$OFFICIAL_HOME" --apply
verify "$OFFICIAL_HOME" official
mkdir -p "$VERIFY_FIXTURE/bin" "$VERIFY_FIXTURE/claude/skills/orchestrate"
cp "$ROOT/bin/verify-install.sh" "$VERIFY_FIXTURE/bin/verify-install.sh"
chmod +x "$VERIFY_FIXTURE/bin/verify-install.sh"
cp "$ROOT/claude/skills/orchestrate/SKILL.md" "$VERIFY_FIXTURE/claude/skills/orchestrate/SKILL.md"
"$PYTHON_BIN" - "$VERIFY_FIXTURE/claude/skills/orchestrate/SKILL.md" <<'PY'
import sys
from pathlib import Path
path = Path(sys.argv[1])
path.write_text(path.read_text(encoding="utf-8").replace("](../../../shared/orchestrate/delegation-contract.md)", "`../../../shared/orchestrate/delegation-contract.md`"), encoding="utf-8")
PY
ln -s "$ROOT/codex" "$VERIFY_FIXTURE/codex"
ln -s "$ROOT/shared" "$VERIFY_FIXTURE/shared"
verify_fixture_output="$(HOME="$OFFICIAL_HOME" DOTAGENTS_SKIP_FACTORY_CORE=1 "$VERIFY_FIXTURE/bin/verify-install.sh" --profile official 2>&1 || true)"
# pipefail下の`printf | grep -q`はgrepの早期exitでprintfがSIGPIPEになり、マッチ成功でも
# パイプライン全体が非0になる（実被弾: 出力がpipe bufferを超えた環境で誤FAIL）。herestringで回避する。
grep -Fq 'が共有委譲契約を参照していない' <<<"$verify_fixture_output" || fail 'Claude shared delegation reference の欠落を verify が検出しない'
mkdir -p "$OFFICIAL_HOME/.claude"
cat >"$OFFICIAL_HOME/.claude/settings.json" <<'EOF'
{"hooks":{"PreToolUse":[{"hooks":[{"type":"command","command":"~/.local/bin/delegation-gate-hook","timeout":5}]}],"SessionStart":[{"hooks":[{"type":"command","command":"~/.local/bin/todo-gate-hook session-start","timeout":10}]},{"hooks":[{"type":"command","command":"~/.local/bin/orchestrate-advisory-hook","timeout":5}]},{"hooks":[{"type":"command","command":"~/.local/bin/lattice-gantt-hook session-start","timeout":6}]}],"Stop":[{"hooks":[{"type":"command","command":"~/.local/bin/todo-gate-hook stop","timeout":10}]}],"UserPromptSubmit":[{"hooks":[{"type":"command","command":"~/.local/bin/onset-gate-hook","timeout":5}]}],"PostToolUse":[{"hooks":[{"type":"command","command":"~/.local/bin/plan-gate-hook","timeout":5}]}]}}
EOF
verify "$OFFICIAL_HOME" official
"$PYTHON_BIN" - "$OFFICIAL_HOME/.claude/settings.json" <<'PY'
import json
import sys
path = sys.argv[1]
data = json.load(open(path, encoding="utf-8"))
data["hooks"]["SessionStart"][1]["hooks"][0]["unexpected"] = True
json.dump(data, open(path, "w", encoding="utf-8"))
PY
if verify "$OFFICIAL_HOME" official >/dev/null 2>&1; then fail 'Claude advisory hook の余計な field を verify が見逃した'; fi
"$PYTHON_BIN" - "$OFFICIAL_HOME/.claude/settings.json" <<'PY'
import json
import sys
path = sys.argv[1]
data = json.load(open(path, encoding="utf-8"))
del data["hooks"]["SessionStart"][1]["hooks"][0]["unexpected"]
json.dump(data, open(path, "w", encoding="utf-8"))
PY
verify "$OFFICIAL_HOME" official
"$PYTHON_BIN" - "$OFFICIAL_HOME/.claude/settings.json" <<'PY'
import json
import sys
path = sys.argv[1]
data = json.load(open(path, encoding="utf-8"))
data["hooks"]["SessionStart"].append({"hooks":[{"type":"command","command":"~/.local/bin/orchestrate-advisory-hook","timeout":5}]})
json.dump(data, open(path, "w", encoding="utf-8"))
PY
if verify "$OFFICIAL_HOME" official >/dev/null 2>&1; then fail 'Claude advisory duplicate を verify が見逃した'; fi
"$PYTHON_BIN" - "$OFFICIAL_HOME/.claude/settings.json" <<'PY'
import json
import sys
path = sys.argv[1]
data = json.load(open(path, encoding="utf-8"))
data["hooks"]["SessionStart"] = data["hooks"]["SessionStart"][:3]
data["hooks"]["SessionStart"][1]["hooks"][0]["command"] = "echo ~/.local/bin/orchestrate-advisory-hook"
json.dump(data, open(path, "w", encoding="utf-8"))
PY
if verify "$OFFICIAL_HOME" official >/dev/null 2>&1; then fail 'Claude advisory echo/stale command を verify が見逃した'; fi
"$PYTHON_BIN" - "$OFFICIAL_HOME/.claude/settings.json" "$OFFICIAL_HOME" <<'PY'
import json
import sys
from pathlib import Path
path, home = sys.argv[1:]
data = json.load(open(path, encoding="utf-8"))
hook = data["hooks"]["SessionStart"][1]["hooks"][0]
hook["command"] = str(Path(home).resolve() / ".local/bin/orchestrate-advisory-hook")
hook["timeout"] = 4
json.dump(data, open(path, "w", encoding="utf-8"))
PY
if verify "$OFFICIAL_HOME" official >/dev/null 2>&1; then fail 'Claude advisory stale timeout を verify が見逃した'; fi
"$PYTHON_BIN" - "$OFFICIAL_HOME/.claude/settings.json" "$OFFICIAL_HOME" <<'PY'
import json
import sys
from pathlib import Path
path, home = sys.argv[1:]
data = json.load(open(path, encoding="utf-8"))
hook = data["hooks"]["SessionStart"][1]["hooks"][0]
hook["command"] = str(Path(home).resolve() / ".local/bin/orchestrate-advisory-hook")
hook["timeout"] = 5
json.dump(data, open(path, "w", encoding="utf-8"))
PY
verify "$OFFICIAL_HOME" official
"$PYTHON_BIN" - "$OFFICIAL_HOME/.claude/settings.json" <<'PY'
import json
import sys
path = sys.argv[1]
data = json.load(open(path, encoding="utf-8"))
data["hooks"]["SessionStart"][2]["hooks"][0]["unexpected"] = True
json.dump(data, open(path, "w", encoding="utf-8"))
PY
if verify "$OFFICIAL_HOME" official >/dev/null 2>&1; then fail 'Claude Lattice hook の余計な field を verify が見逃した'; fi
"$PYTHON_BIN" - "$OFFICIAL_HOME/.claude/settings.json" <<'PY'
import json
import sys
path = sys.argv[1]
data = json.load(open(path, encoding="utf-8"))
del data["hooks"]["SessionStart"][2]["hooks"][0]["unexpected"]
data["hooks"]["SessionStart"].append({"hooks":[{"type":"command","command":"~/.local/bin/lattice-gantt-hook session-start","timeout":5}]})
json.dump(data, open(path, "w", encoding="utf-8"))
PY
if verify "$OFFICIAL_HOME" official >/dev/null 2>&1; then fail 'Claude Lattice hook duplicate を verify が見逃した'; fi
"$PYTHON_BIN" - "$OFFICIAL_HOME/.claude/settings.json" <<'PY'
import json
import sys
path = sys.argv[1]
data = json.load(open(path, encoding="utf-8"))
data["hooks"]["SessionStart"] = data["hooks"]["SessionStart"][:3]
data["hooks"]["SessionStart"][2]["hooks"][0]["command"] = "echo ~/.local/bin/lattice-gantt-hook session-start"
json.dump(data, open(path, "w", encoding="utf-8"))
PY
if verify "$OFFICIAL_HOME" official >/dev/null 2>&1; then fail 'Claude Lattice echo/stale command を verify が見逃した'; fi
"$PYTHON_BIN" - "$OFFICIAL_HOME/.claude/settings.json" "$OFFICIAL_HOME" <<'PY'
import json
import sys
from pathlib import Path
path, home = sys.argv[1:]
data = json.load(open(path, encoding="utf-8"))
hook = data["hooks"]["SessionStart"][2]["hooks"][0]
hook["command"] = str(Path(home).resolve() / ".local/bin/lattice-gantt-hook") + " session-start"
hook["timeout"] = 4
json.dump(data, open(path, "w", encoding="utf-8"))
PY
if verify "$OFFICIAL_HOME" official >/dev/null 2>&1; then fail 'Claude Lattice stale timeout を verify が見逃した'; fi
"$PYTHON_BIN" - "$OFFICIAL_HOME/.claude/settings.json" <<'PY'
import json
import sys
path = sys.argv[1]
data = json.load(open(path, encoding="utf-8"))
data["hooks"]["SessionStart"][2]["hooks"][0]["timeout"] = 6
json.dump(data, open(path, "w", encoding="utf-8"))
PY
verify "$OFFICIAL_HOME" official
assert_link "$OFFICIAL_HOME/.agents/skills/orchestrate" "$ROOT/codex/skills/orchestrate"
assert_link "$OFFICIAL_HOME/.agents/skills/run-observer-parent-watch" "$ROOT/codex/skills/run-observer-parent-watch"
rm "$OFFICIAL_HOME/.agents/skills/run-observer-parent-watch"
[ ! -e "$OFFICIAL_HOME/.agents/skills/run-observer-parent-watch" ] \
  || fail 'official skill rollback後もentryが残る'
HOME="$OFFICIAL_HOME" "$ROOT/install.sh" --profile official >/dev/null
assert_link "$OFFICIAL_HOME/.agents/skills/run-observer-parent-watch" "$ROOT/codex/skills/run-observer-parent-watch"
verify "$OFFICIAL_HOME" official
assert_link "$OFFICIAL_HOME/.local/bin/factory-reporter" "$ROOT/bin/factory-reporter.mjs"
assert_link "$OFFICIAL_HOME/.local/bin/factory-external-event" "$ROOT/bin/factory-external-event.mjs"
[ -x "$OFFICIAL_HOME/.local/bin/factory-external-event" ] || fail 'factory-external-event が実行可能でない'
HOME="$OFFICIAL_HOME" "$OFFICIAL_HOME/.local/bin/factory-external-event" status --json | grep -Fq '"high_watermark":0' || fail '配布factory-external-eventを直接実行できない'
assert_link "$OFFICIAL_HOME/.local/bin/factory-scan" "$ROOT/bin/factory-scan.mjs"
assert_link "$OFFICIAL_HOME/.local/bin/orchestrate-run" "$ROOT/bin/orchestrate-run.mjs"
[ -x "$OFFICIAL_HOME/.local/bin/orchestrate-run" ] || fail 'orchestrate-run が実行可能でない'
help_json="$(node "$OFFICIAL_HOME/.local/bin/orchestrate-run" --help)"
"$PYTHON_BIN" - "$help_json" <<'PY' || fail 'orchestrate-run help がrecord-only versioned contractを示さない'
import json
import sys
data = json.loads(sys.argv[1])
raise SystemExit(0 if data.get("contract_version") == "dotagents.orchestrate.control-record.v2" and data.get("mode") == "record-only" and data.get("external_execution") is False and "init" in data.get("commands", []) else 1)
PY
assert_link "$OFFICIAL_HOME/.local/bin/orchestrate-advisory-hook" "$ROOT/bin/orchestrate-advisory-hook.sh"
[ -x "$OFFICIAL_HOME/.local/bin/orchestrate-advisory-hook" ] || fail 'orchestrate-advisory-hook が実行可能でない'
assert_link "$OFFICIAL_HOME/.local/bin/lattice-gantt-hook" "$ROOT/bin/lattice-gantt-hook.sh"
assert_link "$OFFICIAL_HOME/.local/bin/codex-lattice-gantt-hook" "$ROOT/bin/codex-lattice-gantt-hook.sh"
[ -x "$OFFICIAL_HOME/.local/bin/lattice-gantt-hook" ] || fail 'lattice-gantt-hook が実行可能でない'
[ -x "$OFFICIAL_HOME/.local/bin/codex-lattice-gantt-hook" ] || fail 'codex-lattice-gantt-hook が実行可能でない'
assert_link "$OFFICIAL_HOME/.local/bin/bughub-external-probe" "$ROOT/bin/bughub-external-probe.mjs"
[ ! -e "$OFFICIAL_HOME/.codex/skills/orchestrate" ] || fail 'official が legacy skill 面を作った'
grep -Fq 'model = "keep-me"' "$OFFICIAL_HOME/.codex/config.toml" || fail '既存 config を保持しない'
grep -Fq 'hooks = true' "$OFFICIAL_HOME/.codex/config.toml" || fail '現行 hooks flag を保持しない'
if grep -Eq '^[[:space:]]*codex_hooks[[:space:]]*=' "$OFFICIAL_HOME/.codex/config.toml"; then
  fail 'deprecated codex_hooks flag を除去しない'
fi
grep -Fq '/custom/keep stop' "$OFFICIAL_HOME/.codex/hooks.json" || fail '既存 hook を保持しない'
assert_stop_count "$OFFICIAL_HOME/.codex/hooks.json" || fail '~ 表記の callout hook を重複追加した'
"$PYTHON_BIN" - "$OFFICIAL_HOME/.codex/hooks.json" "$OFFICIAL_HOME" <<'PY' || fail 'SessionStart advisory hook を正規設定しない'
import json
import shlex
import sys
from pathlib import Path
data = json.load(open(sys.argv[1], encoding="utf-8"))
path = str(Path(sys.argv[2]).resolve() / ".local/bin/orchestrate-advisory-hook")
command = shlex.join(["/bin/sh", path])
expected = {"type":"command", "command":command, "timeoutSec":5, "async":False, "statusMessage":None}
hooks = [h for e in data["hooks"]["SessionStart"] for h in e.get("hooks", []) if isinstance(h, dict) and h.get("command") == command]
raise SystemExit(0 if hooks == [expected] else 1)
PY
"$PYTHON_BIN" - "$OFFICIAL_HOME/.codex/hooks.json" "$OFFICIAL_HOME" <<'PY' || fail 'SessionStart Lattice hook を正規設定しない'
import json
import shlex
import sys
from pathlib import Path
data = json.load(open(sys.argv[1], encoding="utf-8"))
path = str(Path(sys.argv[2]).resolve() / ".local/bin/codex-lattice-gantt-hook")
command = shlex.join(["/usr/bin/env", "python3", path, "session-start"])
expected = {"type":"command", "command":command, "timeoutSec":6, "async":False, "statusMessage":None}
hooks = [h for e in data["hooks"]["SessionStart"] for h in e.get("hooks", []) if isinstance(h, dict) and "codex-lattice-gantt-hook" in h.get("command", "")]
raise SystemExit(0 if hooks == [expected] else 1)
PY
"$PYTHON_BIN" - "$OFFICIAL_HOME/.codex/hooks.json" <<'PY' || fail 'matcher group から callout hook を分離しない'
import json
import sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
entries = data["hooks"]["Stop"]
matcher_entries = [e for e in entries if e.get("matcher") == "never-match"]
standalone = [e for e in entries if set(e) == {"hooks"} and len(e["hooks"]) == 1 and e["hooks"][0].get("command", "").endswith("codex-callout-hook stop")]
raise SystemExit(0 if matcher_entries and not matcher_entries[0]["hooks"] and len(standalone) == 1 else 1)
PY
"$PYTHON_BIN" - "$OFFICIAL_HOME/.codex/hooks.json" "$OFFICIAL_HOME" <<'PY' || fail 'callout hook を正規設定へ修正しない'
import json
import shlex
import sys
from pathlib import Path
data = json.load(open(sys.argv[1], encoding="utf-8"))
hooks = [h for e in data["hooks"]["Stop"] for h in e.get("hooks", []) if isinstance(h, dict) and h.get("command", "").endswith("codex-callout-hook stop")]
hook_path = Path(sys.argv[2]).resolve() / ".local/bin/codex-callout-hook"
command = shlex.join(["/usr/bin/env", "python3", str(hook_path), "stop"])
expected = {"type":"command", "command":command, "timeoutSec":10, "async":False, "statusMessage":None}
raise SystemExit(0 if hooks == [expected] else 1)
PY
archive_count="$(find "$OFFICIAL_HOME/Archives" -name '*.tar.gz' | wc -l | tr -d ' ')"
[ "$archive_count" = 1 ] || fail 'apply の backup 数が期待と不一致'
"$PYTHON_BIN" - "$OFFICIAL_HOME/Archives" 700 <<'PY' || fail 'Archives の権限が 0700 でない'
import os
import stat
import sys
from pathlib import Path
if os.name == "nt":
    raise SystemExit(0)
raise SystemExit(0 if stat.S_IMODE(Path(sys.argv[1]).stat().st_mode) == int(sys.argv[2], 8) else 1)
PY
archive_path="$(find "$OFFICIAL_HOME/Archives" -name '*.tar.gz' | head -n1)"
"$PYTHON_BIN" - "$archive_path" 600 <<'PY' || fail 'backup archive の権限が 0600 でない'
import os
import stat
import sys
from pathlib import Path
if os.name == "nt":
    raise SystemExit(0)
raise SystemExit(0 if stat.S_IMODE(Path(sys.argv[1]).stat().st_mode) == int(sys.argv[2], 8) else 1)
PY
"$PYTHON_BIN" - "$archive_path" <<'PY' || fail 'backup member の権限が 0600 でない'
import sys
import tarfile
with tarfile.open(sys.argv[1], "r:gz") as archive:
    raise SystemExit(0 if all(member.mode == 0o600 for member in archive.getmembers()) else 1)
PY
apply_config "$OFFICIAL_HOME" --apply | grep -Fq '変更なし' || fail '2回目 apply が冪等でない'
[ "$(find "$OFFICIAL_HOME/Archives" -name '*.tar.gz' | wc -l | tr -d ' ')" = "$archive_count" ] || fail '冪等 apply が backup を作った'
cat >"$OFFICIAL_HOME/.codex/config.toml" <<'EOF'
model = "keep-me"

[features.multi_agent_v2] # keep section comment
hide_spawn_agent_metadata = true # keep metadata comment
tool_namespace = "old" # keep namespace comment
EOF
apply_config "$OFFICIAL_HOME" --apply
grep -Fq '[features.multi_agent_v2] # keep section comment' "$OFFICIAL_HOME/.codex/config.toml" || fail 'section inline comment を保持しない'
grep -Fq 'hide_spawn_agent_metadata = false # keep metadata comment' "$OFFICIAL_HOME/.codex/config.toml" || fail 'routing key inline comment を保持しない'
grep -Fq 'tool_namespace = "agents" # keep namespace comment' "$OFFICIAL_HOME/.codex/config.toml" || fail 'routing key inline comment を保持しない'
verify "$OFFICIAL_HOME" official
"$PYTHON_BIN" - "$OFFICIAL_HOME/.codex/hooks.json" "$OFFICIAL_HOME" <<'PY'
import json
import sys
from pathlib import Path
path, home_arg = sys.argv[1:]
home = Path(home_arg).resolve()
data = json.load(open(path, encoding="utf-8"))
for entry in data["hooks"]["Stop"]:
    for hook in entry.get("hooks", []):
        if hook.get("command") == "~/.local/bin/codex-callout-hook stop":
            hook["command"] = f"{home / '.local/bin/codex-callout-hook'} stop"
with open(path, "w", encoding="utf-8") as file:
    json.dump(data, file)
PY
apply_config "$OFFICIAL_HOME" --apply | grep -Fq '変更なし' || fail '絶対 path の既存 callout hook を重複回避できない'
assert_stop_count "$OFFICIAL_HOME/.codex/hooks.json" || fail '絶対 path の callout hook を重複追加した'

mkdir -p "$OFFICIAL_HOME/.codex/skills"
ln -s "$ROOT/codex/skills/orchestrate" "$OFFICIAL_HOME/.codex/skills/orchestrate"
if verify "$OFFICIAL_HOME" official; then
  fail '反対面の同名 skill 重複を verify が見逃した'
fi

mkdir -p "$EXTERNAL_CODEX_HOME"
printf '%s\n' 'model = "external"' >"$EXTERNAL_CODEX_HOME/config.toml"
printf '%s\n' '{"hooks":{}}' >"$EXTERNAL_CODEX_HOME/hooks.json"
external_output="$(HOME="$OFFICIAL_HOME" CODEX_HOME="$EXTERNAL_CODEX_HOME" "$PYTHON_BIN" "$OFFICIAL_HOME/.local/bin/apply-codex-config" --apply)"
external_archive="${external_output#*backup: }"
external_archive="${external_archive%）}"
[ -f "$external_archive" ] || fail 'HOME 外 config の backup path を出力しない'
external_archive_for_tar=$external_archive
if command -v cygpath >/dev/null 2>&1; then
  external_archive_for_tar=$(cygpath -u "$external_archive")
fi
tar -tzf "$external_archive_for_tar" | grep -Fxq 'external-codex-home/config.toml' || fail 'HOME 外 config の backup 名が安全な相対名でない'
tar -tzf "$external_archive_for_tar" | grep -Fxq 'external-codex-home/hooks.json' || fail 'HOME 外 hooks の backup 名が安全な相対名でない'
grep -Fq 'hide_spawn_agent_metadata = false' "$EXTERNAL_CODEX_HOME/config.toml" || fail 'HOME 外 CODEX_HOME の routing を適用しない'

printf '%s\n' 'model = "target"' >"$SYMLINK_TARGETS/config.toml"
printf '%s\n' '{"hooks":{}}' >"$SYMLINK_TARGETS/hooks.json"
ln -s "$SYMLINK_TARGETS/config.toml" "$SYMLINK_CODEX_HOME/config.toml"
ln -s "$SYMLINK_TARGETS/hooks.json" "$SYMLINK_CODEX_HOME/hooks.json"
symlink_config_before="$(cat "$SYMLINK_TARGETS/config.toml")"
symlink_hooks_before="$(cat "$SYMLINK_TARGETS/hooks.json")"
if HOME="$OFFICIAL_HOME" CODEX_HOME="$SYMLINK_CODEX_HOME" "$PYTHON_BIN" "$OFFICIAL_HOME/.local/bin/apply-codex-config" --apply >/dev/null 2>&1; then
  fail 'symlink config/hooks への apply を受理した'
fi
[ "$(cat "$SYMLINK_TARGETS/config.toml")" = "$symlink_config_before" ] || fail 'symlink target config を書き換えた'
[ "$(cat "$SYMLINK_TARGETS/hooks.json")" = "$symlink_hooks_before" ] || fail 'symlink target hooks を書き換えた'

printf '%s\n' 'bad = ???' >"$BAD_CODEX_HOME/config.toml"
printf '%s\n' '{"hooks":{}}' >"$BAD_CODEX_HOME/hooks.json"
bad_config_before="$(cat "$BAD_CODEX_HOME/config.toml")"
bad_hooks_before="$(cat "$BAD_CODEX_HOME/hooks.json")"
if HOME="$OFFICIAL_HOME" CODEX_HOME="$BAD_CODEX_HOME" "$PYTHON_BIN" "$OFFICIAL_HOME/.local/bin/apply-codex-config" --apply >/dev/null 2>&1; then
  fail '不正 TOML の apply を受理した'
fi
[ "$(cat "$BAD_CODEX_HOME/config.toml")" = "$bad_config_before" ] || fail '不正 TOML 時に config を書き換えた'
[ "$(cat "$BAD_CODEX_HOME/hooks.json")" = "$bad_hooks_before" ] || fail '不正 TOML 時に hooks を書き換えた'

printf '%s\n' 'model = "transaction"' >"$TRANSACTION_CODEX_HOME/config.toml"
printf '%s\n' '{"hooks":{}}' >"$TRANSACTION_CODEX_HOME/hooks.json"
transaction_config_before="$(cat "$TRANSACTION_CODEX_HOME/config.toml")"
transaction_hooks_before="$(cat "$TRANSACTION_CODEX_HOME/hooks.json")"
archive_before="$(find "$OFFICIAL_HOME/Archives" -name '*.tar.gz' | wc -l | tr -d ' ')"
if HOME="$OFFICIAL_HOME" CODEX_HOME="$TRANSACTION_CODEX_HOME" DOTAGENTS_TEST_FAIL_REPLACE=hooks.json "$PYTHON_BIN" "$OFFICIAL_HOME/.local/bin/apply-codex-config" --apply >/dev/null 2>&1; then
  fail '2本目 replace 失敗を受理した'
fi
[ "$(cat "$TRANSACTION_CODEX_HOME/config.toml")" = "$transaction_config_before" ] || fail 'transaction rollback が config を戻さない'
[ "$(cat "$TRANSACTION_CODEX_HOME/hooks.json")" = "$transaction_hooks_before" ] || fail 'transaction rollback が hooks を戻さない'
[ "$(find "$OFFICIAL_HOME/Archives" -name '*.tar.gz' | wc -l | tr -d ' ')" = "$((archive_before + 1))" ] || fail 'transaction failure の backup 数が不正'

: >"$TRANSACTION_CODEX_HOME/config.toml"
: >"$TRANSACTION_CODEX_HOME/hooks.json"
if HOME="$OFFICIAL_HOME" CODEX_HOME="$TRANSACTION_CODEX_HOME" DOTAGENTS_TEST_FAIL_REPLACE=hooks.json "$PYTHON_BIN" "$OFFICIAL_HOME/.local/bin/apply-codex-config" --apply >/dev/null 2>&1; then
  fail '空既存 file の transaction failure を受理した'
fi
if [ ! -f "$TRANSACTION_CODEX_HOME/config.toml" ] || [ -s "$TRANSACTION_CODEX_HOME/config.toml" ]; then
  fail '空既存 config を rollback で復元しない'
fi
if [ ! -f "$TRANSACTION_CODEX_HOME/hooks.json" ] || [ -s "$TRANSACTION_CODEX_HOME/hooks.json" ]; then
  fail '空既存 hooks を rollback で復元しない'
fi

seed_config "$LEGACY_HOME"
HOME="$LEGACY_HOME" "$ROOT/install.sh" --profile=legacy
apply_config "$LEGACY_HOME" --apply
verify "$LEGACY_HOME" legacy
assert_link "$LEGACY_HOME/.codex/skills/orchestrate" "$ROOT/codex/skills/orchestrate"
assert_link "$LEGACY_HOME/.codex/skills/run-observer-parent-watch" "$ROOT/codex/skills/run-observer-parent-watch"
[ ! -e "$LEGACY_HOME/.agents/skills/orchestrate" ] || fail 'legacy が official skill 面を作った'
[ ! -e "$LEGACY_HOME/.agents/skills/run-observer-parent-watch" ] \
  || fail 'legacy が official Observer parent skill 面を作った'

echo 'clean-home install: OK'
