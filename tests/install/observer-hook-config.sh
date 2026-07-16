#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOME_FIXTURE="$(mktemp -d)"
CLI_DIR="$(mktemp -d)"
trap 'rm -rf "$HOME_FIXTURE" "$CLI_DIR"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
HOOK="$HOME_FIXTURE/observer-parent-stop-hook"
printf '%s\n' '#!/usr/bin/env bash' 'exit 0' >"$HOOK"
chmod 755 "$HOOK"
cat >"$CLI_DIR/observer-hook-config" <<'PY'
#!/usr/bin/env python3
import json, sys
op, *args = sys.argv[1:]
provider = args[args.index("--provider") + 1]
executable = args[args.index("--executable") + 1]
command = f"{executable} --provider {provider}"
entry = {"hooks":[{"type":"command","command":command,"timeout":5}]} if provider == "claude" else {"type":"command","command":command,"timeoutSec":5,"async":False,"statusMessage":None}
if op == "fragment":
    schema = "invalid" if __import__("os").environ.get("OBSERVER_TEST_BAD_SCHEMA") else "observer.parent_stop_hook_fragment.v1"
    print(json.dumps({"schema":schema,"provider":provider,"event":"Stop","entry":entry}))
    raise SystemExit(0)
candidate = json.load(sys.stdin)
entries = candidate.get("hooks", {}).get("Stop", [])
if provider == "claude":
    count = sum(1 for outer in entries if isinstance(outer, dict) for hook in outer.get("hooks", []) if isinstance(hook, dict) and hook.get("command") == command)
    canonical = count == 1 and any(outer == entry for outer in entries)
else:
    count = sum(1 for item in entries if isinstance(item, dict) and item.get("command") == command)
    canonical = count == 1 and entry in entries
print(json.dumps({"schema":"observer.parent_stop_hook_verification.v1","provider":provider,"event":"Stop","status":"canonical" if canonical else ("missing" if count == 0 else "noncanonical"),"target_count":count}))
PY
chmod 755 "$CLI_DIR/observer-hook-config"

mkdir -p "$HOME_FIXTURE/.claude" "$HOME_FIXTURE/.codex"
cat >"$HOME_FIXTURE/.claude/settings.json" <<'EOF'
{"env":"OBSERVER_SECRET_SENTINEL","hooks":{"Stop":[{"hooks":[{"type":"command","command":"/other/keep"}]}]}}
EOF
cat >"$HOME_FIXTURE/.codex/hooks.json" <<'EOF'
{"hooks":{"Stop":[{"type":"command","command":"/other/keep","timeoutSec":9,"async":false,"statusMessage":null}]}}
EOF
before_claude="$(cat "$HOME_FIXTURE/.claude/settings.json")"
before_codex="$(cat "$HOME_FIXTURE/.codex/hooks.json")"
dry="$(HOME="$HOME_FIXTURE" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/observer-hook-config" "$ROOT/bin/apply-observer-hook-config.sh" --observer-hook "$HOOK" 2>&1)"
printf '%s' "$dry" | grep -Fq 'provider=claude' || fail 'dry-run がClaude要約を出さない'
printf '%s' "$dry" | grep -Fq 'provider=codex' || fail 'dry-run がCodex要約を出さない'
if printf '%s' "$dry" | grep -Fq 'OBSERVER_SECRET_SENTINEL'; then fail 'dry-run が設定内容を出した'; fi
[ "$(cat "$HOME_FIXTURE/.claude/settings.json")" = "$before_claude" ] || fail 'dry-run がClaudeを書換えた'
[ "$(cat "$HOME_FIXTURE/.codex/hooks.json")" = "$before_codex" ] || fail 'dry-run がCodexを書換えた'
if HOME="$HOME_FIXTURE" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/observer-hook-config" OBSERVER_TEST_BAD_SCHEMA=1 "$ROOT/bin/apply-observer-hook-config.sh" --apply --observer-hook "$HOOK" >/dev/null 2>&1; then fail 'schema不一致を成功扱いした'; fi
[ "$(cat "$HOME_FIXTURE/.claude/settings.json")" = "$before_claude" ] || fail 'schema failure がClaudeを書換えた'
[ "$(cat "$HOME_FIXTURE/.codex/hooks.json")" = "$before_codex" ] || fail 'schema failure がCodexを書換えた'
HOME="$HOME_FIXTURE" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/observer-hook-config" "$ROOT/bin/apply-observer-hook-config.sh" --apply --observer-hook "$HOOK" >/dev/null
python3 - "$HOME_FIXTURE" "$HOOK" <<'PY' || exit 1
import json, sys
from pathlib import Path
home, hook = map(Path, sys.argv[1:])
for provider, path in (("claude", home / ".claude/settings.json"), ("codex", home / ".codex/hooks.json")):
    data = json.load(open(path))
    assert any("/other/keep" in str(entry) for entry in data["hooks"]["Stop"])
    command = f"{hook} --provider {provider}"
    count = sum(1 for entry in data["hooks"]["Stop"] for item in (entry.get("hooks", []) if provider == "claude" else [entry]) if isinstance(item, dict) and item.get("command") == command)
    assert count == 1
