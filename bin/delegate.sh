#!/usr/bin/env bash
# delegate: 物量作業を Claude レート非依存の外部知能（Codex/Grok）へ委譲する統一ラッパ。
# MODELS.md「実装は外部枠を第一選択」を実運用しやすくする（2026-07-04 新設）。
#
# 使い方:
#   delegate codex "<プロンプト>" [repo_path]
#   delegate grok  "<プロンプト>" [repo_path]      # grok は暫定（呼び出し仕様は要実測・P6-1）
#
# 特徴:
#   - タイムアウト内蔵（macOS に timeout(1) が無い罠を回避。既定 300s、DELEGATE_TIMEOUT で変更）
#   - repo_path のリポに CLAUDE.md があれば「先に読め」を前置（リポ単位コンテキスト）
#   - 実行後 git status --porcelain を表示＝統括の diff レビューを楽にする
#   - 失敗は握りつぶさずそのまま非ゼロ終了（フォールバック禁止）
set -uo pipefail

BACKEND="${1:?usage: delegate <codex|grok> \"<prompt>\" [repo_path]}"
PROMPT="${2:?prompt required}"
REPO="${3:-$PWD}"
TIMEOUT="${DELEGATE_TIMEOUT:-300}"
CODEX_BIN="${CODEX_BIN:-$HOME/.local/bin/codex}"
GROK_BIN="${GROK_BIN:-$HOME/.grok/bin/grok}"

cd "$REPO" || { echo "delegate: cannot cd $REPO" >&2; exit 1; }

CTX=""
[ -f CLAUDE.md ] && CTX="このリポの CLAUDE.md を必ず先に読み、その掟に従うこと。"$'\n'

# timeout(1) 非依存のガード
run_guarded() {
  "$@" &
  local pid=$!
  ( sleep "$TIMEOUT"; kill -TERM "$pid" 2>/dev/null ) &
  local watcher=$!
  wait "$pid"; local rc=$?
  kill "$watcher" 2>/dev/null
  wait "$watcher" 2>/dev/null
  return $rc
}

case "$BACKEND" in
  codex)
    [ -x "$CODEX_BIN" ] || { echo "delegate: codex not found at $CODEX_BIN" >&2; exit 1; }
    run_guarded "$CODEX_BIN" exec --sandbox workspace-write --skip-git-repo-check "${CTX}${PROMPT}"
    rc=$?
    ;;
  grok)
    [ -x "$GROK_BIN" ] || { echo "delegate: grok not found at $GROK_BIN" >&2; exit 1; }
    # 呼び出し仕様は未実測（P6-1 で確定させる）。暫定で prompt を第1引数に渡す。
    echo "delegate: grok backend は未実測（暫定呼び出し）。結果は統括が要精査。" >&2
    run_guarded "$GROK_BIN" "${CTX}${PROMPT}"
    rc=$?
    ;;
  *)
    echo "delegate: unknown backend '$BACKEND' (codex|grok)" >&2; exit 2 ;;
esac

echo
echo "=== delegate: 委譲後の作業ツリー（統括レビュー用・git status --porcelain） ==="
git status --porcelain 2>/dev/null || echo "(git 管理外)"
exit "$rc"
