#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/dist"
touch "$TMP/dist/oracle-mcp.js" "$TMP/dist/oracle-cli.js"

cat > "$TMP/node" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$CHROME_PATH" "$@" > "$CAPTURE"
EOF
chmod +x "$TMP/node"

CAPTURE="$TMP/mcp.out" ORACLE_NODE_BIN="$TMP/node" ORACLE_DIST="$TMP/dist" \
  CHROME_PATH="$TMP/chrome" bash "$ROOT/bin/oracle-mcp-stable.sh" --probe
grep -Fx "$TMP/chrome" "$TMP/mcp.out"
grep -Fx "$TMP/dist/oracle-mcp.js" "$TMP/mcp.out"
grep -Fx -- '--probe' "$TMP/mcp.out"

CAPTURE="$TMP/cli.out" ORACLE_NODE_BIN="$TMP/node" ORACLE_DIST="$TMP/dist" \
  CHROME_PATH="$TMP/chrome" bash "$ROOT/bin/oracle-mcp-stable.sh" cli status
grep -Fx "$TMP/dist/oracle-cli.js" "$TMP/cli.out"
grep -Fx 'status' "$TMP/cli.out"

cat > "$TMP/chrome" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$CAPTURE"
EOF
chmod +x "$TMP/chrome"
CAPTURE="$TMP/chrome.out" ORACLE_CHROME_BIN="$TMP/chrome" \
  bash "$ROOT/bin/oracle-chrome-shim.sh" --probe
grep -Fx -- '--window-position=-32000,-32000' "$TMP/chrome.out"
grep -Fx -- '--probe' "$TMP/chrome.out"

printf 'oracle wrappers: OK\n'