PY
archive_count="$(find "$HOME_FIXTURE/Archives" -name '*.tar.gz' | wc -l | tr -d ' ')"
[ "$archive_count" = 1 ] || fail '初回applyのbackup数が不正'
archive_path="$(find "$HOME_FIXTURE/Archives" -name '*.tar.gz' -print -quit)"
python3 - "$archive_path" <<'PY' || fail 'backup modeが0600でない'
import stat
import sys
from pathlib import Path
raise SystemExit(0 if stat.S_IMODE(Path(sys.argv[1]).stat().st_mode) == 0o600 else 1)
PY
idempotent="$(HOME="$HOME_FIXTURE" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/observer-hook-config" "$ROOT/bin/apply-observer-hook-config.sh" --apply --observer-hook "$HOOK")"
printf '%s' "$idempotent" | grep -Fq '変更なし' || fail '二回目applyが冪等でない'
[ "$(find "$HOME_FIXTURE/Archives" -name '*.tar.gz' | wc -l | tr -d ' ')" = "$archive_count" ] || fail '冪等applyがbackupを増やした'
if HOME="$HOME_FIXTURE" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/missing" "$ROOT/bin/apply-observer-hook-config.sh" --apply --observer-hook "$HOOK" >/dev/null 2>&1; then fail 'CLI不在を成功扱いした'; fi
saved_claude="$(cat "$HOME_FIXTURE/.claude/settings.json")"
saved_codex="$(cat "$HOME_FIXTURE/.codex/hooks.json")"
python3 - "$HOME_FIXTURE/.claude/settings.json" "$HOME_FIXTURE/.codex/hooks.json" "$HOOK" <<'PY'
import json, sys
claude, codex, hook = sys.argv[1:]
data = json.load(open(claude))
json.dump(data, open(claude, "w", encoding="utf-8"), separators=(",", ":"))
data = json.load(open(codex))
command = f"{hook} --provider codex"
data["hooks"]["Stop"] = [entry for entry in data["hooks"]["Stop"] if entry.get("command") != command]
json.dump(data, open(codex, "w", encoding="utf-8"), separators=(",", ":"))
PY
saved_claude="$(cat "$HOME_FIXTURE/.claude/settings.json")"
saved_codex="$(cat "$HOME_FIXTURE/.codex/hooks.json")"
if HOME="$HOME_FIXTURE" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/observer-hook-config" DOTAGENTS_TEST_FAIL_REPLACE=hooks.json "$ROOT/bin/apply-observer-hook-config.sh" --apply --observer-hook "$HOOK" >/dev/null 2>&1; then fail 'replace failureを成功扱いした'; fi
[ "$(cat "$HOME_FIXTURE/.claude/settings.json")" = "$saved_claude" ] || fail 'rollback がClaudeを戻さない'
[ "$(cat "$HOME_FIXTURE/.codex/hooks.json")" = "$saved_codex" ] || fail 'rollback がCodexを戻さない'
stamp=20000101T000000Z
collision="$HOME_FIXTURE/Archives/dotagents-observer-hook-config-$stamp.tar.gz"
printf '%s' 'keep-existing-backup' >"$collision"
printf '\n' >>"$HOME_FIXTURE/.claude/settings.json"
HOME="$HOME_FIXTURE" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/observer-hook-config" DOTAGENTS_TEST_BACKUP_STAMP="$stamp" "$ROOT/bin/apply-observer-hook-config.sh" --apply --observer-hook "$HOOK" >/dev/null
[ "$(cat "$collision")" = keep-existing-backup ] || fail '既存backupを上書きした'
[ -f "$HOME_FIXTURE/Archives/dotagents-observer-hook-config-$stamp-1.tar.gz" ] || fail '同秒backupのsuffixを作らない'
SYMLINK_HOME="$(mktemp -d)"
trap 'rm -rf "$HOME_FIXTURE" "$CLI_DIR" "$SYMLINK_HOME"' EXIT
mkdir -p "$SYMLINK_HOME/external-claude" "$SYMLINK_HOME/external-codex"
ln -s "$SYMLINK_HOME/external-claude" "$SYMLINK_HOME/.claude"
if HOME="$SYMLINK_HOME" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/observer-hook-config" "$ROOT/bin/apply-observer-hook-config.sh" --apply --observer-hook "$HOOK" >/dev/null 2>&1; then fail 'symlink設定を成功扱いした'; fi
rm "$SYMLINK_HOME/.claude"
mkdir "$SYMLINK_HOME/.claude"
ln -s "$SYMLINK_HOME/external-codex" "$SYMLINK_HOME/codex-link"
if HOME="$SYMLINK_HOME" CODEX_HOME="$SYMLINK_HOME/codex-link" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/observer-hook-config" "$ROOT/bin/apply-observer-hook-config.sh" --dry-run --observer-hook "$HOOK" >/dev/null 2>&1; then fail 'symlink CODEX_HOMEを成功扱いした'; fi
ln -s "$SYMLINK_HOME/missing-codex-target" "$SYMLINK_HOME/broken-codex-link"
if HOME="$SYMLINK_HOME" CODEX_HOME="$SYMLINK_HOME/broken-codex-link" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/observer-hook-config" "$ROOT/bin/apply-observer-hook-config.sh" --dry-run --observer-hook "$HOOK" >/dev/null 2>&1; then fail 'broken symlink CODEX_HOMEを成功扱いした'; fi
EMPTY_HOME="$(mktemp -d)"
RESTORE_HOME="$(mktemp -d)"
trap 'rm -rf "$HOME_FIXTURE" "$CLI_DIR" "$SYMLINK_HOME" "$EMPTY_HOME" "$RESTORE_HOME"' EXIT
mkdir -p "$EMPTY_HOME/.claude"
: >"$EMPTY_HOME/.claude/settings.json"
HOME="$EMPTY_HOME" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/observer-hook-config" "$ROOT/bin/apply-observer-hook-config.sh" --apply --observer-hook "$HOOK" >/dev/null
python3 - "$EMPTY_HOME" <<'PY'
import json, sys
from pathlib import Path
home = Path(sys.argv[1])
assert isinstance(json.load(open(home / ".claude/settings.json")), dict)
assert isinstance(json.load(open(home / ".codex/hooks.json")), dict)
PY

