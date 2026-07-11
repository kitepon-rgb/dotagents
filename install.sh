#!/usr/bin/env bash
# Symlink dotagents entries into ~/.claude/{skills,commands} and ~/.codex/{skills,rules}.
# Idempotent: re-running overwrites existing symlinks but never removes unrelated files.
set -euo pipefail

# MSYS/Git Bash（Windows native）: 無指定だと ln -s が実コピーになり正本化が静かに不成立する。
# 開発者モード ON 前提で本物の symlink を強制（非対応なら ln が失敗して止まる＝静かなコピーへ逃げない）。
case "$(uname -s)" in MINGW*|MSYS*) export MSYS=winsymlinks:nativestrict ;; esac

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

link_one() {
  local src="$1" dst="$2"
  if [ -e "$dst" ] && [ ! -L "$dst" ]; then
    echo "SKIP (real file exists — 退避しないと本リポ版が使われない): $dst" >&2
    return 0
  fi
  ln -sfn "$src" "$dst"
  echo "linked: $dst -> $src"
}

# Claude
mkdir -p "$HOME/.claude/skills" "$HOME/.claude/commands" "$HOME/.claude/agents"
# global CLAUDE.md (canonical copy lives in this repo; terminals must remove any
# pre-existing real file first — link_one SKIPs real files by design)
if [ -e "$HERE/claude/CLAUDE.md" ]; then
  link_one "$HERE/claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
fi
for d in "$HERE/claude/skills"/*/; do
  [ -d "$d" ] || continue
  link_one "${d%/}" "$HOME/.claude/skills/$(basename "$d")"
done
for f in "$HERE/claude/commands"/*.md; do
  [ -e "$f" ] || continue
  link_one "$f" "$HOME/.claude/commands/$(basename "$f")"
done
for f in "$HERE/claude/agents"/*.md; do
  [ -e "$f" ] || continue
  link_one "$f" "$HOME/.claude/agents/$(basename "$f")"
done

# Codex
mkdir -p "$HOME/.codex/skills" "$HOME/.codex/rules" "$HOME/.codex/agents"
if [ -e "$HERE/codex/AGENTS.md" ]; then
  link_one "$HERE/codex/AGENTS.md" "$HOME/.codex/AGENTS.md"
fi
for d in "$HERE/codex/skills"/*/; do
  [ -d "$d" ] || continue
  link_one "${d%/}" "$HOME/.codex/skills/$(basename "$d")"
done
for f in "$HERE/codex/rules"/*; do
  [ -e "$f" ] || continue
  link_one "$f" "$HOME/.codex/rules/$(basename "$f")"
done
for f in "$HERE/codex/agents"/*.toml; do
  [ -e "$f" ] || continue
  link_one "$f" "$HOME/.codex/agents/$(basename "$f")"
done

# caveat own entries — Caveat v0.15+ manages its own sync (dotagents no longer
# owns the trap DB). The knowledge repo lives at ~/.caveat/own as a standalone
# git repo whose remote is the PRIVATE github.com/<you>/Caveat-Private (public
# + private entries; the public subset is mirrored to Caveat-Public via
# `caveat publish`). Set it up per machine with the tool, not a symlink:
#   caveat sync --init            # first machine: gh-creates Caveat-Private, pushes
#   caveat sync --init --repo <Caveat-Private-url>   # later machines: clones it
# and thereafter `caveat sync` round-trips. This installer intentionally does
# not wire ~/.caveat/own — that is Caveat's job now.
if [ -d "$HERE/caveat" ]; then
  echo "NOTE: dotagents/caveat is a leftover from the pre-v0.15 symlink model." >&2
  echo "      Caveat now syncs ~/.caveat/own to Caveat-Private itself; see comment above." >&2
fi

# bin scripts (extension dropped at the destination, e.g. agents-update.sh -> agents-update)
mkdir -p "$HOME/.local/bin"
for f in "$HERE/bin"/*.sh; do
  [ -e "$f" ] || continue
  link_one "$f" "$HOME/.local/bin/$(basename "$f" .sh)"
done

echo "done."
