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
printf '%s\n' "$*" >> "$HOME/npm-calls.log"
EOF
chmod +x "$TEST_HOME/.nvm/fake-bin/npm"

env -i HOME="$TEST_HOME" PATH="$TEST_HOME/base-bin" \
  AGENTS_UPDATE_PATH_PREFIX="$TEST_HOME/no-system-bin" \
  /bin/bash "$ROOT/bin/agents-update.sh" >/dev/null

[ "$(wc -l < "$TEST_HOME/npm-calls.log" | tr -d ' ')" -eq 13 ] \
  || fail 'curated package 13件を fake npm へ渡していない'
grep -q '=== agents-update end:' "$TEST_HOME/.local/state/agents-update/agents-update.log" \
  || fail '完了行がない'

if env -i HOME="$EMPTY_HOME" PATH="$TEST_HOME/base-bin" \
  AGENTS_UPDATE_PATH_PREFIX="$TEST_HOME/no-system-bin" \
  /bin/bash "$ROOT/bin/agents-update.sh" >"$EMPTY_HOME/out.log" 2>&1; then
  fail 'npm / NVM 不在を成功扱いした'
fi
grep -q '^FATAL: npm が PATH にない' "$EMPTY_HOME/out.log" \
  || fail 'npm 不在の原因を名指ししない'

echo 'agents-update cron env: OK'
