#!/usr/bin/env bash
# WSL2へdotagents工場を一撃展開し、定期更新のdelivery receiptまで検証する。
set -euo pipefail

script_source="${BASH_SOURCE[0]}"
while [ -L "$script_source" ]; do
  script_dir="$(cd "$(dirname "$script_source")" && pwd)"
  script_source="$(readlink "$script_source")"
  case "$script_source" in /*) ;; *) script_source="$script_dir/$script_source" ;; esac
done
ROOT="$(cd "$(dirname "$script_source")/.." && pwd)"
CRON_MARKER='# dotagents-agents-update-wsl'
REPORT_CONFIG="${FACTORY_REPORTER_CONFIG:-${XDG_CONFIG_HOME:-$HOME/.config}/dotagents/factory-reporter.json}"
REPORT_STATE="${XDG_STATE_HOME:-$HOME/.local/state}/dotagents/factory-reporter-v7"
UPDATE_LOG="${XDG_STATE_HOME:-$HOME/.local/state}/agents-update/agents-update.log"

die() { echo "FAIL: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "必須commandがない: $1"; }

is_wsl() {
  [ "${DOTAGENTS_SETUP_WSL_FORCE:-0}" = 1 ] && return 0
  [ "$(uname -s 2>/dev/null || true)" = Linux ] \
    && grep -qiE '(microsoft|wsl)' /proc/sys/kernel/osrelease 2>/dev/null
}

validate_report_config() {
  [ -f "$REPORT_CONFIG" ] || die "factory reporter configがない: $REPORT_CONFIG"
  node - "$REPORT_CONFIG" <<'NODE' || exit 1
const fs = require('fs');
const path = process.argv[2];
let value;
try { value = JSON.parse(fs.readFileSync(path, 'utf8')); }
catch (error) { process.stderr.write(`FAIL: factory reporter configを読めない: ${error.message}\n`); process.exit(1); }
let endpoint;
try { endpoint = new URL(value?.reporting?.endpoint); }
catch { process.stderr.write('FAIL: factory reporter endpointが不正\n'); process.exit(1); }
if (value?.reporting?.enabled !== true || endpoint.pathname !== '/api/factory/v7/reports') {
  process.stderr.write('FAIL: factory reporterはenabledなwire v7でなければならない\n');
  process.exit(1);
}
NODE
}

fresh_report_id() {
  node -e '
    try {
      const value = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      if (typeof value.report_id === "string") process.stdout.write(value.report_id);
    } catch {}
  ' "$REPORT_STATE/latest-report.json" 2>/dev/null || true
}

new_batch_token() {
  if [ -r /proc/sys/kernel/random/uuid ]; then
    tr -d '\r\n' </proc/sys/kernel/random/uuid
  else
    python3 -c 'import uuid; print(uuid.uuid4())'
  fi
}

validate_delivery_receipt() {
  local prior_report_id="$1" batch_token="$2"
  node --input-type=module - \
    "$ROOT/lib/factory/delivery-receipt.mjs" \
    "$REPORT_STATE/latest-report.json" \
    "$REPORT_STATE/delivery-receipt.json" \
    "$prior_report_id" "$batch_token" <<'NODE'
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [contractPath, reportPath, receiptPath, priorReportId, batchToken] = process.argv.slice(2);
const { assertDeliveryReceipt } = await import(pathToFileURL(contractPath).href);
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
assertDeliveryReceipt({ report, priorReportId: priorReportId || null, receipt, batchToken });
process.stdout.write(`${report.report_id}\n`);
NODE
}

run_scheduled_update() {
  need node
  need python3
  validate_report_config
  local prior_report_id batch_token report_id
  prior_report_id="$(fresh_report_id)"
  batch_token="$(new_batch_token)"
  AGENTS_UPDATE_BATCH_TOKEN="$batch_token" \
    FACTORY_REPORTER_RUNNER="$HOME/.local/bin/factory-reporter-v7-schedule-runner" \
    "$ROOT/bin/agents-update.sh"
  [ -f "$UPDATE_LOG" ] || die "agents-update logがない: $UPDATE_LOG"
  grep -Fq "agents-update batch-token: $batch_token" "$UPDATE_LOG" \
    || die '今回のbatch tokenがagents-update logにない'
  grep -Fq 'agents-update end:' "$UPDATE_LOG" || die 'agents-update完了行がlogにない'
  report_id="$(validate_delivery_receipt "$prior_report_id" "$batch_token")" \
    || die 'fresh v7 reportとBugHub delivery receiptが一致しない'
  printf '{"ok":true,"mode":"scheduled-update","batch_token":"%s","report_id":"%s","delivery_acknowledged":true}\n' \
    "$batch_token" "$report_id"
}

backup_managed_config() {
  local -a paths=()
  local path
  for path in .gitconfig .gitignore_global .claude.json .claude/settings.json \
    .codex/config.toml .codex/hooks.json; do
    [ ! -e "$HOME/$path" ] || paths+=("$path")
  done
  [ "${#paths[@]}" -gt 0 ] || return 0
  local backup_dir="$HOME/Archives"
  local backup_file
  mkdir -p "$backup_dir"
  backup_file="$(mktemp "$backup_dir/dotagents-pre-wsl-setup-$(date +%Y%m%d-%H%M%S)-XXXXXX.tar.gz")"
  tar -czf "$backup_file" -C "$HOME" "${paths[@]}"
}

ensure_git_identity() {
  git config --global user.name kitepon-rgb
  git config --global user.email kitepon-rgb@users.noreply.github.com
  git config --global init.defaultBranch main
  if [ ! -f "$HOME/.gitignore_global" ] || ! grep -Fqx '.DS_Store' "$HOME/.gitignore_global"; then
    printf '.DS_Store\n' >>"$HOME/.gitignore_global"
  fi
  git config --global core.excludesfile "$HOME/.gitignore_global"
}

ensure_claude_mcp() {
  local name="$1"
  shift
  local output=''
  if output="$(NO_COLOR=1 TERM=dumb claude mcp get "$name" 2>&1)" \
    && grep -Eq '^  Scope: User config' <<<"$output" \
    && grep -Eq '^  Status: .*Connected$' <<<"$output"; then
    return 0
  fi
  claude mcp remove --scope user "$name" >/dev/null 2>&1 || true
  claude mcp add --scope user "$name" -- "$@"
  output="$(NO_COLOR=1 TERM=dumb claude mcp get "$name" 2>&1)" \
    || die "Claude MCPを取得できない: $name"
  if ! grep -Eq '^  Scope: User config' <<<"$output" \
    || ! grep -Eq '^  Status: .*Connected$' <<<"$output"; then
    die "Claude MCPがuser scopeでConnectedでない: $name"
  fi
}

codex_mcp_matches() {
  local name="$1" command_name="$2"
  codex mcp get "$name" --json 2>/dev/null | node -e '
    let value;
    try { value = JSON.parse(require("fs").readFileSync(0, "utf8")); }
    catch { process.exit(1); }
    const transport = value?.transport;
    process.exit(value?.enabled === true && transport?.type === "stdio"
      && transport?.command === process.argv[1]
      && Array.isArray(transport?.args) && transport.args.length === 0 ? 0 : 1);
  ' "$command_name"
}

ensure_codex_mcp() {
  local name="$1" command_name="$2"
  if codex_mcp_matches "$name" "$command_name"; then
    return 0
  fi
  codex mcp remove "$name" >/dev/null 2>&1 || true
  codex mcp add "$name" -- "$command_name"
  codex_mcp_matches "$name" "$command_name" \
    || die "Codex MCPがcanonicalでない: $name"
}

ensure_managed_commands() {
  local command_name missing=0
  for command_name in caveat throughline spotter lattice markitdown gpt-connector \
    aiterm-mcp codex-sidecar-mcp peertable-client; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      echo "INFO: factory managed commandを更新で補完する: $command_name"
      missing=1
    fi
  done
  if [ "$missing" -eq 1 ]; then
    "$ROOT/bin/agents-update.sh"
  fi
  for command_name in caveat throughline spotter lattice markitdown gpt-connector \
    aiterm-mcp codex-sidecar-mcp peertable-client; do
    need "$command_name"
  done
}

ensure_caveat_sync() {
  if [ -d "$HOME/.caveat/own/.git" ]; then
    caveat sync
  else
    caveat sync --init --repo https://github.com/kitepon-rgb/Caveat-Private.git
  fi
}

ensure_mcp() {
  ensure_claude_mcp aiterm aiterm-mcp
  ensure_claude_mcp caveat caveat mcp-server
  ensure_claude_mcp lattice lattice-mcp
  ensure_claude_mcp codex-sidecar codex-sidecar-mcp
  ensure_claude_mcp gpt_connector gpt-connector-mcp
  ensure_codex_mcp aiterm aiterm-mcp
  ensure_codex_mcp lattice lattice-mcp
  ensure_codex_mcp codex-sidecar codex-sidecar-mcp
  ensure_codex_mcp gpt_connector gpt-connector-mcp
}

cron_quote() {
  printf "'%s'" "${1//\'/\'\\\'\'}"
}

install_cron() {
  mkdir -p "$(dirname "$UPDATE_LOG")"
  if ! systemctl is-enabled cron >/dev/null 2>&1 \
    || ! systemctl is-active cron >/dev/null 2>&1; then
    sudo -n systemctl enable --now cron
  fi
  local cron_tmp current candidate installed backup_dir backup_file setup_bin scheduler_log line
  cron_tmp="$(mktemp -d)"
  current="$cron_tmp/current"
  candidate="$cron_tmp/candidate"
  installed="$cron_tmp/installed"
  trap 'rm -rf "${cron_tmp:-}"' RETURN
  crontab -l >"$current" 2>/dev/null || true
  backup_dir="${XDG_STATE_HOME:-$HOME/.local/state}/dotagents/backups"
  mkdir -p "$backup_dir"
  backup_file="$(mktemp "$backup_dir/crontab-pre-wsl-setup-$(date +%Y%m%d-%H%M%S)-XXXXXX")"
  cp "$current" "$backup_file"
  awk -v marker="$CRON_MARKER" '
    index($0, marker) { next }
    $0 ~ /(^|[[:space:]\047"])([^[:space:]\047"]*\/)?agents-update(\.sh)?([[:space:]\047"]|$)/ { next }
    $0 ~ /(^|[[:space:]\047"])([^[:space:]\047"]*\/)?update-npm-globals(\.sh)?([[:space:]\047"]|$)/ { next }
    { print }
  ' "$current" >"$candidate"
  setup_bin="$HOME/.local/bin/setup-wsl-factory"
  scheduler_log="${XDG_STATE_HOME:-$HOME/.local/state}/agents-update/scheduler.log"
  line="0 2 * * * $(cron_quote "$setup_bin") --scheduled-update >> $(cron_quote "$scheduler_log") 2>&1 $CRON_MARKER"
  printf '%s\n' "$line" >>"$candidate"
  crontab "$candidate"
  crontab -l >"$installed"
  [ "$(grep -Fxc "$line" "$installed")" -eq 1 ] \
    || die '毎日2:00のagents-update cronを読み戻せない'
}

run_setup() {
  is_wsl || die 'このスクリプトはWSL2専用'
  local command_name
  for command_name in git gh node npm docker python3 claude codex uv crontab sudo systemctl; do
    need "$command_name"
  done
  local node_major
  node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
  [ "$node_major" -ge 22 ] || die 'Node.js 22以上が必要'
  python3 -c 'print(1)' >/dev/null || die 'python3を実行できない'
  docker info >/dev/null 2>&1 || die 'docker daemonへ接続できない'
  gh auth status >/dev/null 2>&1 || die 'GitHub CLIが未認証'
  sudo -n true >/dev/null 2>&1 || die '非対話sudoを利用できない'

  backup_managed_config
  ensure_git_identity
  "$ROOT/bin/apply-codex-config.sh" --apply
  "$ROOT/install.sh" --profile official
  ensure_managed_commands
  ensure_caveat_sync
  ensure_mcp
  lattice hooks install --host claude
  lattice hooks install --host codex
  spotter install -y
  "$ROOT/bin/configure-windows-wsl-ssh.sh" --apply
  install_cron
  "$ROOT/bin/verify-install.sh" --profile official
  run_scheduled_update
  echo 'setup-wsl-factory: OK'
}

case "${1:-}" in
  '') run_setup ;;
  --scheduled-update)
    [ "$#" -eq 1 ] || die '使い方: setup-wsl-factory.sh [--scheduled-update]'
    is_wsl || die 'このスクリプトはWSL2専用'
    run_scheduled_update
    ;;
  *) die '使い方: setup-wsl-factory.sh [--scheduled-update]' ;;
esac
