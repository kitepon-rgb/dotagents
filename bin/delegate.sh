#!/usr/bin/env bash
# delegate: 物量作業を Claude レート非依存の外部知能（Codex/Grok）へ委譲する統一ラッパ。
# MODELS.md「実装は外部枠を第一選択」を実運用しやすくする（2026-07-04 新設）。
#
# 使い方:
#   delegate codex  "<プロンプト>" [repo_path]     # 外部枠へ実装委譲（workspace-write）
#   delegate review "<対象>"      [repo_path]     # 外部枠に read-only レビューさせ統括へ返す（Claude⇄Codex 協業の片方向）
#   delegate grok   "<プロンプト>" [repo_path]     # grok は要 login・未確定（P6-1）
#
# 特徴:
#   - タイムアウト内蔵（macOS に timeout(1) が無い罠を回避。既定 300s、DELEGATE_TIMEOUT で変更）
#   - repo_path のリポに CLAUDE.md があれば「先に読め」を前置（リポ単位コンテキスト）
#   - 実行後 git status --porcelain を表示＝統括の diff レビューを楽にする
#   - 失敗は握りつぶさずそのまま非ゼロ終了（フォールバック禁止）
set -uo pipefail

BACKEND="${1:?usage: delegate <codex|review|grok> \"<prompt>\" [repo_path]}"
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
  review)
    # Claude⇄外部AI 協業の片方向: Codex に read-only レビューさせ統括（ベル）へ返す。
    # smux(ShawnPana/smux) が狙う「Claude⇄Codex 対話」を、aiterm PTY＋本コマンドで実現
    # （smux 本体は tmux-bridge が aiterm-mcp と機能重複・tmux 競合リスクのため不採用＝rag/orchestration/smux）。
    # 全自動対話でなく「1往復ごとに統括が裁定」する設計＝品質 > 自動化。
    [ -x "$CODEX_BIN" ] || { echo "delegate: codex not found at $CODEX_BIN" >&2; exit 1; }
    run_guarded "$CODEX_BIN" exec --sandbox read-only --skip-git-repo-check "${CTX}以下を read-only でレビューし、指摘を重要度順・該当箇所つきで返せ。ファイルは一切変更するな（変更は統括が裁定後に行う）: ${PROMPT}"
    rc=$?
    ;;
  grok)
    # Grok Build の非対話委譲は `grok agent {stdio|headless|serve}` 配下（2026-07-04 実測）。
    # ただしこの端末は未認証（"You are not authenticated"）＝要 `grok login`（H）。
    # 認証と正確な非対話呼び出しの実測（P6-1）が済むまで、推測で動かさず明示エラーで止める
    # （「動くフリ」を避ける＝グローバル鉄則。フォールバック禁止）。
    echo "delegate: grok backend は未確定。要 'grok login'（H）＋非対話呼び出しの実測（P6-1）。現状は codex を使え。" >&2
    exit 3
    ;;
  *)
    echo "delegate: unknown backend '$BACKEND' (codex|grok)" >&2; exit 2 ;;
esac

echo
echo "=== delegate: 委譲後の作業ツリー（統括レビュー用・git status --porcelain） ==="
git status --porcelain 2>/dev/null || echo "(git 管理外)"
exit "$rc"
