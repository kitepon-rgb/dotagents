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
session_key() { printf '%s' "$1" | python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest())'; }

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

# Orchestrate advisoryはhook配布dirのfake sibling CLIだけを実行する。対象repoのCLIは悪性でも実行しない。
mkdir -p "$REPO/bin" "$STATE/sentinel" "$STATE/advisory-bin" "$STATE/lib/orchestrate"
ADVISORY="$STATE/advisory-bin/orchestrate-advisory-hook"
cp "$ROOT/bin/orchestrate-advisory-hook.sh" "$ADVISORY"
cp "$ROOT/lib/orchestrate/advisory-hook.py" "$STATE/lib/orchestrate/advisory-hook.py"
chmod +x "$ADVISORY"
cat >"$STATE/advisory-bin/orchestrate-run" <<'PY'
const fs = require("fs");
const path = require("path");
const mode = fs.readFileSync(path.join(__dirname, "mode"), "utf8").trim() || "valid";
if (mode === "failure") process.exit(1);
if (mode === "timeout") setTimeout(() => process.exit(0), 6000);
else if (mode === "invalid") console.log("not-json");
else if (mode === "flood") console.log("x".repeat(70 * 1024));
else {
  const many = mode === "many" ? Array.from({ length: 5 }, (_, index) => `control-${index}`) : ["control-a"];
  const entries = (prefix, key, reason) => mode === "many" ? Array.from({ length: 5 }, (_, index) => ({ [key]: `${prefix}-${index}`, reason })) : [{ [key]: `${prefix}-a`, reason }];
  const result = { schema_version: "orchestrate.advisory-snapshot.v1", evaluated_at: "2026-07-14T00:00:00.000Z", active_control_ids: many,
    unknown: { worker_run_ids: mode === "many" ? Array.from({ length: 5 }, (_, index) => `worker-${index}`) : ["worker-a"], consultation_ids: [] },
    uncollected: { worker_run_ids: [], consultation_ids: mode === "many" ? Array.from({ length: 5 }, (_, index) => `consult-${index}`) : ["consult-a"] },
    write_conflicts: mode === "many" ? Array.from({ length: 5 }, (_, index) => ({ control_id: `control-${index}`, worker_run_id: `writer-${index}`, reason: "scope-overlap" })) : [{ control_id: "control-a", worker_run_id: "writer-a", reason: "scope-overlap" }],
    h_reference_gaps: entries("task", "task_id", "approval-expired"), capacity_warnings: entries("registry", "registry_observation_id", "hard-reached"), truncated: mode === "many" };
  if (mode === "empty") Object.assign(result, { active_control_ids: [], unknown: { worker_run_ids: [], consultation_ids: [] }, uncollected: { worker_run_ids: [], consultation_ids: [] }, write_conflicts: [], h_reference_gaps: [], capacity_warnings: [], truncated: false });
  console.log(JSON.stringify({ ok: true, command: "advisory-snapshot", result }));
}
PY
chmod +x "$STATE/advisory-bin/orchestrate-run"
set_advisory_mode() { printf '%s\n' "$1" >"$STATE/advisory-bin/mode"; }
cat >"$REPO/bin/orchestrate-run.mjs" <<'EOF'
#!/usr/bin/env bash
echo malicious-repo-cli-called >>"${ADVISORY_MALICIOUS_LOG:?}"
exit 99
EOF
chmod +x "$REPO/bin/orchestrate-run.mjs"
for provider in gpt-connector gpt-connector-mcp codex-sidecar-mcp aiterm-mcp; do
  cat >"$STATE/sentinel/$provider" <<'EOF'
#!/usr/bin/env bash
echo provider-called >>"${ADVISORY_SENTINEL_LOG:?}"
exit 99
EOF
  chmod +x "$STATE/sentinel/$provider"
done
for tool in python3 git node dirname readlink; do
  cat >"$STATE/sentinel/$tool" <<'EOF'
#!/usr/bin/env bash
echo runtime-path-called >>"${ADVISORY_RUNTIME_LOG:?}"
exit 99
EOF
  chmod +x "$STATE/sentinel/$tool"
