#!/usr/bin/env python3
# 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。判定の正は docs/02_models.md
import datetime
import hashlib
import json
import os
import re
import sys

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


def output(kind, message):
    base = {"hookEventName": "PreToolUse"}
    if kind == "warn":
        base["additionalContext"] = message
    else:
        base["permissionDecision"] = kind
        base["permissionDecisionReason"] = message
    emit({"hookSpecificOutput": base})


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
        model_text = str(model) if model is not None else ""
        if re.search(r"-20\d{6}", model_text):
            key = hashlib.sha1((tool_name + "|" + model_text).encode()).hexdigest()[:12]
            path = os.path.join(STATE_DIR, f"{session_id}.deny.{key}")
            try:
                count = int(open(path, encoding="utf-8").read().strip() or "0")
            except Exception:
                count = 0
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(str(count + 1) + "\n")
            gc()
            message = f"【配置ゲート・ブロック】model \"{model_text}\" は日付付き model ID＝規約違反(02_models.md 指定の作法)。floating alias（sonnet/haiku/opus）か現行ティア語彙に替えて再実行すれば通る。"
            output("warn" if count >= 2 else "deny", message)
            return

        if tool_name == "mcp__aiterm__codex_agent" and (not tool_input.get("model") or not tool_input.get("reasoning_effort")):
            gc()
            output("deny", "【配置ゲート・ブロック】codex_agent は model×reasoning_effort の毎回明示が規約(02_models.md 入口の既知の事実)。省略は端末ピン（旗艦×ultra 等）を継承する。両引数を明示して再実行すれば通る。")
            return

        if tool_name == "mcp__oracle__consult":
            detected = None
            if tool_input.get("preset") == "chatgpt-pro-heavy":
                detected = 'preset:"chatgpt-pro-heavy"'
            elif "browserModelLabel" in tool_input:
                detected = "browserModelLabel"
            elif tool_input.get("modelStrategy") == "select":
                detected = 'modelStrategy:"select"'
            elif tool_input.get("engine") == "api":
                detected = 'engine:"api"'
            if detected:
                gc()
                output("deny", f"【配置ゲート・ブロック】oracle.consult に封印パラメータ（{detected}）が指定された。標準形は engine:\"browser\" のみ・モデル/Effort はアカウント現在値で走る（06_oracle-mcp.md）。封印指定を外して再実行すれば通る。API engine は課金経路のため禁止。")
                return

        effort_values = [tool_input.get(key) for key in ("reasoning_effort", "effort", "modelReasoningEffort")]
        effort = next((value for value in effort_values if value is not None), None)
        if "ultra" in effort_values:
            gc()
            output("ask", "effort=ultra は max 推論＋proactive 自動委譲 ON＝子を自動量産(02_models.md エスカレーションゲート「オーナー明示要求時のみ」)。この依頼にオーナーの明示要求が実在する場合のみ承認してください。")
            return

        warn_path = os.path.join(STATE_DIR, f"{session_id}.placement-warn")
        if not os.path.exists(warn_path):
            open(warn_path, "a", encoding="utf-8").close()
            gc()
            shown_model = str(model) if model not in (None, "") else "省略"
            shown_effort = str(effort) if effort not in (None, "") else "未指定"
            output("warn", f"【配置ゲート】このセッション初の委譲（{tool_name}: model={shown_model}, effort={shown_effort}）。この委譲の配置宣言が未提示なら、今ここで1行書く（例: `A: 役割=実装物量 →〔Codex 中位×medium×codex_work〕`）。以後の委譲は 02_models.md 決定表の行を写して宣言してから渡す。Agent/Workflow の model 省略が許されるのは検証・反証・裁定系のみ（sidecar は .codex-sidecar.yml defaults も正当経路）。xhigh/max は要正当化。迷ったら安い方。以後は明白違反時のみ通知する。")
    except Exception:
        error_log("delegation-gate-hook")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        error_log("delegation-gate-hook")
