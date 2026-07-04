---
id: windows-python-print-of-em-dash-u-2014-crashes-with-cp932-codec-on-japanese-locale
title: 'Windows Python: print() of em-dash (U+2014) crashes with cp932 codec on Japanese locale'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - windows
  - python
  - cp932
  - shift-jis
  - japanese-locale
  - unicode-encode-error
  - stdout
  - console
  - em-dash
  - portability
environment:
  os: Windows 11 Pro
  arch: x64
  node: 24.14.0
  python: '3.12'
  console_codepage: cp932
  locale: ja-JP
  shell: PowerShell
source_project: null
source_session: 2026-05-01T08:09:18.539Z/457705e7addf
created_at: 2026-05-01
updated_at: 2026-05-01
last_verified: 2026-05-01
---

## Context

Surfaced when smoke-testing a stdlib-only CLI summary script for a JSONL log on a Japanese-locale Windows 11 host. The script ran fine in CI (Linux) and silently failed only on the developer's Windows machine.

## Symptom

UnicodeEncodeError: 'cp932' codec can't encode character '\\u2014' in position N: illegal multibyte sequence — when a Python script run on Windows prints a string containing an em-dash (—) to stdout. Crashes the script. Same pattern affects en-dash (–, U+2013), curly quotes (U+2018-U+201D), Unicode arrows (U+2192 etc.), and other "punctuation that looks fine in editors but is not in the cp932 repertoire."

## Cause

On Windows, Python's `sys.stdout` defaults its encoding to the active console code page. On Japanese-locale Windows installations that code page is `cp932` (Shift-JIS variant), which CAN encode JIS-defined characters (kanji, hiragana, katakana, ASCII) but CANNOT encode many "Western typographic" Unicode characters that pass through unnoticed when authoring on macOS/Linux:

- U+2014 EM DASH —
- U+2013 EN DASH –
- U+2018/U+2019 LEFT/RIGHT SINGLE QUOTATION MARK ' '
- U+201C/U+201D LEFT/RIGHT DOUBLE QUOTATION MARK " "
- Most arrows (→ ← ↑ ↓), bullets (•), and many emoji-adjacent symbols

The mismatch is invisible during development on a UTF-8 host (macOS/Linux/WSL) and typically surfaces only when a Windows user runs the script for the first time. The string itself loads fine; the crash happens at the `print()` boundary when Python tries to encode for the console.

## Resolution

Three options, in order of preference for a CLI tool that must be portable:

1. **Avoid the offending characters in print() output.** Use ASCII `-` instead of `—`, ASCII `"..."` instead of `"..."`. This is the only fix that works without touching the runtime environment. Recommended for any script that may be redistributed.

2. **Force UTF-8 stdout at runtime** via `sys.stdout.reconfigure(encoding="utf-8", errors="replace")` (Python 3.7+) at the top of the script. Works inside the script but does not help if the console itself cannot render the character (it just stops the crash).

3. **Set `PYTHONIOENCODING=utf-8` in the environment** before invoking Python. Works from PowerShell as `$env:PYTHONIOENCODING="utf-8"; python script.py`. Same caveat about console rendering.

`chcp 65001` (switch the console to UTF-8 code page) helps the rendering side but does NOT change what Python uses unless `PYTHONIOENCODING` or `PYTHONUTF8=1` is also set. The cleanest portable fix is option 1.

## Evidence

Reproduced on 2026-05-01 with Python 3.12 on Windows 11 Pro, default Japanese locale (active code page 932). A CLI script that printed `=== access log summary — last 1 day(s) ===` (note the em-dash) crashed with `UnicodeEncodeError: 'cp932' codec can't encode character '\\u2014' in position 23: illegal multibyte sequence`. Replacing the em-dash with an ASCII hyphen-minus (`-`) made the same script run cleanly. Setting `$env:PYTHONIOENCODING="utf-8"` also worked but only inside that PowerShell session.