done
mkdir -p "$STATE/poison"
printf '%s\n' 'raise SystemExit("PYTHONPATH loaded")' >"$STATE/poison/sitecustomize.py"
printf '%s\n' 'require("fs").appendFileSync(process.env.ADVISORY_NODE_OPTIONS_LOG, "node-options-loaded\\n")' >"$STATE/poison/node-options.js"
set_advisory_mode valid
run advisory-success env PATH="$STATE/sentinel:$PATH" GIT_DIR="$STATE/not-a-git" PYTHONPATH="$STATE/poison" NODE_OPTIONS="--require=$STATE/poison/node-options.js" ADVISORY_NODE_OPTIONS_LOG="$STATE/node-options.log" ADVISORY_RUNTIME_LOG="$STATE/runtime.log" ADVISORY_SENTINEL_LOG="$STATE/provider.log" ADVISORY_MALICIOUS_LOG="$STATE/malicious.log" "$ADVISORY" <<EOF
{"session_id":"advisory-1","cwd":"$HOOK_REPO"}
EOF
json && [[ "$RUN_OUT" == *"active Control: control-a"* && "$RUN_OUT" == *"unknown Run: worker:worker-a"* && "$RUN_OUT" != *"permissionDecision"* ]] && pass advisory-success || fail_case advisory-success
[ ! -e "$STATE/provider.log" ] && pass advisory-no-provider || fail_case advisory-no-provider
[ ! -e "$STATE/malicious.log" ] && pass advisory-no-repo-cli || fail_case advisory-no-repo-cli
[ ! -e "$STATE/runtime.log" ] && [ ! -e "$STATE/node-options.log" ] && pass advisory-no-parent-runtime || fail_case advisory-no-parent-runtime
set_advisory_mode valid
run advisory-dedupe "$ADVISORY" <<EOF
{"session_id":"advisory-1","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass advisory-dedupe || fail_case advisory-dedupe
set_advisory_mode empty
run advisory-empty "$ADVISORY" <<EOF
{"session_id":"advisory-empty","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass advisory-empty || fail_case advisory-empty
for mode in failure timeout invalid flood; do
  set_advisory_mode "$mode"
  started=$(/usr/bin/python3 -c 'import time; print(time.monotonic())')
  run "advisory-$mode" "$ADVISORY" <<EOF
{"session_id":"advisory-$mode","cwd":"$HOOK_REPO"}
EOF
  [ "$RUN_BYTES" -eq 0 ] && pass "advisory-$mode" || fail_case "advisory-$mode"
  if [ "$mode" = timeout ]; then
    /usr/bin/python3 - "$started" <<'PY' || fail_case advisory-timeout-deadline
import sys, time
raise SystemExit(0 if time.monotonic() - float(sys.argv[1]) < 4.5 else 1)
PY
    pass advisory-timeout-deadline
  fi
done
set_advisory_mode valid
run advisory-off env DOTAGENTS_ORCHESTRATE_ADVISORY=off "$ADVISORY" <<EOF
{"session_id":"advisory-off","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass advisory-off || fail_case advisory-off
set_advisory_mode many
run advisory-bounded "$ADVISORY" <<EOF
{"session_id":"advisory-many","cwd":"$HOOK_REPO"}
EOF
json && [[ "$RUN_OUT" == *"control-2"* && "$RUN_OUT" != *"control-3"* && "$RUN_BYTES" -lt 2048 ]] && pass advisory-bounded || fail_case advisory-bounded
MARKERS="$STATE/dotagents/hooks"; mkdir -p "$MARKERS"
touch -t 202001010000 "$MARKERS/other-hook-cache" "$MARKERS/orchestrate-advisory-old.shown"
set_advisory_mode empty
run advisory-gc "$ADVISORY" <<EOF
{"session_id":"advisory-gc","cwd":"$HOOK_REPO"}
EOF
[ -f "$MARKERS/other-hook-cache" ] && [ ! -e "$MARKERS/orchestrate-advisory-old.shown" ] && pass advisory-gc-ownership || fail_case advisory-gc-ownership
mkdir -p "$STATE/cache-target/dotagents/hooks"; printf '%s\n' keep >"$STATE/cache-target/dotagents/hooks/keep"
ln -s "$STATE/cache-target" "$STATE/cache-link"
set_advisory_mode valid
run advisory-cache-symlink env XDG_CACHE_HOME="$STATE/cache-link" "$ADVISORY" <<EOF
{"session_id":"advisory-cache-symlink","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && [ "$(cat "$STATE/cache-target/dotagents/hooks/keep")" = keep ] && pass advisory-cache-symlink || fail_case advisory-cache-symlink

# 4本のcallout hookも、cache rootがsymlinkならfail closedで無出力にする。
run c1-cache-symlink env XDG_CACHE_HOME="$STATE/cache-link" python3 "$ROOT/bin/delegation-gate-hook.sh" <<'EOF'
{"session_id":"unsafe-delegation","tool_name":"Agent","tool_input":{}}
EOF
[ "$RUN_BYTES" -eq 0 ] && [ "$(cat "$STATE/cache-target/dotagents/hooks/keep")" = keep ] && pass c1-cache-symlink || fail_case c1-cache-symlink
run c2-cache-symlink env XDG_CACHE_HOME="$STATE/cache-link" python3 "$ROOT/bin/todo-gate-hook.sh" session-start <<EOF
{"session_id":"unsafe-todo","source":"startup","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && [ "$(cat "$STATE/cache-target/dotagents/hooks/keep")" = keep ] && pass c2-cache-symlink || fail_case c2-cache-symlink
run c4-cache-symlink env XDG_CACHE_HOME="$STATE/cache-link" python3 "$ROOT/bin/onset-gate-hook.sh" <<'EOF'
{"session_id":"unsafe-onset"}
EOF
[ "$RUN_BYTES" -eq 0 ] && [ "$(cat "$STATE/cache-target/dotagents/hooks/keep")" = keep ] && pass c4-cache-symlink || fail_case c4-cache-symlink
run codex-cache-symlink env XDG_CACHE_HOME="$STATE/cache-link" python3 "$ROOT/bin/codex-callout-hook.sh" user-prompt-submit <<'EOF'
{"session_id":"unsafe-codex"}
EOF
[ "$RUN_BYTES" -eq 0 ] && [ "$(cat "$STATE/cache-target/dotagents/hooks/keep")" = keep ] && pass codex-cache-symlink || fail_case codex-cache-symlink

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
[ "$RUN_BYTES" -eq 0 ] && [ -f "$STATE/dotagents/hooks/$(session_key t1).todo-pending" ] && pass c3-warn || fail_case c3-warn
run c3-active python3 "$ROOT/bin/todo-gate-hook.sh" stop <<EOF
{"session_id":"t1","cwd":"$HOOK_REPO","stop_hook_active":true}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass c3-active || fail_case c3-active

run c4-normal python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{"session_id":"u1"}' && json && [[ "$RUN_OUT" == *'通常レーン'* && "$RUN_OUT" == *'対象限定commitだけで閉じます'* ]] && pass c4-normal || fail_case c4-normal
run c4-silent python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{"session_id":"u1"}' && [ "$RUN_BYTES" -eq 0 ] && pass c4-silent || fail_case c4-silent
run c4-off env DOTAGENTS_ONSET_GATE=off python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{"session_id":"u2"}' && [ "$RUN_BYTES" -eq 0 ] && pass c4-off || fail_case c4-off
printf '%s\n' keep >"$STATE/cache-file-target"
FILE_SYMLINK_KEY=$(session_key unsafe-file-marker)
ln -s "$STATE/cache-file-target" "$STATE/dotagents/hooks/$FILE_SYMLINK_KEY.onset-info"
run c4-cache-file-symlink python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{"session_id":"unsafe-file-marker"}'
[ "$RUN_BYTES" -eq 0 ] && [ "$(cat "$STATE/cache-file-target")" = keep ] && pass c4-cache-file-symlink || fail_case c4-cache-file-symlink
run c4-pending python3 "$ROOT/bin/onset-gate-hook.sh" <<<'{"session_id":"t1"}' && json && [[ "$RUN_OUT" == *'前ターン'* ]] && pass c4-pending || fail_case c4-pending
[ ! -f "$STATE/dotagents/hooks/$(session_key t1).todo-pending" ] && pass c4-pending-drained || fail_case c4-pending-drained
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

# session_id は cache filename に連結しない。絶対path・../・長大入力でも SHA-256 の固定長 key だけを使う。
TRAVERSAL_SESSION='../outside'
ABSOLUTE_SESSION="$STATE/outside-absolute"
LONG_SESSION=$(python3 -c 'print("x" * 10000)')
for session in "$TRAVERSAL_SESSION" "$ABSOLUTE_SESSION" "$LONG_SESSION"; do
  key=$(session_key "$session")
  run c5-onset-session-key python3 "$ROOT/bin/onset-gate-hook.sh" <<EOF
{"session_id":"$session"}
EOF
  json && [ -f "$STATE/dotagents/hooks/$key.onset-info" ] && [ "${#key}" -eq 64 ] && pass c5-onset-session-key || fail_case c5-onset-session-key
done
[ ! -e "$STATE/dotagents/outside.onset-info" ] && [ ! -e "$ABSOLUTE_SESSION.onset-info" ] && pass c5-session-key-no-escape || fail_case c5-session-key-no-escape

TRAVERSAL_KEY=$(session_key "$TRAVERSAL_SESSION")
run c5-delegation-session-key python3 "$ROOT/bin/delegation-gate-hook.sh" <<EOF
{"session_id":"$TRAVERSAL_SESSION","tool_name":"Agent","tool_input":{"model":"x-20202607"}}
EOF
json && [ -f "$STATE/dotagents/hooks/$TRAVERSAL_KEY.placement-warn" ] && pass c5-delegation-session-key || fail_case c5-delegation-session-key
[ ! -e "$STATE/dotagents/outside.placement-warn" ] && pass c5-delegation-no-escape || fail_case c5-delegation-no-escape

TODO_ABSOLUTE_KEY=$(session_key "$ABSOLUTE_SESSION")
run c5-todo-session-key python3 "$ROOT/bin/todo-gate-hook.sh" session-start <<EOF
{"session_id":"$ABSOLUTE_SESSION","source":"startup","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && find "$STATE/dotagents/hooks" -maxdepth 1 -name "$TODO_ABSOLUTE_KEY.*.snapshot" -type f | grep -q . && pass c5-todo-session-key || fail_case c5-todo-session-key
[ "$(find "$STATE" -maxdepth 1 -name 'outside-absolute.*.snapshot' -type f | wc -l | tr -d ' ')" -eq 0 ] && pass c5-todo-no-escape || fail_case c5-todo-no-escape

# Lattice工程表SessionStart hook。共通coreの異常系とClaude plain stdoutを固定する。
PYTHON_EXE=$(command -v python3)
mkdir -p "$STATE/git-only" "$STATE/lattice-bin" "$STATE/non-git"
ln -s "$(command -v git)" "$STATE/git-only/git"
cat >"$STATE/lattice-bin/lattice" <<'EOF'
#!/usr/bin/env bash
[ "$*" = "todo status" ] || exit 2
case "${LATTICE_TEST_MODE:-valid_v1}" in
  valid_v1)
    printf '%s\n' '{"schema":"lattice.todo_status_result.v1","project_id":"dotagents","active_set":[{"plan_key":"master","task_id":"G4","label":"dotagents側アクセス配線"}],"next_ready":[{"plan_key":"master","task_id":"G5","label":"authoring CLI"}],"blocked":[],"member_heads":[{"plan_key":"master","through_sequence":4,"journal_head_digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}],"result_digest":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}' ;;
  valid_v2)
    printf '%s\n' '{"schema":"lattice.todo_status_result.v2","project_id":"dotagents","active_set":[{"plan_key":"master","task_id":"G4","label":"dotagents側アクセス配線","unmet_dependencies":[]},{"plan_key":"master","task_id":"G6","label":"host rollout","unmet_dependencies":[{"plan_key":"master","task_id":"G3"},{"plan_key":"master","project_id":"dotagents","task_id":"G2"}]}],"next_ready":[{"plan_key":"master","task_id":"G5","label":"authoring CLI"}],"blocked":[],"member_heads":[{"plan_key":"master","through_sequence":4,"journal_head_digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}],"result_digest":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}' ;;
  invalid) printf '%s\n' '{"schema":"wrong"}' ;;
  invalid_dependency)
    printf '%s\n' '{"schema":"lattice.todo_status_result.v2","project_id":"dotagents","active_set":[{"plan_key":"master","task_id":"G4","label":"dotagents側アクセス配線","unmet_dependencies":[{"plan_key":"master","task_id":"G3","extra":"rejected"}]}],"next_ready":[],"blocked":[],"member_heads":[],"result_digest":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"}' ;;
  flood) head -c 70000 /dev/zero | tr '\0' x ;;
  failure) exit 1 ;;
  timeout) sleep 4 ;;
