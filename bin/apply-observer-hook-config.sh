#!/usr/bin/env python3
"""Observerが生成するparent Stop fragmentをClaude/Codexへ安全に適用する。"""

import argparse
import copy
import io
import json
import os
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path


SCHEMA = "observer.parent_stop_hook_fragment.v1"
BACKUP_SCHEMA = "dotagents.observer_hook_config_backup.v1"
BACKUP_MANIFEST = "observer-hook-backup.json"
WINDOWS = os.name == "nt"


def current_uid():
    return None if WINDOWS else os.geteuid()


def current_gid():
    return None if WINDOWS else os.getegid()


def owned_by_current_user(info):
    return WINDOWS or info.st_uid == current_uid()


def private_mode(mode):
    return WINDOWS or not stat.S_IMODE(mode) & 0o077


def parse_args():
    parser = argparse.ArgumentParser(description="Observer parent Stop hookを二設定へtransaction適用する。")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="差分を表示する（既定）")
    mode.add_argument("--apply", action="store_true", help="backup後に適用する")
    mode.add_argument("--restore", metavar="ARCHIVE", help="検証済みbackupを原子的に復元する")
    parser.add_argument("--observer-hook", help="absolute observer-parent-stop-hook executable path")
    parser.add_argument("--state-root", help="absolute Observer private state root bound into both hooks")
    args = parser.parse_args()
    if args.restore is None and (args.observer_hook is None or args.state_root is None):
        parser.error("--observer-hook と --state-root が必要です")
    if args.restore is not None and (args.observer_hook is not None or args.state_root is not None):
        parser.error("--restore と --observer-hook/--state-root は同時指定できません")
    return args


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


def fragment(provider, executable, state_root):
    value = run_observer(["fragment", "--provider", provider, "--executable", executable, "--state-root", state_root])
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


def is_target_command(command, provider, executable):
    prefix = f"{executable} --provider {provider}"
    return isinstance(command, str) and (command == prefix or command.startswith(f"{prefix} --state-root "))


def stop_entries(config, path):
    hooks = config.setdefault("hooks", {})
    if not isinstance(hooks, dict):
        raise ValueError(f"{path}: hooks object が必要")
    entries = hooks.setdefault("Stop", [])
    if not isinstance(entries, list):
        raise ValueError(f"{path}: hooks.Stop は配列である必要があります")
    return entries


def normalize(provider, config, path, item, executable):
    entries = stop_entries(config, path)
    command = fragment_command(provider, item)
    if provider == "claude":
        normalized = []
        for entry in entries:
            if not isinstance(entry, dict) or not isinstance(entry.get("hooks"), list):
                normalized.append(entry)
                continue
            hooks = [hook for hook in entry["hooks"] if not (isinstance(hook, dict) and is_target_command(hook.get("command"), provider, executable))]
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
        config["hooks"]["Stop"] = [entry for entry in entries if not (isinstance(entry, dict) and is_target_command(entry.get("command"), provider, executable))] + [copy.deepcopy(item["entry"])]
    return config


def verify(provider, executable, state_root, candidate):
    value = run_observer(["verify", "--provider", provider, "--executable", executable, "--state-root", state_root], candidate=candidate)
    if not isinstance(value, dict) or value.get("schema") != "observer.parent_stop_hook_verification.v1" or value.get("provider") != provider or value.get("event") != "Stop" or value.get("status") != "canonical" or value.get("target_count") != 1:
        raise ValueError(f"observer-hook-config {provider} verifier がcanonicalを返しません")


