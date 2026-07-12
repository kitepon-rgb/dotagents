#!/usr/bin/env python3
"""Codex routing と dotagents callout hook だけを安全に適用する。"""

import argparse
import copy
import difflib
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path


ROUTING_SECTION = "features.multi_agent_v2"
ROUTING_VALUES = {
    "hide_spawn_agent_metadata": "false",
    "tool_namespace": '"agents"',
}
HOOKS = {
    "SessionStart": ("session-start", 10),
    "PreToolUse": ("pre-tool-use", 5),
    "UserPromptSubmit": ("user-prompt-submit", 5),
    "Stop": ("stop", 10),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Codex routing と dotagents hook だけを差分適用する。"
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--dry-run", action="store_true", help="差分を表示する（既定）")
    group.add_argument("--apply", action="store_true", help="backup 後に差分を適用する")
    return parser.parse_args()


def validate_toml(text: str, path: Path) -> None:
    """Codex 本体の TOML parser で全体を検証する。"""
    codex = shutil.which("codex")
    if not codex:
        raise ValueError("codex CLI 不在のため TOML を完全検証できません")
    with tempfile.TemporaryDirectory(prefix="dotagents-toml-") as directory:
        config = Path(directory) / "config.toml"
        config.write_text(text, encoding="utf-8")
        try:
            result = subprocess.run(
                [codex, "debug", "prompt-input"],
                env={**os.environ, "HOME": directory, "CODEX_HOME": directory},
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
                timeout=10,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise ValueError(f"{path}: Codex TOML parser が timeout") from exc
    if result.returncode != 0:
        detail = result.stderr.strip() or f"exit {result.returncode}"
        raise ValueError(f"{path}: TOML パース失敗: {detail}")


def update_routing(text: str) -> str:
    header = f"[{ROUTING_SECTION}]"
    header_match = re.search(rf"(?m)^{re.escape(header)}(?:[ \t]+#.*)?[ \t]*$", text)
    if not header_match:
        suffix = "" if not text or text.endswith("\n") else "\n"
        return text + suffix + f"{header}\n" + "\n".join(
            f"{key} = {value}" for key, value in ROUTING_VALUES.items()
        ) + "\n"

    start = header_match.end()
    next_header = re.search(r"(?m)^\[", text[start:])
    end = start + next_header.start() if next_header else len(text)
    section = text[start:end]
    for key, value in ROUTING_VALUES.items():
        pattern = re.compile(rf"(?m)^(\s*{re.escape(key)}\s*=\s*)(.*?)(\s+#.*)?$")
        match = pattern.search(section)
        if match:
            section = section[: match.start()] + f"{match.group(1)}{value}{match.group(3) or ''}" + section[match.end() :]
        else:
            prefix = "" if not section or section.endswith("\n") else "\n"
            section += f"{prefix}{key} = {value}\n"
    return text[:start] + section + text[end:]


def load_hooks(text: str, path: Path) -> dict:
    if not text:
        return {"hooks": {}}
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{path}: JSON パース失敗: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("hooks", {}), dict):
        raise ValueError(f"{path}: top-level hooks object が必要")
    if "hooks" not in data:
        data["hooks"] = {}
    return data


def is_callout_command(command: object, hook_path: Path, subcommand: str, home: Path) -> bool:
    if not isinstance(command, str):
        return False
    try:
        parts = shlex.split(command)
    except ValueError:
        return False
    if len(parts) != 2 or parts[1] != subcommand:
        return False
    executable = parts[0]
    if executable == "~" or executable.startswith("~/"):
        executable = str(home) + executable[1:]
    return Path(executable).expanduser().resolve(strict=False) == hook_path.expanduser().resolve(strict=False)


def update_hooks(data: dict, home: Path) -> dict:
    hook_path = home / ".local/bin/codex-callout-hook"
    for event, (subcommand, timeout) in HOOKS.items():
        entries = data["hooks"].setdefault(event, [])
        if not isinstance(entries, list):
            raise ValueError(f"hooks.{event} は配列である必要がある")
        canonical = {
            "type": "command",
            "command": f"{hook_path} {subcommand}",
            "timeoutSec": timeout,
            "async": False,
            "statusMessage": None,
        }
        normalized = []
        for entry in entries:
            if not isinstance(entry, dict) or not isinstance(entry.get("hooks"), list):
                normalized.append(entry)
                continue
            hooks = []
            for hook in entry["hooks"]:
                if isinstance(hook, dict) and is_callout_command(hook.get("command"), hook_path, subcommand, home):
                    continue
                hooks.append(hook)
            if hooks:
                copied = dict(entry)
                copied["hooks"] = hooks
                normalized.append(copied)
            elif set(entry) != {"hooks"}:
                copied = dict(entry)
                copied["hooks"] = []
                normalized.append(copied)
        normalized.append({"hooks": [canonical]})
        data["hooks"][event] = normalized
    return data


def render_hooks(data: dict) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def diff(path: Path, before: str, after: str) -> str:
    return "".join(
        difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile=str(path),
            tofile=str(path),
        )
    )


