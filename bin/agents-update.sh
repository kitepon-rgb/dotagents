#!/usr/bin/env bash
# Auto-update curated NPM-installed CLIs and tools used across this user's
# development machines. Idempotent; safe to re-run.
#
# 注意: `npm link` や `npm install -g .`（ローカル版のグローバル導入）中の package を
# このリストに残すと registry 版で上書きされる。ローカル開発に切り替える時は先にリストから外すこと。
# codex-sidecar-cli/core は registry 運用で確定（2026-07-04 オーナー裁定「そのままで」）。
# link 開発へ戻す場合は先にこのリストから外して npm link する（将来の任意事項）。

set -u

# launchd / cron は最小 PATH で起動する（npm が /opt/homebrew 等にあると見つからず静かに失敗する）。
PATH="${AGENTS_UPDATE_PATH_PREFIX:-/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin}:$PATH"

# Linux / WSL2 の cron は NVM の選択済み Node を PATH に含めない。
# 対話 shell 側の偶然の PATH に頼らず、NVM がある端末では正規入口から復元する。
if ! command -v npm >/dev/null 2>&1 && [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1090,SC1091
  . "$NVM_DIR/nvm.sh"
fi

if ! command -v npm >/dev/null 2>&1; then
  printf 'FATAL: npm が PATH にない（NVM 利用時は %s/nvm.sh と default Node を確認）\n' "${NVM_DIR:-$HOME/.nvm}" >&2
  exit 1
fi

LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/agents-update"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/agents-update.log"

PACKAGES=(
  '@anthropic-ai/claude-code'
  '@openai/codex'
  '@steipete/oracle'
  '@anthropic-ai/sdk'
  '@colbymchenry/codegraph'
  'aiterm-mcp'
  'caveat-cli'
  'claude-spotter'
  'codex-sidecar-cli'
  'codex-sidecar-core'
  'codex-sidecar-mcp'
  'pnpm'
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
