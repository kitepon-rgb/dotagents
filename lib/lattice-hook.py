"""Lattice工程表をSessionStartへ案内するread-only共通ロジック。"""

import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile


CAPTURE_LIMIT = 64 * 1024
STATUS_SCHEMAS = {
    "lattice.todo_status_result.v1",
    "lattice.todo_status_result.v2",
    "lattice.todo_status_result.v3",
}
IDENTIFIER = re.compile(r"^[0-9A-Za-z](?:[0-9A-Za-z._-]{0,127})$")
DIGEST = re.compile(r"^[0-9a-f]{64}$")
GANTT_REF = Path(".lattice/generated/gantt.html")
STATUS_TIMEOUT = "timeout"
STATUS_EXECUTION_FAILED = "execution_failed"
STATUS_INVALID_RESPONSE = "invalid_response"


def emit(frontend, message):
    if frontend == "codex":
        payload = {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": message,
            }
        }
        sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    else:
        sys.stdout.write(message + "\n")


def executable(name):
    candidate = shutil.which(name)
    if not candidate:
        return None
    try:
        resolved = Path(candidate).resolve(strict=True)
        info = resolved.stat()
    except OSError:
        return None
    if not stat.S_ISREG(info.st_mode) or not os.access(resolved, os.X_OK):
        return None
    return resolved


