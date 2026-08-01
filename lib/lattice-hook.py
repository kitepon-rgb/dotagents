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
    "lattice.todo_status_result.v4",
}
# schemaごとにexact key-setを持つ。v4はtop-levelにdispatch_frontierを追加する。
# 部分一致や未知key無視で受理せず、schema分岐で厳密等価を保つ（fail-closed）。
STATUS_TOPLEVEL_BASE = {
    "schema",
    "project_id",
    "active_set",
    "next_ready",
    "blocked",
    "member_heads",
    "result_digest",
}
STATUS_SCHEMA_PATTERN = re.compile(r"^lattice\.todo_status_result\.v[0-9]{1,6}$")
DISPATCH_FRONTIER_SCHEMA = "lattice.todo_dispatch_frontier.v1"
PROJECT_STATUS_SCHEMA = "lattice.project_status.v1"
# guidanceの正本入口はtyped discovery（lattice status --json）。案内する工程が無い
# missing/uninitializedは静かに終了し、readyとactive_runだけ工程を読む。invalidと
# 未知stateはfail-visible（.lattice/todoの有無で早期判定しない）。
PROJECT_STATES_GUIDE = {"ready", "active_run"}
PROJECT_STATES_QUIET = {"missing", "uninitialized"}
PROJECT_STATES_ERROR = {"invalid"}
IDENTIFIER = re.compile(r"^[0-9A-Za-z](?:[0-9A-Za-z._-]{0,127})$")
DIGEST = re.compile(r"^[0-9a-f]{64}$")
GANTT_REF = Path(".lattice/generated/gantt.html")
STATUS_TIMEOUT = "timeout"
STATUS_EXECUTION_FAILED = "execution_failed"
STATUS_INVALID_RESPONSE = "invalid_response"
STATUS_UNSUPPORTED_VERSION = "unsupported_version"
DISCOVERY_INVALID = "discovery_invalid"
# session-contextを持たないCLI（0.14.0未満）。fallbackではなく観測可能な版差の分岐。
SESSION_CONTEXT_ABSENT = "session_context_absent"


def emit(frontend, message):
    if frontend == "codex":
        payload = {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": message,
            }
        }
        # Windows PowerShell 5.1経由でもCodexがJSONを誤復号しないようASCIIだけを出す。
        sys.stdout.write(json.dumps(payload, ensure_ascii=True) + "\n")
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


def dispatch_frontier(value):
    # v4のtop-level dispatch_frontier（lattice.todo_dispatch_frontier.v1）を厳密検証する。
    if not isinstance(value, dict):
        return False
    if set(value) != {
        "schema",
        "selection_source",
        "policy",
        "recommended_parallelism",
        "subset_requires_reason",
        "parallel_start_flag",
        "frontier_digest",
    }:
        return False
    parallelism = value.get("recommended_parallelism")
    return (
        value.get("schema") == DISPATCH_FRONTIER_SCHEMA
        and bounded_text(value.get("selection_source"), 64)
        and bounded_text(value.get("policy"), 128)
        and isinstance(parallelism, int)
        and not isinstance(parallelism, bool)
        and 0 <= parallelism <= 4096
        and isinstance(value.get("subset_requires_reason"), bool)
        and bounded_text(value.get("parallel_start_flag"), 64)
        and isinstance(value.get("frontier_digest"), str)
        and DIGEST.fullmatch(value["frontier_digest"]) is not None
    )


