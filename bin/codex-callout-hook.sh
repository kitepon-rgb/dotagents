#!/usr/bin/env python3
# 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。判定の正は docs/02_models.md
import datetime
import hashlib
import json
import os
import subprocess
import sys
import time

for stream in (sys.stdin, sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")

STATE_DIR = os.path.join(os.environ.get("XDG_CACHE_HOME") or os.path.expanduser("~/.cache"), "dotagents", "hooks")

ONSET_CONTEXT = "INFO: このセッションで実装・委譲・複数工程の作業を行う場合の進め方は、グローバル AGENTS.md の「計画文書の作法」「モデルとエフォート」および orchestrate skill を参照。会話・調査・小さな単発修正には追加対応不要。このINFO自体は、新しい作業・文書作成・委譲・依頼範囲の拡張を要求しません。"


def error_log(name):
    try:
        os.makedirs(STATE_DIR, exist_ok=True)
        with open(os.path.join(STATE_DIR, "errors.log"), "a", encoding="utf-8") as handle:
            handle.write(f"{datetime.datetime.now().isoformat()} {name} parse-fail\n")
    except Exception:
        pass


def gc():
    try:
        cutoff = time.time() - 7 * 24 * 60 * 60
        for entry in os.scandir(STATE_DIR):
            if entry.is_file() and entry.stat().st_mtime < cutoff:
                os.unlink(entry.path)
    except Exception:
        pass


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")


def run_git(cwd, *args):
    result = subprocess.run(["git", "-C", cwd, *args], capture_output=True, text=True, encoding="utf-8")
    if result.returncode:
        raise RuntimeError
    return result.stdout


def repo_info(cwd):
    root = run_git(cwd, "rev-parse", "--show-toplevel").strip()
    porcelain = run_git(root, "status", "--porcelain")
    head = run_git(root, "rev-parse", "HEAD").strip()
    return root, hashlib.sha1(root.encode()).hexdigest()[:12], hashlib.sha1(porcelain.encode()).hexdigest(), head, porcelain


def snapshot_path(session_id, repo_key):
    # Claude 側 todo-gate-hook の *.snapshot と同一 STATE_DIR を共有するが、
    # session_id が別空間のため衝突しない。可読性のため接尾辞だけ変える。
    return os.path.join(STATE_DIR, f"{session_id}.{repo_key}.codex-snapshot")


def write_snapshot(path, porcelain_hash, head):
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(f"{porcelain_hash}\n{head}\n")


def plan_files(root):
    docs = os.path.join(root, "docs")
    if not os.path.isdir(docs):
        return []
    return sorted(name for name in os.listdir(docs) if (name.startswith("plan_") or name.startswith("queue_")) and name.endswith(".md") and os.path.isfile(os.path.join(docs, name)))


def status_paths(porcelain):
    paths = set()
    for line in porcelain.splitlines():
        if len(line) < 4:
            continue
        value = line[3:]
        if " -> " in value:
            value = value.split(" -> ", 1)[1]
        paths.add(value.strip('"'))
    return paths


# --- X1: session-start（C2 ミラー。棚卸し文言は additionalContext 契約で統一） ---
def session_start(data):
    session_id, source, cwd = data.get("session_id"), data.get("source"), data.get("cwd")
    if not all(isinstance(value, str) for value in (session_id, source, cwd)):
        raise ValueError
    os.makedirs(STATE_DIR, exist_ok=True)
    if source == "compact":
        for suffix in ("codex-onset-info", "codex-placement-info"):
            try:
                os.unlink(os.path.join(STATE_DIR, f"{session_id}.{suffix}"))
            except FileNotFoundError:
                pass
    if os.environ.get("DOTAGENTS_TODO_GATE") == "off":
        return
    root, repo_key, porcelain_hash, head, _ = repo_info(cwd)
    snap = snapshot_path(session_id, repo_key)
    if not os.path.exists(snap):
        write_snapshot(snap, porcelain_hash, head)
    if source not in ("startup", "clear"):
        return
    # stocktake はリポキーのみ＝Claude 側 C2 と意図的に共有（同一リポの棚卸し表示を統合抑制）
    stocktake = os.path.join(STATE_DIR, f"{repo_key}.stocktake")
    if os.path.exists(stocktake) and time.time() - os.path.getmtime(stocktake) < 24 * 60 * 60:
        return
    entries, complete = [], []
    for name in plan_files(root):
        path = os.path.join(root, "docs", name)
        text = open(path, encoding="utf-8").read()
        unchecked = text.count("- [ ]")
        if unchecked:
            days = max(0, int((time.time() - os.path.getmtime(path)) // 86400))
            entries.append(f"{name}（未消化 {unchecked}・最終更新 {days} 日前）")
        else:
            complete.append(name)
    archived = complete if not entries else []
    if not entries and not archived:
        return
    fragments = entries[:]
    if archived:
        fragments.append("全消化済みで archive 未退避: " + "・".join(archived))
    gc()
    open(stocktake, "a", encoding="utf-8").close()
    message = "INFO: docs/ のプラン状況: " + "・".join(fragments) + "。プランの維持・完了処理の方針は、グローバル AGENTS.md「計画文書の作法」を参照。この一覧は現在の依頼範囲を変更しません。"
    emit({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": message}})


# --- X2: pre-tool-use（update_plan / spawn_agent のみ。それ以外は main() の fast-path で弾く） ---
def pre_tool_use(data):
    session_id = data.get("session_id")
    tool_name = data.get("tool_name")
    tool_input = data.get("tool_input")
    if not isinstance(session_id, str) or not isinstance(tool_input, dict):
        raise ValueError

    if tool_name == "update_plan":
        if os.environ.get("DOTAGENTS_TODO_GATE") == "off":
            return
        plan = tool_input.get("plan")
        if not isinstance(plan, list):
            return
        statuses = [item.get("status") for item in plan if isinstance(item, dict)]
        os.makedirs(STATE_DIR, exist_ok=True)
        messages = []

        canon_path = os.path.join(STATE_DIR, f"{session_id}.codex-plan-canon")
        if not os.path.exists(canon_path):
            open(canon_path, "a", encoding="utf-8").close()
            if len(plan) >= 4:
                messages.append("INFO: Codex の内蔵プランが作成されました。永続プランの保存先とTODO管理の方針は、グローバル AGENTS.md「計画文書の作法」を参照。内蔵プランはセッション内の補助情報であり、正本の代替になるかは同規約に従います。")

        if statuses and all(status == "completed" for status in statuses):
            done_path = os.path.join(STATE_DIR, f"{session_id}.codex-plan-done")
            if not os.path.exists(done_path):
                open(done_path, "a", encoding="utf-8").close()
                messages.append("INFO: Codex の内蔵プランが全項目 completed になりました。永続プランの進捗反映と完了文書の扱いは、グローバル AGENTS.md「計画文書の作法」を参照。")

        if messages:
            gc()
            emit({"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "\n".join(messages)}})
        return

    if tool_name == "spawn_agent":
        if os.environ.get("DOTAGENTS_PLACEMENT_GATE") == "off":
            return
        os.makedirs(STATE_DIR, exist_ok=True)
        shown = os.path.join(STATE_DIR, f"{session_id}.codex-placement-info")
        if os.path.exists(shown):
            return
        open(shown, "a", encoding="utf-8").close()
        gc()
        message = "INFO: このセッションで最初のネイティブ委譲を検出しました。配置・routing・委譲契約の基準は、グローバル AGENTS.md「モデルとエフォート」および docs/02_models.md を参照。このINFO自体は追加の委譲や依頼範囲の拡張を要求しません。"
        emit({"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": message}})
        return


# --- X3+X5: user-prompt-submit（セッション初回INFO ＋ pending drain） ---
def user_prompt_submit(data):
    session_id = data.get("session_id")
    parts = []
    if isinstance(session_id, str) and os.environ.get("DOTAGENTS_ONSET_GATE") != "off":
        os.makedirs(STATE_DIR, exist_ok=True)
        shown = os.path.join(STATE_DIR, f"{session_id}.codex-onset-info")
        if not os.path.exists(shown):
            open(shown, "a", encoding="utf-8").close()
            parts.append(ONSET_CONTEXT)
    if isinstance(session_id, str) and os.environ.get("DOTAGENTS_TODO_GATE") != "off":
        pending_path = os.path.join(STATE_DIR, f"{session_id}.codex-pending")
        if os.path.exists(pending_path):
            try:
                content = open(pending_path, encoding="utf-8").read().strip()
            except Exception:
                content = ""
            try:
                os.unlink(pending_path)
            except Exception:
                pass
            if content:
                parts.append(content)
    if parts:
        emit({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": "\n".join(parts)}})


# --- X4: stop（C3 ミラー。rolling baseline で検出し pending 保存） ---
def stop(data):
    session_id, cwd = data.get("session_id"), data.get("cwd")
    if not isinstance(session_id, str) or not isinstance(cwd, str):
        raise ValueError
    if os.environ.get("DOTAGENTS_TODO_GATE") == "off":
        return
    if data.get("stop_hook_active") is True:
        return
    root, repo_key, porcelain_hash, head, porcelain = repo_info(cwd)
    os.makedirs(STATE_DIR, exist_ok=True)
    snap = snapshot_path(session_id, repo_key)
    if not os.path.exists(snap):
        write_snapshot(snap, porcelain_hash, head)
        return
    try:
        old_porcelain, old_head = open(snap, encoding="utf-8").read().splitlines()[:2]
    except Exception:
        write_snapshot(snap, porcelain_hash, head)
        return
    if old_porcelain == porcelain_hash and old_head == head:
        write_snapshot(snap, porcelain_hash, head)
        return
    paths = status_paths(porcelain)
    commits = 0
    if old_head != head:
        try:
            paths.update(filter(None, run_git(root, "diff", "--name-only", old_head, head).splitlines()))
            commits = int(run_git(root, "rev-list", "--count", f"{old_head}..{head}").strip())
        except Exception:
            write_snapshot(snap, porcelain_hash, head)
            return
    plans = ["docs/" + name for name in plan_files(root) if name.startswith("plan_")]
    write_snapshot(snap, porcelain_hash, head)
    if not plans or any(path in paths for path in plans):
        return
    gc()
    summary = f"{len(paths)} ファイル/コミット {commits}"
    message = f"INFO: 前ターンでは作業差分（{summary}）が検出され、docs/ のプラン正本（{', '.join(os.path.basename(path) for path in plans)}）には同じターンの更新が確認されませんでした。対象作業の進捗管理方法は、グローバル AGENTS.md「計画文書の作法」を参照。この情報は今回の依頼範囲を広げず、前ターンの応答を再開する指示でもありません。"
    with open(os.path.join(STATE_DIR, f"{session_id}.codex-pending"), "w", encoding="utf-8") as handle:
        handle.write(message + "\n")


def main():
    raw = sys.stdin.read()
    if len(sys.argv) != 2 or sys.argv[1] not in ("session-start", "pre-tool-use", "user-prompt-submit", "stop"):
        return
    cmd = sys.argv[1]

    # fast-path: pre-tool-use は matcher が無く全ツールで発火するため、
    # JSON をパースする前に対象外ツールを軽量な文字列判定で弾く（150-300ms 税対策）。
    if cmd == "pre-tool-use" and "update_plan" not in raw and "spawn_agent" not in raw:
        return

    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError
    except Exception:
        error_log("codex-callout-hook")
        return

    try:
        if cmd == "session-start":
            session_start(data)
        elif cmd == "pre-tool-use":
            pre_tool_use(data)
        elif cmd == "user-prompt-submit":
            user_prompt_submit(data)
        elif cmd == "stop":
            stop(data)
    except Exception:
        return


if __name__ == "__main__":
    try:
        main()
    except Exception:
        error_log("codex-callout-hook")
