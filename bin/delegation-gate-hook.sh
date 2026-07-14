#!/usr/bin/env python3
# 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。判定の正は docs/02_models.md
import datetime
import hashlib
import json
import os
import sys
from pathlib import Path

for stream in (sys.stdin, sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib" / "orchestrate"))
from hook_state import safe_append, safe_exists, safe_touch, safe_unlink, state_dir

STATE_DIR = state_dir()
if STATE_DIR is None:
    raise SystemExit(0)


def error_log(name):
    try:
        safe_append(os.path.join(STATE_DIR, "errors.log"), f"{datetime.datetime.now().isoformat()} {name} parse-fail\n")
    except Exception:
        pass


def gc():
    try:
        cutoff = datetime.datetime.now().timestamp() - 7 * 24 * 60 * 60
        for entry in os.scandir(STATE_DIR):
            if entry.is_file(follow_symlinks=False) and entry.stat(follow_symlinks=False).st_mtime < cutoff:
                safe_unlink(entry.path)
    except Exception:
        pass


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")


def session_key(session_id):
    return hashlib.sha256(session_id.encode("utf-8")).hexdigest()


def main():
    raw = sys.stdin.read()
    if os.environ.get("DOTAGENTS_PLACEMENT_GATE") == "off":
        return
    try:
        data = json.loads(raw)
        session_id = data["session_id"]
        tool_name = data["tool_name"]
        tool_input = data["tool_input"]
        if not isinstance(session_id, str) or not isinstance(tool_name, str) or not isinstance(tool_input, dict):
            raise ValueError
    except Exception:
        error_log("delegation-gate-hook")
        return

    try:
        model = tool_input.get("model")
        effort_values = [tool_input.get(key) for key in ("reasoning_effort", "effort", "modelReasoningEffort")]
        effort = next((value for value in effort_values if value is not None), None)
        warn_path = os.path.join(STATE_DIR, f"{session_key(session_id)}.placement-warn")
        if not safe_exists(warn_path) and safe_touch(warn_path):
            gc()
            shown_model = str(model) if model not in (None, "") else "省略"
            shown_effort = str(effort) if effort not in (None, "") else "未指定"
            message = f"INFO: このセッションで最初の委譲を検出しました（{tool_name}: model={shown_model}, effort={shown_effort}）。配置・委譲契約・モデル選択の基準は、グローバル CLAUDE.md / AGENTS.md「モデルとエフォート」および docs/02_models.md を参照。このINFO自体は追加の委譲や依頼範囲の拡張を要求しません。"
            emit({"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": message}})
    except Exception:
        error_log("delegation-gate-hook")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        error_log("delegation-gate-hook")