def unsupported_status_version(raw):
    # envelopeは整合するが schema が未対応の lattice.todo_status_result.v<N> かを判定する。
    # malformed（STATUS_INVALID_RESPONSE）と版差（STATUS_UNSUPPORTED_VERSION）を分ける。
    if not raw or len(raw) > CAPTURE_LIMIT:
        return False
    try:
        value = json.loads(raw.decode("utf-8", "strict"))
    except (UnicodeError, json.JSONDecodeError):
        return False
    if not isinstance(value, dict):
        return False
    schema = value.get("schema")
    return (
        isinstance(schema, str)
        and STATUS_SCHEMA_PATTERN.fullmatch(schema) is not None
        and schema not in STATUS_SCHEMAS
    )


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
    if not isinstance(value, dict):
        return None
    schema = value.get("schema")
    if schema not in STATUS_SCHEMAS or not identifier(value.get("project_id")):
        return None
    # schemaごとのexact key-set。v4だけtop-levelにdispatch_frontierを持つ。
    if schema == "lattice.todo_status_result.v4":
        expected = STATUS_TOPLEVEL_BASE | {"dispatch_frontier"}
    else:
        expected = STATUS_TOPLEVEL_BASE
    if set(value) != expected:
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
    if schema == "lattice.todo_status_result.v4" and not dispatch_frontier(value.get("dispatch_frontier")):
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
        if unsupported_status_version(raw):
            return None, STATUS_UNSUPPORTED_VERSION
        return None, STATUS_INVALID_RESPONSE
    return status_value, None


def parse_project_status(raw):
    # typed discoveryの正本 lattice.project_status.v1 から state（と store.ref）を取り出す。
    if not raw or len(raw) > CAPTURE_LIMIT:
        return None
    try:
        value = json.loads(raw.decode("utf-8", "strict"))
    except (UnicodeError, json.JSONDecodeError):
        return None
    if not isinstance(value, dict) or value.get("schema") != PROJECT_STATUS_SCHEMA:
        return None
    state = value.get("state")
    known = PROJECT_STATES_GUIDE | PROJECT_STATES_QUIET | PROJECT_STATES_ERROR
    if not isinstance(state, str) or state not in known:
        return None
    return value


def read_session_context(lattice, root):
    """statusと工程状態と並列可否を1プロセス・1 store読みで取る（Lattice ADR 0131）。

    statusとtodo statusは同じstoreを別プロセスで二重に払う。hostの実行枠を超えて
    案内ごと捨てられるため、統合入口があるCLIではこちらを使う。

    exit 2かつstdout空は「この入口を持たないCLI」で、旧2呼び出しへ静かに回る。
    それ以外の失敗は既存と同じくfail-visibleにする。「非ゼロなら黙る」にしない。
    """
    try:
        with tempfile.TemporaryFile() as capture:
            result = subprocess.run(
                [str(lattice), "session-context", "--json"],
                cwd=root,
                stdin=subprocess.DEVNULL,
                stdout=capture,
                stderr=subprocess.DEVNULL,
                timeout=5.0,
                check=False,
            )
            capture.seek(0)
            raw = capture.read(CAPTURE_LIMIT + 1)
    except subprocess.TimeoutExpired:
        return None, STATUS_TIMEOUT
    except OSError:
        return None, STATUS_EXECUTION_FAILED
    if result.returncode == 2 and not raw.strip():
        return None, SESSION_CONTEXT_ABSENT
    value = parse_session_context(raw)
    if value is not None:
        return value, None
    if result.returncode != 0:
        return None, STATUS_EXECUTION_FAILED
    return None, STATUS_INVALID_RESPONSE


def parse_session_context(raw):
    """必要fieldだけを取り出す（allowlist読み）。

    独立性の投影は版を上げずにキーが増えた実績がある。未知keyの追加でhookが
    全端末で壊れる構造を新しい面へ持ち込まない。知っているkeyの型だけを検査し、
    知らないkeyは無視する。`todo`部分木は todo_status_result.v4 そのものなので、
    既存の厳密検証をそのまま通す。
    """
    if raw is None or len(raw) > CAPTURE_LIMIT:
        return None
    try:
        value = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
    if not isinstance(value, dict):
        return None
    if value.get("schema") != "lattice.session_context.v1":
        return None
    status = value.get("status")
    if not isinstance(status, dict):
        return None
    project_status = parse_project_status(json.dumps(status).encode("utf-8"))
    if project_status is None:
        return None
    todo_raw = value.get("todo")
    todo = None
    if todo_raw is not None:
        if not isinstance(todo_raw, dict):
            return None
        todo = parse_status(json.dumps(todo_raw).encode("utf-8"))
        if todo is None:
            return None
    return {
        "status": project_status,
        "todo": todo,
        "independence": parse_independence(value.get("independence")),
    }


