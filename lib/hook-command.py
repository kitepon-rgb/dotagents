"""POSIX 直書きと Windows の interpreter + 引用付き絶対 path を同一 hook command として照合する。"""

from __future__ import annotations

import os
import shlex
from pathlib import Path


def hook_script(command: str, home: Path):
    try:
        parts = shlex.split(command, posix=os.name != "nt")
    except ValueError:
        return None
    if os.name == "nt":
        parts = [
            part[1:-1]
            if len(part) >= 2 and part[0] == part[-1] and part[0] in {"'", '"'}
            else part
            for part in parts
        ]
    interpreters = {
        "python.exe", "python3.exe", "python", "python3",
        "sh.exe", "bash.exe", "sh", "bash", "cmd.exe",
    }
    while parts:
        first = Path(parts[0]).name.lower()
        if first in interpreters:
            parts = parts[1:]
            continue
        if parts[0] in {"/usr/bin/env", "env"} and len(parts) > 1:
            parts = parts[2:]
            continue
        break
    if not parts:
        return None
    script = parts[0]
    if script.startswith("~/"):
        script = str(home) + script[1:]
    return Path(script).expanduser().resolve(strict=False), tuple(parts[1:])


def command_matches(command: str, required_command: str, home: Path) -> bool:
    if required_command in command:
        return True
    parsed = hook_script(command, home)
    if parsed is None:
        return False
    script, args = parsed
    tokens = required_command.split()
    name, rest = tokens[0], tuple(tokens[1:])
    if name not in {script.name, script.stem}:
        return False
    return args[: len(rest)] == rest