def git_root(cwd):
    git = executable("git")
    if git is None:
        return None
    try:
        result = subprocess.run(
            [str(git), "--no-optional-locks", "-C", cwd, "rev-parse", "--show-toplevel"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=0.5,
            check=False,
        )
        if result.returncode != 0 or len(result.stdout) > 4096:
            return None
        value = result.stdout.decode("utf-8", "strict").strip()
        return Path(value).resolve(strict=True) if value else None
    except (OSError, UnicodeError, subprocess.TimeoutExpired):
        return None


def bounded_text(value, limit=512):
    return (
        isinstance(value, str)
        and 0 < len(value) <= limit
        and all(ord(character) >= 0x20 and character != "\x7f" for character in value)
    )


def identifier(value):
    return isinstance(value, str) and IDENTIFIER.fullmatch(value) is not None


def dependency_entry(value):
    if not isinstance(value, dict):
        return False
    keys = set(value)
    # v2の同一project参照はproject_idを省略し、cross-project形は明示する。
    if keys not in (
        {"plan_key", "task_id"},
        {"plan_key", "project_id", "task_id"},
    ):
        return False
    return (
        identifier(value.get("plan_key"))
        and identifier(value.get("task_id"))
        and ("project_id" not in value or identifier(value.get("project_id")))
    )


def task_entry(value):
    if not isinstance(value, dict):
        return False
    keys = set(value)
    if keys not in (
        {"plan_key", "task_id", "label"},
        {"plan_key", "task_id", "label", "unmet_dependencies"},
    ):
        return False
    return (
        identifier(value.get("plan_key"))
        and identifier(value.get("task_id"))
        and bounded_text(value.get("label"), 160)
        and (
            "unmet_dependencies" not in value
            or bounded_list(value.get("unmet_dependencies"), dependency_entry)
        )
    )


def blocked_entry(value):
    return (
        isinstance(value, dict)
        and set(value) == {"plan_key", "task_id", "reason"}
        and identifier(value.get("plan_key"))
        and identifier(value.get("task_id"))
        and bounded_text(value.get("reason"))
    )


def member_head(value, schema):
    if not isinstance(value, dict):
        return False
    if schema in {"lattice.todo_status_result.v1", "lattice.todo_status_result.v2"}:
        return (
            set(value) == {"plan_key", "through_sequence", "journal_head_digest"}
            and identifier(value.get("plan_key"))
            and isinstance(value.get("through_sequence"), int)
            and not isinstance(value.get("through_sequence"), bool)
            and 0 <= value["through_sequence"] <= 9_007_199_254_740_991
            and isinstance(value.get("journal_head_digest"), str)
            and DIGEST.fullmatch(value["journal_head_digest"]) is not None
        )
    expected = {
        "plan_key",
        "plan_version",
        "through_sequence",
        "journal_head_digest",
        "reconciliation_state",
        "revision_digest",
        "reconciliation_digest",
    }
    state = value.get("reconciliation_state")
    revision = value.get("revision_digest")
    return (
        set(value) == expected
        and identifier(value.get("plan_key"))
        and identifier(value.get("plan_version"))
        and isinstance(value.get("through_sequence"), int)
        and not isinstance(value.get("through_sequence"), bool)
        and 0 <= value["through_sequence"] <= 9_007_199_254_740_991
        and isinstance(value.get("journal_head_digest"), str)
        and DIGEST.fullmatch(value["journal_head_digest"]) is not None
        and state in {"registered_unreconciled", "reconciled"}
        and (
            (state == "registered_unreconciled" and revision is None)
            or (
                state == "reconciled"
                and isinstance(revision, str)
                and DIGEST.fullmatch(revision) is not None
            )
        )
        and isinstance(value.get("reconciliation_digest"), str)
        and DIGEST.fullmatch(value["reconciliation_digest"]) is not None
    )


def bounded_list(value, validator):
    return isinstance(value, list) and len(value) <= 2000 and all(validator(entry) for entry in value)


def parse_status(raw):
    if not raw or len(raw) > CAPTURE_LIMIT:
        return None
    try:
        text = raw.decode("utf-8", "strict")
        if len(text.splitlines()) != 1:
            return None
        value = json.loads(text)
    except (UnicodeError, json.JSONDecodeError):
        return None
    expected = {
        "schema",
        "project_id",
        "active_set",
        "next_ready",
        "blocked",
        "member_heads",
        "result_digest",
    }
    if not isinstance(value, dict) or set(value) != expected:
        return None
    if value.get("schema") not in STATUS_SCHEMAS or not identifier(value.get("project_id")):
        return None
    if not bounded_list(value.get("active_set"), task_entry):
        return None
    if not bounded_list(value.get("next_ready"), task_entry):
        return None
    if not bounded_list(value.get("blocked"), blocked_entry):
        return None
    if not bounded_list(value.get("member_heads"), lambda entry: member_head(entry, value["schema"])):
        return None
    if not isinstance(value.get("result_digest"), str) or DIGEST.fullmatch(value["result_digest"]) is None:
        return None
    return value


def read_status(lattice, root):
    try:
        with tempfile.TemporaryFile() as capture:
            result = subprocess.run(
                [str(lattice), "todo", "status"],
                cwd=root,
                stdin=subprocess.DEVNULL,
                stdout=capture,
                stderr=subprocess.DEVNULL,
                timeout=5.0,
                check=False,
            )
            if result.returncode != 0:
                return None, STATUS_EXECUTION_FAILED
            capture.seek(0)
            raw = capture.read(CAPTURE_LIMIT + 1)
    except subprocess.TimeoutExpired:
        return None, STATUS_TIMEOUT
    except OSError:
        return None, STATUS_EXECUTION_FAILED
    status_value = parse_status(raw)
    if status_value is None:
        return None, STATUS_INVALID_RESPONSE
    return status_value, None


def task_summary(entries):
    if not entries:
        return "なし"
    return "・".join(
        f"{entry['plan_key']}/{entry['task_id']}（{entry['label']}）" for entry in entries[:8]
    ) + ("ほか" if len(entries) > 8 else "")


def gantt_location(root):
    path = root / GANTT_REF
    uri = path.absolute().as_uri()
    try:
        info = path.lstat()
    except OSError:
        return f"未生成（予定パス: {uri}）"
    if not stat.S_ISREG(info.st_mode):
        return f"未生成（予定パス: {uri}）"
    return uri


def missing_cli_message():
    return (
        "INFO: Lattice工程表: lattice CLIが未導入のため現在地を案内できません。"
        "@quolu/lattice の導入後に再確認してください。このINFOは依頼範囲を拡張しません。"
    )


def status_unavailable_message(reason):
    if reason == STATUS_TIMEOUT:
        detail = "status取得が期限超過しました。"
    elif reason == STATUS_EXECUTION_FAILED:
        detail = "CLI実行失敗のため現在地を取得できませんでした。"
    else:
        detail = "status応答を検証できないため現在地を取得できませんでした。"
    return (
        f"INFO: Lattice工程表: storeは存在しますが {detail}"
        "lattice CLIの版とstore整合を確認してください。このINFOは依頼範囲を拡張しません。"
    )


def status_message(root, status_value):
    dependency_count = 0
    if status_value["schema"] in {
        "lattice.todo_status_result.v2",
        "lattice.todo_status_result.v3",
    }:
        dependency_count = sum(
            1 for entry in status_value["active_set"] if entry.get("unmet_dependencies")
        )
    dependency_note = (
        f"未充足依存あり: active {dependency_count}件。" if dependency_count else ""
    )
    reconciliation_note = ""
    if status_value["schema"] == "lattice.todo_status_result.v3":
        unreconciled = sum(
            1
            for entry in status_value["member_heads"]
            if entry["reconciliation_state"] == "registered_unreconciled"
        )
        reconciled = len(status_value["member_heads"]) - unreconciled
        reconciliation_note = f"校正状態: reconciled={reconciled}, unreconciled={unreconciled}。"
    return (
        f"INFO: Lattice工程表: {gantt_location(root)}。"
        f"現在地: active={task_summary(status_value['active_set'])}; "
        f"next-ready={task_summary(status_value['next_ready'])}。"
        f"{dependency_note}"
        f"{reconciliation_note}"
        "工程正本は Lattice store、散文は linked Markdown。"
        "表示不能時は lattice todo gantt を明示実行してください。"
        "このINFOは依頼範囲を拡張しません。"
    )


def main(frontend):
    if frontend not in {"claude", "codex"}:
        return
    if os.environ.get("DOTAGENTS_LATTICE_HOOK") == "off":
        return
    if len(sys.argv) != 2 or sys.argv[1] != "session-start":
        return
    try:
        raw = sys.stdin.buffer.read(CAPTURE_LIMIT + 1)
        if len(raw) > CAPTURE_LIMIT:
            return
        data = json.loads(raw.decode("utf-8", "strict"))
        required = (data.get("session_id"), data.get("source"), data.get("cwd"))
        if not isinstance(data, dict) or not all(isinstance(value, str) and value for value in required):
            return
        if data["source"] not in {"startup", "clear"}:
            return
        root = git_root(data["cwd"])
        if root is None:
            return
        lattice = executable("lattice")
        if lattice is None:
            emit(frontend, missing_cli_message())
            return
        if not (root / ".lattice/todo").is_dir():
            return
        status_value, reason = read_status(lattice, root)
        if status_value is None:
            emit(frontend, status_unavailable_message(reason))
            return
        emit(frontend, status_message(root, status_value))
    except Exception:
        return
