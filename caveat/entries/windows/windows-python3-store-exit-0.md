---
id: windows-python3-store-exit-0
title: Windows の python3 は Store 偽エイリアスが exit 0 でスクリプトを黙って握りつぶすことがある
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - windows
  - python
  - app-execution-alias
  - microsoft-store
  - silent-failure
  - exit-code
environment:
  os: win32
  arch: x64
  node: 24.14.0
  os_version: Windows 11 Pro 10.0.26200
  shell: Git Bash (MINGW64)
  python: 3.12.10 (実体は python 側)
source_project: null
source_session: 2026-07-04T12:51:12.413Z/5ccd50425ba0
created_at: 2026-07-04
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Symptom

Git Bash 等から `python3 -c "<script>"` や `python3 - <<EOF` を実行すると、スクリプトが一切実行されないのに **exit 0 で成功したように見える**（stdout に「Python」と1行出るだけ）。ファイル書き換えスクリプトが無言で no-op になり、後段の検証で初めて「変わっていない」ことに気づく。`command -v python3` は通るため、ランブックの前提チェック（存在確認のみ）もすり抜ける。

## Cause

`python3` が実インタープリタでなく `%LOCALAPPDATA%\Microsoft\WindowsApps\python3.exe`（Microsoft Store の App Execution Alias スタブ）に解決されている。実 Python（この端末では `%LOCALAPPDATA%\Programs\Python\Python312\python.exe`）は `python` にのみ紐づいており、`python3` はスタブのまま。スタブは非対話コンテキストで Store を開けず、「Python」とだけ出力して exit 0 で終わる＝呼び出し側からは成功に見える。

## Resolution

①スクリプトでは `python3` でなく `python` を使う（Windows では実体が `python` 側にいる）か、フルパス指定。②恒久対処はオーナー操作: 設定 > アプリ > 詳細設定 > アプリ実行エイリアス で python3.exe（と必要なら python.exe）のストアエイリアスを OFF。③前提チェックは存在確認（command -v）でなく**実行結果で判定**する: `python3 -c "print(1)"` の stdout が `1` であること（exit code は信用できない）。

## Evidence

FOX(Windows 11 Pro) で実測 2026-07-04: `command -v python3` → WindowsApps パスを返し成功／`python3 --version` → 「Python」のみ（バージョン出ず）／`python3 -c "print('hello')"` → 「Python」出力・hello 出ず・exit=0／`python --version` → Python 3.12.10（実体）。実害: ファイル書き換えスクリプトが2回サイレント no-op になり、tail 検証で発覚。
