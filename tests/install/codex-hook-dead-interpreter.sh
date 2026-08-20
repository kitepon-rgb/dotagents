#!/usr/bin/env bash
# 死んだ Python interpreter の git-destroy-gate を同一 hook として畳む。
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PYTHONIOENCODING=utf-8

python3 - "$ROOT/bin/apply-codex-config.sh" <<'PY'
import sys
from pathlib import Path

source = Path(sys.argv[1]).read_text(encoding="utf-8")
ns = {"__name__": "apply_codex", "__file__": sys.argv[1]}
exec(compile(source, sys.argv[1], "exec"), ns)

home = Path.home()
hook = home / ".local/bin/codex-git-destroy-gate-hook"
dead = (
    r'& "C:\Program Files\Python313\python.exe" '
    r'"' + str(hook) + r'"'
)
live = ns["python_hook_command"](hook)
assert ns["is_python_hook_command"](dead, hook, home), "死んだ interpreter を同一 hook と見なさない"
assert ns["is_python_hook_command"](live, hook, home), "現行 interpreter を同一 hook と見なさない"
assert not ns["is_python_hook_command"](dead, home / ".local/bin/codex-callout-hook", home)
print("codex hook dead interpreter matching")
PY
