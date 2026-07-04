---
id: windows-git-bash-ln-s-native-symlink-off
title: Windows で Git Bash の ln -s は黙ってコピーになり、native symlink は開発者モード OFF だと作成不可
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - windows
  - git-bash
  - msys2
  - symlink
  - developer-mode
  - dotfiles
  - install
environment:
  os: win32
  arch: x64
  node: 24.14.0
  os_version: Windows 11 Pro 10.0.26200
  shell: Git Bash (MINGW64)
  powershell: '5.1'
source_project: null
source_session: 2026-07-04T11:45:46.108Z/a14865252894
created_at: 2026-07-04
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Symptom

bash スクリプト（dotagents の install.sh など symlink 配置系）を Windows の Git Bash で実行すると、`ln -sfn` がエラーを出さず成功するのに、できたものは symlink ではなく実ファイルのコピー（`ls -la` で `-rw-r--r--`・readlink が失敗）。symlink 前提の「リポ編集→即反映」同期が静かに不成立になる。`MSYS=winsymlinks:nativestrict` を付けて native symlink を強制すると、今度は `ln: failed to create symbolic link: Operation not permitted`。PowerShell の `New-Item -ItemType SymbolicLink` も `Administrator privilege required for this operation.`

## Cause

Windows の symlink 作成には SeCreateSymbolicLinkPrivilege が必要で、既定では管理者のみ。非管理者で作るには Windows 開発者モード（設定 > システム > 開発者向け）を ON にする必要がある（レジストリ HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock の AllowDevelopmentWithoutDevLicense=1）。さらに MSYS2/Git Bash は既定で `ln -s` をコピーにフォールバックする仕様（winsymlinks 未指定時）なので、権限があっても env `MSYS=winsymlinks:nativestrict`（または native）を指定しないと本物の symlink にならない。

## Resolution

①オーナー操作で Windows 開発者モードを ON（HKLM 書込は管理者権限が要るため非管理者シェルからは不可）。② symlink を張るスクリプトは `MSYS=winsymlinks:nativestrict ./install.sh` のように env を明示（nativestrict なら失敗時にコピーへ落ちず error で止まる＝サイレント不成立を防げる）。③検証は「エラーが出ない」でなく `readlink` / `ls -la` で実体確認。PowerShell 5.1 の New-Item は開発者モード ON でも非昇格では失敗する版があるため、Git Bash + nativestrict か cmd の mklink を使う。

## Evidence

FOX(Windows 11 Pro 10.0.26200・Git Bash MINGW64) で実測 2026-07-04: ln -sfn → コピー生成（readlink exit=1）／MSYS=winsymlinks:nativestrict ln -sfn → Operation not permitted／New-Item SymbolicLink → NewItemSymbolicLinkElevationRequired／AppModelUnlock レジストリ値なし＝開発者モード OFF。
