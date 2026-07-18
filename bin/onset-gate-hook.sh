#!/usr/bin/env python3
# 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。判定の正は docs/02_models.md
import json
import hashlib
import os
import sys
from pathlib import Path

for stream in (sys.stdin, sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib" / "orchestrate"))
from hook_state import safe_exists, safe_read, safe_touch, safe_unlink, state_dir

STATE_DIR = state_dir()
if STATE_DIR is None:
    raise SystemExit(0)
CONTEXT = "INFO: 統括レーン（計画に組込済みの中断・多段の受入連鎖・複数repo書込調整・裁定証跡のいずれかが着手時に確定する戦役）は、グローバル CLAUDE.md / AGENTS.md「作業レーンと統制」とorchestrate skillに従います。それ以外はすべて通常レーンで、docs plan、F/A/H宣言、Controlが不要です（Workerへの委譲・fan-out技法は通常レーンでも可）。このINFO自体は作業範囲を拡張しません。"


def session_key(session_id):
    return hashlib.sha256(session_id.encode("utf-8")).hexdigest()

try:
    data = json.loads(sys.stdin.read())
    session_id = data.get("session_id")
    if not isinstance(session_id, str):
        raise ValueError
    parts = []
    key = session_key(session_id)
    shown = os.path.join(STATE_DIR, f"{key}.onset-info")
    if os.environ.get("DOTAGENTS_ONSET_GATE") != "off" and not safe_exists(shown) and safe_touch(shown):
        parts.append(CONTEXT)
    pending = os.path.join(STATE_DIR, f"{key}.todo-pending")
    if os.environ.get("DOTAGENTS_TODO_GATE") != "off" and safe_exists(pending):
        content = (safe_read(pending) or "").strip()
        safe_unlink(pending)
        if content:
            parts.append(content)
    if parts:
        sys.stdout.write(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": "\n".join(parts)}}, ensure_ascii=False) + "\n")
except Exception:
    pass
