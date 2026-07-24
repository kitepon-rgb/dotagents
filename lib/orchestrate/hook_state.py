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
