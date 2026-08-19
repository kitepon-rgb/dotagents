#!/usr/bin/env bash
# Windows の interpreter + 引用付き絶対 path を factory hook の正規 command として受理する。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PYTHONIOENCODING=utf-8

python3 - "$ROOT/lib/hook-command.py" "$ROOT/bin/verify-install.sh" <<'PY'
import importlib.util
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location("hook_command", sys.argv[1])
hook_command = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook_command)
command_matches = hook_command.command_matches

verifier = Path(sys.argv[2]).read_text(encoding="utf-8")
if "required_command in command" in verifier:
    raise SystemExit("verify-install.sh が Windows 引用 command を substring 照合のまま残している")
if verifier.count("command_matches(command, required_command, home)") < 2:
    raise SystemExit("verify-install.sh が Grok/Claude の command_matches を使っていない")

home = Path(r"C:\Users\kite_")
quoted = (
    r'"C:\Users\kite_\AppData\Local\Programs\Python\Python312\python.exe" '
    r'"C:\Users\kite_\.local\bin\grok-todo-gate-hook" "session-start"'
)
posix = "~/.local/bin/grok-todo-gate-hook session-start"
claude = (
    r'"C:\Users\kite_\AppData\Local\Programs\Python\Python312\python3.exe" '
    r'"C:\Users\kite_\.local\bin\todo-gate-hook" "session-start"'
)
assert command_matches(posix, "grok-todo-gate-hook session-start", home)
assert command_matches(quoted, "grok-todo-gate-hook session-start", home)
assert command_matches(quoted.replace("session-start", "stop"), "grok-todo-gate-hook stop", home)
assert command_matches(
    r'"C:\Users\kite_\AppData\Local\Programs\Python\Python312\python.exe" '
    r'"C:\Users\kite_\.local\bin\grok-git-destroy-gate-hook"',
    "grok-git-destroy-gate-hook",
    home,
)
assert command_matches(claude, "todo-gate-hook session-start", home)
assert not command_matches(quoted, "todo-gate-hook session-start", home)
assert not command_matches(quoted, "grok-todo-gate-hook stop", home)
assert not command_matches(claude, "grok-todo-gate-hook session-start", home)
print("quoted hook command matching")
PY
