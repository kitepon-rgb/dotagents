#!/usr/bin/env bash
# Auto-update curated NPM-installed CLIs and tools used across this user's
# development machines. Idempotent; safe to re-run.
#
# Excluded on purpose:
#   - codex-sidecar-cli  (npm-linked to local repo)
#   - codex-sidecar-core (npm-linked to local repo)
# If you later `npm link` any package below, remove it from this list first
# or this script will clobber the link with a registry copy.

set -u

LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/agents-update"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/agents-update.log"

PACKAGES=(
  '@anthropic-ai/claude-code'
  '@openai/codex'
  '@anthropic-ai/sdk'
  '@colbymchenry/codegraph'
  'aiterm-mcp'
  'caveat-cli'
  'claude-spotter'
  'codex-sidecar-mcp'
  'throughline'
)

{
  printf '\n=== agents-update start: %s ===\n' "$(date -Iseconds)"
  for pkg in "${PACKAGES[@]}"; do
    printf -- '--- %s ---\n' "$pkg"
    if ! npm install -g "${pkg}@latest"; then
      printf 'FAILED: %s\n' "$pkg"
    fi
  done
  printf '=== agents-update end:   %s ===\n' "$(date -Iseconds)"
} 2>&1 | tee -a "$LOG"