mkdir -p "$RESTORE_HOME/.claude"
cat >"$RESTORE_HOME/.claude/settings.json" <<'EOF'
{"restore":"original","hooks":{"Stop":[]}}
EOF
chmod 640 "$RESTORE_HOME/.claude/settings.json"
restore_before="$(cat "$RESTORE_HOME/.claude/settings.json")"
restore_uid="$(stat -f %u "$RESTORE_HOME/.claude/settings.json")"
restore_gid="$(stat -f %g "$RESTORE_HOME/.claude/settings.json")"
HOME="$RESTORE_HOME" OBSERVER_HOOK_CONFIG_BIN="$CLI_DIR/observer-hook-config" \
  "$ROOT/bin/apply-observer-hook-config.sh" --apply --observer-hook "$HOOK" >/dev/null
restore_archive="$(find "$RESTORE_HOME/Archives" -name '*.tar.gz' -print -quit)"
[ -n "$restore_archive" ] || fail 'restore fixture backupがない'
[ "$(stat -f %Lp "$RESTORE_HOME/.claude/settings.json")" = 640 ] || fail 'applyが既存modeを保持しない'
[ "$(stat -f %Lp "$RESTORE_HOME/.codex/hooks.json")" = 600 ] || fail 'applyが新規configを0600にしない'

