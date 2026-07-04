#!/usr/bin/env bash
# sync-sweep: 開発ルート直下の全 git リポ＋非 git ディレクトリの同期状態台帳を Markdown で出力する。
# 使い方: sync-sweep [dev-root]   （既定 ~/Developer）
# 方針: 1 リポの失敗で全体を止めない。ただし失敗は行内に ERROR/注記で必ず残す（黙って飛ばさない）。
# 検査項目は dotagents/PLAN.md「定常運用」節が正: ahead/behind・dirty・unpushed・stash・迷いブランチ・
# 既定ブランチ・NO_REMOTE・gitignore 貴重物候補・非 git ディレクトリ。
set -uo pipefail

ROOT="${1:-$HOME/Developer}"
HOSTLABEL="$(hostname -s 2>/dev/null || hostname)"   # Windows(Git Bash) は hostname -s 非対応
TODAY="$(date +%F)"

echo "# sync-sweep 台帳 — ${HOSTLABEL}:${ROOT}（${TODAY}）"
echo
echo "| ディレクトリ | 種別 | 既定br | 現在br | ahead/behind | dirty | unpushed br | stash | ignored(貴重物候補) | 注記 |"
echo "|---|---|---|---|---|---|---|---|---|---|"

for d in "$ROOT"/*/; do
  name="$(basename "$d")"
  if [ ! -d "$d/.git" ]; then
    cnt=$(find "$d" -maxdepth 1 -mindepth 1 2>/dev/null | wc -l | tr -d ' ')
    echo "| $name | **非git** | - | - | - | - | - | - | - | 直下 ${cnt} エントリ。git化 or 退避のトリアージ対象 |"
    continue
  fi
  (
    cd "$d" || { echo "| $name | git | ? | ? | ? | ? | ? | ? | ? | ERROR: cd 失敗 |"; exit 0; }
    note=""
    git fetch --all --quiet 2>/dev/null || note="fetch失敗(オフライン/認証?) "
    remote_cnt=$(git remote 2>/dev/null | wc -l | tr -d ' ')
    typ="git"; [ "$remote_cnt" -eq 0 ] && typ="**NO_REMOTE**"
    defbr="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')"
    [ -z "$defbr" ] && defbr="?"
    curbr="$(git branch --show-current 2>/dev/null)"
    [ -z "$curbr" ] && curbr="DETACHED"
    ab="-"
    up="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)"
    if [ -n "$up" ]; then
      a=$(git rev-list --count "$up"..HEAD 2>/dev/null || echo '?')
      b=$(git rev-list --count HEAD.."$up" 2>/dev/null || echo '?')
      ab="+${a}/-${b}"
    fi
    dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    unpushed=""
    while IFS= read -r br; do
      [ -z "$br" ] && continue
      bu="$(git rev-parse --abbrev-ref --symbolic-full-name "$br@{upstream}" 2>/dev/null || true)"
      if [ -z "$bu" ]; then
        unpushed="${unpushed}${br}(upstream無) "
      else
        c=$(git rev-list --count "$bu".."$br" 2>/dev/null || echo 0)
        [ "${c:-0}" -gt 0 ] && unpushed="${unpushed}${br}(+${c}) "
      fi
    done < <(git for-each-ref --format='%(refname:short)' refs/heads 2>/dev/null)
    stash=$(git stash list 2>/dev/null | wc -l | tr -d ' ')
    ig_all=$(git status --ignored --porcelain 2>/dev/null | grep -c '^!!' || true)
    ig_names="$(git status --ignored --porcelain 2>/dev/null | awk '$1=="!!"{print $2}' \
      | grep -Ei '\.env|secret|token|credential|\.pem|\.key|CLAUDE|AGENTS|docs/|rag/|data/|\.md$|\.sqlite|\.db$' \
      | head -3 | tr '\n' ' ')"
    echo "| $name | $typ | $defbr | $curbr | $ab | $dirty | ${unpushed:--} | $stash | ${ig_all}件 ${ig_names} | $note |"
  )
done

echo
echo "凡例: ahead/behind は現在ブランチの upstream 比（+ローカル先行/-リモート先行）。ignored 貴重物候補は"
echo "ヒューリスティック（.env/鍵/CLAUDE.md/docs 等のパターン上位3件）＝**最終判定は必ず目視**（PLAN 定常運用）。"
echo "stash は push で運ばれない。非 git ディレクトリはトリアージ対象（PLAN 定常運用）。"
