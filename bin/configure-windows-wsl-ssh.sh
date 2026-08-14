#!/usr/bin/env bash
# Windows Codex Desktop が WSL2 を Windows native と混ぜず、独立 SSH host として開くための配線。
set -euo pipefail

mode=apply
case "${1:-}" in
  ""|--apply) mode=apply ;;
  --check) mode=check ;;
  *) echo "FAIL: 使い方: $0 [--apply|--check]" >&2; exit 2 ;;
esac

is_wsl=false
if [ "${DOTAGENTS_WSL_SSH_FORCE:-0}" = 1 ]; then
  is_wsl=true
elif [ "$(uname -s)" = Linux ] && grep -qiE '(microsoft|wsl)' /proc/sys/kernel/osrelease 2>/dev/null; then
  is_wsl=true
fi
if [ "$is_wsl" != true ]; then
  echo 'SKIP: Windows→WSL SSH 配線は WSL2 だけが対象'
  exit 0
fi

remote_host="${DOTAGENTS_WSL_SSH_HOST:-fox-wsl}"
remote_user="${DOTAGENTS_WSL_SSH_USER:-$(id -un)}"
remote_port="${DOTAGENTS_WSL_SSH_PORT:-2222}"
case "$remote_host" in *[!A-Za-z0-9._-]*|'') echo "FAIL: 不正な SSH host alias: $remote_host" >&2; exit 2 ;; esac
case "$remote_user" in *[!A-Za-z0-9._-]*|'') echo "FAIL: 不正な WSL user: $remote_user" >&2; exit 2 ;; esac
case "$remote_port" in *[!0-9]*|'') echo "FAIL: 不正な SSH port: $remote_port" >&2; exit 2 ;; esac

windows_home="${DOTAGENTS_WINDOWS_HOME:-}"
if [ -z "$windows_home" ]; then
  cmd_bin=''
  if command -v cmd.exe >/dev/null 2>&1; then
    cmd_bin="$(command -v cmd.exe)"
  elif [ -x /mnt/c/Windows/System32/cmd.exe ]; then
    cmd_bin=/mnt/c/Windows/System32/cmd.exe
  fi
  [ -n "$cmd_bin" ] || { echo 'FAIL: Windows USERPROFILE を取得する cmd.exe が見つからない' >&2; exit 1; }
  command -v wslpath >/dev/null 2>&1 || { echo 'FAIL: Windows USERPROFILE を変換する wslpath が見つからない' >&2; exit 1; }
  # Linux cwdのままcmd.exeを起動するとUNC path警告がstdoutへ混ざるため、Windows drive上で取得する。
  windows_drive="$(wslpath -u "C:\\")"
  windows_profile="$(cd "$windows_drive" && "$cmd_bin" /d /c 'echo %USERPROFILE%' | tr -d '\r')"
  windows_home="$(wslpath -u "$windows_profile")"