applied_claude="$(cat "$RESTORE_HOME/.claude/settings.json")"
applied_codex="$(cat "$RESTORE_HOME/.codex/hooks.json")"
if HOME="$RESTORE_HOME" DOTAGENTS_TEST_FAIL_REPLACE=hooks.json \
  "$ROOT/bin/apply-observer-hook-config.sh" --restore "$restore_archive" >/dev/null 2>&1
then
  fail 'restore replace failureを成功扱いした'
fi
[ "$(cat "$RESTORE_HOME/.claude/settings.json")" = "$applied_claude" ] || fail 'restore失敗がClaude current stateを壊した'
[ "$(cat "$RESTORE_HOME/.codex/hooks.json")" = "$applied_codex" ] || fail 'restore失敗がCodex current stateを壊した'

HOME="$RESTORE_HOME" "$ROOT/bin/apply-observer-hook-config.sh" --restore "$restore_archive" >/dev/null
[ "$(cat "$RESTORE_HOME/.claude/settings.json")" = "$restore_before" ] || fail 'restoreがClaude原文を戻さない'
[ ! -e "$RESTORE_HOME/.codex/hooks.json" ] || fail 'restoreが元absentのCodex configを削除しない'
[ "$(stat -f %Lp "$RESTORE_HOME/.claude/settings.json")" = 640 ] || fail 'restoreが元modeを戻さない'
[ "$(stat -f %u "$RESTORE_HOME/.claude/settings.json")" = "$restore_uid" ] || fail 'restoreが元uidを戻さない'
[ "$(stat -f %g "$RESTORE_HOME/.claude/settings.json")" = "$restore_gid" ] || fail 'restoreが元gidを戻さない'

ln -s "$restore_archive" "$RESTORE_HOME/restore-link.tar.gz"
if HOME="$RESTORE_HOME" "$ROOT/bin/apply-observer-hook-config.sh" --restore "$RESTORE_HOME/restore-link.tar.gz" >/dev/null 2>&1
then
  fail 'symlink archiveをrestoreした'
fi
chmod 644 "$restore_archive"
if HOME="$RESTORE_HOME" "$ROOT/bin/apply-observer-hook-config.sh" --restore "$restore_archive" >/dev/null 2>&1
then
  fail 'world-readable archiveをrestoreした'
fi
chmod 600 "$restore_archive"
bad_archive="$RESTORE_HOME/Archives/dotagents-observer-hook-config-bad.tar.gz"
printf '%s' 'not-a-backup' >"$bad_archive"
chmod 600 "$bad_archive"
if HOME="$RESTORE_HOME" "$ROOT/bin/apply-observer-hook-config.sh" --restore "$bad_archive" >/dev/null 2>&1
then
  fail '破損archiveをrestoreした'
fi
echo 'observer hook config: OK'
