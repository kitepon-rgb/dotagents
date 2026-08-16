#!/usr/bin/env bash
# 上流 phuryn を取り込み、kitepon overlay の短いコミット列を載せ直す。
# ビルド・本番配備はしない。dirty なら止まる。
set -euo pipefail

DESKTOP="${GROK_COMMUNITY_DESKTOP:-$HOME/Developer/grok-build-vscode}"
AFK="${GROK_COMMUNITY_AFK:-$HOME/Developer/afkpilot}"
PUSH=0

usage() {
  cat <<'EOF'
update-grok-community-overlay — fetch upstream and rebase kitepon overlay commits

  update-grok-community-overlay           rebase both trees, run focused tests
  update-grok-community-overlay --push    also git push --force-with-lease origin

Env:
  GROK_COMMUNITY_DESKTOP  default ~/Developer/grok-build-vscode
  GROK_COMMUNITY_AFK      default ~/Developer/afkpilot
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --push) PUSH=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown arg: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

rebase_one() {
  local dir="$1" name="$2"
  echo "=== $name ==="
  if [ ! -d "$dir/.git" ]; then
    echo "missing git repo: $dir" >&2
    exit 1
  fi
  git -C "$dir" remote get-url upstream >/dev/null
  git -C "$dir" remote get-url origin >/dev/null
  if [ -n "$(git -C "$dir" status --porcelain)" ]; then
    echo "dirty worktree, refuse: $dir" >&2
    git -C "$dir" status -sb >&2
    exit 1
  fi
  git -C "$dir" fetch upstream --tags
  git -C "$dir" fetch origin
  echo "ours on top of upstream:"
  git -C "$dir" log --oneline "upstream/main..HEAD"
  git -C "$dir" rebase upstream/main
  echo "HEAD after rebase: $(git -C "$dir" rev-parse --short HEAD)"
}

rebase_one "$DESKTOP" "grok-build-desktop-kitepon"
rebase_one "$AFK" "afkpilot-kitepon"

echo "=== focused tests ==="
if [ -f "$DESKTOP/package.json" ]; then
  (cd "$DESKTOP" && npx vitest run test/relay-url-resolve.test.ts test/app-update.test.ts test/remote-client-state.test.ts)
fi
if [ -f "$AFK/package.json" ]; then
  (cd "$AFK" && npx vitest run test/devices-file.test.ts)
fi

if [ "$PUSH" -eq 1 ]; then
  git -C "$DESKTOP" push --force-with-lease origin HEAD
  git -C "$AFK" push --force-with-lease origin HEAD
  echo "pushed origin (force-with-lease)"
else
  echo "rebase ok. build/deploy is separate. push with --push if origin should move."
  echo "Desktop build: cd $DESKTOP && npm run compile && npx electron-builder --mac dir --arm64 --publish never"
  echo "AFK deploy:    rsync source then docker compose -f $AFK/deploy/kitepon/docker-compose.yml up -d --build"
fi
