#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OBSERVER_REPO="${OBSERVER_REPO:-$ROOT/../Observer}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
[ -f "$OBSERVER_REPO/package.json" ] || fail "Observer repoが見つかりません: $OBSERVER_REPO"

HOME_FIXTURE="$WORK/home"
PREFIX="$WORK/prefix"
mkdir -p "$HOME_FIXTURE/.claude" "$HOME_FIXTURE/.codex" "$PREFIX"
printf '%s\n' '{"sentinel":"claude-existing"}' >"$HOME_FIXTURE/.claude/settings.json"
printf '%s\n' '{"sentinel":"codex-existing"}' >"$HOME_FIXTURE/.codex/hooks.json"
printf '%s\n' 'credential-must-not-change' >"$HOME_FIXTURE/credential.sentinel"
printf '%s\n' 'prefix-unrelated-must-remain' >"$PREFIX/unrelated.sentinel"
chmod 600 "$HOME_FIXTURE/credential.sentinel"

before_claude="$(cat "$HOME_FIXTURE/.claude/settings.json")"
before_codex="$(cat "$HOME_FIXTURE/.codex/hooks.json")"
before_credential="$(cat "$HOME_FIXTURE/credential.sentinel")"

npm pack "$OBSERVER_REPO" --pack-destination "$WORK" --silent >/dev/null
tarball_count="$(find "$WORK" -maxdepth 1 -name 'observer-*.tgz' | wc -l | tr -d ' ')"
[ "$tarball_count" = 1 ] || fail 'Observer tarballを一意に生成できません'
TARBALL="$(find "$WORK" -maxdepth 1 -name 'observer-*.tgz' -print -quit)"

install_candidate() {
  HOME="$HOME_FIXTURE" npm install --global --prefix "$PREFIX" "$TARBALL" \
    --ignore-scripts --no-audit --no-fund >/dev/null
}

verify_candidate() {
  HOME="$HOME_FIXTURE" "$ROOT/bin/verify-observer-package.sh" \
    --prefix "$PREFIX" --expected-version 0.0.0 >/dev/null
}

[ ! -e "$PREFIX/lib/node_modules/observer" ] || fail '初期package状態がabsentではありません'
install_candidate
verify_candidate
install_candidate
verify_candidate

dry="$(
  HOME="$HOME_FIXTURE" \
  CODEX_HOME="$HOME_FIXTURE/.codex" \
  OBSERVER_HOOK_CONFIG_BIN="$PREFIX/bin/observer-hook-config" \
    "$ROOT/bin/apply-observer-hook-config.sh" --dry-run \
    --observer-hook "$PREFIX/bin/observer-parent-stop-hook" \
    --state-root "$HOME_FIXTURE/observer-state"
)"
printf '%s' "$dry" | grep -Fq 'provider=claude' || fail 'installed hook dry-runがClaudeを検証しません'
printf '%s' "$dry" | grep -Fq 'provider=codex' || fail 'installed hook dry-runがCodexを検証しません'

if HOME="$HOME_FIXTURE" "$ROOT/bin/verify-observer-package.sh" \
  --prefix "$PREFIX" --expected-version 9.9.9 >/dev/null 2>&1
then
  fail 'version mismatchを成功扱いしました'
fi

product_source="$PREFIX/lib/node_modules/observer/src/product-diagnostics.mjs"
cp "$product_source" "$WORK/product-diagnostics.mjs"
python3 - "$product_source" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
changed = source.replace("observer.product_diagnostics.v1", "observer.product_diagnostics.v999", 1)
assert changed != source
path.write_text(changed, encoding="utf-8")
PY
if HOME="$HOME_FIXTURE" "$ROOT/bin/verify-observer-package.sh" \
  --prefix "$PREFIX" --expected-version 0.0.0 >/dev/null 2>&1
then
  fail 'schema mismatchを成功扱いしました'
fi
cp "$WORK/product-diagnostics.mjs" "$product_source"
verify_candidate

[ "$(cat "$HOME_FIXTURE/.claude/settings.json")" = "$before_claude" ] \
  || fail 'installまたはdry-runがClaude設定を変更しました'
[ "$(cat "$HOME_FIXTURE/.codex/hooks.json")" = "$before_codex" ] \
  || fail 'installまたはdry-runがCodex設定を変更しました'
[ "$(cat "$HOME_FIXTURE/credential.sentinel")" = "$before_credential" ] \
  || fail 'installまたはverifyがcredential sentinelを変更しました'

HOME="$HOME_FIXTURE" npm uninstall --global --prefix "$PREFIX" observer \
  --ignore-scripts --no-audit --no-fund >/dev/null
[ ! -e "$PREFIX/lib/node_modules/observer" ] || fail 'rollback後もObserver packageが残っています'
for name in observer observer-mcp observer-parent-stop-hook observer-hook-config observer-claude-characterization; do
  [ ! -e "$PREFIX/bin/$name" ] || fail "rollback後も$name commandが残っています"
done
[ "$(cat "$PREFIX/unrelated.sentinel")" = 'prefix-unrelated-must-remain' ] \
  || fail 'rollbackがprefix内の無関係fileを変更しました'
[ "$(cat "$HOME_FIXTURE/.claude/settings.json")" = "$before_claude" ] \
  || fail 'rollbackがClaude設定を変更しました'
[ "$(cat "$HOME_FIXTURE/.codex/hooks.json")" = "$before_codex" ] \
  || fail 'rollbackがCodex設定を変更しました'
[ "$(cat "$HOME_FIXTURE/credential.sentinel")" = "$before_credential" ] \
  || fail 'rollbackがcredential sentinelを変更しました'

echo 'observer package install/reinstall/verify/rollback: OK'
