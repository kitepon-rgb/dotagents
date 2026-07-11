#!/usr/bin/env bash
# bin/codex-callout-hook.sh の空打ちテスト（X1-X5）。既存 smoke.sh（Claude 側）は触らない。
set -u

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
STATE=$(mktemp -d)
REPO=$(mktemp -d)
trap 'rm -rf "$STATE" "$REPO"' EXIT
export XDG_CACHE_HOME="$STATE"
HOOK="$ROOT/bin/codex-callout-hook.sh"

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

# 対象外サブコマンド／引数なし → 沈黙
run x0-noargs python3 "$HOOK" <<<'{}' && [ "$RUN_BYTES" -eq 0 ] && pass x0-noargs || fail_case x0-noargs
run x0-badcmd python3 "$HOOK" bogus <<<'{}' && [ "$RUN_BYTES" -eq 0 ] && pass x0-badcmd || fail_case x0-badcmd

# --- X2 pre-tool-use fast-path ---
run x2-fastpath-other python3 "$HOOK" pre-tool-use <<<'{"session_id":"p0","tool_name":"apply_patch","tool_input":{}}' && [ "$RUN_BYTES" -eq 0 ] && pass x2-fastpath-other || fail_case x2-fastpath-other

# update_plan 初回・step<4 → 沈黙
run x2-plan-small python3 "$HOOK" pre-tool-use <<<'{"session_id":"p1","tool_name":"update_plan","tool_input":{"plan":[{"step":"a","status":"pending"},{"step":"b","status":"pending"}]}}' \
  && [ "$RUN_BYTES" -eq 0 ] && pass x2-plan-small || fail_case x2-plan-small

# update_plan 初回・step>=4 → 正本化ゲート文言
run x2-plan-canon python3 "$HOOK" pre-tool-use <<EOF
{"session_id":"p2","tool_name":"update_plan","tool_input":{"plan":[{"step":"a","status":"pending"},{"step":"b","status":"pending"},{"step":"c","status":"pending"},{"step":"d","status":"pending"}]}}
EOF
json && [[ "$RUN_OUT" == *"正本化ゲート発火"* ]] && pass x2-plan-canon || fail_case x2-plan-canon

# 同一セッション2回目の update_plan（4件以上でも）→ 初回スロットル済みで沈黙
run x2-plan-canon-2nd python3 "$HOOK" pre-tool-use <<EOF
{"session_id":"p2","tool_name":"update_plan","tool_input":{"plan":[{"step":"a","status":"pending"},{"step":"b","status":"pending"},{"step":"c","status":"pending"},{"step":"d","status":"pending"}]}}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x2-plan-canon-2nd || fail_case x2-plan-canon-2nd

# 全 step completed → TODO 消化文言（別セッションで独立に発火することを確認）
run x2-plan-done python3 "$HOOK" pre-tool-use <<EOF
{"session_id":"p3","tool_name":"update_plan","tool_input":{"plan":[{"step":"a","status":"completed"},{"step":"b","status":"completed"}]}}
EOF
json && [[ "$RUN_OUT" == *"内蔵プランを全消化した"* ]] && pass x2-plan-done || fail_case x2-plan-done

# 同一セッション再度全 completed → スロットル済みで沈黙
run x2-plan-done-2nd python3 "$HOOK" pre-tool-use <<EOF
{"session_id":"p3","tool_name":"update_plan","tool_input":{"plan":[{"step":"a","status":"completed"},{"step":"b","status":"completed"}]}}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x2-plan-done-2nd || fail_case x2-plan-done-2nd

# DOTAGENTS_TODO_GATE=off → update_plan は沈黙
run x2-plan-off env DOTAGENTS_TODO_GATE=off python3 "$HOOK" pre-tool-use <<EOF
{"session_id":"p4","tool_name":"update_plan","tool_input":{"plan":[{"step":"a","status":"pending"},{"step":"b","status":"pending"},{"step":"c","status":"pending"},{"step":"d","status":"pending"}]}}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x2-plan-off || fail_case x2-plan-off

# spawn_agent: agent_type 欠落 → deny（1,2回目）
run x2-spawn-noagenttype-1 python3 "$HOOK" pre-tool-use <<<'{"session_id":"s1","tool_name":"spawn_agent","tool_input":{"model":"sonnet"}}' \
  && json && [[ "$RUN_OUT" == *'"deny"'* ]] && pass x2-spawn-noagenttype-1 || fail_case x2-spawn-noagenttype-1

# spawn_agent: model 日付ID → deny
run x2-spawn-dateid python3 "$HOOK" pre-tool-use <<<'{"session_id":"s2","tool_name":"spawn_agent","tool_input":{"agent_type":"implementer","model":"x-20260227"}}' \
  && json && [[ "$RUN_OUT" == *'"deny"'* ]] && pass x2-spawn-dateid || fail_case x2-spawn-dateid

# spawn_agent: 同一セッション×同一違反キーを3回連呼 → 3回目は warn に自動降格
python3 "$HOOK" pre-tool-use <<<'{"session_id":"s3","tool_name":"spawn_agent","tool_input":{"agent_type":"implementer","model":"x-20260227"}}' >/dev/null
python3 "$HOOK" pre-tool-use <<<'{"session_id":"s3","tool_name":"spawn_agent","tool_input":{"agent_type":"implementer","model":"x-20260227"}}' >/dev/null
run x2-spawn-degrade python3 "$HOOK" pre-tool-use <<<'{"session_id":"s3","tool_name":"spawn_agent","tool_input":{"agent_type":"implementer","model":"x-20260227"}}' \
  && json && [[ "$RUN_OUT" == *additionalContext* && "$RUN_OUT" != *permissionDecision* ]] && pass x2-spawn-degrade || fail_case x2-spawn-degrade

