#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo 'usage: verify-observer-package --prefix <absolute-path> --expected-version <version>' >&2
  exit 2
}

fail() {
  echo "FAIL: Observer package verify: $*" >&2
  exit 1
}

PREFIX=''
EXPECTED_VERSION=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --prefix)
      [ "$#" -ge 2 ] || usage
      PREFIX="$2"
      shift 2
      ;;
    --expected-version)
      [ "$#" -ge 2 ] || usage
      EXPECTED_VERSION="$2"
      shift 2
      ;;
    *) usage ;;
  esac
done

case "$PREFIX" in
  /*) ;;
  *) fail '--prefix はabsolute pathが必要です' ;;
esac
[ -n "$EXPECTED_VERSION" ] || usage
[[ "$EXPECTED_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$ ]] \
  || fail '--expected-version が不正です'
if [ ! -d "$PREFIX" ] || [ -L "$PREFIX" ]; then
  fail 'prefixがregular directoryではありません'
fi

PACKAGE_ROOT="$PREFIX/lib/node_modules/@quolu/observer"
if [ ! -d "$PACKAGE_ROOT" ] || [ -L "$PACKAGE_ROOT" ]; then
  fail 'Observer packageが見つかりません'
fi

for entry in \
  'observer:bin/observer.mjs' \
  'observer-mcp:bin/observer-mcp.mjs' \
  'observer-parent-stop-hook:bin/observer-parent-stop-hook.mjs' \
  'observer-hook-config:bin/observer-hook-config.mjs' \
  'observer-claude-characterization:bin/observer-claude-characterization.mjs'
do
  name="${entry%%:*}"
  relative="${entry#*:}"
  shim="$PREFIX/bin/$name"
  [ -x "$shim" ] || fail "$name commandが見つかりません"
  python3 - "$shim" "$PACKAGE_ROOT/$relative" <<'PY' \
    || fail 'npm bin shimのtargetが不正です'
import os
import stat
import sys
from pathlib import Path

shim, expected = map(Path, sys.argv[1:])
if not shim.is_symlink():
    raise SystemExit(1)
target = shim.resolve(strict=True)
expected = expected.resolve(strict=True)
mode = stat.S_IMODE(os.lstat(expected).st_mode)
raise SystemExit(0 if target == expected and expected.is_file() and mode & stat.S_IXUSR else 1)
PY
done

TEMPORARY="$(mktemp -d)"
trap 'rm -rf "$TEMPORARY"' EXIT
if ! "$PREFIX/bin/observer" diagnostics >"$TEMPORARY/product.json" 2>"$TEMPORARY/product.err"; then
  fail 'observer diagnosticsがreadyを返しません'
fi
[ ! -s "$TEMPORARY/product.err" ] || fail 'observer diagnosticsがstderrを出しました'
if ! "$PREFIX/bin/observer-mcp" --diagnostics >"$TEMPORARY/mcp.json" 2>"$TEMPORARY/mcp.err"; then
  fail 'observer-mcp --diagnosticsが失敗しました'
fi
[ ! -s "$TEMPORARY/mcp.err" ] || fail 'observer-mcp --diagnosticsがstderrを出しました'

python3 - "$TEMPORARY/product.json" "$TEMPORARY/mcp.json" \
  "$PREFIX" "${HOME:-}" "$EXPECTED_VERSION" <<'PY' \
  || fail 'diagnostics schemaまたはversionが不正です'
import json
import sys
from pathlib import Path

product_path, mcp_path, prefix, home, expected_version = sys.argv[1:]
try:
    product = json.loads(Path(product_path).read_text(encoding="utf-8"))
    mcp = json.loads(Path(mcp_path).read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError):
    raise SystemExit(1)

manifest = {
    "schema": "observer.product_manifest.v1",
    "name": "observer",
    "version": expected_version,
    "supported_platforms": ["darwin"],
    "state": {
        "platform": "darwin",
        "default_root": "$HOME/Library/Application Support/Observer",
        "directory_mode": "0700",
        "file_mode": "0600",
    },
    "bins": [
        {"name": "observer", "path": "bin/observer.mjs"},
        {"name": "observer-mcp", "path": "bin/observer-mcp.mjs"},
        {"name": "observer-parent-stop-hook", "path": "bin/observer-parent-stop-hook.mjs"},
        {"name": "observer-hook-config", "path": "bin/observer-hook-config.mjs"},
        {"name": "observer-claude-characterization", "path": "bin/observer-claude-characterization.mjs"},
    ],
    "dependencies": [
        {"name": "node", "version": ">=22.13", "scope": "runtime"},
        {"name": "throughline", "version": "0.6.3", "scope": "supervisor"},
        {"name": "aiterm-mcp", "version": "0.14.0", "scope": "claude_transport"},
        {"name": "codex", "version": "codex-cli 0.144.3", "scope": "codex_host"},
    ],
    "diagnostics": [
        {"name": "product", "command": "observer diagnostics"},
        {"name": "mcp", "command": "observer-mcp --diagnostics"},
    ],
}
expected_product = {
    "schema": "observer.product_diagnostics.v1",
    "status": "ready",
    "manifest": manifest,
    "checks": [
        {"name": "package_manifest", "status": "ok"},
        {"name": "instruction_files", "status": "ok"},
        {"name": "bin_integrity", "status": "ok"},
        {"name": "node_runtime", "status": "ok"},
        {"name": "platform", "status": "ok"},
    ],
}
expected_mcp = {
    "schema": "observer.mcp_diagnostics.v1",
    "status": "ready",
    "server_version": expected_version,
    "protocol_versions": ["2025-11-25", "2025-06-18"],
    "tools": ["observer_read", "observer_wait"],
    "production_ai_surface": "disabled",
}
serialized = json.dumps(product, separators=(",", ":"))
leaks_path = prefix in serialized or (home not in ("", "/") and home in serialized)
raise SystemExit(0 if product == expected_product and mcp == expected_mcp and not leaks_path else 1)
PY

echo "Observer package verify: OK version=$EXPECTED_VERSION"
