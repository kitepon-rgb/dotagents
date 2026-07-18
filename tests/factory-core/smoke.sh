#!/usr/bin/env bash
# 外部所有の factory core 8製品を verify-install のテスト専用最小モードで固定する。
# 実 CLI や利用者の状態には依存しない。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP="$(mktemp -d)"
HOME_DIR="$TMP/home"
PROJECT="$TMP/project"
BIN_DIR="$TMP/bin"
trap 'rm -rf "$TMP"' EXIT

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

mkdir -p "$HOME_DIR/.caveat/own" "$HOME_DIR/.local/bin" "$PROJECT/.spotter" "$PROJECT/.claude" "$BIN_DIR"
git -C "$HOME_DIR/.caveat/own" init -q
git -C "$HOME_DIR/.caveat/own" remote add origin 'git@github.com:kitepon-rgb/Caveat-Private.git'
cat > "$PROJECT/.spotter/marker.json" <<EOF
{"markerVersion":"2","auditorContext":{"mode":"throughline","command":"$BIN_DIR/throughline"}}
EOF
printf '{}\n' > "$PROJECT/.spotter/tool-db.json"
printf '{}\n' > "$PROJECT/.spotter/tool-db.codex.json"
cat > "$PROJECT/.claude/settings.json" <<'EOF'
{
  "hooks": {
    "SessionStart": [{"hooks": [{"type": "command", "command": "spotter.mjs hook session-start"}]}],
    "UserPromptSubmit": [{"hooks": [{"type": "command", "command": "spotter.mjs hook user-prompt"}]}],
    "PreToolUse": [{"hooks": [{"type": "command", "command": "spotter.mjs hook pre-tool-use"}]}],
    "Stop": [{"hooks": [{"type": "command", "command": "spotter.mjs hook stop"}]}],
    "SessionEnd": [{"hooks": [{"type": "command", "command": "spotter.mjs hook session-end"}]}]
  }
}
EOF

for command in caveat throughline codegraph markitdown; do
  cat > "$BIN_DIR/$command" <<'EOF'
#!/bin/sh
exit 0
EOF
  chmod +x "$BIN_DIR/$command"
done
cat > "$BIN_DIR/uv" <<'EOF'
#!/bin/sh
if [ "$1" = tool ] && [ "$2" = list ]; then
  printf '%s\n' 'markitdown 0.0.0'
  exit 0
fi
exit 64
EOF
chmod +x "$BIN_DIR/uv"

for command in oracle gpt-connector aiterm-mcp codex-sidecar-mcp lattice; do
  cat > "$BIN_DIR/$command" <<'EOF'
#!/bin/sh
[ "$1" = --version ] && exit 0
exit 64
EOF
  chmod +x "$BIN_DIR/$command"
done
cat > "$HOME_DIR/.local/bin/oracle-mcp-stable" <<'EOF'
#!/bin/sh
exit 0
EOF
chmod +x "$HOME_DIR/.local/bin/oracle-mcp-stable"

cat > "$BIN_DIR/spotter" <<'EOF'
#!/bin/sh
if [ "$1" = codex-hook ] && [ "$2" = diagnostics ] && [ "$3" = --project ]; then
  case "${SPOTTER_DIAGNOSTICS_MODE:-valid}" in
    valid)
      printf '%s\n' '{"availability":"available","installedHooks":{"sessionStart":"installed","userPromptSubmit":"installed","stop":"installed"},"readiness":"configured-unverified","validation":{"sessionStart":{"registered":true,"compatible":true,"misconfigured":false,"canonical":true,"issues":[]},"userPromptSubmit":{"registered":true,"compatible":true,"misconfigured":false,"canonical":true,"issues":[]},"stop":{"registered":true,"compatible":true,"misconfigured":false,"canonical":true,"issues":[]}}}'
      ;;
    noncanonical)
      printf '%s\n' '{"availability":"available","installedHooks":{"sessionStart":"installed","userPromptSubmit":"installed","stop":"installed"},"readiness":"configured-unverified","validation":{"sessionStart":{"registered":true,"compatible":true,"misconfigured":false,"canonical":true,"issues":[]},"userPromptSubmit":{"registered":true,"compatible":true,"misconfigured":false,"canonical":false,"issues":["noncanonical"]},"stop":{"registered":true,"compatible":true,"misconfigured":false,"canonical":true,"issues":[]}}}'
      ;;
  esac
  exit 0
fi
exit 64
EOF
chmod +x "$BIN_DIR/spotter"

verify_core() {
  HOME="$HOME_DIR" PATH="$BIN_DIR:/usr/bin:/bin" \
    DOTAGENTS_FACTORY_CORE_ONLY=1 \
    DOTAGENTS_FACTORY_PROJECT_ROOT="$PROJECT" \
    "$ROOT/bin/verify-install.sh" --profile official
}