fi
case "$windows_home" in /*) ;; *) echo "FAIL: Windows home が絶対pathでない: $windows_home" >&2; exit 1 ;; esac

windows_ssh_dir="$windows_home/.ssh"
windows_public_key="$windows_ssh_dir/id_ed25519.pub"
windows_config="$windows_ssh_dir/config"
wsl_ssh_dir="$HOME/.ssh"
wsl_authorized_keys="$wsl_ssh_dir/authorized_keys"
begin_marker="# BEGIN dotagents $remote_host"
end_marker="# END dotagents $remote_host"

[ -f "$windows_public_key" ] || {
  echo "FAIL: Windows 公開鍵がない: $windows_public_key" >&2
  echo '      Windows側で ssh-keygen -t ed25519 を一度実行してから install.sh を再実行' >&2
  exit 1
}
public_key="$(awk 'NF { print; exit }' "$windows_public_key")"
case "$public_key" in ssh-*' '*) ;; *) echo "FAIL: Windows 公開鍵の形式が不正: $windows_public_key" >&2; exit 1 ;; esac

managed_block=$(cat <<EOF
$begin_marker
Host $remote_host
  HostName localhost
  Port $remote_port
  User $remote_user
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
$end_marker
EOF
)

marker_begin_count=0
marker_end_count=0
if [ -f "$windows_config" ]; then
  marker_begin_count="$(grep -Fxc "$begin_marker" "$windows_config" || true)"
  marker_end_count="$(grep -Fxc "$end_marker" "$windows_config" || true)"
fi
[ "$marker_begin_count" -le 1 ] && [ "$marker_begin_count" -eq "$marker_end_count" ] || {
  echo "FAIL: dotagents managed block marker が壊れている: $windows_config" >&2
  exit 1
}

if [ -f "$windows_config" ] && awk -v host="$remote_host" -v begin="$begin_marker" -v end="$end_marker" '
  $0 == begin { managed = 1; next }
  $0 == end { managed = 0; next }
  !managed && tolower($1) == "host" {
    for (i = 2; i <= NF; i++) if ($i == host) found = 1
  }
  END { exit(found ? 0 : 1) }
' "$windows_config"; then
  echo "FAIL: dotagents 管理外の Host $remote_host が既にある: $windows_config" >&2
  exit 1
fi

authorized_ok=false
if [ -f "$wsl_authorized_keys" ] && grep -Fqx "$public_key" "$wsl_authorized_keys"; then
  authorized_ok=true
fi
config_ok=false
if [ "$marker_begin_count" -eq 1 ]; then
  current_block="$(awk -v begin="$begin_marker" -v end="$end_marker" '
    $0 == begin { capture = 1 }
    capture { print }
    $0 == end { exit }
  ' "$windows_config")"
  [ "$current_block" = "$managed_block" ] && config_ok=true
fi

if [ "$mode" = check ]; then
  [ "$authorized_ok" = true ] || { echo "FAIL: Windows 公開鍵が WSL authorized_keys にない: $wsl_authorized_keys" >&2; exit 1; }
  [ "$config_ok" = true ] || { echo "FAIL: Windows SSH の $remote_host managed block が不一致: $windows_config" >&2; exit 1; }
  echo "OK: Windows→WSL SSH 配線 ($remote_host -> localhost:$remote_port, user=$remote_user)"
  exit 0
fi

if [ "$authorized_ok" = true ] && [ "$config_ok" = true ]; then
  echo "OK: Windows→WSL SSH 配線は適用済み ($remote_host)"
  exit 0
fi

# ~/.ssh と Windows側 SSH config はgit管理外の重要設定なので、既存ファイルを変更前にtar退避する。
backup_dir="$HOME/.local/state/dotagents/backups/$(date +%Y%m%d-%H%M%S)-windows-wsl-ssh"
mkdir -p "$backup_dir"
if [ -f "$wsl_authorized_keys" ]; then
  tar -czf "$backup_dir/wsl-authorized-keys.tar.gz" -C "$HOME" .ssh/authorized_keys
fi
if [ -f "$windows_config" ]; then
  tar -czf "$backup_dir/windows-ssh-config.tar.gz" -C "$windows_home" .ssh/config
fi

mkdir -p "$wsl_ssh_dir" "$windows_ssh_dir"
chmod 700 "$wsl_ssh_dir"

if [ "$authorized_ok" != true ]; then
  authorized_candidate="$(mktemp)"
  trap 'rm -f "${authorized_candidate:-}" "${config_candidate:-}"' EXIT
  if [ -f "$wsl_authorized_keys" ]; then
    awk '{ print }' "$wsl_authorized_keys" >"$authorized_candidate"
  fi
  printf '%s\n' "$public_key" >>"$authorized_candidate"
  install -m 600 "$authorized_candidate" "$wsl_authorized_keys"
fi

if [ "$config_ok" != true ]; then
  config_candidate="$(mktemp)"
  trap 'rm -f "${authorized_candidate:-}" "${config_candidate:-}"' EXIT
  if [ -f "$windows_config" ]; then
    awk -v begin="$begin_marker" -v end="$end_marker" '
      $0 == begin { managed = 1; next }
      $0 == end { managed = 0; next }
      !managed { print }
    ' "$windows_config" >"$config_candidate"
  fi
  [ ! -s "$config_candidate" ] || printf '\n' >>"$config_candidate"
  printf '%s\n' "$managed_block" >>"$config_candidate"
  cp "$config_candidate" "$windows_config"
fi

echo "configured: Windows SSH $remote_host -> localhost:$remote_port (user=$remote_user)"
echo "authorized: $windows_public_key -> $wsl_authorized_keys"
echo "backup: $backup_dir"