# spawn_agent: 準拠（agent_type あり・model 非日付ID）→ 沈黙
run x2-spawn-clean python3 "$HOOK" pre-tool-use <<<'{"session_id":"s4","tool_name":"spawn_agent","tool_input":{"agent_type":"implementer","model":"sonnet"}}' \
  && [ "$RUN_BYTES" -eq 0 ] && pass x2-spawn-clean || fail_case x2-spawn-clean

# DOTAGENTS_PLACEMENT_GATE=off → spawn_agent 違反があっても沈黙
run x2-spawn-off env DOTAGENTS_PLACEMENT_GATE=off python3 "$HOOK" pre-tool-use <<<'{"session_id":"s5","tool_name":"spawn_agent","tool_input":{"model":"x-20260227"}}' \
  && [ "$RUN_BYTES" -eq 0 ] && pass x2-spawn-off || fail_case x2-spawn-off

# --- X1 session-start（C2 ミラー） ---
git -C "$REPO" init -q && git -C "$REPO" config user.email smoke@example.test && git -C "$REPO" config user.name smoke
mkdir "$REPO/docs"; printf '%s\n' '- [ ] task' >"$REPO/docs/plan_x.md"; printf '%s\n' base >"$REPO/source.txt"
git -C "$REPO" add . && git -C "$REPO" commit -qm initial

run x1-stocktake python3 "$HOOK" session-start <<EOF
{"session_id":"t1","source":"startup","cwd":"$REPO"}
EOF
json && [[ "$RUN_OUT" == *'【TODO 棚卸し】'* ]] && pass x1-stocktake || fail_case x1-stocktake

run x1-resume python3 "$HOOK" session-start <<EOF
{"session_id":"t2","source":"resume","cwd":"$REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x1-resume || fail_case x1-resume

run x1-off env DOTAGENTS_TODO_GATE=off python3 "$HOOK" session-start <<EOF
{"session_id":"t3","source":"startup","cwd":"$REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x1-off || fail_case x1-off

# --- X4 stop（C3 ミラー） ---
run x4-clean python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$REPO","stop_hook_active":false}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x4-clean || fail_case x4-clean

printf '%s\n' changed >>"$REPO/source.txt"
run x4-warn python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$REPO","stop_hook_active":false}
EOF
json && [[ "$RUN_OUT" == *additionalContext* ]] && pass x4-warn || fail_case x4-warn

run x4-active python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$REPO","stop_hook_active":true}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x4-active || fail_case x4-active

run x4-off env DOTAGENTS_TODO_GATE=off python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$REPO","stop_hook_active":false}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x4-off || fail_case x4-off

# 同一ファイルへの再追記は git status --porcelain の文字列が変わらず rolling baseline が
# 「差分なし」と判定する（todo-gate-hook.sh 由来の既存挙動）ため、新規ファイルで porcelain を変える
printf '%s\n' new2 >"$REPO/source2.txt"
run x4-block-1 env DOTAGENTS_TODO_GATE=block python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$REPO","stop_hook_active":false}
EOF
json && [[ "$RUN_OUT" == *'"decision"'*'"block"'* ]] && pass x4-block-1 || fail_case x4-block-1

# block スロットルはターン内1回上限＝2回目は decision:block でなく通常の warn(additionalContext) へフォールバック
# （todo-gate-hook.sh 由来の既定仕様。沈黙ではない）
printf '%s\n' new3 >"$REPO/source3.txt"
run x4-block-2 env DOTAGENTS_TODO_GATE=block python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$REPO","stop_hook_active":false}
EOF
json && [[ "$RUN_OUT" == *additionalContext* && "$RUN_OUT" != *'"decision"'* ]] && pass x4-block-2 || fail_case x4-block-2

# --- X3/X5 user-prompt-submit（着手ゲート毎ターん ＋ pending drain） ---
run x35-normal python3 "$HOOK" user-prompt-submit <<<'{"session_id":"u1"}' \
  && json && [[ "$RUN_OUT" == *'【着手ゲート】'* ]] && pass x35-normal || fail_case x35-normal

run x35-off env DOTAGENTS_ONSET_GATE=off python3 "$HOOK" user-prompt-submit <<<'{"session_id":"u2"}' \
  && [ "$RUN_BYTES" -eq 0 ] && pass x35-off || fail_case x35-off

mkdir -p "$STATE/dotagents/hooks"
printf '%s' 'pending-notice-text' >"$STATE/dotagents/hooks/u3.codex-pending"
run x35-pending python3 "$HOOK" user-prompt-submit <<<'{"session_id":"u3"}' \
  && json && [[ "$RUN_OUT" == *'pending-notice-text'* && "$RUN_OUT" == *'【着手ゲート】'* ]] && pass x35-pending || fail_case x35-pending
[ ! -f "$STATE/dotagents/hooks/u3.codex-pending" ] && pass x35-pending-drained || fail_case x35-pending-drained

if [ "$fail" -ne 0 ]; then exit 1; fi
printf 'ALL PASS\n'
