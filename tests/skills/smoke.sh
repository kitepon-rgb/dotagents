#!/usr/bin/env bash
# Codex skill の静的契約を検証する。外部サービスや本番環境は操作しない。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

fail() { echo "FAIL: $*" >&2; exit 1; }
contains() { rg -Fq "$2" "$1" || fail "$1 に $2 がない"; }
assert_order() {
  local file="$1"
  shift
  python3 - "$file" "$@" <<'PY' || fail "$file の語句が存在しないか想定順序でない"
from pathlib import Path
import sys

content = Path(sys.argv[1]).read_text(encoding="utf-8")
cursor = 0
for token in sys.argv[2:]:
    position = content.find(token, cursor)
    if position < 0:
        raise SystemExit(1)
    cursor = position + len(token)
PY
}
frontmatter_is_name_and_description_only() {
  awk '
    NR == 1 { if ($0 != "---") exit 1; next }
    /^---$/ { closed = 1; exit }
    {
      if ($0 !~ /^(name|description): /) exit 1
      key = $0; sub(/:.*/, "", key)
      if (seen[key]++) exit 1
      count++
    }
    END { exit !(closed && count == 2 && seen["name"] && seen["description"]) }
  ' "$1" || fail "$1 の frontmatter は name/description だけではない"
}

for skill in orchestrate audit-gauntlet auto-deploy-on-push; do
  file="$ROOT/codex/skills/$skill/SKILL.md"
  [ -f "$file" ] || fail "$file がない"
  frontmatter_is_name_and_description_only "$file"
  rg -q '^name: ' "$file" || fail "$file に frontmatter name がない"
  rg -q '^description: ' "$file" || fail "$file に frontmatter description がない"
  yaml="$ROOT/codex/skills/$skill/agents/openai.yaml"
  [ -f "$yaml" ] || fail "$yaml がない"
  contains "$yaml" "\$$skill"
done

[ -d "$ROOT/codex/skills/orchestrate" ] || fail 'Codex orchestrate は実ディレクトリでない'
[ ! -L "$ROOT/codex/skills/orchestrate" ] || fail 'Codex orchestrate が symlink のまま'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" '../../../shared/orchestrate/contract.md'
contains "$ROOT/shared/orchestrate/contract.md" '統括の共通契約'
contains "$ROOT/shared/orchestrate/contract.md" '非目標（やらないこと）、既知の罠、検証方法を必ず含める'
contains "$ROOT/claude/skills/orchestrate/SKILL.md" '../../../shared/orchestrate/contract.md'
contains "$ROOT/claude/skills/orchestrate/SKILL.md" 'references/delegation-contract.md'
contains "$ROOT/claude/skills/orchestrate/SKILL.md" 'references/workflow-templates.md'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" 'agent_type=<role>'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" 'fork_turns="none"'
assert_order "$ROOT/codex/skills/orchestrate/SKILL.md" \
  'routing smoke のみ' \
  'verify-codex-agent-routing' \
  'follow-up で実作業を渡す'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" '呼び出し側が手指定しない'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" '入れ子の Codex を起動しない'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" '親が統合と最終検証を担う'
if rg -qi 'Workflow' "$ROOT/codex/skills/orchestrate/SKILL.md"; then
  fail 'Codex orchestrate が Claude 専用 Workflow を実行入口としている'
fi

audit="$ROOT/codex/skills/audit-gauntlet/SKILL.md"
assert_order "$audit" \
  'Find を複数視点' \
  'Dedup で重複を統合' \
  'existence（事実として実在するか）と value（直す価値と変更リスクがあるか）の独立2票' \
  'Critic に既出の言い換えでない盲点' \
  '親が採用・棄却を裁定する'
contains "$audit" '疑わしければ棄却する'
contains "$audit" '件数遷移'

deploy="$ROOT/codex/skills/auto-deploy-on-push/SKILL.md"
assert_order "$deploy" \
  '読み取り専用で' \
  '目的、影響範囲、失敗時の rollback を説明し、H 承認を得る' \
  '承認後も対象範囲を狭く保ち' \
  '変更後は静的検証'
# shellcheck disable=SC2016 # backticks are literal Markdown from the skill contract.
contains "$deploy" '承認前に鍵生成、`authorized_keys` 変更、Secrets 登録、workflow 書き込み、push、workflow 実行をしてはならない'
contains "$deploy" '秘密値は表示・収集・保存しない'
contains "$deploy" '秘密をログ・文書・commit に含めない'
contains "$deploy" '実本番操作は明示承認されたものだけ実行する'
contains "$deploy" '../../../claude/skills/auto-deploy-on-push/SKILL.md'

echo 'skills smoke: OK'
