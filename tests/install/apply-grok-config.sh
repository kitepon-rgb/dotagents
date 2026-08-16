#!/usr/bin/env bash
# apply-grok-config の Wave 1 面を実 HOME に触れず検証する。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOME_FIXTURE="$(mktemp -d)"
ABSENT_HOME="$(mktemp -d)"
SYMLINK_HOME="$(mktemp -d)"
trap 'rm -rf "$HOME_FIXTURE" "$ABSENT_HOME" "$SYMLINK_HOME"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }

HOME="$HOME_FIXTURE" "$ROOT/install.sh" --profile official >/dev/null
[ -L "$HOME_FIXTURE/.local/bin/apply-grok-config" ] \
  || fail 'apply-grok-config を ~/.local/bin へ配布しない'
assert_link() {
  if [ ! -L "$1" ] || [ "$(readlink "$1")" != "$2" ]; then
    fail "$1 が $2 向き symlink でない"
  fi
}
assert_link "$HOME_FIXTURE/.grok/rules/AGENTS.md" "$ROOT/grok/AGENTS.md"
assert_link "$HOME_FIXTURE/.grok/runbooks" "$ROOT/shared/runbooks"
assert_link "$HOME_FIXTURE/.grok/skills/orchestrate" "$ROOT/grok/skills/orchestrate"
assert_link "$HOME_FIXTURE/.grok/agents/refuter.md" "$ROOT/grok/agents/refuter.md"
assert_link "$HOME_FIXTURE/.grok/hooks/factory.json" "$ROOT/grok/hooks/factory.json"

mkdir -p "$HOME_FIXTURE/.grok"
cat >"$HOME_FIXTURE/.grok/config.toml" <<'EOF'
[models]
default = "keep-me"
default_reasoning_effort = "xhigh"

[ui]
permission_mode = "always-approve"

[privacy]
privacy_banner_acked = "keep-login"

[mcp_servers.x-article]
url = "https://example.invalid/mcp"
enabled = true

[compat.claude]
skills = true
agents = true
hooks = true
EOF
before="$(cat "$HOME_FIXTURE/.grok/config.toml")"
dry="$(HOME="$HOME_FIXTURE" "$HOME_FIXTURE/.local/bin/apply-grok-config" --dry-run)"
grep -Fq 'agents = false' <<<"$dry" || fail 'dry-run が agents = false を出さない'
grep -Fq 'hooks = false' <<<"$dry" || fail 'dry-run が hooks = false を出さない'
grep -Fq '[mcp_servers.aiterm]' <<<"$dry" || fail 'dry-run が工場MCPを出さない'
[ "$(cat "$HOME_FIXTURE/.grok/config.toml")" = "$before" ] || fail 'dry-run が config.toml を書き換えた'
[ ! -d "$HOME_FIXTURE/Archives" ] || fail 'dry-run が backup を作った'

HOME="$HOME_FIXTURE" "$HOME_FIXTURE/.local/bin/apply-grok-config" --apply >/dev/null
applied="$(cat "$HOME_FIXTURE/.grok/config.toml")"
grep -Fq 'default = "keep-me"' <<<"$applied" || fail 'models.default を書き換えた'
grep -Fq 'default_reasoning_effort = "xhigh"' <<<"$applied" || fail 'models.effort を書き換えた'
grep -Fq 'permission_mode = "always-approve"' <<<"$applied" || fail 'permission を書き換えた'
grep -Fq 'privacy_banner_acked = "keep-login"' <<<"$applied" || fail 'login/privacy を書き換えた'
grep -Fq 'skills = true' <<<"$applied" || fail 'compat.claude.skills を書き換えた'
grep -Fq 'hooks = false' <<<"$applied" || fail 'compat.claude.hooks を false にしない'
grep -Fq 'agents = false' <<<"$applied" || fail 'compat.claude.agents を false にしない'
if grep -Eq 'hooks[ \t]*=[ \t]*true' <<<"$applied"; then
  fail 'hooks = true が残っている'
fi
if grep -Eq 'agents[ \t]*=[ \t]*true' <<<"$applied"; then
  fail 'agents = true が残っている'
fi
grep -Fq 'url = "https://example.invalid/mcp"' <<<"$applied" || fail '個人MCP x-article を消した'
for name in aiterm caveat lattice codex-sidecar gpt_connector aishell; do
  grep -Fq "[mcp_servers.$name]" <<<"$applied" || fail "工場MCP $name を書かない"
done
grep -Fq 'command = "caveat"' <<<"$applied" || fail 'caveat command が契約と違う'
grep -Fq 'args = ["mcp-server"]' <<<"$applied" || fail 'caveat args が契約と違う'
grep -Fq 'AISHELL_CAPABILITY_SET = "expanded-v1"' <<<"$applied" || fail 'aishell env が契約と違う'

HOME="$HOME_FIXTURE" "$HOME_FIXTURE/.local/bin/apply-grok-config" --apply | grep -Fq '変更なし' \
  || fail '2回目 apply が冪等でない'

HOME="$ABSENT_HOME" "$HOME_FIXTURE/.local/bin/apply-grok-config" --apply >/dev/null
grep -Fq '[compat.claude]' "$ABSENT_HOME/.grok/config.toml" || fail '不在の config.toml を作らない'
grep -Fq 'agents = false' "$ABSENT_HOME/.grok/config.toml" || fail '新規 config に agents = false を書かない'
grep -Fq 'hooks = false' "$ABSENT_HOME/.grok/config.toml" || fail '新規 config に hooks = false を書かない'
grep -Fq '[mcp_servers.lattice]' "$ABSENT_HOME/.grok/config.toml" || fail '新規 config に工場MCPを書かない'

mkdir -p "$SYMLINK_HOME/.grok" "$SYMLINK_HOME/target"
printf '%s\n' 'agents = true' >"$SYMLINK_HOME/target/config.toml"
ln -s "$SYMLINK_HOME/target/config.toml" "$SYMLINK_HOME/.grok/config.toml"
if HOME="$SYMLINK_HOME" "$HOME_FIXTURE/.local/bin/apply-grok-config" --apply >/dev/null 2>&1; then
  fail 'symlink config.toml への apply を受理した'
fi
grep -Fq 'agents = true' "$SYMLINK_HOME/target/config.toml" || fail 'symlink 先を書き換えた'

echo 'apply-grok-config: OK'
