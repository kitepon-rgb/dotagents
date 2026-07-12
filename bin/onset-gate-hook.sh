#!/usr/bin/env python3
# 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。判定の正は docs/02_models.md
import json
import os
import sys

for stream in (sys.stdin, sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")

STATE_DIR = os.path.join(os.environ.get("XDG_CACHE_HOME") or os.path.expanduser("~/.cache"), "dotagents", "hooks")
CONTEXT = "INFO: このセッションで実装・委譲・複数工程の作業を行う場合の進め方は、グローバル CLAUDE.md / AGENTS.md の「計画文書の作法」「モデルとエフォート」および orchestrate skill を参照。会話・調査・小さな単発修正には追加対応不要。このINFO自体は、新しい作業・文書作成・委譲・依頼範囲の拡張を要求しません。"

try:
    data = json.loads(sys.stdin.read())
    session_id = data.get("session_id")
    if not isinstance(session_id, str):
        raise ValueError
    os.makedirs(STATE_DIR, exist_ok=True)
    parts = []
    shown = os.path.join(STATE_DIR, f"{session_id}.onset-info")
    if os.environ.get("DOTAGENTS_ONSET_GATE") != "off" and not os.path.exists(shown):
        open(shown, "a", encoding="utf-8").close()
        parts.append(CONTEXT)
    pending = os.path.join(STATE_DIR, f"{session_id}.todo-pending")
    if os.environ.get("DOTAGENTS_TODO_GATE") != "off" and os.path.exists(pending):
        try:
            content = open(pending, encoding="utf-8").read().strip()
        except Exception:
            content = ""
        try:
            os.unlink(pending)
        except Exception:
            pass
        if content:
            parts.append(content)
    if parts:
        sys.stdout.write(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": "\n".join(parts)}}, ensure_ascii=False) + "\n")
except Exception:
    pass
