#!/usr/bin/env bash
# shellcheck disable=SC2015
# bin/codex-callout-hook.sh の空打ちテスト（X1-X5）。既存 smoke.sh（Claude 側）は触らない。
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
session_key() { printf '%s' "$1" | python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest())'; }

# 対象外サブコマンド／引数なし → 沈黙
run x0-noargs python3 "$HOOK" <<<'{}' && [ "$RUN_BYTES" -eq 0 ] && pass x0-noargs || fail_case x0-noargs
run x0-badcmd python3 "$HOOK" bogus <<<'{}' && [ "$RUN_BYTES" -eq 0 ] && pass x0-badcmd || fail_case x0-badcmd

# --- X2 pre-tool-use fast-path ---
run x2-fastpath-other python3 "$HOOK" pre-tool-use <<<'{"session_id":"p0","tool_name":"apply_patch","tool_input":{}}' && [ "$RUN_BYTES" -eq 0 ] && pass x2-fastpath-other || fail_case x2-fastpath-other

# update_plan 初回・step<4 → 沈黙
run x2-plan-small python3 "$HOOK" pre-tool-use <<<'{"session_id":"p1","tool_name":"update_plan","tool_input":{"plan":[{"step":"a","status":"pending"},{"step":"b","status":"pending"}]}}' \
  && [ "$RUN_BYTES" -eq 0 ] && pass x2-plan-small || fail_case x2-plan-small

# update_plan 初回・step>=4 → レーン別の計画文言
run x2-plan-canon python3 "$HOOK" pre-tool-use <<EOF
{"session_id":"p2","tool_name":"update_plan","tool_input":{"plan":[{"step":"a","status":"pending"},{"step":"b","status":"pending"},{"step":"c","status":"pending"},{"step":"d","status":"pending"}]}}
EOF
json && [[ "$RUN_OUT" == *"通常レーンは内蔵planで足り"* && "$RUN_OUT" == *"統括レーンだけ"* ]] && pass x2-plan-canon || fail_case x2-plan-canon

# 同一セッション2回目の update_plan（4件以上でも）→ 初回スロットル済みで沈黙
run x2-plan-canon-2nd python3 "$HOOK" pre-tool-use <<EOF
{"session_id":"p2","tool_name":"update_plan","tool_input":{"plan":[{"step":"a","status":"pending"},{"step":"b","status":"pending"},{"step":"c","status":"pending"},{"step":"d","status":"pending"}]}}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x2-plan-canon-2nd || fail_case x2-plan-canon-2nd

# 全 step completed → TODO 消化文言（別セッションで独立に発火することを確認）
run x2-plan-done python3 "$HOOK" pre-tool-use <<EOF
{"session_id":"p3","tool_name":"update_plan","tool_input":{"plan":[{"step":"a","status":"completed"},{"step":"b","status":"completed"}]}}
EOF
json && [[ "$RUN_OUT" == *"completed"* ]] && pass x2-plan-done || fail_case x2-plan-done

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

# spawn_agent: 引数に関係なく初回はINFO、同一セッション2回目は沈黙
run x2-spawn-info python3 "$HOOK" pre-tool-use <<<'{"session_id":"s1","tool_name":"spawn_agent","tool_input":{"model":"x-20260227"}}' \
  && json && [[ "$RUN_OUT" == *'INFO:'* && "$RUN_OUT" != *permissionDecision* ]] && pass x2-spawn-info || fail_case x2-spawn-info
run x2-spawn-silent python3 "$HOOK" pre-tool-use <<<'{"session_id":"s1","tool_name":"spawn_agent","tool_input":{"agent_type":"implementer"}}' \
  && [ "$RUN_BYTES" -eq 0 ] && pass x2-spawn-silent || fail_case x2-spawn-silent

# DOTAGENTS_PLACEMENT_GATE=off → spawn_agent は沈黙
run x2-spawn-off env DOTAGENTS_PLACEMENT_GATE=off python3 "$HOOK" pre-tool-use <<<'{"session_id":"s5","tool_name":"spawn_agent","tool_input":{}}' \
  && [ "$RUN_BYTES" -eq 0 ] && pass x2-spawn-off || fail_case x2-spawn-off

