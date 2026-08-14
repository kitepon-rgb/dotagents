#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/.codex/sessions/2026/07/17"

python_bin=python3
if [[ "${OS:-}" == "Windows_NT" ]]; then python_bin=python; fi
"$python_bin" - "$repo" "$tmp/.codex/sessions/2026/07/17" <<'PY'
import json
import sys
import tomllib
from pathlib import Path

repo = Path(sys.argv[1])
sessions = Path(sys.argv[2])
role = tomllib.loads((repo / "codex/agents/refuter.toml").read_text(encoding="utf-8"))
for role_file in (repo / "codex/agents").glob("*.toml"):
    assert "sandbox_mode" not in tomllib.loads(role_file.read_text(encoding="utf-8")), role_file


def write_rollout(name: str, agent_path, developer_text: str) -> None:
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
write_rollout("null-path", None, role["developer_instructions"])
PY

output="$({ CODEX_HOME="$tmp/.codex" "$repo/bin/verify-codex-agent-routing.sh" refuter /root/refuter_crlf; } 2>&1)"
grep -Fq 'developer_instructions: applied' <<<"$output"
grep -Fq 'sandbox: danger-full-access' <<<"$output"
grep -Fq 'sandbox_contract: observed-only' <<<"$output"
grep -Fq 'routing-check: OK' <<<"$output"
if grep -Fq 'WARN: sandbox' <<<"$output"; then
  echo "FAIL: 強制できないsandboxを期待値として警告した" >&2
  exit 1
fi

if CODEX_HOME="$tmp/.codex" "$repo/bin/verify-codex-agent-routing.sh" refuter /root/refuter_missing >/dev/null 2>&1; then
  echo "FAIL: developer instructions欠落を拒否しなかった" >&2
  exit 1
fi

null_output="$({ CODEX_HOME="$tmp/.codex" CODEX_AGENT_ROUTING_MAX_AGE_SECONDS=300 "$repo/bin/verify-codex-agent-routing.sh" refuter /root/refuter_null; } 2>&1 || true)"
grep -Fq "agent_path='/root/refuter_null' が見つからない" <<<"$null_output"

echo "agent-routing-verifier: OK"
