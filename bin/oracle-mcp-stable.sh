#!/usr/bin/env bash
# oracle-mcp を Node undici の setTypeOfService EINVAL クラッシュから守るラッパー。
# 根本原因: undici が全 HTTP/1.1 リクエストで socket.setTypeOfService(0) を無条件に呼び、
# macOS で特定ソケット状態だと EINVAL が未捕捉例外となりプロセスごと死ぬ
# (Node 24.18/26.4 で実測・oracle 0.15.2 の MCP/CLI 両方が被弾)。
# これは upstream(undici) 修正までの明示的・一時的ガード。発動時は stderr に1回記録する。
# 使い方: oracle-mcp-stable        → MCP サーバー起動（claude mcp 登録用）
#         oracle-mcp-stable cli …  → oracle CLI をガード付きで起動（保守用）
set -euo pipefail

ORACLE_DIST=/opt/homebrew/lib/node_modules/@steipete/oracle/dist/bin
# shellcheck disable=SC2016  # JS テンプレートリテラル(${e.code})を含む＝シェル展開させない意図の single quote
GUARD='data:text/javascript,
import net from "node:net";
const orig = net.Socket.prototype.setTypeOfService;
if (orig) {
  let warned = false;
  net.Socket.prototype.setTypeOfService = function (v) {
    try { return orig.call(this, v); } catch (e) {
      if (!warned) { warned = true; console.error(`[oracle-mcp-stable] setTypeOfService guard: ${e.code} を無害化 (undici QoS ヒント)`); }
      return this;
    }
  };
}'

ENTRY="$ORACLE_DIST/oracle-mcp.js"
if [ "${1:-}" = "cli" ]; then
  ENTRY="$ORACLE_DIST/oracle-cli.js"
  shift
fi

# Chrome は画面外シム経由で起動（oracle の hideWindow は描画停止で送信が壊れるため不使用）。
export CHROME_PATH="${CHROME_PATH:-$HOME/.local/bin/oracle-chrome-shim}"

exec /opt/homebrew/bin/node --import "$GUARD" "$ENTRY" "$@"
