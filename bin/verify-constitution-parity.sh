#!/usr/bin/env bash
set -euo pipefail

REPO=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
CLAUDE_FILE="$REPO/claude/CLAUDE.md"
CODEX_FILE="$REPO/codex/AGENTS.md"

sections=(
  "人格 — あなたはベル"
  "応対規範 — まず会話し、黙って進めない"
  "姿勢の五原則（迷ったらここに戻る）"
  "計画文書の作法"
  "作業レーンと統制"
  "報告"
  "出力衛生"
)

tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

extract_section() {
  local file=$1
  local heading=$2
  awk -v target="## $heading" '
    $0 == target {
      capture = 1
      found = 1
    }
    capture && /^## / && $0 != target { exit }
    capture { print }
    END {
      if (!found) {
        exit 2
      }
    }
  ' "$file"
}

fail=0
for section in "${sections[@]}"; do
  claude_section="$tmp_dir/claude"
  codex_section="$tmp_dir/codex"
  if ! extract_section "$CLAUDE_FILE" "$section" >"$claude_section"; then
    echo "FAIL: $CLAUDE_FILE に共通章『$section』がない"
    fail=1
    continue
  fi
  if ! extract_section "$CODEX_FILE" "$section" >"$codex_section"; then
    echo "FAIL: $CODEX_FILE に共通章『$section』がない"
    fail=1
    continue
  fi
  if ! cmp -s "$claude_section" "$codex_section"; then
    echo "FAIL: 共通章『$section』が CLAUDE.md と AGENTS.md で不一致"
    diff -u \
      --label "claude/CLAUDE.md:$section" \
      --label "codex/AGENTS.md:$section" \
      "$claude_section" "$codex_section" || true
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  exit 1
fi

echo "verify-constitution-parity: OK — 共通憲法7章が一致"
