"""SessionStart向けの読み取り専用Orchestrate advisory。失敗時は常に沈黙する。"""

import datetime
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import threading
import time


SCHEMA = "orchestrate.advisory-snapshot.v1"
CAPTURE_LIMIT = 64 * 1024
CACHE_TTL_SECONDS = 7 * 24 * 60 * 60
SYSTEM_PATHS = ("/usr/bin", "/bin", "/usr/sbin", "/sbin")
GIT_CANDIDATES = ("/usr/bin/git", "/opt/homebrew/bin/git", "/usr/local/bin/git")
NODE_CANDIDATES = ("/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node")


def trusted_executable(candidates):
    for candidate in candidates:
        try:
            resolved = Path(candidate).resolve(strict=True)
            info = resolved.stat()
            if stat.S_ISREG(info.st_mode) and os.access(resolved, os.X_OK):
                return resolved
        except OSError:
            pass
    return None


def safe_env(executables=()):
    result = {}
    for key, value in os.environ.items():
        if key in {"HOME", "TMPDIR", "LANG"} or key.startswith("LC_"):
            result[key] = value
    paths = []
    for executable in executables:
        parent = str(Path(executable).parent)
        if parent not in paths:
            paths.append(parent)
    result["PATH"] = os.pathsep.join(paths + list(SYSTEM_PATHS))
    return result


def canonical_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def remaining(deadline, maximum):
    return max(0.01, min(maximum, deadline - time.monotonic()))


def git_root(git, cwd, deadline):
    try:
        result = subprocess.run(
            [str(git), "--no-optional-locks", "-C", cwd, "rev-parse", "--show-toplevel"],
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            timeout=remaining(deadline, 0.5), check=False, env=safe_env((git,)),
        )
        if result.returncode != 0 or len(result.stdout) > 4096:
            return None
        root = result.stdout.decode("utf-8", "strict").strip()
        return Path(root).resolve() if root else None
    except (OSError, UnicodeError, subprocess.TimeoutExpired):
        return None


def safe_directory(path):
    try:
        info = path.lstat()
    except FileNotFoundError:
        try:
            path.mkdir(mode=0o700)
            info = path.lstat()
        except OSError:
            return False
    except OSError:
        return False
    owner_and_mode_safe = os.name == "nt" or (
        info.st_uid == os.getuid() and not (info.st_mode & 0o022)
    )
    return stat.S_ISDIR(info.st_mode) and not stat.S_ISLNK(info.st_mode) and owner_and_mode_safe


def state_dir():
    base = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache")
    if not safe_directory(base):
        return None
    dotagents = base / "dotagents"
    if not safe_directory(dotagents):
        return None
    hooks = dotagents / "hooks"
    return hooks if safe_directory(hooks) else None


def marker_path(directory, session_id, root):
    digest = hashlib.sha256(f"{session_id}\0{root}".encode("utf-8")).hexdigest()
    return directory / f"orchestrate-advisory-{digest}.shown"


def safe_marker(path):
    try:
        info = path.lstat()
    except FileNotFoundError:
        return False
    except OSError:
        return None
    owner_safe = os.name == "nt" or info.st_uid == os.getuid()
    if not (stat.S_ISREG(info.st_mode) and owner_safe and info.st_nlink == 1):
        return None
    return True


def gc(directory):
    cutoff = time.time() - CACHE_TTL_SECONDS
    try:
        for entry in directory.iterdir():
            try:
                info = entry.lstat()
                if entry.name.startswith("orchestrate-advisory-") and entry.name.endswith(".shown") and stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and info.st_nlink == 1 and info.st_mtime < cutoff:
                    entry.unlink()
            except OSError:
                pass
    except OSError:
        pass


def cli_candidates(invoked_dir, source_dir):
    result = []
    for candidate in (Path(invoked_dir) / "orchestrate-run", Path(source_dir) / "orchestrate-run.mjs"):
        try:
            resolved = candidate.resolve(strict=True)
            info = resolved.stat()
            if stat.S_ISREG(info.st_mode) and os.access(resolved, os.X_OK) and resolved not in result:
                result.append(resolved)
        except OSError:
            pass
    return result


def stop_process(process):
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=0.25)
        return
    except subprocess.TimeoutExpired:
        process.kill()
    try:
        process.wait(timeout=0.25)
    except subprocess.TimeoutExpired:
        pass


def run_cli(node, cli, payload, deadline):
    input_path = None
    process = None
    try:
        fd, input_path = tempfile.mkstemp(prefix="dotagents-orchestrate-advisory-", suffix=".json", dir="/tmp")
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "wb") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
            handle.flush(); os.fsync(handle.fileno())
        process = subprocess.Popen(
            [str(node), str(cli), "advisory-snapshot", "--input", input_path],
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=safe_env((node,)),
        )
        captured = {"stdout": bytearray(), "stderr": bytearray()}
        overflow = threading.Event()

        def reader(name, stream):
            try:
                while True:
                    chunk = stream.read(4096)
                    if not chunk:
                        return
                    if len(captured[name]) + len(chunk) > CAPTURE_LIMIT:
                        overflow.set(); stop_process(process); return
                    captured[name].extend(chunk)
            except OSError:
                overflow.set()

        readers = [threading.Thread(target=reader, args=(name, stream), daemon=True) for name, stream in (("stdout", process.stdout), ("stderr", process.stderr))]
        for thread in readers:
            thread.start()
        try:
            process.wait(timeout=remaining(deadline, 2.0))
        except subprocess.TimeoutExpired:
            stop_process(process)
            return None
        finally:
            for thread in readers:
                thread.join(timeout=0.25)
        if overflow.is_set() or process.returncode != 0 or captured["stderr"]:
            return None
        return bytes(captured["stdout"])
    except (OSError, ValueError, TypeError):
        return None
    finally:
        if process is not None and process.poll() is None:
            stop_process(process)
        if input_path is not None:
            try:
                os.unlink(input_path)
            except OSError:
                pass


