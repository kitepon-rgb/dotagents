#!/usr/bin/env python3
# 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。判定の正は docs/02_models.md
import json
import os
import sys

CONTEXT = "【着手ゲート】この依頼で実装・委譲・オーケストレーションに入るなら、手を動かす前に: (1) orchestrate スキルと docs/02_models.md を**開いて**、作業を F/A/H でラベルし配置（ティア×effort×入口）を決定表の該当行を **file:line 引用付き**で1行宣言する（既定は A＝委譲、自分で書く(F)なら理由を1行）。(2) プランは docs/ に正本化したか（会話・TodoWrite の使い捨てで済ませない）。調査・会話・小さな単発修正だけのターンは無視してよい。"

try:
    sys.stdin.read()
    if os.environ.get("DOTAGENTS_ONSET_GATE") != "off":
        sys.stdout.write(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": CONTEXT}}, ensure_ascii=False) + "\n")
except Exception:
    pass
