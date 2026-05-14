#!/usr/bin/env bash
# Symlink dotagents entries into ~/.claude/{skills,commands} and ~/.codex/{skills,rules}.
# Idempotent: re-running overwrites existing symlinks but never removes unrelated files.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

link_one() {
  local src="$1" dst="$2"
  if [ -e "$dst" ] && [ ! -L "$dst" ]; then
    echo "SKIP (real file exists, not a symlink): $dst" >&2
    return 0
  fi
  ln -sfn "$src" "$dst"
  echo "linked: $dst -> $src"
}

# Claude
mkdir -p "$HOME/.claude/skills" "$HOME/.claude/commands"
for d in "$HERE/claude/skills"/*/; do
  [ -d "$d" ] || continue
  link_one "${d%/}" "$HOME/.claude/skills/$(basename "$d")"
done
for f in "$HERE/claude/commands"/*.md; do
  [ -e "$f" ] || continue
  link_one "$f" "$HOME/.claude/commands/$(basename "$f")"
done

# Codex
mkdir -p "$HOME/.codex/skills" "$HOME/.codex/rules"
for d in "$HERE/codex/skills"/*/; do
  [ -d "$d" ] || continue
  link_one "${d%/}" "$HOME/.codex/skills/$(basename "$d")"
done
for f in "$HERE/codex/rules"/*; do
  [ -e "$f" ] || continue
  link_one "$f" "$HOME/.codex/rules/$(basename "$f")"
done

# bin scripts (extension dropped at the destination, e.g. agents-update.sh -> agents-update)
mkdir -p "$HOME/.local/bin"
for f in "$HERE/bin"/*.sh; do
  [ -e "$f" ] || continue
  link_one "$f" "$HOME/.local/bin/$(basename "$f" .sh)"
done

echo "done."
