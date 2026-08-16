#!/usr/bin/env python3
"""Grok config の工場所有面を差分適用する。model / login / permission は触らない。"""

from __future__ import annotations

import argparse
import difflib
import io
import os
import re
import shutil
import stat
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path


SECTION = "compat.claude"
COMPAT_FALSE_KEYS = ("agents", "hooks")
VALUE = "false"

FACTORY_SERVERS = (
    ("aiterm", {"command": "aiterm-mcp"}),
    ("caveat", {"command": "caveat", "args": ("mcp-server",)}),
    ("lattice", {"command": "lattice-mcp"}),
    ("codex-sidecar", {"command": "codex-sidecar-mcp"}),
    ("gpt_connector", {"command": "gpt-connector-mcp"}),
    ("aishell", {"command": "aishell-mcp", "env": {"AISHELL_CAPABILITY_SET": "expanded-v1"}}),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Grok の工場MCPと compat.claude.agents/hooks を差分適用する。")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--dry-run", action="store_true", help="差分を表示する（既定）")
    group.add_argument("--apply", action="store_true", help="backup 後に差分を適用する")
    return parser.parse_args()


def grok_home(home: Path) -> Path:
    raw = os.environ.get("GROK_HOME")
    if raw:
        return Path(raw).expanduser().resolve()
    return (home / ".grok").resolve()


def normalize_toml(text: str) -> str:
    body = text.replace("\r\n", "\n")
    if body and not body.endswith("\n"):
        return f"{body}\n"
    return body


def set_compat_claude_false(text: str, key: str) -> str:
    body = normalize_toml(text)
    header = re.compile(r"^[ \t]*\[compat\.claude\][ \t]*(?:#.*)?$")
    next_header = re.compile(r"^[ \t]*\[")
    key_line = re.compile(rf"^([ \t]*{re.escape(key)}[ \t]*=[ \t]*)(.*?)([ \t]*(?:#.*)?)?$")
    lines = body.splitlines(keepends=True)
    start = None
    for index, line in enumerate(lines):
        if header.match(line.rstrip("\n")):
            start = index
            break
    if start is None:
        prefix = "" if not body.strip() else "\n"
        return f"{body}{prefix}[{SECTION}]\n{key} = {VALUE}\n"
    end = len(lines)
    for index in range(start + 1, len(lines)):
        if next_header.match(lines[index]) and not header.match(lines[index].rstrip("\n")):
            end = index
            break
    for index in range(start + 1, end):
        match = key_line.match(lines[index].rstrip("\n"))
        if match is None:
            continue
        comment = match.group(3) or ""
        lines[index] = f"{match.group(1)}{VALUE}{comment}\n"
        return "".join(lines)
    insert_at = start + 1
    while insert_at < end and lines[insert_at].strip() == "":
        insert_at += 1
    lines.insert(insert_at, f"{key} = {VALUE}\n")
    return "".join(lines)


def realized_command(name: str) -> str:
    found = shutil.which(name)
    if not found:
        return name
    return str(Path(found))


def existing_command(body: str) -> str | None:
    match = re.search(r'^[ \t]*command[ \t]*=[ \t]*"([^"]+)"[ \t]*(?:#.*)?$', body, re.M)
    if match is None:
        return None
    return match.group(1)


def usable_absolute_command(command: str, name: str) -> bool:
    path = Path(command)
    return path.name == name and path.is_file() and os.access(path, os.X_OK)


def command_to_write(spec: dict, existing_body: str | None = None) -> str:
    name = spec["command"]
    realized = realized_command(name)
    if realized != name:
        return realized
    if existing_body:
        current = existing_command(existing_body)
        if current and usable_absolute_command(current, name):
            return current
    return name


def command_satisfies_contract(body: str, spec: dict) -> bool:
    current = existing_command(body)
    if current is None:
        return False
    name = spec["command"]
    if current == name:
        return shutil.which(name) is None
    return usable_absolute_command(current, name)


def mcp_env(spec: dict, command: str) -> dict[str, str]:
    env = dict(spec.get("env") or {})
    path_dirs = ["/usr/bin", "/bin", "/usr/sbin", "/sbin"]
    command_path = Path(command)
    if command_path.is_absolute():
        bindir = str(command_path.parent)
        if bindir not in path_dirs:
            path_dirs.insert(0, bindir)
    env["PATH"] = ":".join(path_dirs)
    return env


def render_mcp_section(name: str, spec: dict, existing_body: str | None = None) -> str:
    command = command_to_write(spec, existing_body)
    lines = [f"[mcp_servers.{name}]", f'command = "{command}"']
    args = spec.get("args") or ()
    if args:
        rendered = ", ".join(f'"{item}"' for item in args)
        lines.append(f"args = [{rendered}]")
    env = mcp_env(spec, command)
    if env:
        rendered = ", ".join(f'{key} = "{value}"' for key, value in env.items())
        lines.append(f"env = {{ {rendered} }}")
    lines.append("enabled = true")
    return "\n".join(lines) + "\n"