# --- X1 session-start（C2 ミラー） ---
git -C "$REPO" init -q && git -C "$REPO" config user.email smoke@example.test && git -C "$REPO" config user.name smoke
mkdir "$REPO/docs"; printf '%s\n' '- [ ] task' >"$REPO/docs/plan_x.md"; printf '%s\n' base >"$REPO/source.txt"
git -C "$REPO" add . && git -C "$REPO" commit -qm initial

run x1-stocktake python3 "$HOOK" session-start <<EOF
{"session_id":"t1","source":"startup","cwd":"$HOOK_REPO"}
EOF
json && [[ "$RUN_OUT" == *'INFO: docs/'* ]] && pass x1-stocktake || fail_case x1-stocktake

run x1-resume python3 "$HOOK" session-start <<EOF
{"session_id":"t2","source":"resume","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x1-resume || fail_case x1-resume

run x1-off env DOTAGENTS_TODO_GATE=off python3 "$HOOK" session-start <<EOF
{"session_id":"t3","source":"startup","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x1-off || fail_case x1-off

# --- X4 stop（C3 ミラー） ---
run x4-clean python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$HOOK_REPO","stop_hook_active":false}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x4-clean || fail_case x4-clean

printf '%s\n' changed >>"$REPO/source.txt"
run x4-warn python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$HOOK_REPO","stop_hook_active":false}
EOF
[ "$RUN_BYTES" -eq 0 ] && [ -f "$STATE/dotagents/hooks/$(session_key t1).codex-pending" ] && pass x4-warn || fail_case x4-warn

# dirty snapshot から同一HEADのcleanへ戻った時も、直前の変更pathを保持して0ファイルと誤表示しない。
git -C "$REPO" restore source.txt
run x4-dirty-clean python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$HOOK_REPO","stop_hook_active":false}
EOF
pending=$(cat "$STATE/dotagents/hooks/$(session_key t1).codex-pending")
[ "$RUN_BYTES" -eq 0 ] && [[ "$pending" == *'1 ファイルの作業差分を解消'* && "$pending" != *'0 ファイル'* ]] && pass x4-dirty-clean || fail_case x4-dirty-clean

# 配布前の2行snapshotでも、dirty→cleanを0ファイルとは表示しない。
printf '%s\n' legacy >>"$REPO/source.txt"
run x4-legacy-baseline python3 "$HOOK" stop <<EOF
{"session_id":"t-legacy","cwd":"$HOOK_REPO","stop_hook_active":false}
EOF
legacy_snapshot=$(find "$STATE/dotagents/hooks" -maxdepth 1 -name "$(session_key t-legacy).*codex-snapshot" -print -quit)
sed -n '1,2p' "$legacy_snapshot" >"$legacy_snapshot.old"
mv "$legacy_snapshot.old" "$legacy_snapshot"
git -C "$REPO" restore source.txt
run x4-legacy-dirty-clean python3 "$HOOK" stop <<EOF
{"session_id":"t-legacy","cwd":"$HOOK_REPO","stop_hook_active":false}
EOF
pending=$(cat "$STATE/dotagents/hooks/$(session_key t-legacy).codex-pending")
[ "$RUN_BYTES" -eq 0 ] && [[ "$pending" == *'dirtyだった作業差分を解消'* && "$pending" != *'0 ファイル'* ]] && pass x4-legacy-dirty-clean || fail_case x4-legacy-dirty-clean

run x4-active python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$HOOK_REPO","stop_hook_active":true}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x4-active || fail_case x4-active

run x4-off env DOTAGENTS_TODO_GATE=off python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$HOOK_REPO","stop_hook_active":false}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x4-off || fail_case x4-off

# block 値でもStopは止めず、pending保存だけ
printf '%s\n' new2 >"$REPO/source2.txt"
run x4-block-1 env DOTAGENTS_TODO_GATE=block python3 "$HOOK" stop <<EOF
{"session_id":"t1","cwd":"$HOOK_REPO","stop_hook_active":false}
EOF
[ "$RUN_BYTES" -eq 0 ] && [ -f "$STATE/dotagents/hooks/$(session_key t1).codex-pending" ] && pass x4-block-1 || fail_case x4-block-1

# --- X3/X5 user-prompt-submit（セッション1回のINFO ＋ pending drain） ---
run x35-normal python3 "$HOOK" user-prompt-submit <<<'{"session_id":"u1"}' \
  && json && [[ "$RUN_OUT" == *'通常レーン'* && "$RUN_OUT" == *'対象限定commitだけで閉じます'* ]] && pass x35-normal || fail_case x35-normal

run x35-silent python3 "$HOOK" user-prompt-submit <<<'{"session_id":"u1"}' \
  && [ "$RUN_BYTES" -eq 0 ] && pass x35-silent || fail_case x35-silent

run x35-off env DOTAGENTS_ONSET_GATE=off python3 "$HOOK" user-prompt-submit <<<'{"session_id":"u2"}' \
  && [ "$RUN_BYTES" -eq 0 ] && pass x35-off || fail_case x35-off

mkdir -p "$STATE/dotagents/hooks"
printf '%s' 'pending-notice-text' >"$STATE/dotagents/hooks/$(session_key u3).codex-pending"
run x35-pending python3 "$HOOK" user-prompt-submit <<<'{"session_id":"u3"}' \
  && json && [[ "$RUN_OUT" == *'pending-notice-text'* && "$RUN_OUT" == *'INFO:'* ]] && pass x35-pending || fail_case x35-pending
[ ! -f "$STATE/dotagents/hooks/$(session_key u3).codex-pending" ] && pass x35-pending-drained || fail_case x35-pending-drained

run x35-compact python3 "$HOOK" session-start <<EOF
{"session_id":"u1","source":"compact","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass x35-compact || fail_case x35-compact
run x35-rearmed python3 "$HOOK" user-prompt-submit <<<'{"session_id":"u1"}' \
  && json && [[ "$RUN_OUT" == *'INFO:'* ]] && pass x35-rearmed || fail_case x35-rearmed

# TODO gate off なら既存 pending も配送しない
printf '%s' 'must-stay-pending' >"$STATE/dotagents/hooks/$(session_key u4).codex-pending"
run x35-pending-off env DOTAGENTS_TODO_GATE=off DOTAGENTS_ONSET_GATE=off python3 "$HOOK" user-prompt-submit <<<'{"session_id":"u4"}' \
  && [ "$RUN_BYTES" -eq 0 ] && [ -f "$STATE/dotagents/hooks/$(session_key u4).codex-pending" ] && pass x35-pending-off || fail_case x35-pending-off

# 絶対path・../・長大入力でも Codex hook は固定長 digest filename だけを参照する。
for session in "$STATE/codex-absolute" '../codex-outside' "$(python3 -c 'print("y" * 10000)')"; do
  key=$(session_key "$session")
  printf '%s' 'digest-pending' >"$STATE/dotagents/hooks/$key.codex-pending"
  run x6-session-key python3 "$HOOK" user-prompt-submit <<EOF
{"session_id":"$session"}
EOF
  json && [[ "$RUN_OUT" == *'digest-pending'* ]] && [ ! -e "$STATE/dotagents/hooks/$key.codex-pending" ] && pass x6-session-key || fail_case x6-session-key
done
[ ! -e "$STATE/codex-absolute.codex-pending" ] && [ ! -e "$STATE/dotagents/codex-outside.codex-pending" ] && pass x6-session-key-no-escape || fail_case x6-session-key-no-escape

# Codex frontendは共通Lattice coreのINFOをadditionalContextへ包む。
PYTHON_EXE=$(command -v python3)
mkdir -p "$STATE/git-only" "$STATE/lattice-bin" "$REPO/.lattice/todo" "$REPO/.lattice/generated"
ln -s "$(command -v git)" "$STATE/git-only/git"
cat >"$STATE/lattice-bin/lattice" <<'EOF'
#!/usr/bin/env bash
[ "$*" = "todo status" ] || exit 2
case "${LATTICE_TEST_MODE:-valid_v1}" in
  valid_v1)
    printf '%s\n' '{"schema":"lattice.todo_status_result.v1","project_id":"dotagents","active_set":[{"plan_key":"master","task_id":"G4","label":"dotagents側アクセス配線"}],"next_ready":[{"plan_key":"master","task_id":"G5","label":"authoring CLI"}],"blocked":[],"member_heads":[{"plan_key":"master","through_sequence":4,"journal_head_digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}],"result_digest":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}' ;;
  valid_v2)
    printf '%s\n' '{"schema":"lattice.todo_status_result.v2","project_id":"dotagents","active_set":[{"plan_key":"master","task_id":"G4","label":"dotagents側アクセス配線","unmet_dependencies":[]},{"plan_key":"master","task_id":"G6","label":"host rollout","unmet_dependencies":[{"plan_key":"master","task_id":"G3"},{"plan_key":"master","project_id":"dotagents","task_id":"G2"}]}],"next_ready":[{"plan_key":"master","task_id":"G5","label":"authoring CLI"}],"blocked":[],"member_heads":[{"plan_key":"master","through_sequence":4,"journal_head_digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}],"result_digest":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}' ;;
  valid_v3)
    printf '%s\n' '{"schema":"lattice.todo_status_result.v3","project_id":"dotagents","active_set":[{"plan_key":"master","task_id":"G4","label":"dotagents側アクセス配線","unmet_dependencies":[]}],"next_ready":[{"plan_key":"master","task_id":"G5","label":"authoring CLI"}],"blocked":[],"member_heads":[{"plan_key":"master","plan_version":"rev-a","through_sequence":4,"journal_head_digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","reconciliation_state":"reconciled","revision_digest":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","reconciliation_digest":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"},{"plan_key":"queue","plan_version":"v1","through_sequence":0,"journal_head_digest":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","reconciliation_state":"registered_unreconciled","revision_digest":null,"reconciliation_digest":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"}],"result_digest":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"}' ;;
  slow_success)
    sleep 3
    printf '%s\n' '{"schema":"lattice.todo_status_result.v1","project_id":"dotagents","active_set":[{"plan_key":"master","task_id":"G4","label":"dotagents側アクセス配線"}],"next_ready":[{"plan_key":"master","task_id":"G5","label":"authoring CLI"}],"blocked":[],"member_heads":[{"plan_key":"master","through_sequence":4,"journal_head_digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}],"result_digest":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}' ;;
  invalid)
    printf '%s\n' '{"schema":"wrong"}' ;;
  invalid_dependency)
    printf '%s\n' '{"schema":"lattice.todo_status_result.v2","project_id":"dotagents","active_set":[{"plan_key":"master","task_id":"G4","label":"dotagents側アクセス配線","unmet_dependencies":[{"plan_key":"master","task_id":"G3","extra":"rejected"}]}],"next_ready":[],"blocked":[],"member_heads":[],"result_digest":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"}' ;;
  failure) exit 1 ;;
  timeout) sleep 6 ;;