def backup(home: Path, originals: dict[Path, str]) -> Path:
    archive_dir = home / "Archives"
    archive_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(archive_dir, 0o700)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    archive = archive_dir / f"dotagents-codex-config-{stamp}.tar.gz"
    suffix = 1
    while archive.exists():
        archive = archive_dir / f"dotagents-codex-config-{stamp}-{suffix}.tar.gz"
        suffix += 1
    with tarfile.open(archive, "w:gz") as tar:
        for path, content in originals.items():
            if path.exists():
                try:
                    member_name = str(path.relative_to(home))
                except ValueError:
                    member_name = f"external-codex-home/{path.name}"
                info = tarfile.TarInfo(member_name)
                encoded = content.encode("utf-8")
                info.size = len(encoded)
                info.mode = 0o600
                tar.addfile(info, fileobj=__import__("io").BytesIO(encoded))
    os.chmod(archive, 0o600)
    return archive


def prepare_write(path: Path, text: str) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            file.write(text)
            file.flush()
            os.fsync(file.fileno())
        return temporary
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def apply_transaction(changed: dict[Path, str], originals: dict[Path, str], existed: dict[Path, bool]) -> None:
    prepared = {}
    replaced = []
    try:
        for path, text in changed.items():
            prepared[path] = prepare_write(path, text)
        for path in changed:
            if os.environ.get("DOTAGENTS_TEST_FAIL_REPLACE") == path.name:
                raise OSError(f"test injection: {path.name} replace failure")
            os.replace(prepared[path], path)
            replaced.append(path)
    except BaseException as exc:
        rollback_errors = []
        for path in reversed(replaced):
            try:
                if existed[path]:
                    os.replace(prepare_write(path, originals[path]), path)
                else:
                    path.unlink(missing_ok=True)
            except BaseException as rollback_exc:
                rollback_errors.append(f"{path}: {rollback_exc}")
        if rollback_errors:
            raise OSError(f"適用失敗: {exc}; rollback 失敗: {'; '.join(rollback_errors)}") from exc
        raise OSError(f"適用失敗、rollback 済み: {exc}") from exc
    finally:
        for temporary in prepared.values():
            try:
                os.unlink(temporary)
            except FileNotFoundError:
                pass


def main() -> int:
    args = parse_args()
    home = Path(os.environ.get("HOME", str(Path.home()))).expanduser().resolve()
    codex_home = Path(os.environ.get("CODEX_HOME", home / ".codex")).expanduser()
    config_path = codex_home / "config.toml"
    hooks_path = codex_home / "hooks.json"
    if config_path.is_symlink() or hooks_path.is_symlink():
        raise ValueError("config.toml と hooks.json は symlink では適用できません")
    existed = {config_path: config_path.exists(), hooks_path: hooks_path.exists()}
    originals = {
        config_path: config_path.read_text(encoding="utf-8") if existed[config_path] else "",
        hooks_path: hooks_path.read_text(encoding="utf-8") if existed[hooks_path] else "",
    }

    validate_toml(originals[config_path], config_path)
    hooks = load_hooks(originals[hooks_path], hooks_path)
    original_hooks = copy.deepcopy(hooks)
    updated_hooks = update_hooks(hooks, home)
    proposed = {
        config_path: update_routing(originals[config_path]),
        hooks_path: originals[hooks_path] if updated_hooks == original_hooks else render_hooks(updated_hooks),
    }
    validate_toml(proposed[config_path], config_path)
    load_hooks(proposed[hooks_path], hooks_path)
    changed = {path: text for path, text in proposed.items() if text != originals[path]}

    if not args.apply:
        for path in (config_path, hooks_path):
            if path in changed:
                sys.stdout.write(diff(path, originals[path], changed[path]))
        return 0
    if not changed:
        print("apply-codex-config: 変更なし")
        return 0

    archive = backup(home, originals)
    apply_transaction(changed, originals, existed)
    print(f"apply-codex-config: 適用完了（backup: {archive}）")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