def ids(values):
    return values if isinstance(values, list) and len(values) <= 256 and all(isinstance(value, str) and 0 < len(value) <= 128 for value in values) else None


def pairs(values, first):
    if not isinstance(values, list) or len(values) > 256:
        return None
    return values if all(isinstance(value, dict) and set(value) == {first, "reason"} and all(isinstance(value.get(key), str) and 0 < len(value[key]) <= 128 for key in (first, "reason")) for value in values) else None


def snapshot_from_output(raw):
    try:
        envelope = json.loads(raw.decode("utf-8", "strict")) if raw and len(raw) <= CAPTURE_LIMIT else None
    except (UnicodeError, json.JSONDecodeError):
        return None
    if not isinstance(envelope, dict) or set(envelope) != {"ok", "command", "result"} or envelope.get("ok") is not True or envelope.get("command") != "advisory-snapshot" or not isinstance(envelope.get("result"), dict):
        return None
    value = envelope["result"]
    expected = {"schema_version", "evaluated_at", "active_control_ids", "unknown", "uncollected", "write_conflicts", "h_reference_gaps", "capacity_warnings", "truncated"}
    if set(value) != expected or value.get("schema_version") != SCHEMA or not isinstance(value.get("evaluated_at"), str) or not isinstance(value.get("truncated"), bool):
        return None
    unknown, uncollected = value["unknown"], value["uncollected"]
    conflict_ok = isinstance(value["write_conflicts"], list) and len(value["write_conflicts"]) <= 256 and all(isinstance(entry, dict) and set(entry) == {"control_id", "worker_run_id", "reason"} and all(isinstance(entry.get(key), str) and 0 < len(entry[key]) <= 128 for key in ("control_id", "worker_run_id", "reason")) for entry in value["write_conflicts"])
    if not all(isinstance(part, dict) and set(part) == {"worker_run_ids", "consultation_ids"} and ids(part["worker_run_ids"]) is not None and ids(part["consultation_ids"]) is not None for part in (unknown, uncollected)) or ids(value["active_control_ids"]) is None or not conflict_ok or pairs(value["h_reference_gaps"], "task_id") is None or pairs(value["capacity_warnings"], "registry_observation_id") is None:
        return None
    return value


def section(label, values):
    return None if not values else f"{label}: {', '.join(values[:3])}{' …' if len(values) > 3 else ''}"


def format_context(snapshot):
    sections = [
        section("active Control", snapshot["active_control_ids"]),
        section("unknown Run", [f"worker:{entry}" for entry in snapshot["unknown"]["worker_run_ids"]] + [f"consultation:{entry}" for entry in snapshot["unknown"]["consultation_ids"]]),
        section("未回収", [f"worker:{entry}" for entry in snapshot["uncollected"]["worker_run_ids"]] + [f"consultation:{entry}" for entry in snapshot["uncollected"]["consultation_ids"]]),
        section("write conflict", [f"{entry['control_id']}/{entry['worker_run_id']}:{entry['reason']}" for entry in snapshot["write_conflicts"]]),
        section("H参照不足", [f"{entry['task_id']}:{entry['reason']}" for entry in snapshot["h_reference_gaps"]]),
        section("capacity", [f"{entry['registry_observation_id']}:{entry['reason']}" for entry in snapshot["capacity_warnings"]]),
    ]
    content = [entry for entry in sections if entry is not None]
    return None if not content else "INFO: Orchestrate advisory — " + " / ".join(content) + ("（一覧は各3件まで）" if snapshot["truncated"] else "")


def mark_shown(path):
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write("shown\n")
    except OSError:
        pass


def main():
    deadline = time.monotonic() + 3.0
    if os.environ.get("DOTAGENTS_ORCHESTRATE_ADVISORY") == "off" or len(sys.argv) != 3:
        return
    try:
        raw = sys.stdin.buffer.read(CAPTURE_LIMIT + 1)
        if len(raw) > CAPTURE_LIMIT:
            return
        data = json.loads(raw.decode("utf-8", "strict"))
        if not isinstance(data, dict) or not isinstance(data.get("session_id"), str) or not isinstance(data.get("cwd"), str) or not data["session_id"] or len(data["session_id"]) > 256:
            return
        git = trusted_executable(GIT_CANDIDATES); node = trusted_executable(NODE_CANDIDATES)
        if git is None or node is None:
            return
        root = git_root(git, data["cwd"], deadline)
        directory = state_dir()
        if root is None or directory is None or time.monotonic() >= deadline:
            return
        gc(directory)
        marker = marker_path(directory, data["session_id"], root)
        marker_state = safe_marker(marker)
        if marker_state is None or marker_state:
            return
        snapshot = None
        for cli in cli_candidates(sys.argv[1], sys.argv[2]):
            snapshot = snapshot_from_output(run_cli(node, cli, {"cwd": str(root), "evaluated_at": canonical_now()}, deadline) or b"")
            if snapshot is not None:
                break
        context = format_context(snapshot) if snapshot is not None else None
        if context is None or time.monotonic() >= deadline:
            return
        sys.stdout.write(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": context}}, ensure_ascii=False) + "\n")
        sys.stdout.flush(); mark_shown(marker)
    except Exception:
        return


if __name__ == "__main__":
    main()
