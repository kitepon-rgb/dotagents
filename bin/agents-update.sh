#!/usr/bin/env bash
# Auto-update curated NPM-installed CLIs and tools used across this user's
# development machines. Idempotent; safe to re-run.
#
# 注意: `npm link` や `npm install -g .`（ローカル版のグローバル導入）中の package を
# このリストに残すと registry 版で上書きされる。ローカル開発に切り替える時は先にリストから外すこと。
# codex-sidecar-cli/core は registry 運用で確定（2026-07-04 オーナー裁定「そのままで」）。
# link 開発へ戻す場合は先にこのリストから外して npm link する（将来の任意事項）。

set -uo pipefail

# launchd / cron は最小 PATH で起動する（npm が /opt/homebrew 等にあると見つからず静かに失敗する）。
PATH="${AGENTS_UPDATE_PATH_PREFIX:-$HOME/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin}:$PATH"

# Linux / WSL2 の cron は NVM の選択済み Node を PATH に含めない。
# 対話 shell 側の偶然の PATH に頼らず、NVM がある端末では正規入口から復元する。
if ! command -v npm >/dev/null 2>&1 && [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1090,SC1091
  . "$NVM_DIR/nvm.sh"
fi

LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/agents-update"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/agents-update.log"

runtime_os="${OS:-}"
if command -v uname >/dev/null 2>&1; then
  runtime_os="$(uname -s)"
fi
case "$runtime_os" in
  MINGW*|MSYS*|Windows_NT)
    FACTORY_REPORTER_CONFIG="${FACTORY_REPORTER_CONFIG:-${LOCALAPPDATA:-$HOME/AppData/Local}/dotagents/factory-reporter/config.json}"
    ;;
  *)
    FACTORY_REPORTER_CONFIG="${FACTORY_REPORTER_CONFIG:-${XDG_CONFIG_HOME:-$HOME/.config}/dotagents/factory-reporter.json}"
    ;;
esac
FACTORY_REPORTER_RUNNER="${FACTORY_REPORTER_RUNNER:-$HOME/.local/bin/factory-reporter-schedule-runner}"

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

UV_TOOLS=(
  'markitdown'
)

{
  update_failed=0
  report_failed=0
  printf '\n=== agents-update start: %s ===\n' "$(date -Iseconds)"
  if ! command -v npm >/dev/null 2>&1; then
    printf 'FAILED: npm が PATH にない（NVM 利用時は %s/nvm.sh と default Node を確認）\n' "${NVM_DIR:-$HOME/.nvm}"
    update_failed=1
  else
    for pkg in "${PACKAGES[@]}"; do
      printf -- '--- %s ---\n' "$pkg"
      if ! npm install -g "${pkg}@latest"; then
        printf 'FAILED: %s\n' "$pkg"
        update_failed=1
      fi
    done
  fi
  if ! command -v uv >/dev/null 2>&1; then
    printf 'FAILED: uv 不在（MarkItDownを更新できない）\n'
    update_failed=1
  else
    for pkg in "${UV_TOOLS[@]}"; do
      printf -- '--- uv-tool:%s ---\n' "$pkg"
      if ! uv tool upgrade "$pkg"; then
        printf 'FAILED: uv-tool:%s\n' "$pkg"
        update_failed=1
      fi
    done
  fi

  printf -- '--- factory-reporter:post-update-contract ---\n'
  if [[ ! -x "$FACTORY_REPORTER_RUNNER" ]]; then
    printf 'FAILED: factory reporter runner が実行できない: %s\n' "$FACTORY_REPORTER_RUNNER"
    report_failed=1
  elif ! "$FACTORY_REPORTER_RUNNER" --config "$FACTORY_REPORTER_CONFIG"; then
    printf 'FAILED: factory reporter の更新後contract scan/report\n'
    report_failed=1
  fi

  printf 'agents-update result: update=%s report=%s\n' \
    "$([[ "$update_failed" -eq 0 ]] && printf success || printf failed)" \
    "$([[ "$report_failed" -eq 0 ]] && printf success || printf failed)"
  printf '=== agents-update end:   %s ===\n' "$(date -Iseconds)"
  if [[ "$update_failed" -ne 0 || "$report_failed" -ne 0 ]]; then
    exit 1
  fi
  exit 0
} 2>&1 | tee -a "$LOG"
