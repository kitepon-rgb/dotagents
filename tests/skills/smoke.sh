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

for skill in orchestrate auto-deploy-on-push run-observer-parent-watch; do
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
contains "$ROOT/codex/skills/orchestrate/SKILL.md" '](../../../shared/orchestrate/contract.md)'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" '](../../../shared/orchestrate/delegation-contract.md)'
contains "$ROOT/shared/orchestrate/contract.md" '統括の共通契約'
contains "$ROOT/shared/orchestrate/contract.md" '非目標（やらないこと）、既知の罠、検証方法を必ず含める'
contains "$ROOT/shared/orchestrate/contract.md" 'Control Recordの最小lifecycle'
contains "$ROOT/shared/orchestrate/delegation-contract.md" 'Delegation Packet（8点）'
contains "$ROOT/shared/orchestrate/delegation-contract.md" 'Worker Reportの受入'
contains "$ROOT/claude/skills/orchestrate/SKILL.md" '](../../../shared/orchestrate/contract.md)'
contains "$ROOT/claude/skills/orchestrate/SKILL.md" '](../../../shared/orchestrate/delegation-contract.md)'
contains "$ROOT/claude/skills/orchestrate/SKILL.md" 'references/workflow-templates.md'
[ ! -e "$ROOT/claude/skills/orchestrate/references/delegation-contract.md" ] || fail 'Claude 固有の旧 delegation-contract.md が残っている'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" 'agent_type=<role>'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" 'fork_turns="none"'
assert_order "$ROOT/codex/skills/orchestrate/SKILL.md" \
  'routing smoke のみ' \
  'verify-codex-agent-routing' \
  'follow-up で実作業を渡す'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" '呼び出し側が手指定しない'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" '入れ子のCodexを起動してよい'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" 'execution-verified'
contains "$ROOT/shared/orchestrate/delegation-contract.md" '同一taskを重複起動しない'
contains "$ROOT/shared/orchestrate/contract.md" '対象diff、受入条件、関連gate、未検証範囲を自ら確認してaccept/reject'
contains "$ROOT/codex/skills/orchestrate/SKILL.md" 'tightに結合した作業ならCodex nativeを既定'
contains "$ROOT/shared/orchestrate/executor-adapters.md" 'まず新規admissionを止める'
# shellcheck disable=SC2016 # backticks are literal Markdown from the contract.
contains "$ROOT/shared/orchestrate/executor-adapters.md" '`unknown`を別terminal stateへ暗黙変換しない'
contains "$ROOT/codex/AGENTS.md" '① native＝'
contains "$ROOT/codex/AGENTS.md" '② external execution＝'
contains "$ROOT/codex/AGENTS.md" '③ consultation＝'
contains "$ROOT/codex/AGENTS.md" 'commit / push / branch切替 / merge / rebase / reset / stash'
contains "$ROOT/codex/AGENTS.md" '秘密・token・cookie・OAuth・private key'
contains "$ROOT/codex/AGENTS.md" 'installed（CLI存在）→ registered（親へconnector登録）→ verified（read-only疎通）→ execution-verified'
contains "$ROOT/docs/05_codex-fragments.md" 'codex mcp add codex-sidecar -- codex-sidecar-mcp'
if rg -qi 'Workflow' "$ROOT/codex/skills/orchestrate/SKILL.md"; then
  fail 'Codex orchestrate が Claude 専用 Workflow を実行入口としている'
fi

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

observer="$ROOT/codex/skills/run-observer-parent-watch/SKILL.md"
contains "$observer" 'parent codex run'
contains "$observer" '別providerやprivate protocolへfallbackしない'
# shellcheck disable=SC2016 # backticks are literal Markdown from the skill contract.
contains "$observer" '`--runtime-root`は渡さない'
contains "$observer" '重複起動しない'
contains "$observer" '別transport、別thread、別spawn'
assert_order "$observer" \
  'observer watch status' \
  '承認を待つ' \
  'PTY付きforeground' \
  'session ID' \
  'SIGINT'

echo 'skills smoke: OK'