assert_rejected() {
  local label="$1"
  if verify_core >/dev/null 2>&1; then
    fail "$label を成功扱いした"
  fi
}

# updater の curated package は同名重複を許さず、コア製品の導入面を必須化する。
for package in \
  caveat-cli throughline claude-spotter gpt-connector aiterm-mcp \
  codex-sidecar-cli codex-sidecar-core codex-sidecar-mcp '@colbymchenry/codegraph'; do
  [ "$(grep -Ec "^[[:space:]]*'${package}'[[:space:]]*$" "$ROOT/bin/agents-update.sh")" -eq 1 ] \
    || fail "agents-update の $package は1件でなければならない"
done
[ "$(grep -Ec "^[[:space:]]*'@quolu/lattice@0\.5\.0'[[:space:]]*#" "$ROOT/bin/agents-update.sh")" -eq 1 ] \
  || fail 'agents-update の @quolu/lattice は0.5.0固定pinでなければならない'
[ "$(grep -Ec "^[[:space:]]*'markitdown'[[:space:]]*$" "$ROOT/bin/agents-update.sh")" -eq 1 ] \
  || fail 'agents-update の uv tool package markitdown は1件でなければならない'
! grep -Eq "^[[:space:]]*'grok(-build)?'[[:space:]]*$" "$ROOT/bin/agents-update.sh" \
  || fail 'Grok Build を npm package として更新してはならない'
grep -Fq 'grok update --check --json' "$ROOT/bin/agents-update.sh" \
  || fail 'Grok Build の stable JSON update check がない'
[ "$(grep -Ec '^  advisory:$' "$ROOT/.codex-sidecar.yml")" -eq 1 ] || fail 'codex-sidecar advisory preset がない'

verify_core || fail '有効な factory core fixture が verify-install に拒否された'

mv "$BIN_DIR/caveat" "$BIN_DIR/caveat.off"
assert_rejected 'caveat CLI 欠落'
mv "$BIN_DIR/caveat.off" "$BIN_DIR/caveat"

mv "$BIN_DIR/throughline" "$BIN_DIR/throughline.off"
assert_rejected 'throughline CLI 欠落'
mv "$BIN_DIR/throughline.off" "$BIN_DIR/throughline"

for command in codegraph markitdown; do
  mv "$BIN_DIR/$command" "$BIN_DIR/$command.off"
  assert_rejected "$command CLI 欠落"
  mv "$BIN_DIR/$command.off" "$BIN_DIR/$command"
done

mv "$BIN_DIR/uv" "$BIN_DIR/uv.off"
assert_rejected 'uv CLI 欠落'
mv "$BIN_DIR/uv.off" "$BIN_DIR/uv"

mv "$BIN_DIR/spotter" "$BIN_DIR/spotter.off"
assert_rejected 'spotter CLI 欠落'
mv "$BIN_DIR/spotter.off" "$BIN_DIR/spotter"

for command in aiterm-mcp codex-sidecar-mcp lattice; do
  mv "$BIN_DIR/$command" "$BIN_DIR/$command.off"
  assert_rejected "$command CLI 欠落"
  mv "$BIN_DIR/$command.off" "$BIN_DIR/$command"
done

# Oracle はv1 rollback互換だけに残す。v2の通常導入・更新対象ではないため、
# v2 factory core smokeはOracle wrapperの正常性を要求しない。

git -C "$HOME_DIR/.caveat/own" remote set-url origin 'git@github.com:kitepon-rgb/not-private.git'
assert_rejected 'Caveat-Private remote 欠落'
git -C "$HOME_DIR/.caveat/own" remote set-url origin 'git@github.com:kitepon-rgb/Caveat-Private.git'

mv "$PROJECT/.spotter/marker.json" "$PROJECT/.spotter/marker.json.off"
assert_rejected 'Spotter marker 欠落'
mv "$PROJECT/.spotter/marker.json.off" "$PROJECT/.spotter/marker.json"

cat > "$PROJECT/.spotter/marker.json" <<EOF
{"markerVersion":"2","auditorContext":{"mode":"none","command":"$BIN_DIR/throughline"}}
EOF
assert_rejected 'Throughline 以外の auditor context'
cat > "$PROJECT/.spotter/marker.json" <<EOF
{"markerVersion":"2","auditorContext":{"mode":"throughline","command":"$BIN_DIR/throughline"}}
EOF

SPOTTER_DIAGNOSTICS_MODE=noncanonical assert_rejected '非 canonical Spotter diagnostics'

printf 'factory core smoke: OK\n'
