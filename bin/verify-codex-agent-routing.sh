#!/usr/bin/env bash
# Codex 子セッションが指定 role の実効設定で起動したかを rollout JSONL から検証する。
# 実作業はこの検証が green になってから follow-up task として渡す。
set -euo pipefail

usage() {
  echo "使い方: verify-codex-agent-routing <role> <agent-path>" >&2
  echo "例: verify-codex-agent-routing implementer /root/implementer_smoke" >&2
}

if [ "$#" -ne 2 ]; then
  usage
  exit 2
fi

role="$1"
agent_path="$2"
case "$role" in
  *[!A-Za-z0-9_-]*|'') echo "FAIL: 不正な role: $role" >&2; exit 2 ;;
esac
case "$agent_path" in
  /*) ;;
  *) echo "FAIL: agent-path は /root/... の絶対タスクパスで指定: $agent_path" >&2; exit 2 ;;
esac

self="${BASH_SOURCE[0]}"
while [ -L "$self" ]; do self="$(readlink "$self")"; done
repo="$(cd "$(dirname "$self")/.." && pwd)"
role_file="$repo/codex/agents/$role.toml"
sessions_dir="${CODEX_HOME:-$HOME/.codex}/sessions"
max_age_seconds="${CODEX_AGENT_ROUTING_MAX_AGE_SECONDS:-300}"
require_sandbox="${CODEX_AGENT_ROUTING_REQUIRE_SANDBOX:-0}"

case "$require_sandbox" in
  0|1) ;;
  *) echo "FAIL: CODEX_AGENT_ROUTING_REQUIRE_SANDBOX は 0 または 1 で指定" >&2; exit 2 ;;
esac

if [ ! -f "$role_file" ]; then
  echo "FAIL: role 定義が不在: $role_file" >&2
  exit 1
fi
if [ ! -d "$sessions_dir" ]; then
  echo "FAIL: Codex sessions が不在: $sessions_dir" >&2
  exit 1
fi

python3 - "$role_file" "$sessions_dir" "$role" "$agent_path" "$max_age_seconds" "$require_sandbox" <<'PY'
import json
import re
import sys
import time
from pathlib import Path

role_file = Path(sys.argv[1])
sessions_dir = Path(sys.argv[2])
expected_role = sys.argv[3]
expected_agent_path = sys.argv[4]
try:
    max_age_seconds = int(sys.argv[5])
except ValueError:
    print(f"FAIL: CODEX_AGENT_ROUTING_MAX_AGE_SECONDS は整数で指定: {sys.argv[5]}", file=sys.stderr)
    raise SystemExit(2)
require_sandbox = sys.argv[6] == "1"

role_text = role_file.read_text(encoding="utf-8")


def parse_quoted(key: str):
    match = re.search(rf'(?m)^{re.escape(key)}\s*=\s*("(?:[^"\\]|\\.)*")\s*$', role_text)
    if not match:
        return None
    return json.loads(match.group(1))


def parse_multiline(key: str):
    match = re.search(
        rf'(?ms)^{re.escape(key)}\s*=\s*"""\n?(.*?)\n?"""\s*$',
        role_text,
    )
    return match.group(1) if match else None


role_config = {
    "name": parse_quoted("name"),
    "description": parse_quoted("description"),
    "model": parse_quoted("model"),
    "model_reasoning_effort": parse_quoted("model_reasoning_effort"),
    "sandbox_mode": parse_quoted("sandbox_mode"),
    "developer_instructions": parse_multiline("developer_instructions"),
}

required = ("name", "description", "developer_instructions")
missing = [key for key in required if not role_config.get(key)]
if missing:
    print(f"FAIL: {role_file} の必須キー欠落: {', '.join(missing)}", file=sys.stderr)
    raise SystemExit(1)
if role_config["name"] != expected_role:
    print(
        f"FAIL: role 引数 {expected_role!r} と TOML name {role_config['name']!r} が不一致",
        file=sys.stderr,
    )
    raise SystemExit(1)

expected = {
    "agent_role": expected_role,
    "model": role_config.get("model"),
    "effort": role_config.get("model_reasoning_effort"),
}
expected_sandbox = role_config.get("sandbox_mode")


def first_session_meta(path: Path):
    try:
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                item = json.loads(line)
                if item.get("type") == "session_meta":
                    return item
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    return None


deadline = time.time() + 10
rollout_path = None
session_meta = None
while time.time() < deadline:
    now = time.time()
    candidates = sorted(
        sessions_dir.rglob("rollout-*.jsonl"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    for candidate in candidates:
        if now - candidate.stat().st_mtime > max_age_seconds:
            break
        meta = first_session_meta(candidate)
        if not meta:
            continue
        payload = meta.get("payload", {})
        if payload.get("agent_path") == expected_agent_path:
            rollout_path = candidate
            session_meta = meta
            break
    if rollout_path:
        break
    time.sleep(0.25)

if rollout_path is None or session_meta is None:
    print(
        f"FAIL: 直近 {max_age_seconds} 秒の rollout に agent_path={expected_agent_path!r} が見つからない",
        file=sys.stderr,
    )
    raise SystemExit(1)

turn_context = None
developer_texts = []
deadline = time.time() + 10
while time.time() < deadline and turn_context is None:
    developer_texts.clear()
    try:
        with rollout_path.open(encoding="utf-8") as handle:
            for line in handle:
                item = json.loads(line)
                # full-history fork の rollout には親履歴の turn_context も入るため、
                # 先頭ではなく末尾（現在の子 turn）を採用する。
                if item.get("type") == "turn_context":
                    turn_context = item.get("payload", {})
                if item.get("type") != "response_item":
                    continue
                payload = item.get("payload", {})
                if payload.get("type") != "message" or payload.get("role") != "developer":
                    continue
                for content in payload.get("content", []):
                    if content.get("type") == "input_text":
                        developer_texts.append(content.get("text", ""))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        turn_context = None
    if turn_context is None:
        time.sleep(0.25)

if turn_context is None:
    print(f"FAIL: turn_context がまだ記録されていない: {rollout_path}", file=sys.stderr)
    raise SystemExit(1)

meta_payload = session_meta.get("payload", {})
actual = {
    "agent_role": meta_payload.get("agent_role"),
    "model": turn_context.get("model"),
    "effort": turn_context.get("effort"),
    "sandbox": (turn_context.get("sandbox_policy") or {}).get("type"),
}

errors = []
for key, expected_value in expected.items():
    if expected_value is not None and actual.get(key) != expected_value:
        errors.append(f"{key}: expected={expected_value!r}, actual={actual.get(key)!r}")

def normalize_newlines(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n")


expected_instructions = normalize_newlines(role_config["developer_instructions"]).strip()
developer_text = normalize_newlines("\n".join(developer_texts))
instructions_applied = expected_instructions in developer_text
if not instructions_applied:
    errors.append("developer_instructions: role TOML の本文が developer message に存在しない")

sandbox_mismatch = expected_sandbox is not None and actual.get("sandbox") != expected_sandbox
if sandbox_mismatch and require_sandbox:
    errors.append(
        f"sandbox: expected={expected_sandbox!r}, actual={actual.get('sandbox')!r}"
    )

print(f"rollout: {rollout_path}")
print(f"agent_path: {expected_agent_path}")
for key in ("agent_role", "model", "effort", "sandbox"):
    print(f"{key}: {actual.get(key)}")
print(f"developer_instructions: {'applied' if instructions_applied else 'missing'}")
if sandbox_mismatch and not require_sandbox:
    print(
        f"WARN: sandbox は role TOML と不一致（expected={expected_sandbox!r}, "
        f"actual={actual.get('sandbox')!r}）。routing 判定とは分離",
        file=sys.stderr,
    )

if errors:
    for error in errors:
        print(f"FAIL: {error}", file=sys.stderr)
    print("routing-check: FAIL — 実作業を渡さず、この子を停止すること", file=sys.stderr)
    raise SystemExit(1)

print("routing-check: OK — role/model/effort/developer_instructions の実効設定を確認")
PY
