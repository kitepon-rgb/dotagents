#!/usr/bin/env bash
# oracle 用 Chrome を画面外座標で起動するシム（CHROME_PATH に指定して使う）。
# oracle の hideWindow(Cmd-H) は非表示アプリの描画停止により ChatGPT の送信・DOM 検知が
# 壊れるため使えない（2026-07-11 実測: 送信が下書きのまま残り、後続 run に混入する）。
# 画面外配置なら描画が続いたままデスクトップを奪わない。upstream 対応までの一時手段。
set -euo pipefail
exec "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --window-position=-32000,-32000 "$@"
