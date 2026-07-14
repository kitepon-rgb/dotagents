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


def error_log():
    try:
        os.makedirs(STATE_DIR, exist_ok=True)
        with open(os.path.join(STATE_DIR, "errors.log"), "a", encoding="utf-8") as handle:
            handle.write(f"{datetime.datetime.now().isoformat()} todo-gate-hook parse-fail\n")
    except Exception:
        pass


def run_git(cwd, *args):
    result = subprocess.run(["git", "-C", cwd, *args], capture_output=True, text=True, encoding="utf-8")
    if result.returncode:
        raise RuntimeError
    return result.stdout


def gc():
    try:
        cutoff = time.time() - 7 * 24 * 60 * 60
        for entry in os.scandir(STATE_DIR):
            if entry.is_file() and entry.stat().st_mtime < cutoff:
                os.unlink(entry.path)
    except Exception:
        pass


def repo_info(cwd):
    root = run_git(cwd, "rev-parse", "--show-toplevel").strip()
    porcelain = run_git(root, "status", "--porcelain")
    head = run_git(root, "rev-parse", "HEAD").strip()
    return root, hashlib.sha1(root.encode()).hexdigest()[:12], hashlib.sha1(porcelain.encode()).hexdigest(), head, porcelain


def session_key(session_id):
    return hashlib.sha256(session_id.encode("utf-8")).hexdigest()


def snapshot_path(session_id, repo_key):
    return os.path.join(STATE_DIR, f"{session_key(session_id)}.{repo_key}.snapshot")


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


def session_start(data):
    session_id, source, cwd = data["session_id"], data["source"], data["cwd"]
    if not all(isinstance(value, str) for value in (session_id, source, cwd)):
        raise ValueError
    root, repo_key, porcelain_hash, head, _ = repo_info(cwd)
    os.makedirs(STATE_DIR, exist_ok=True)
    key = session_key(session_id)
    snap = snapshot_path(session_id, repo_key)
    if not os.path.exists(snap):
        write_snapshot(snap, porcelain_hash, head)
    if source == "compact":
        for suffix in ("placement-warn", "onset-info"):
            try:
                os.unlink(os.path.join(STATE_DIR, f"{key}.{suffix}"))
            except FileNotFoundError:
                pass
    if os.environ.get("DOTAGENTS_TODO_GATE") == "off":
        return
    if source not in ("startup", "clear"):
        return
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
    sys.stdout.write("INFO: docs/ のプラン状況: " + "・".join(fragments) + "。プランの維持・完了処理の方針は、グローバル CLAUDE.md / AGENTS.md「計画文書の作法」を参照。この一覧は現在の依頼範囲を変更しません。\n")


def stop(data):
    session_id, cwd = data["session_id"], data["cwd"]
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
    message = f"INFO: 前ターンでは作業差分（{summary}）が検出され、docs/ のプラン正本（{', '.join(os.path.basename(path) for path in plans)}）には同じターンの更新が確認されませんでした。対象作業の進捗管理方法は、グローバル CLAUDE.md / AGENTS.md「計画文書の作法」を参照。この情報は今回の依頼範囲を広げず、前ターンの応答を再開する指示でもありません。"
    with open(os.path.join(STATE_DIR, f"{session_key(session_id)}.todo-pending"), "w", encoding="utf-8") as handle:
        handle.write(message + "\n")


def main():
    raw = sys.stdin.read()
    if len(sys.argv) != 2 or sys.argv[1] not in ("session-start", "stop"):
        return
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError
    except Exception:
        error_log()
        return
    required = ("session_id", "source", "cwd") if sys.argv[1] == "session-start" else ("session_id", "cwd", "stop_hook_active")
    if any(key not in data for key in required):
        error_log()
        return
    try:
        if sys.argv[1] == "session-start":
            session_start(data)
        else:
            stop(data)
    except Exception:
        return


if __name__ == "__main__":
    try:
        main()
    except Exception:
        error_log()
