#!/usr/bin/env bash
# Windows→WSL SSH 配線の生成・冪等性・管理境界を隔離fixtureで検証する。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WSL_HOME="$(mktemp -d)"
WINDOWS_HOME="$(mktemp -d)"
CONFLICT_WINDOWS_HOME="$(mktemp -d)"
trap 'rm -rf "$WSL_HOME" "$WINDOWS_HOME" "$CONFLICT_WINDOWS_HOME"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
run_configure() {
  HOME="$WSL_HOME" \
    DOTAGENTS_WSL_SSH_FORCE=1 \
    DOTAGENTS_WINDOWS_HOME="$WINDOWS_HOME" \
    DOTAGENTS_WSL_SSH_USER=kite \
    "$ROOT/bin/configure-windows-wsl-ssh.sh" "$1"
}

mkdir -p "$WINDOWS_HOME/.ssh" "$WINDOWS_HOME/.codex" "$WSL_HOME/.codex"
public_key='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFixtureOnlyNotASecret windows-fixture'
printf '%s\n' "$public_key" >"$WINDOWS_HOME/.ssh/id_ed25519.pub"
printf '%s\n' '{"hooks":{"UserPromptSubmit":[{"hooks":[{"type":"command","command":"/usr/bin/node /home/kite/hook.mjs"}]}]}}' >"$WSL_HOME/.codex/hooks.json"
printf '%s\n' '{"hooks":{"UserPromptSubmit":[{"hooks":[{"type":"command","command":"C:\\\\Program Files\\\\nodejs\\\\node.exe"}]}]}}' >"$WINDOWS_HOME/.codex/hooks.json"
cat >"$WINDOWS_HOME/.ssh/config" <<'EOF'
Host existing-host
  HostName 192.0.2.1
EOF

run_configure --apply
run_configure --check
grep -Fqx "$public_key" "$WSL_HOME/.ssh/authorized_keys" || fail 'Windows公開鍵をauthorized_keysへ配っていない'
grep -Fq 'Host existing-host' "$WINDOWS_HOME/.ssh/config" || fail '既存Windows SSH設定を保持していない'
grep -Fq 'Host fox-wsl' "$WINDOWS_HOME/.ssh/config" || fail 'fox-wsl aliasを生成していない'
grep -Fq 'HostName localhost' "$WINDOWS_HOME/.ssh/config" || fail 'fox-wslをlocalhostへ向けていない'
grep -Fq 'Port 2222' "$WINDOWS_HOME/.ssh/config" || fail 'fox-wslのportが2222でない'
grep -Fq 'User kite' "$WINDOWS_HOME/.ssh/config" || fail 'fox-wslのuserがkiteでない'
[ "$(grep -Fc '# BEGIN dotagents fox-wsl' "$WINDOWS_HOME/.ssh/config")" -eq 1 ] || fail 'managed blockが1件でない'
cmp -s "$WSL_HOME/.codex/hooks.json" "$WINDOWS_HOME/.codex/hooks.json" || fail 'WSL正規hookをWindows Codex Desktopへ投影していない'

before_authorized="$(cksum "$WSL_HOME/.ssh/authorized_keys")"
before_config="$(cksum "$WINDOWS_HOME/.ssh/config")"
before_hooks="$(cksum "$WINDOWS_HOME/.codex/hooks.json")"
run_configure --apply
[ "$(cksum "$WSL_HOME/.ssh/authorized_keys")" = "$before_authorized" ] || fail 'authorized_keysの再実行が冪等でない'
[ "$(cksum "$WINDOWS_HOME/.ssh/config")" = "$before_config" ] || fail 'Windows SSH configの再実行が冪等でない'
[ "$(cksum "$WINDOWS_HOME/.codex/hooks.json")" = "$before_hooks" ] || fail 'Windows Codex hooksの再実行が冪等でない'
[ "$(grep -Fxc "$public_key" "$WSL_HOME/.ssh/authorized_keys")" -eq 1 ] || fail 'Windows公開鍵を重複登録した'

printf '%s\n' '{"hooks":{"UserPromptSubmit":[{"hooks":[{"type":"command","command":"C:\\\\Program Files\\\\nodejs\\\\node.exe"}]}]}}' >"$WINDOWS_HOME/.codex/hooks.json"
if run_configure --check >"$WSL_HOME/hooks-drift.out" 2>&1; then
  fail 'Windows Codex hooksのdriftを見逃した'
fi
grep -Fq 'Windows Codex Desktop hooks が WSL 正規hooksと不一致' "$WSL_HOME/hooks-drift.out" || fail 'hook driftの理由を示さない'
run_configure --apply

mkdir -p "$CONFLICT_WINDOWS_HOME/.ssh"
printf '%s\n' "$public_key" >"$CONFLICT_WINDOWS_HOME/.ssh/id_ed25519.pub"
cat >"$CONFLICT_WINDOWS_HOME/.ssh/config" <<'EOF'
Host fox-wsl
  HostName unmanaged.example
EOF
if HOME="$WSL_HOME" DOTAGENTS_WSL_SSH_FORCE=1 DOTAGENTS_WINDOWS_HOME="$CONFLICT_WINDOWS_HOME" \
  "$ROOT/bin/configure-windows-wsl-ssh.sh" --apply >"$WSL_HOME/conflict.out" 2>&1; then
  fail '管理外のfox-wsl設定を上書きした'
fi
grep -Fq 'dotagents 管理外の Host fox-wsl' "$WSL_HOME/conflict.out" || fail '管理外aliasの衝突理由を示さない'

echo 'wsl-remote-ssh install test: OK'
