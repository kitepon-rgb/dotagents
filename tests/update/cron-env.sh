#!/usr/bin/env bash
# Linux / WSL2 の cron 最小環境で agents-update が NVM の npm を復元することを検証する。
set -euo pipefail

case "$(uname -s)" in
  MINGW*|MSYS*) printf 'agents-update cron env: SKIP — Windows native は cron/NVM 対象外\n'; exit 0 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_HOME="$(mktemp -d)"
EMPTY_HOME="$(mktemp -d)"
trap 'rm -rf "$TEST_HOME" "$EMPTY_HOME"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }

mkdir -p "$TEST_HOME/.nvm/fake-bin" "$TEST_HOME/base-bin"
for command_path in /bin/date /bin/mkdir /usr/bin/tee; do
  [ -x "$command_path" ] || fail "test prerequisite がない: $command_path"
  ln -s "$command_path" "$TEST_HOME/base-bin/${command_path##*/}"
done
cat > "$TEST_HOME/.nvm/nvm.sh" <<'EOF'
PATH="$NVM_DIR/fake-bin:$PATH"
export PATH
EOF
cat > "$TEST_HOME/.nvm/fake-bin/npm" <<'EOF'
#!/bin/sh
printf '%s:%s\n' "${RUN_ID:-default}" "$*" >> "$HOME/npm-calls.log"
printf 'npm:%s\n' "$*" >> "$HOME/update-events.log"
case "${NPM_FAIL_PACKAGE:-}" in
  '') exit 0 ;;
esac
case "$*" in
  *"${NPM_FAIL_PACKAGE}@latest"*) exit 23 ;;
esac
EOF
chmod +x "$TEST_HOME/.nvm/fake-bin/npm"
cat > "$TEST_HOME/.nvm/fake-bin/uv" <<'EOF'
#!/bin/sh
printf '%s:%s\n' "${RUN_ID:-default}" "$*" >> "$HOME/uv-calls.log"
printf 'uv:%s\n' "$*" >> "$HOME/update-events.log"
case "${UV_FAIL_PACKAGE:-}" in
  '') exit 0 ;;
esac
case "$*" in
  *"${UV_FAIL_PACKAGE}"*) exit 24 ;;
esac
EOF
chmod +x "$TEST_HOME/.nvm/fake-bin/uv"
cat > "$TEST_HOME/base-bin/factory-reporter-schedule-runner" <<'EOF'
#!/bin/sh
printf '%s:%s\n' "${RUN_ID:-default}" "$*" >> "$HOME/reporter-calls.log"
printf 'reporter:%s\n' "$*" >> "$HOME/update-events.log"
[ "${REPORT_FAIL:-0}" -eq 0 ]
EOF
chmod +x "$TEST_HOME/base-bin/factory-reporter-schedule-runner"

REPORTER="$TEST_HOME/base-bin/factory-reporter-schedule-runner"
REPORTER_CONFIG="$TEST_HOME/factory-reporter.json"

env -i HOME="$TEST_HOME" PATH="$TEST_HOME/base-bin" \
  AGENTS_UPDATE_PATH_PREFIX="$TEST_HOME/no-system-bin" \
  FACTORY_REPORTER_RUNNER="$REPORTER" \
  FACTORY_REPORTER_CONFIG="$REPORTER_CONFIG" \
  RUN_ID=normal \
  /bin/bash "$ROOT/bin/agents-update.sh" >/dev/null

[ "$(grep -c '^normal:' "$TEST_HOME/npm-calls.log")" -eq 13 ] \
  || fail 'curated package 13件を fake npm へ渡していない'
[ "$(grep -c '^normal:tool upgrade markitdown$' "$TEST_HOME/uv-calls.log")" -eq 1 ] \
  || fail 'markitdown を fake uv tool upgrade へ1件渡していない'
[ "$(grep -c '^normal:--config '"$REPORTER_CONFIG"'$' "$TEST_HOME/reporter-calls.log")" -eq 1 ] \
  || fail '更新後に factory reporter を1回実行していない'
[ "$(tail -n 1 "$TEST_HOME/update-events.log")" = "reporter:--config $REPORTER_CONFIG" ] \
  || fail 'factory reporter が更新処理より前に実行された'
grep -q '=== agents-update end:' "$TEST_HOME/.local/state/agents-update/agents-update.log" \
  || fail '完了行がない'

if env -i HOME="$TEST_HOME" PATH="$TEST_HOME/base-bin" \
  AGENTS_UPDATE_PATH_PREFIX="$TEST_HOME/no-system-bin" \
  FACTORY_REPORTER_RUNNER="$REPORTER" \
  FACTORY_REPORTER_CONFIG="$REPORTER_CONFIG" \
  RUN_ID=npm-fail \
  NPM_FAIL_PACKAGE='claude-spotter' \
  /bin/bash "$ROOT/bin/agents-update.sh" >"$TEST_HOME/fail.out" 2>&1; then
  fail '途中の npm install 失敗を成功扱いした'
fi
[ "$(grep -c '^npm-fail:' "$TEST_HOME/npm-calls.log")" -eq 13 ] \
  || fail '途中失敗後も残り package を更新しなかった'