def render(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def backup_member(home, path):
    try:
        return str(path.relative_to(home))
    except ValueError:
        return f"external-codex-home/{path.name}"


def file_metadata(path):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
        raise ValueError(f"{path}: regular fileが必要です")
    return {"mode": stat.S_IMODE(info.st_mode), "uid": info.st_uid, "gid": info.st_gid}


def validate_file_metadata(value, label):
    allowed_groups = set() if WINDOWS else set(os.getgroups()) | {os.getegid()}
    if (not WINDOWS and (value["uid"] != current_uid() or value["gid"] not in allowed_groups)) \
            or value["mode"] < 0 or value["mode"] > 0o777 or (not WINDOWS and value["mode"] & 0o133):
        raise ValueError(f"{label}: modeまたはownerが安全条件を満たしません")


def snapshot(paths):
    existed = {path: path.exists() for path in paths.values()}
    metadata = {path: file_metadata(path) if existed[path] else None for path in paths.values()}
    for path, value in metadata.items():
        if value is not None:
            validate_file_metadata(value, path)
    originals = {path: path.read_text(encoding="utf-8") if existed[path] else "" for path in paths.values()}
    return originals, existed, metadata


def ensure_unchanged(paths, originals, existed, metadata):
    current = snapshot(paths)
    if current != (originals, existed, metadata):
        raise OSError("Observer hook configがtransaction準備中に変更されました")


def backup(home, paths, originals, existed, metadata):
    directory = home / "Archives"
    if directory.exists():
        info = directory.lstat()
        if not stat.S_ISDIR(info.st_mode) or not owned_by_current_user(info):
            raise ValueError("Archives directoryのownerまたはtypeが不正です")
    else:
        directory.mkdir(parents=True, mode=0o700)
    os.chmod(directory, 0o700)
    stamp = os.environ.get("DOTAGENTS_TEST_BACKUP_STAMP") or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    descriptor = None
    for suffix in range(0, 1000):
        ending = "" if suffix == 0 else f"-{suffix}"
        archive = directory / f"dotagents-observer-hook-config-{stamp}{ending}.tar.gz"
        try:
            descriptor = os.open(archive, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
            break
        except FileExistsError:
            continue
    else:
        raise OSError("Observer hook backup名の連番上限を超えました")
    entries = []
    for provider, path in paths.items():
        current = metadata[path]
        entries.append({
            "provider": provider,
            "member": backup_member(home, path),
            "existed": existed[path],
            "mode": current["mode"] if current else None,
            "uid": current["uid"] if current else None,
            "gid": current["gid"] if current else None,
        })
    manifest = json.dumps({"schema": BACKUP_SCHEMA, "entries": entries}, ensure_ascii=False, separators=(",", ":")) + "\n"
    try:
        with os.fdopen(descriptor, "wb") as archive_file:
            descriptor = None
            with tarfile.open(fileobj=archive_file, mode="w:gz") as tar:
                encoded_manifest = manifest.encode("utf-8")
                manifest_info = tarfile.TarInfo(BACKUP_MANIFEST)
                manifest_info.size, manifest_info.mode = len(encoded_manifest), 0o600
                tar.addfile(manifest_info, io.BytesIO(encoded_manifest))
                for provider, path in paths.items():
                    if not existed[path]:
                        continue
                    info = tarfile.TarInfo(backup_member(home, path))
                    encoded = originals[path].encode("utf-8")
                    info.size, info.mode = len(encoded), metadata[path]["mode"]
                    tar.addfile(info, io.BytesIO(encoded))
    except BaseException:
        if descriptor is not None:
            os.close(descriptor)
        archive.unlink(missing_ok=True)
        raise
    return archive


def prepare(path, content, metadata):
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent, text=True)
    with os.fdopen(descriptor, "w", encoding="utf-8") as file:
        file.write(content)
        file.flush()
        os.fsync(file.fileno())
        if not WINDOWS:
            os.fchmod(file.fileno(), metadata["mode"])
            os.fchown(file.fileno(), metadata["uid"], metadata["gid"])
    return temporary


def verify_desired(desired):
    for path, value in desired.items():
        if value is None:
            if path.exists():
                raise OSError(f"{path.name}: absent状態を復元できません")
            continue
        if path.read_text(encoding="utf-8") != value["content"]:
            raise OSError(f"{path.name}: 内容を復元できません")
        actual = file_metadata(path)
        expected = {key: value[key] for key in ("mode", "uid", "gid")}
        if not WINDOWS and actual != expected:
            raise OSError(f"{path.name}: modeまたはownerを復元できません")


def transaction(desired, originals, existed, metadata):
    prepared, replaced = {}, []
    try:
        for path, value in desired.items():
            if value is not None:
                prepared[path] = prepare(path, value["content"], value)
        for path, value in desired.items():
            if os.environ.get("DOTAGENTS_TEST_FAIL_REPLACE") == path.name:
                raise OSError(f"test injection: {path.name}")
            if value is None:
                path.unlink(missing_ok=True)
            else:
                os.replace(prepared[path], path)
            replaced.append(path)
        verify_desired(desired)
    except BaseException as exc:
        errors = []
        for path in reversed(replaced):
            try:
                if existed[path]:
                    os.replace(prepare(path, originals[path], metadata[path]), path)
                else:
                    path.unlink(missing_ok=True)
            except BaseException as rollback:
                errors.append(str(rollback))
        suffix = f"; rollback失敗: {'; '.join(errors)}" if errors else "; rollback済み"
        raise OSError(f"適用失敗: {exc}{suffix}") from exc
    finally:
        for temporary in prepared.values():
            Path(temporary).unlink(missing_ok=True)


def validate_restore_metadata(entry):
    exact = {"provider", "member", "existed", "mode", "uid", "gid"}
    if not isinstance(entry, dict) or set(entry) != exact or entry.get("provider") not in {"claude", "codex"} \
            or not isinstance(entry.get("member"), str) or not isinstance(entry.get("existed"), bool):
        raise ValueError("backup manifest entryが不正です")
    if not entry["existed"]:
        if any(entry[key] is not None for key in ("mode", "uid", "gid")):
            raise ValueError("backup absent metadataが不正です")
        return
    if not all(isinstance(entry[key], int) for key in ("mode", "uid", "gid")):
        raise ValueError("backup file metadataが不正です")
    validate_file_metadata(entry, "backup")


def read_backup(archive, home, paths):
    archive_directory = home / "Archives"
    if not archive.is_absolute() or archive.is_symlink():
        raise ValueError("--restore はabsolute regular archiveが必要です")
    archive = archive.resolve(strict=True)
    if archive.parent != archive_directory or not archive.name.startswith("dotagents-observer-hook-config-") \
            or not archive.name.endswith(".tar.gz"):
        raise ValueError("--restore はabsolute regular archiveが必要です")
    directory_info = archive_directory.lstat()
    if not stat.S_ISDIR(directory_info.st_mode) or not owned_by_current_user(directory_info) \
            or not private_mode(directory_info.st_mode):
        raise ValueError("restore archive directoryのownerまたはmodeが不正です")
    descriptor = os.open(archive, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    info = os.fstat(descriptor)
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or not owned_by_current_user(info) \
            or not private_mode(info.st_mode):
        os.close(descriptor)
        raise ValueError("restore archiveのownerまたはmodeが不正です")
    try:
        with os.fdopen(descriptor, "rb") as archive_file:
            descriptor = None
            with tarfile.open(fileobj=archive_file, mode="r:gz") as tar:
                members = tar.getmembers()
                if len(members) > 3 or any(not member.isfile() or member.size > 10 * 1024 * 1024 for member in members):
                    raise ValueError("restore archive memberが不正です")
                indexed = {member.name: member for member in members}
                if len(indexed) != len(members) or BACKUP_MANIFEST not in indexed:
                    raise ValueError("restore archive manifestが不正です")
                manifest_file = tar.extractfile(indexed[BACKUP_MANIFEST])
                if manifest_file is None:
                    raise ValueError("restore archive manifestを読めません")
                manifest = json.loads(manifest_file.read().decode("utf-8"))
                if not isinstance(manifest, dict) or set(manifest) != {"schema", "entries"} \
                        or manifest.get("schema") != BACKUP_SCHEMA or not isinstance(manifest.get("entries"), list) \
                        or len(manifest["entries"]) != 2:
                    raise ValueError("restore archive manifest schemaが不正です")
                by_provider = {}
                desired = {}
                expected_members = {BACKUP_MANIFEST}
                for entry in manifest["entries"]:
                    validate_restore_metadata(entry)
                    provider = entry["provider"]
                    if provider in by_provider or entry["member"] != backup_member(home, paths[provider]):
                        raise ValueError("restore archive targetが不正です")
                    by_provider[provider] = entry
                    if entry["existed"]:
                        expected_members.add(entry["member"])
                        member = indexed.get(entry["member"])
                        if member is None:
                            raise ValueError("restore archive contentが不足しています")
                        extracted = tar.extractfile(member)
                        if extracted is None:
                            raise ValueError("restore archive contentを読めません")
                        content = extracted.read().decode("utf-8")
                        desired[paths[provider]] = {"content": content, **{key: entry[key] for key in ("mode", "uid", "gid")}}
                    else:
                        desired[paths[provider]] = None
                if set(by_provider) != {"claude", "codex"} or set(indexed) != expected_members:
                    raise ValueError("restore archive member集合が不正です")
                return desired
    except (OSError, tarfile.TarError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"restore archiveを検証できません: {exc}") from exc
    finally:
        if descriptor is not None:
            os.close(descriptor)


def main():
    args = parse_args()
    home = Path(os.environ.get("HOME", str(Path.home()))).expanduser().resolve()
    codex_home = Path(os.environ.get("CODEX_HOME", home / ".codex")).expanduser()
    paths = {"claude": home / ".claude" / "settings.json", "codex": codex_home / "hooks.json"}
    directories = (home / ".claude", codex_home)
    if any(directory.is_symlink() for directory in directories):
        raise ValueError("Claude settings directory と Codex hooks directory はsymlinkでは適用できません")
    if any(path.is_symlink() for path in paths.values()):
        raise ValueError("Claude settings.json と Codex hooks.json はsymlinkでは適用できません")
    originals, existed, metadata = snapshot(paths)
    if args.restore is not None:
        desired = read_backup(Path(args.restore), home, paths)
        ensure_unchanged(paths, originals, existed, metadata)
        transaction(desired, originals, existed, metadata)
        print(f"apply-observer-hook-config: 復元完了（archive: {args.restore}）")
        return
    executable = Path(args.observer_hook)
    if not executable.is_absolute():
        raise ValueError("--observer-hook はabsolute pathが必要です")
    state_root = Path(args.state_root)
    if not state_root.is_absolute():
        raise ValueError("--state-root はabsolute pathが必要です")
    proposed = {}
    for provider, path in paths.items():
        item = fragment(provider, str(executable), str(state_root))
        config = normalize(provider, load_json(originals[path], path), path, item, str(executable))
        verify(provider, str(executable), str(state_root), config)
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
    ensure_unchanged(paths, originals, existed, metadata)
    archive = backup(home, paths, originals, existed, metadata)
    desired = {}
    for path, content in changed.items():
        current = metadata[path] if existed[path] else {"mode": 0o600, "uid": current_uid(), "gid": current_gid()}
        desired[path] = {"content": content, **current}
    transaction(desired, originals, existed, metadata)
    print(f"apply-observer-hook-config: 適用完了（backup: {archive}）")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
