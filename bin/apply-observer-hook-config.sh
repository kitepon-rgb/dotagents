#!/usr/bin/env python3
"""Observerが生成するparent Stop fragmentをClaude/Codexへ安全に適用する。"""

import argparse
import copy
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path


SCHEMA = "observer.parent_stop_hook_fragment.v1"


def parse_args():
    parser = argparse.ArgumentParser(description="Observer parent Stop hookを二設定へtransaction適用する。")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="差分を表示する（既定）")
    mode.add_argument("--apply", action="store_true", help="backup後に適用する")
    parser.add_argument("--observer-hook", required=True, help="absolute observer-parent-stop-hook executable path")
    return parser.parse_args()


def load_json(text, path):
    if not text:
        return {}
    try:
        value = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{path}: JSON パース失敗: {exc}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"{path}: top-level object が必要")
    return value


def observer_command():
    configured = os.environ.get("OBSERVER_HOOK_CONFIG_BIN", "observer-hook-config")
    executable = shutil.which(configured)
    if not executable:
        raise ValueError("observer-hook-config CLI が見つかりません")
    return executable


def run_observer(arguments, *, candidate=None):
    try:
        result = subprocess.run(
            [observer_command(), *arguments],
            input=None if candidate is None else json.dumps(candidate),
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError as exc:
        raise ValueError(f"observer-hook-config CLI を実行できません: {exc}") from exc
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or f"exit {result.returncode}"
        raise ValueError(f"observer-hook-config CLI 失敗: {detail}")
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise ValueError("observer-hook-config CLI のJSON出力が不正です") from exc


def fragment(provider, executable):
    value = run_observer(["fragment", "--provider", provider, "--executable", executable])
    if not isinstance(value, dict) or value.get("schema") != SCHEMA or value.get("provider") != provider or value.get("event") != "Stop" or not isinstance(value.get("entry"), dict):
        raise ValueError(f"observer-hook-config {provider} fragment schema が不正です")
    return value


def fragment_command(provider, value):
    entry = value["entry"]
    if provider == "claude":
        hooks = entry.get("hooks")
        if not isinstance(hooks, list) or len(hooks) != 1 or not isinstance(hooks[0], dict) or not isinstance(hooks[0].get("command"), str):
            raise ValueError("observer-hook-config Claude fragment entry が不正です")
        return hooks[0]["command"]
    if not isinstance(entry.get("command"), str):
        raise ValueError("observer-hook-config Codex fragment entry が不正です")
    return entry["command"]


def stop_entries(config, path):
    hooks = config.setdefault("hooks", {})
    if not isinstance(hooks, dict):
        raise ValueError(f"{path}: hooks object が必要")
    entries = hooks.setdefault("Stop", [])
    if not isinstance(entries, list):
        raise ValueError(f"{path}: hooks.Stop は配列である必要があります")
    return entries


def normalize(provider, config, path, item):
    entries = stop_entries(config, path)
    command = fragment_command(provider, item)
    if provider == "claude":
        normalized = []
        for entry in entries:
            if not isinstance(entry, dict) or not isinstance(entry.get("hooks"), list):
                normalized.append(entry)
                continue
            hooks = [hook for hook in entry["hooks"] if not (isinstance(hook, dict) and hook.get("command") == command)]
            if hooks:
                copied = dict(entry)
                copied["hooks"] = hooks
                normalized.append(copied)
            elif set(entry) != {"hooks"}:
                copied = dict(entry)
                copied["hooks"] = []
                normalized.append(copied)
        normalized.append(copy.deepcopy(item["entry"]))
        config["hooks"]["Stop"] = normalized
    else:
        config["hooks"]["Stop"] = [entry for entry in entries if not (isinstance(entry, dict) and entry.get("command") == command)] + [copy.deepcopy(item["entry"])]
    return config


def verify(provider, executable, candidate):
    value = run_observer(["verify", "--provider", provider, "--executable", executable], candidate=candidate)
    if not isinstance(value, dict) or value.get("schema") != "observer.parent_stop_hook_verification.v1" or value.get("provider") != provider or value.get("event") != "Stop" or value.get("status") != "canonical" or value.get("target_count") != 1:
        raise ValueError(f"observer-hook-config {provider} verifier がcanonicalを返しません")


def render(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def backup(home, originals, existed):
    directory = home / "Archives"
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(directory, 0o700)
    stamp = os.environ.get("DOTAGENTS_TEST_BACKUP_STAMP") or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    archive = directory / f"dotagents-observer-hook-config-{stamp}.tar.gz"
    for suffix in range(1, 1000):
        if not archive.exists():
            break
        archive = directory / f"dotagents-observer-hook-config-{stamp}-{suffix}.tar.gz"
    else:
        raise OSError("Observer hook backup名の連番上限を超えました")
    with tarfile.open(archive, "w:gz") as tar:
        for path, content in originals.items():
            if not existed[path]:
                continue
            try:
                member_name = str(path.relative_to(home))
            except ValueError:
                member_name = f"external-codex-home/{path.name}"
            info = tarfile.TarInfo(member_name)
            encoded = content.encode("utf-8")
            info.size, info.mode = len(encoded), 0o600
            tar.addfile(info, io.BytesIO(encoded))
    os.chmod(archive, 0o600)
    return archive


def prepare(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent, text=True)
    with os.fdopen(descriptor, "w", encoding="utf-8") as file:
        file.write(content)
        file.flush()
        os.fsync(file.fileno())
    return temporary


def transaction(changed, originals, existed):
    prepared, replaced = {}, []
    try:
        for path, content in changed.items():
            prepared[path] = prepare(path, content)
        for path in changed:
            if os.environ.get("DOTAGENTS_TEST_FAIL_REPLACE") == path.name:
                raise OSError(f"test injection: {path.name}")
            os.replace(prepared[path], path)
            replaced.append(path)
    except BaseException as exc:
        errors = []
        for path in reversed(replaced):
            try:
                if existed[path]:
                    os.replace(prepare(path, originals[path]), path)
                else:
                    path.unlink(missing_ok=True)
            except BaseException as rollback:
                errors.append(str(rollback))
        suffix = f"; rollback失敗: {'; '.join(errors)}" if errors else "; rollback済み"
        raise OSError(f"適用失敗: {exc}{suffix}") from exc
    finally:
        for temporary in prepared.values():
            Path(temporary).unlink(missing_ok=True)


def main():
    args = parse_args()
    executable = Path(args.observer_hook)
    if not executable.is_absolute():
        raise ValueError("--observer-hook はabsolute pathが必要です")
    home = Path(os.environ.get("HOME", str(Path.home()))).expanduser().resolve()
    codex_home = Path(os.environ.get("CODEX_HOME", home / ".codex")).expanduser()
    paths = {"claude": home / ".claude" / "settings.json", "codex": codex_home / "hooks.json"}
    directories = (home / ".claude", codex_home)
    if any(directory.is_symlink() for directory in directories):
        raise ValueError("Claude settings directory と Codex hooks directory はsymlinkでは適用できません")
    if any(path.is_symlink() for path in paths.values()):
        raise ValueError("Claude settings.json と Codex hooks.json はsymlinkでは適用できません")
    existed = {path: path.exists() for path in paths.values()}
    originals = {path: path.read_text(encoding="utf-8") if existed[path] else "" for path in paths.values()}
    proposed = {}
    for provider, path in paths.items():
        item = fragment(provider, str(executable))
        config = normalize(provider, load_json(originals[path], path), path, item)
        verify(provider, str(executable), config)
        proposed[path] = render(config)
    changed = {path: content for path, content in proposed.items() if content != originals[path]}
    if not args.apply:
        for provider, path in paths.items():
            state = "yes" if path in changed else "no"
            print(f"apply-observer-hook-config: dry-run provider={provider} path={path} changed={state}")
        return
    if not changed:
        print("apply-observer-hook-config: 変更なし")
        return
    archive = backup(home, originals, existed)
    transaction(changed, originals, existed)
    print(f"apply-observer-hook-config: 適用完了（backup: {archive}）")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
