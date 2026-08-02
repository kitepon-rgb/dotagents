import hashlib
import json
import os
import stat
from pathlib import Path


def _owner_and_mode_safe(info):
    if os.name == "nt":
        # Windows の st_uid / POSIX mode bits は ACL を表現せず、常に 0 / 0777 相当になる。
        return True
    return info.st_uid == os.getuid() and not (info.st_mode & 0o022)


def _safe_directory(path):
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
    return stat.S_ISDIR(info.st_mode) and not stat.S_ISLNK(info.st_mode) and _owner_and_mode_safe(info)


def state_dir():
    base = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache")
    if not _safe_directory(base):
        return None
    dotagents = base / "dotagents"
    if not _safe_directory(dotagents):
        return None
    hooks = dotagents / "hooks"
    return str(hooks) if _safe_directory(hooks) else None


def _safe_info(path):
    try:
        info = os.lstat(path)
    except OSError:
        return None
    return info if stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and _owner_and_mode_safe(info) else None


def safe_exists(path):
    return _safe_info(path) is not None


def safe_mtime(path):
    info = _safe_info(path)
    return None if info is None else info.st_mtime


def _open_fd(path, flags):
    path = Path(path)
    flags |= getattr(os, "O_NOFOLLOW", 0)
    if os.name == "nt" and path.exists() and _safe_info(path) is None:
        return None
    try:
        fd = os.open(path, flags, 0o600)
    except OSError:
        return None
    info = os.fstat(fd)
    if not (stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and _owner_and_mode_safe(info)):
        os.close(fd)
        return None
    return fd


def safe_touch(path):
    if safe_exists(path):
        return True
    fd = _open_fd(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    if fd is None:
        return False
    os.close(fd)
    return True


def safe_write(path, text):
    fd = _open_fd(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC)
    if fd is None:
        return False
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
        return True
    except OSError:
        return False


def safe_append(path, text):
    fd = _open_fd(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND)
    if fd is None:
        return False
    try:
        with os.fdopen(fd, "a", encoding="utf-8") as handle:
            handle.write(text)
        return True
    except OSError:
        return False


def safe_read(path):
    fd = _open_fd(path, os.O_RDONLY)
    if fd is None:
        return None
    try:
        with os.fdopen(fd, "r", encoding="utf-8") as handle:
            return handle.read()
    except (OSError, UnicodeError):
        return None


def safe_unlink(path):
    if not safe_exists(path):
        return False
    try:
        os.unlink(path)
        return True
    except OSError:
        return False


# Writer reservations deliberately have no TTL.  A timed-out/unknown worker remains
# a conflict until its parent explicitly releases it.
def writer_state_dir():
    parent = state_dir()
    if parent is None:
        return None
    directory = Path(parent) / "writer-reservations"
    try:
        info = directory.lstat()
    except FileNotFoundError:
        try:
            directory.mkdir(mode=0o700)
            info = directory.lstat()
        except OSError:
            return None
    except OSError:
        return None
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode) or not _owner_and_mode_safe(info):
        return None
    if os.name != "nt" and stat.S_IMODE(info.st_mode) != 0o700:
        try:
            os.chmod(directory, 0o700)
            info = directory.lstat()
        except OSError:
            return None
        if stat.S_IMODE(info.st_mode) != 0o700 or not _owner_and_mode_safe(info):
            return None
    return str(directory)


def _writer_reservation_path(common_dir):
    digest = hashlib.sha256(common_dir.encode("utf-8")).hexdigest()
    directory = writer_state_dir()
    return None if directory is None else os.path.join(directory, f"{digest}.json")


def _writer_paths(common_dir):
    path = _writer_reservation_path(common_dir)
    return (None, None, None) if path is None else (path, path + ".lock", path + ".tmp")


def _opaque_reservation(path, common_dir, reason):
    return {"common_dir": common_dir, "state": "opaque", "reason": reason, "path": os.path.basename(path)}


def writer_reserve(record):
    """Atomically reserve record.common_dir; return ("reserved"|"busy"|"error", record)."""
    common_dir = record.get("common_dir") if isinstance(record, dict) else None
    if not isinstance(common_dir, str) or not common_dir:
        return "error", None
    path, lock_path, temp_path = _writer_paths(common_dir)
    if path is None:
        return "error", None
    # Any pre-existing record, creator lock, or interrupted temp is deliberately
    # opaque busy.  It must be inspected/released manually, never GC'd or opened.
    for candidate, reason in ((path, "record"), (lock_path, "creator-lock"), (temp_path, "interrupted-write")):
        if os.path.lexists(candidate):
            content = safe_read(candidate)
            if candidate == path and content is not None:
                try:
                    parsed = json.loads(content)
                    if isinstance(parsed, dict) and parsed.get("common_dir") == common_dir:
                        return "busy", parsed
                except (TypeError, ValueError):
                    pass
            return "busy", _opaque_reservation(candidate, common_dir, reason)
    payload = json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n"
    lock_fd = _open_fd(lock_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    if lock_fd is None:
        return "busy", _opaque_reservation(lock_path, common_dir, "creator-lock")
    os.close(lock_fd)
    try:
        fd = _open_fd(temp_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
        if fd is None:
            return "busy", _opaque_reservation(temp_path, common_dir, "interrupted-write")
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        # The exclusive creator lock prevents replacement of another record;
        # rename makes readers observe either no record or a complete record.
        os.rename(temp_path, path)
        return "reserved", record
    except OSError:
        return "error", None


def writer_release(common_dir):
    if not isinstance(common_dir, str) or not common_dir:
        return False
    path, lock_path, temp_path = _writer_paths(common_dir)
    if path is None:
        return False
    removed = False
    for candidate in (path, lock_path, temp_path):
        if os.path.lexists(candidate):
            removed = safe_unlink(candidate) or removed
    return removed


def writer_reservations():
    directory = writer_state_dir()
    if directory is None:
        return None
    records = []
    try:
        entries = list(os.scandir(directory))
    except OSError:
        return None
    for entry in entries:
        if not entry.name.endswith(".json"):
            continue
        content = safe_read(entry.path)
        common_dir = "unknown"
        if content is None:
            records.append(_opaque_reservation(entry.path, common_dir, "unreadable-record"))
            continue
        try:
            record = json.loads(content)
        except (TypeError, ValueError):
            records.append(_opaque_reservation(entry.path, common_dir, "malformed-record"))
            continue
        if not isinstance(record, dict) or not isinstance(record.get("common_dir"), str):
            records.append(_opaque_reservation(entry.path, common_dir, "invalid-record"))
            continue
        records.append(record)
    record_names = {entry.name for entry in entries if entry.name.endswith(".json")}
    for entry in entries:
        if entry.name.endswith(".lock") or entry.name.endswith(".tmp"):
            if entry.name.rsplit(".", 1)[0] + ".json" in record_names:
                continue
            records.append(_opaque_reservation(entry.path, "unknown", "interrupted-write"))
    return sorted(records, key=lambda item: (item["common_dir"], item.get("path", "")))
