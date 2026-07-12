#!/usr/bin/env python3
# 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。判定の正は docs/02_models.md
import datetime
import json
import os
import sys

for stream in (sys.stdin, sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")

STATE_DIR = os.path.join(os.environ.get("XDG_CACHE_HOME") or os.path.expanduser("~/.cache"), "dotagents", "hooks")


def error_log(name):
    try:
        os.makedirs(STATE_DIR, exist_ok=True)
        with open(os.path.join(STATE_DIR, "errors.log"), "a", encoding="utf-8") as handle:
            handle.write(f"{datetime.datetime.now().isoformat()} {name} parse-fail\n")
    except Exception:
        pass


def gc():
    try:
        cutoff = datetime.datetime.now().timestamp() - 7 * 24 * 60 * 60
        for entry in os.scandir(STATE_DIR):
            if entry.is_file() and entry.stat().st_mtime < cutoff:
                os.unlink(entry.path)
    except Exception:
        pass


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")


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
        os.makedirs(STATE_DIR, exist_ok=True)
        model = tool_input.get("model")
        effort_values = [tool_input.get(key) for key in ("reasoning_effort", "effort", "modelReasoningEffort")]
        effort = next((value for value in effort_values if value is not None), None)
        warn_path = os.path.join(STATE_DIR, f"{session_id}.placement-warn")
        if not os.path.exists(warn_path):
            open(warn_path, "a", encoding="utf-8").close()
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