esac
EOF
chmod +x "$STATE/lattice-bin/lattice"
printf '%s\n' '<html></html>' >"$REPO/.lattice/generated/gantt.html"
run lattice-codex-missing env PATH="$STATE/git-only" "$PYTHON_EXE" "$ROOT/bin/codex-lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-codex-missing","source":"startup","cwd":"$HOOK_REPO"}
EOF
json && [[ "$RUN_OUT" == *'additionalContext'* && "$RUN_OUT" == *'CLIが未導入'* ]] && pass lattice-codex-missing || fail_case lattice-codex-missing
run lattice-codex-valid env PATH="$STATE/lattice-bin:$PATH" "$PYTHON_EXE" "$ROOT/bin/codex-lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-codex-valid","source":"startup","cwd":"$HOOK_REPO"}
EOF
json && [[ "$RUN_OUT" == *'additionalContext'* && "$RUN_OUT" == *'file://'* && "$RUN_OUT" == *'active=master/G4'* && "$RUN_OUT" != *permissionDecision* ]] && pass lattice-codex-valid || fail_case lattice-codex-valid
run lattice-codex-valid-v2 env PATH="$STATE/lattice-bin:$PATH" LATTICE_TEST_MODE=valid_v2 "$PYTHON_EXE" "$ROOT/bin/codex-lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-codex-valid-v2","source":"startup","cwd":"$HOOK_REPO"}
EOF
json && [[ "$RUN_OUT" == *'additionalContext'* && "$RUN_OUT" == *'未充足依存あり: active 1件'* && "$RUN_OUT" != *'取得できませんでした'* && "$RUN_OUT" != *permissionDecision* ]] && pass lattice-codex-valid-v2 || fail_case lattice-codex-valid-v2
run lattice-codex-valid-v3 env PATH="$STATE/lattice-bin:$PATH" LATTICE_TEST_MODE=valid_v3 "$PYTHON_EXE" "$ROOT/bin/codex-lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-codex-valid-v3","source":"startup","cwd":"$HOOK_REPO"}
EOF
json && [[ "$RUN_OUT" == *'additionalContext'* && "$RUN_OUT" == *'校正状態: reconciled=1, unreconciled=1'* && "$RUN_OUT" != *'取得できませんでした'* && "$RUN_OUT" != *permissionDecision* ]] && pass lattice-codex-valid-v3 || fail_case lattice-codex-valid-v3
run lattice-codex-slow-success env PATH="$STATE/lattice-bin:$PATH" LATTICE_TEST_MODE=slow_success "$PYTHON_EXE" "$ROOT/bin/codex-lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-codex-slow-success","source":"startup","cwd":"$HOOK_REPO"}
EOF
json && [[ "$RUN_OUT" == *'additionalContext'* && "$RUN_OUT" == *'active=master/G4'* && "$RUN_OUT" != *'取得できませんでした'* ]] && pass lattice-codex-slow-success || fail_case lattice-codex-slow-success
for mode in invalid invalid_dependency; do
  run "lattice-codex-$mode" env PATH="$STATE/lattice-bin:$PATH" LATTICE_TEST_MODE="$mode" "$PYTHON_EXE" "$ROOT/bin/codex-lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-codex-$mode","source":"startup","cwd":"$HOOK_REPO"}