def parse_independence(entries):
    """並列可否の要約。読める項目だけを採り、読めない項目は落とす。"""
    if not isinstance(entries, list) or len(entries) > 512:
        return []
    summaries = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        plan_key = entry.get("plan_key")
        if not isinstance(plan_key, str) or not IDENTIFIER.fullmatch(plan_key):
            continue
        guidance = entry.get("guidance")
        message = None
        if isinstance(guidance, dict) and isinstance(guidance.get("message"), str):
            message = guidance_text(guidance["message"])
        groups = entry.get("parallel_groups")
        unknown = entry.get("unknown_task_ids")
        summaries.append({
            "plan_key": plan_key,
            "coverage": entry.get("coverage") if isinstance(entry.get("coverage"), str) else None,
            "message": message,
            "group_count": len(groups) if isinstance(groups, list) else 0,
            "verified_task_count": sum(
                len(group) for group in groups if isinstance(group, list)
            ) if isinstance(groups, list) else 0,
            "serialize_pair_count": entry.get("serialize_pair_count")
            if isinstance(entry.get("serialize_pair_count"), int) else 0,
            "conflict_with_active_count": entry.get("conflict_with_active_count")
            if isinstance(entry.get("conflict_with_active_count"), int) else 0,
            "unknown_count": len(unknown) if isinstance(unknown, list) else 0,
        })
    return summaries


def guidance_text(value):
    """案内文をそのまま載せるための検査。既存のbounded_textとは用途も引数も違う。"""
    if not isinstance(value, str) or not value or len(value) > 512:
        return None
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        return None
    return value


def read_project_status(lattice, root):
    try:
        with tempfile.TemporaryFile() as capture:
            result = subprocess.run(
                [str(lattice), "status", "--json"],
                cwd=root,
                stdin=subprocess.DEVNULL,
                stdout=capture,
                stderr=subprocess.DEVNULL,
                timeout=5.0,
                check=False,
            )
            capture.seek(0)
            raw = capture.read(CAPTURE_LIMIT + 1)
    except subprocess.TimeoutExpired:
        return None, STATUS_TIMEOUT
    except OSError:
        return None, STATUS_EXECUTION_FAILED
    # invalid storeは project_status.v1 envelopeを stdout に出しつつ exit 1 を返す。
    # returncodeより先に stdout を parse し、既知stateのenvelopeなら returncode不問で採用する。
    # parse不能のときだけ returncode で execution_failed / invalid_response を分類する。
    status_value = parse_project_status(raw)
    if status_value is not None:
        return status_value, None
    if result.returncode != 0:
        return None, STATUS_EXECUTION_FAILED
    return None, STATUS_INVALID_RESPONSE


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
    elif reason == STATUS_UNSUPPORTED_VERSION:
        detail = (
            "todo status応答のschema版がこのhookの対応範囲外です"
            "（CLI版がstore対応版より新しい可能性）。"
        )
    else:
        detail = "status応答を検証できないため現在地を取得できませんでした。"
    return (
        f"INFO: Lattice工程表: storeは存在しますが {detail}"
        "lattice CLIの版とstore整合を確認してください。このINFOは依頼範囲を拡張しません。"
    )


def discovery_unavailable_message(reason):
    # typed discovery（lattice status --json）自体が失敗した時のfail-visible。
    # 空集合や「工程なし」へ丸めず、失敗を明示する。
    if reason == STATUS_TIMEOUT:
        detail = "status --json取得が期限超過しました。"
    elif reason == DISCOVERY_INVALID:
        detail = "storeがinvalid状態です（store整合の破損）。"
    elif reason == STATUS_EXECUTION_FAILED:
        detail = "status --json実行失敗のため接続判定ができませんでした。"
    else:
        detail = "status --json応答を検証できませんでした。"
    return (
        f"INFO: Lattice工程表: {detail}"
        "lattice CLIの版とstore整合を確認してください。このINFOは依頼範囲を拡張しません。"
    )


