#!/usr/bin/env bash
# shellcheck disable=SC2015
set -u

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
STATE=$(mktemp -d)
REPO=$(mktemp -d)
HOOK_REPO=$REPO
if command -v cygpath >/dev/null 2>&1; then
  HOOK_REPO=$(cygpath -m "$REPO")
fi
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

run c1-date-info python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d1","tool_name":"Agent","tool_input":{"model":"x-20202607"}}' && json && [[ "$RUN_OUT" == *additionalContext* && "$RUN_OUT" != *permissionDecision* ]] && pass c1-date-info || fail_case c1-date-info
run c1-aiterm-info python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d2","tool_name":"mcp__aiterm__codex_agent","tool_input":{}}' && json && [[ "$RUN_OUT" == *additionalContext* && "$RUN_OUT" != *permissionDecision* ]] && pass c1-aiterm-info || fail_case c1-aiterm-info
run c1-oracle-info python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d3","tool_name":"mcp__oracle__consult","tool_input":{"preset":"chatgpt-pro-heavy"}}' && json && [[ "$RUN_OUT" == *additionalContext* && "$RUN_OUT" != *permissionDecision* ]] && pass c1-oracle-info || fail_case c1-oracle-info
run c1-ultra-info python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d4","tool_name":"Agent","tool_input":{"effort":"ultra"}}' && json && [[ "$RUN_OUT" == *additionalContext* && "$RUN_OUT" != *permissionDecision* ]] && pass c1-ultra-info || fail_case c1-ultra-info
run c1-info python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d5","tool_name":"Agent","tool_input":{"model":"sonnet","effort":"medium"}}' && json && [[ "$RUN_OUT" == *'INFO:'* && "$RUN_OUT" != *permissionDecision* ]] && pass c1-info || fail_case c1-info
run c1-silent python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{"session_id":"d5","tool_name":"Agent","tool_input":{"model":"sonnet","effort":"medium"}}' && [ "$RUN_BYTES" -eq 0 ] && pass c1-silent || fail_case c1-silent
run c1-off env DOTAGENTS_PLACEMENT_GATE=off python3 "$ROOT/bin/delegation-gate-hook.sh" <<<'{}' && [ "$RUN_BYTES" -eq 0 ] && pass c1-off || fail_case c1-off

git -C "$REPO" init -q && git -C "$REPO" config user.email smoke@example.test && git -C "$REPO" config user.name smoke
mkdir "$REPO/docs"; printf '%s\n' '- [ ] task' >"$REPO/docs/plan_x.md"; printf '%s\n' base >"$REPO/source.txt"
git -C "$REPO" add . && git -C "$REPO" commit -qm initial
run c2-stocktake python3 "$ROOT/bin/todo-gate-hook.sh" session-start <<EOF
{"session_id":"t1","source":"startup","cwd":"$HOOK_REPO"}
EOF
[[ "$RUN_OUT" == *'INFO: docs/'* ]] && pass c2-stocktake || fail_case c2-stocktake
run c3-clean python3 "$ROOT/bin/todo-gate-hook.sh" stop <<EOF
{"session_id":"t1","cwd":"$HOOK_REPO","stop_hook_active":false}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass c3-clean || fail_case c3-clean
printf '%s\n' changed >>"$REPO/source.txt"
run c3-warn python3 "$ROOT/bin/todo-gate-hook.sh" stop <<EOF
{"session_id":"t1","cwd":"$HOOK_REPO","stop_hook_active":false}
EOF
[ "$RUN_BYTES" -eq 0 ] && [ -f "$STATE/dotagents/hooks/t1.todo-pending" ] && pass c3-warn || fail_case c3-warn
run c3-active python3 "$ROOT/bin/todo-gate-hook.sh" stop <<EOF
{"session_id":"t1","cwd":"$HOOK_REPO","stop_hook_active":true}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass c3-active || fail_case c3-active

run c4-normal python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{"session_id":"u1"}' && json && [[ "$RUN_OUT" == *'INFO:'* ]] && pass c4-normal || fail_case c4-normal
run c4-silent python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{"session_id":"u1"}' && [ "$RUN_BYTES" -eq 0 ] && pass c4-silent || fail_case c4-silent
run c4-off env DOTAGENTS_ONSET_GATE=off python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{"session_id":"u2"}' && [ "$RUN_BYTES" -eq 0 ] && pass c4-off || fail_case c4-off
run c4-pending python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{"session_id":"t1"}' && json && [[ "$RUN_OUT" == *'前ターン'* ]] && pass c4-pending || fail_case c4-pending
[ ! -f "$STATE/dotagents/hooks/t1.todo-pending" ] && pass c4-pending-drained || fail_case c4-pending-drained
run c4-compact python3 "$ROOT/bin/todo-gate-hook.sh" session-start <<EOF
{"session_id":"u1","source":"compact","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass c4-compact || fail_case c4-compact
run c4-rearmed python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{"session_id":"u1"}' && json && [[ "$RUN_OUT" == *'INFO:'* ]] && pass c4-rearmed || fail_case c4-rearmed

# TODO gate off でも compact は onset/placement の再武装だけ行う
run c4-compact-todo-off env DOTAGENTS_TODO_GATE=off python3 "$ROOT/bin/todo-gate-hook.sh" session-start <<EOF
{"session_id":"u1","source":"compact","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass c4-compact-todo-off || fail_case c4-compact-todo-off
run c4-rearmed-todo-off python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{"session_id":"u1"}' && json && [[ "$RUN_OUT" == *'INFO:'* ]] && pass c4-rearmed-todo-off || fail_case c4-rearmed-todo-off

if [ "$fail" -ne 0 ]; then exit 1; fi
printf 'ALL PASS\n'
