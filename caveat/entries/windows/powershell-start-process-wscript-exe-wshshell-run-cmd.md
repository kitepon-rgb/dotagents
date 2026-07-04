---
id: powershell-start-process-wscript-exe-wshshell-run-cmd
title: PowerShell の Start-Process 経由で起動した wscript.exe が WshShell.Run の cmd 子プロセスを生成しないことがある
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - windows
  - wsh
  - vbscript
  - powershell
  - cmd
  - start-process
  - createprocess
  - session
environment:
  os: Windows 11 Pro 26200
  arch: x64
  node: 24.14.0
  shell: PowerShell 5.1 (Windows built-in)
  wsh: Windows Script Host (wscript.exe)
source_project: null
source_session: 2026-04-25T16:44:00.365Z/22ccb8b66189
created_at: 2026-04-25
updated_at: 2026-04-25
last_verified: 2026-04-25
---

## Symptom

PowerShell から `Start-Process -FilePath "wscript.exe" -ArgumentList "path\to\foo.vbs"` で起動した wscript が、vbs 内の `WshShell.Run "cmd /c some.bat > out.log 2>&1", 0, False` を呼んでも cmd の子プロセスが立ち上がらない。wscript プロセスだけが CPU 0% で長時間 (数十秒～) 残り、リダイレクト先のログファイルも一切更新されない。子プロセス一覧 (Win32_Process WHERE ParentProcessId=...) は空。エクスプローラーからダブルクリック / ログイン時のスタートアップ経由で同じ vbs を起動した場合は正常に cmd が起動して bat が走る。

## Cause

PowerShell の Start-Process 経由で起動された wscript と、explorer.exe (ユーザーログオン時) 経由で起動された wscript では、Windows のセッション/ステーション/ジョブオブジェクトの継承状況が異なる。WSH の WshShell.Run は内部で CreateProcess を呼ぶが、特定の起動文脈下では非同期 (waitOnReturn=False) の cmd ローンチが silent に失敗するか、CreateProcess 呼び出し前にブロックされる挙動を取ることがある。エラーは Run の戻り値にも例外にも出ず、wscript はそのまま終了せずに残る。

## Resolution

PowerShell から wscript.exe を経由しない。具体的には次のいずれか:
1. PowerShell から直接 `Start-Process cmd.exe -ArgumentList "/c","cmd args here"` で目的の cmd を起動する (vbs を介さない)
2. 各サブプロセスを個別に `Start-Process -FilePath ... -ArgumentList @(...)` で並列起動する (vbs バッチを展開する)
3. どうしても vbs を経由したい場合は、エクスプローラーからダブルクリックさせる / ログイン時のスタートアップフォルダから起動させる (explorer 経由なら正常動作する)

検証時は Win32_Process で wscript の ChildProcess を見て、空なら詰まっていると判定可能。生きている wscript は `Stop-Process -Id <pid> -Force` でクリーンアップしてよい。

## Evidence

2026-04-26 セッションで再現:
- PowerShell `Start-Process -FilePath "wscript.exe" -ArgumentList @("...\start-foo.vbs")` を実行
- 8秒後、wscript PID 37692 は ParentProcessId=13484、CPU 0%、StartTime=01:39:29 で生存
- 同じ PID のプロセスを `Get-CimInstance Win32_Process -Filter "ParentProcessId=37692"` で照会した結果、子プロセスは 0 件
- vbs 内の `WshShell.Run "cmd /c scripts\foo.bat > logs\out.log 2>&1", 0, False` で書かれるはずの logs\out.log は 13 分前のタイムスタンプのまま更新されず
- 一方、同じ vbs をスタートアップフォルダから explorer 起動した場合は正常動作することが過去の運用で確認されている