grep -q '^FAILED: claude-spotter$' "$TEST_HOME/.local/state/agents-update/agents-update.log" \
  || fail '失敗した package 名を log に残さない'
grep -q '^npm-fail:install -g codex-sidecar-mcp@latest$' "$TEST_HOME/npm-calls.log" \
  || fail '途中失敗後の package を fake npm へ渡していない'
[ "$(grep -c '^npm-fail:tool upgrade markitdown$' "$TEST_HOME/uv-calls.log")" -eq 1 ] \
  || fail 'npm 失敗後も uv tool upgrade を継続しなかった'
[ "$(grep -c '^npm-fail:' "$TEST_HOME/reporter-calls.log")" -eq 1 ] \
  || fail 'npm 失敗後に factory reporter を実行しなかった'

mv "$TEST_HOME/.nvm/fake-bin/uv" "$TEST_HOME/.nvm/fake-bin/uv.off"
if env -i HOME="$TEST_HOME" PATH="$TEST_HOME/base-bin" \
  AGENTS_UPDATE_PATH_PREFIX="$TEST_HOME/no-system-bin" \
  FACTORY_REPORTER_RUNNER="$REPORTER" \
  FACTORY_REPORTER_CONFIG="$REPORTER_CONFIG" \
  RUN_ID=uv-missing \
  /bin/bash "$ROOT/bin/agents-update.sh" >"$TEST_HOME/uv-missing.out" 2>&1; then
  fail 'uv 不在を成功扱いした'
fi
[ "$(grep -c '^uv-missing:' "$TEST_HOME/npm-calls.log")" -eq 13 ] \
  || fail 'uv 不在時に npm の残件を更新しなかった'
[ "$(grep -c '^uv-missing:' "$TEST_HOME/reporter-calls.log")" -eq 1 ] \
  || fail 'uv 不在時に factory reporter を実行しなかった'
mv "$TEST_HOME/.nvm/fake-bin/uv.off" "$TEST_HOME/.nvm/fake-bin/uv"

if env -i HOME="$TEST_HOME" PATH="$TEST_HOME/base-bin" \
  AGENTS_UPDATE_PATH_PREFIX="$TEST_HOME/no-system-bin" \
  FACTORY_REPORTER_RUNNER="$REPORTER" \
  FACTORY_REPORTER_CONFIG="$REPORTER_CONFIG" \
  RUN_ID=uv-fail \
  UV_FAIL_PACKAGE='markitdown' \
  /bin/bash "$ROOT/bin/agents-update.sh" >"$TEST_HOME/uv-fail.out" 2>&1; then
  fail 'uv tool upgrade 失敗を成功扱いした'
fi
[ "$(grep -c '^uv-fail:' "$TEST_HOME/npm-calls.log")" -eq 13 ] \
  || fail 'uv tool upgrade 失敗時に npm の残件を更新しなかった'
[ "$(grep -c '^uv-fail:tool upgrade markitdown$' "$TEST_HOME/uv-calls.log")" -eq 1 ] \
  || fail 'uv tool upgrade を実行していない'
grep -q '^FAILED: uv-tool:markitdown$' "$TEST_HOME/.local/state/agents-update/agents-update.log" \
  || fail 'uv 失敗した package 名を log に残さない'

if env -i HOME="$TEST_HOME" PATH="$TEST_HOME/base-bin" \
  AGENTS_UPDATE_PATH_PREFIX="$TEST_HOME/no-system-bin" \
  FACTORY_REPORTER_RUNNER="$REPORTER" \
  FACTORY_REPORTER_CONFIG="$REPORTER_CONFIG" \
  RUN_ID=report-fail \
  REPORT_FAIL=1 \
  /bin/bash "$ROOT/bin/agents-update.sh" >"$TEST_HOME/report-fail.out" 2>&1; then
  fail 'factory reporter 失敗を成功扱いした'
fi
[ "$(grep -c '^report-fail:' "$TEST_HOME/npm-calls.log")" -eq 13 ] \
  || fail 'reporter 失敗の試験で更新処理を省略した'
grep -q '^agents-update result: update=success report=failed$' "$TEST_HOME/report-fail.out" \
  || fail '更新成功とreport失敗を区別していない'

if env -i HOME="$EMPTY_HOME" PATH="$TEST_HOME/base-bin" \
  AGENTS_UPDATE_PATH_PREFIX="$TEST_HOME/no-system-bin" \
  FACTORY_REPORTER_RUNNER="$REPORTER" \
  FACTORY_REPORTER_CONFIG="$EMPTY_HOME/factory-reporter.json" \
  RUN_ID=npm-missing \
  /bin/bash "$ROOT/bin/agents-update.sh" >"$EMPTY_HOME/out.log" 2>&1; then
  fail 'npm / NVM 不在を成功扱いした'
fi
grep -q '^FAILED: npm が PATH にない' "$EMPTY_HOME/out.log" \
  || fail 'npm 不在の原因を名指ししない'
[ "$(grep -c '^npm-missing:' "$EMPTY_HOME/reporter-calls.log")" -eq 1 ] \
  || fail 'npm / NVM 不在でも factory reporter を実行しなかった'

echo 'agents-update cron env: OK'
