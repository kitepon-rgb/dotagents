---
id: python-tail-n-traceback
title: python をパイプして `| tail -N` すると失敗時の traceback が消えて「無音不発」に見える
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - python
  - buffering
  - pipe
  - tail
  - stderr
  - traceback
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
source_project: null
source_session: 2026-06-12T02:28:52.796Z/c3b29185010d
created_at: 2026-06-12
updated_at: 2026-06-12
last_verified: 2026-06-12
---

## Symptom

`python script.py 2>&1 | tail -2` のパターンで、スクリプト失敗時に進捗行（stdout 先頭の1行）だけが残り、traceback もエラーメッセージも一切表示されない。成功時は正常に末尾が見えるため、「失敗時だけ沈黙する」謎の不発として数回見逃した。

## Cause

パイプ接続時の CPython は stdout をブロックバッファ（~8KB）、stderr は即時書き込みする。失敗時のパイプへの実際の到達順は stderr(traceback) が先 → stdout(進捗行) がプロセス終了時フラッシュで最後。tail -N は「ストリーム末尾の N 行」を取るので、後から流れてきた stdout の尻尾だけが残り traceback 全体が捨てられる。

## Resolution

① python 側: main() 冒頭で sys.stdout.reconfigure(line_buffering=True)（または -u 起動）→ 出力順序が実時間どおりになり、失敗時は traceback が末尾に来て tail に残る。② tail の行数も余裕を持たせる（-2 → -4 以上）。

## Evidence

2026-06-12 確定。ComfyUI クライアント CLI で4回再現（サーバー履歴の execution_interrupted +1833s がクライアント 1800s タイムアウトの署名と一致し、エラーは出ていたことを裏取り）。line_buffering=True + tail -4 で解消。