esac
EOF
chmod +x "$STATE/lattice-bin/lattice"
run lattice-nongit-missing env PATH="$STATE/git-only" "$PYTHON_EXE" "$ROOT/bin/lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-nongit","source":"startup","cwd":"$STATE/non-git"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass lattice-nongit-missing || fail_case lattice-nongit-missing
run lattice-cli-missing env PATH="$STATE/git-only" "$PYTHON_EXE" "$ROOT/bin/lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-missing","source":"startup","cwd":"$HOOK_REPO"}
EOF
[[ "$RUN_OUT" == 'INFO: Lattice工程表:'* && "$RUN_OUT" == *'CLIが未導入'* ]] && pass lattice-cli-missing || fail_case lattice-cli-missing
run lattice-store-missing env PATH="$STATE/lattice-bin:$PATH" "$PYTHON_EXE" "$ROOT/bin/lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-no-store","source":"startup","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass lattice-store-missing || fail_case lattice-store-missing
mkdir -p "$REPO/.lattice/todo"
run lattice-gantt-missing env PATH="$STATE/lattice-bin:$PATH" "$PYTHON_EXE" "$ROOT/bin/lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-no-gantt","source":"clear","cwd":"$HOOK_REPO"}
EOF
[[ "$RUN_OUT" == *'未生成'* && "$RUN_OUT" == *'active=master/G4（dotagents側アクセス配線）'* && "$RUN_OUT" == *'next-ready=master/G5（authoring CLI）'* && "$RUN_OUT" == *'lattice todo gantt'* ]] && pass lattice-gantt-missing || fail_case lattice-gantt-missing
mkdir -p "$REPO/.lattice/generated"; printf '%s\n' '<html></html>' >"$REPO/.lattice/generated/gantt.html"
run lattice-valid env PATH="$STATE/lattice-bin:$PATH" "$PYTHON_EXE" "$ROOT/bin/lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-valid","source":"startup","cwd":"$HOOK_REPO"}
EOF
[[ "$RUN_OUT" == *'file://'*'.lattice/generated/gantt.html'* && "$RUN_OUT" != *'未生成'* ]] && pass lattice-valid || fail_case lattice-valid
run lattice-valid-v2 env PATH="$STATE/lattice-bin:$PATH" LATTICE_TEST_MODE=valid_v2 "$PYTHON_EXE" "$ROOT/bin/lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-valid-v2","source":"startup","cwd":"$HOOK_REPO"}
EOF
[[ "$RUN_OUT" == *'active=master/G4'* && "$RUN_OUT" == *'未充足依存あり: active 1件'* && "$RUN_OUT" != *'取得できませんでした'* ]] && pass lattice-valid-v2 || fail_case lattice-valid-v2
for mode in invalid invalid_dependency flood failure timeout; do
  run "lattice-$mode" env PATH="$STATE/lattice-bin:$PATH" LATTICE_TEST_MODE="$mode" "$PYTHON_EXE" "$ROOT/bin/lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-$mode","source":"startup","cwd":"$HOOK_REPO"}
EOF
  [[ "$RUN_OUT" == 'INFO: Lattice工程表:'* && "$RUN_OUT" == *'storeは存在しますが lattice todo status で現在地を取得できませんでした'* && "$RUN_OUT" == *'CLIの版とstore整合を確認'* ]] && pass "lattice-$mode" || fail_case "lattice-$mode"
done
run lattice-resume env PATH="$STATE/lattice-bin:$PATH" "$PYTHON_EXE" "$ROOT/bin/lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-resume","source":"resume","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass lattice-resume || fail_case lattice-resume
run lattice-off env PATH="$STATE/lattice-bin:$PATH" DOTAGENTS_LATTICE_HOOK=off "$PYTHON_EXE" "$ROOT/bin/lattice-gantt-hook.sh" session-start <<EOF
{"session_id":"lattice-off","source":"startup","cwd":"$HOOK_REPO"}
EOF
[ "$RUN_BYTES" -eq 0 ] && pass lattice-off || fail_case lattice-off

if [ "$fail" -ne 0 ]; then exit 1; fi
printf 'ALL PASS\n'