def find_table_section(text: str, header_re: re.Pattern[str]) -> tuple[int, int] | None:
    lines = text.splitlines(keepends=True)
    start = None
    for index, line in enumerate(lines):
        if header_re.match(line.rstrip("\n")):
            start = index
            break
    if start is None:
        return None
    end = len(lines)
    next_header = re.compile(r"^[ \t]*\[")
    for index in range(start + 1, len(lines)):
        if next_header.match(lines[index]):
            end = index
            break
    return start, end


def section_has_factory_contract(body: str, spec: dict) -> bool:
    if not command_satisfies_contract(body, spec):
        return False
    if re.search(r"^[ \t]*enabled[ \t]*=[ \t]*false[ \t]*(?:#.*)?$", body, re.M):
        return False
    args = spec.get("args") or ()
    if args:
        needle = ", ".join(f'"{item}"' for item in args)
        if f"[{needle}]" not in body:
            return False
    command = command_to_write(spec, body)
    for key, value in mcp_env(spec, command).items():
        if key not in body or f'"{value}"' not in body:
            return False
    return True


def upsert_factory_mcp(text: str) -> str:
    body = normalize_toml(text)
    for name, spec in FACTORY_SERVERS:
        header_re = re.compile(rf"^[ \t]*\[mcp_servers\.{re.escape(name)}\][ \t]*(?:#.*)?$")
        found = find_table_section(body, header_re)
        if found is None:
            prefix = "" if not body.strip() else "\n"
            body = f"{body}{prefix}{render_mcp_section(name, spec)}"
            continue
        start, end = found
        lines = body.splitlines(keepends=True)
        replace_end = end
        while replace_end > start + 1:
            stripped = lines[replace_end - 1].strip()
            if stripped == "" or stripped.startswith("#"):
                replace_end -= 1
                continue
            break
        existing = "".join(lines[start:replace_end])
        if section_has_factory_contract(existing, spec):
            continue
        body = "".join(lines[:start]) + render_mcp_section(name, spec, existing) + "".join(lines[replace_end:])
    return normalize_toml(body)


def propose(text: str) -> str:
    body = text
    for key in COMPAT_FALSE_KEYS:
        body = set_compat_claude_false(body, key)
    return upsert_factory_mcp(body)


def show_diff(path: Path, before: str, after: str) -> str:
    return "".join(
        difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile=str(path),
            tofile=str(path),
        )
    )


def backup(home: Path, path: Path, original: str, existed: bool) -> Path:
    directory = home / "Archives"
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(directory, 0o700)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    archive = directory / f"dotagents-grok-config-{stamp}.tar.gz"
    suffix = 1
    while archive.exists():
        archive = directory / f"dotagents-grok-config-{stamp}-{suffix}.tar.gz"
        suffix += 1
    with tarfile.open(archive, "w:gz") as tar:
        if existed:
            try:
                name = str(path.relative_to(home))
            except ValueError:
                name = path.name
            info = tarfile.TarInfo(name)
            encoded = original.encode("utf-8")
            info.size = len(encoded)
            info.mode = 0o600
            tar.addfile(info, io.BytesIO(encoded))
    os.chmod(archive, 0o600)
    return archive


def apply(path: Path, content: str, original: str, existed: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    mode = stat.S_IMODE(path.stat().st_mode) if existed else 0o600
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            file.write(content)
            file.flush()
            os.fsync(file.fileno())
        os.chmod(temporary, mode)
        if os.environ.get("DOTAGENTS_TEST_FAIL_REPLACE") == path.name:
            raise OSError(f"test injection: {path.name} replace failure")
        os.replace(temporary, path)
    except BaseException as exc:
        if existed and path.exists() and path.read_text(encoding="utf-8") != original:
            rollback = tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False)
            try:
                rollback.write(original)
                rollback.flush()
                os.fsync(rollback.fileno())
                rollback.close()
                os.chmod(rollback.name, mode)
                os.replace(rollback.name, path)
            finally:
                Path(rollback.name).unlink(missing_ok=True)
        raise OSError(f"適用失敗、rollback 済み: {exc}") from exc
    finally:
        Path(temporary).unlink(missing_ok=True)


def main() -> int:
    args = parse_args()
    home = Path(os.environ.get("HOME", str(Path.home()))).expanduser().resolve()
    path = grok_home(home) / "config.toml"
    if path.is_symlink():
        raise ValueError("config.toml は symlink では適用できません")
    existed = path.exists()
    original = path.read_text(encoding="utf-8") if existed else ""
    proposed = propose(original)
    if proposed == normalize_toml(original):
        print("apply-grok-config: 変更なし")
        return 0
    if not args.apply:
        print(show_diff(path, original, proposed), end="")
        return 0
    archive = backup(home, path, original, existed)
    apply(path, proposed, original, existed)
    print(f"apply-grok-config: 適用完了（backup: {archive}）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