def independence_fragment(summaries):
    """並列可否の1文。案内文はLatticeの返答をverbatimで使う。

    面ごとに文言を書き直すと必ずずれる（Lattice ADR 0130が案内の単一正本を置いた理由）。
    hookは件数を添えるだけで、意味づけの言い換えをしない。
    """
    if not summaries:
        return ""
    parts = []
    for entry in summaries:
        counts = (
            f"検証済み並列{entry['group_count']}group({entry['verified_task_count']}件)"
            f"・要直列{entry['serialize_pair_count']}組"
            f"・作業中との競合{entry['conflict_with_active_count']}件"
            f"・未検査{entry['unknown_count']}件"
        )
        coverage = entry["coverage"] or "unknown"
        message = f" {entry['message']}" if entry["message"] else ""
        parts.append(f"{entry['plan_key']}(coverage={coverage}): {counts}。{message}")
    return "並列可否: " + " ".join(parts) + " "


def status_message(root, status_value, independence=None):
    dependency_count = 0
    if status_value["schema"] in {
        "lattice.todo_status_result.v2",
        "lattice.todo_status_result.v3",
        "lattice.todo_status_result.v4",
    }:
        dependency_count = sum(
            1 for entry in status_value["active_set"] if entry.get("unmet_dependencies")
        )
    dependency_note = (
        f"未充足依存あり: active {dependency_count}件。" if dependency_count else ""
    )
    reconciliation_note = ""
    if status_value["schema"] in {
        "lattice.todo_status_result.v3",
        "lattice.todo_status_result.v4",
    }:
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
        f"{independence_fragment(independence or [])}"
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
        # 統合入口（Lattice 0.14.0以降）はdiscoveryと工程状態と並列可否を1プロセスで返す。
        # 旧2呼び出しは同じstoreを二重に読み、storeが育ったprojectでは実行枠を超えて
        # 案内ごと捨てられていた。入口を持たないCLIだけ従来経路へ回る。
        context, context_reason = read_session_context(lattice, root)
        if context is None and context_reason != SESSION_CONTEXT_ABSENT:
            emit(frontend, status_unavailable_message(context_reason))
            return
        if context is not None:
            project_status = context["status"]
            state = project_status["state"]
            if state in PROJECT_STATES_QUIET:
                return
            if state in PROJECT_STATES_ERROR:
                emit(frontend, discovery_unavailable_message(DISCOVERY_INVALID))
                return
            if context["todo"] is None:
                emit(frontend, status_unavailable_message(STATUS_INVALID_RESPONSE))
                return
            # オーナー裁定: 空の現在地通知は無視を学習させるため、正常な空frontierでは沈黙する。
            if not context["todo"]["active_set"] and not context["todo"]["next_ready"]:
                return
            emit(frontend, status_message(root, context["todo"], context["independence"]))
            return

        # typed discovery: lattice status --json が接続判定の正本。.lattice/todoの
        # ディレクトリ有無で早期判定しない（uninitialized/invalid/store ref変更を
        # 区別できないため）。案内する工程が無いmissing/uninitializedは静かに終了し、
        # ready/active_runだけ工程を読み、invalidと検証不能はfail-visibleにする。
        project_status, discovery_reason = read_project_status(lattice, root)
        if project_status is None:
            emit(frontend, discovery_unavailable_message(discovery_reason))
            return
        state = project_status["state"]
        if state in PROJECT_STATES_QUIET:
            return
        if state in PROJECT_STATES_ERROR:
            emit(frontend, discovery_unavailable_message(DISCOVERY_INVALID))
            return
        status_value, reason = read_status(lattice, root)
        if status_value is None:
            emit(frontend, status_unavailable_message(reason))
            return
        if not status_value["active_set"] and not status_value["next_ready"]:
            return
        emit(frontend, status_message(root, status_value))
    except Exception:
        return
