#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/.codex/sessions/2026/07/17"

python3 - "$repo" "$tmp/.codex/sessions/2026/07/17" <<'PY'
import json
import sys
import tomllib
from pathlib import Path

repo = Path(sys.argv[1])
sessions = Path(sys.argv[2])
role = tomllib.loads((repo / "codex/agents/refuter.toml").read_text(encoding="utf-8"))


def write_rollout(name: str, agent_path: str, developer_text: str) -> None:
    items = [
        {
            "type": "session_meta",
            "payload": {"agent_path": agent_path, "agent_role": role["name"]},
        },
        {
            "type": "response_item",
            "payload": {
                "type": "message",
                "role": "developer",
                "content": [{"type": "input_text", "text": developer_text}],
            },
        },
        {
            "type": "turn_context",
            "payload": {
                "model": role["model"],
                "effort": role["model_reasoning_effort"],
                "sandbox_policy": {"type": "danger-full-access"},
            },
        },
    ]
    path = sessions / f"rollout-{name}.jsonl"
    path.write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in items), encoding="utf-8")


write_rollout(
    "crlf",
    "/root/refuter_crlf",
    role["developer_instructions"].replace("\n", "\r\n"),
)
write_rollout("missing", "/root/refuter_missing", "別のdeveloper instruction")
PY

output="$({ CODEX_HOME="$tmp/.codex" "$repo/bin/verify-codex-agent-routing.sh" refuter /root/refuter_crlf; } 2>&1)"
grep -Fq 'developer_instructions: applied' <<<"$output"
grep -Fq 'routing-check: OK' <<<"$output"

if CODEX_HOME="$tmp/.codex" "$repo/bin/verify-codex-agent-routing.sh" refuter /root/refuter_missing >/dev/null 2>&1; then
  echo "FAIL: developer instructions欠落を拒否しなかった" >&2
  exit 1
fi

echo "agent-routing-verifier: OK"