EOF
  json && [[ "$RUN_OUT" == *'additionalContext'* && "$RUN_OUT" == *'status応答を検証できない'* && "$RUN_OUT" == *'CLIの版とstore整合を確認'* && "$RUN_OUT" != *permissionDecision* ]] && pass "lattice-codex-$mode" || fail_case "lattice-codex-$mode"
done
run lattice-codex-failure env PATH="$STATE/lattice-bin:$PATH" LATTICE_TEST_MODE=failure "$PYTHON_EXE" "$ROOT/bin/codex-lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-codex-failure","source":"startup","cwd":"$HOOK_REPO"}
EOF
json && [[ "$RUN_OUT" == *'additionalContext'* && "$RUN_OUT" == *'CLI実行失敗'* && "$RUN_OUT" != *permissionDecision* ]] && pass lattice-codex-failure || fail_case lattice-codex-failure
run lattice-codex-timeout env PATH="$STATE/lattice-bin:$PATH" LATTICE_TEST_MODE=timeout "$PYTHON_EXE" "$ROOT/bin/codex-lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-codex-timeout","source":"startup","cwd":"$HOOK_REPO"}
EOF
json && [[ "$RUN_OUT" == *'additionalContext'* && "$RUN_OUT" == *'status取得が期限超過'* && "$RUN_OUT" != *permissionDecision* ]] && pass lattice-codex-timeout || fail_case lattice-codex-timeout

if [ "$fail" -ne 0 ]; then exit 1; fi
printf 'ALL PASS\n'
