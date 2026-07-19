---
sources:
  - https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/hooks/src/engine/command_runner.rs
  - https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/core/src/session/mod.rs
retrieved_at: 2026-07-20
confidence: high
---

# Codex Windows hook の shell 契約

Codex CLI 0.144.6 の lifecycle hook は、command を executable/argv に直接分解せず、turn environment から得た shell の実行引数へ単一 command 文字列として渡す。shell が取れない Windows 既定だけは `COMSPEC /C` を使う。

このため Windows native の実効 shell が PowerShell の場合、空白を含む絶対 executable path を `"C:\\Program Files\\...\\tool.exe"` と引用するだけでは文字列式になり、起動されない。正規形は PowerShell call operator を先頭へ置く `& "<executable>" "<arg>"` である。全 token の引用は space と backslash を保つ。

dotagents の `apply-codex-config.sh` は Windows native で `&` 付き正規形を生成し、旧 direct-exec・`&` なし引用形・既存 `&` 付き正規形を同一 hook として認識して重複なく置換する。POSIX host は従来どおり `/usr/bin/env python3 ...` または `/bin/sh ...` を使う。

実機での受入条件は、設定ファイルの一致だけでなく、trust 再承認後の Windows native `codex exec` で hook が成功し、callout の session-key state が生成されること。

一次ソース verbatim: [[raw/openai-codex-hook-command-runner-0.144.6]]
