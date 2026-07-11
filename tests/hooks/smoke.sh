#!/usr/bin/env bash
set -u

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
STATE=$(mktemp -d)
REPO=$(mktemp -d)
trap 'rm -rf "$STATE" "$REPO"' EXIT
export XDG_CACHE_HOME="$STATE"

fail=0
pass() { printf 'PASS %s\n' "$1"; }
fail_case() { printf 'FAIL %s\n' "$1"; fail=1; }
run() {
  name=$1; shift
  out=$(mktemp); err=$(mktemp)
  "$@" >"$out" 2>"$err"; status=$?
  RUN_OUT=$(cat "$out"); RUN_BYTES=$(wc -c <"$out" | tr -d ' '); RUN_ERR=$(cat "$err")
  rm -f "$out" "$err"
  if [ "$status" -ne 0 ] || [ -n "$RUN_ERR" ]; then fail_case "$name exit/stderr"; return 1; fi
  return 0
}
json() { printf '%s' "$RUN_OUT" | python3 -c 'import json,sys; json.load(sys.stdin)' >/dev/null 2>&1; }

run c1-date python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d1","tool_name":"Agent","tool_input":{"model":"x-20202607"}}' && json && [[ "$RUN_OUT" == *'"deny"'* ]] && pass c1-date || fail_case c1-date
run c1-aiterm python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d2","tool_name":"mcp__aiterm__codex_agent","tool_input":{}}' && json && [[ "$RUN_OUT" == *'"deny"'* ]] && pass c1-aiterm || fail_case c1-aiterm
run c1-oracle python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d3","tool_name":"mcp__oracle__consult","tool_input":{"preset":"chatgpt-pro-heavy"}}' && json && [[ "$RUN_OUT" == *'"deny"'* ]] && pass c1-oracle || fail_case c1-oracle
run c1-ultra python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d4","tool_name":"Agent","tool_input":{"effort":"ultra"}}' && json && [[ "$RUN_OUT" == *'"ask"'* ]] && pass c1-ultra || fail_case c1-ultra
run c1-warn python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d5","tool_name":"Agent","tool_input":{"model":"sonnet","effort":"medium"}}' && json && [[ "$RUN_OUT" == *additionalContext* && "$RUN_OUT" != *permissionDecision* ]] && pass c1-warn || fail_case c1-warn
run c1-silent python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d5","tool_name":"Agent","tool_input":{"model":"sonnet","effort":"medium"}}' && [ "$RUN_BYTES" -eq 0 ] && pass c1-silent || fail_case c1-silent
run c1-off env DOTAGENTS_PLACEMENT_GATE=off python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{}' && [ "$RUN_BYTES" -eq 0 ] && pass c1-off || fail_case c1-off

git -C "$REPO" init -q && git -C "$REPO" config user.email smoke@example.test && git -C "$REPO" config user.name smoke
mkdir "$REPO/docs"; printf '%s\n' '- [ ] task' >"$REPO/docs/plan_x.md"; printf '%s\n' base >"$REPO/source.txt"
git -C "$REPO" add . && git -C "$REPO" commit -qm initial
run c2-stocktake python3 "$ROOT/bin/todo-gate-hook.sh" session-start <<EOF
{"session_id":"t1","source":"startup","cwd":"$REPO"}
EOF
[[ "$RUN_OUT" == *'【TODO 棚卸し】'* ]] && pass c2-stocktake || fail_case c2-stocktake
run c3-clean python3 "$ROOT/bin/todo-gate-hook.sh" stop <<EOF
{"session_id":"t1","cwd":"$REPO","stop_hook_active":false}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass c3-clean || fail_case c3-clean
printf '%s\n' changed >>"$REPO/source.txt"
run c3-warn python3 "$ROOT/bin/todo-gate-hook.sh" stop <<EOF
{"session_id":"t1","cwd":"$REPO","stop_hook_active":false}
EOF
json && [[ "$RUN_OUT" == *additionalContext* ]] && pass c3-warn || fail_case c3-warn
run c3-active python3 "$ROOT/bin/todo-gate-hook.sh" stop <<EOF
{"session_id":"t1","cwd":"$REPO","stop_hook_active":true}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass c3-active || fail_case c3-active

run c4-normal python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{}' && json && [[ "$RUN_OUT" == *additionalContext* ]] && pass c4-normal || fail_case c4-normal
run c4-off env DOTAGENTS_ONSET_GATE=off python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{}' && [ "$RUN_BYTES" -eq 0 ] && pass c4-off || fail_case c4-off

if [ "$fail" -ne 0 ]; then exit 1; fi
printf 'ALL PASS\n'
