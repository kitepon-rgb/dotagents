---
id: nssm-readalltext-filestream-readwrite
title: NSSM リダイレクトログは ReadAllText で開けない（共有違反）— FileStream ReadWrite シェアで読む
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - nssm
  - powershell
  - filelock
  - log
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
source_project: null
source_session: 2026-06-12T01:44:29.202Z/514a6b8d323c
created_at: 2026-06-12
updated_at: 2026-06-12
last_verified: 2026-06-12
---

## Symptom

NSSM サービスの AppStderr リダイレクト先ログを PowerShell の [System.IO.File]::ReadAllText で読むと「別のプロセスで使用されているため、プロセスはファイルにアクセスできません」(IOException) で失敗する。Get-Content -Tail は読める。

## Cause

NSSM がログを FILE_SHARE_READ なしで開いているわけではなく、ReadAllText 側が FileShare.Read 既定で開くため書き込み中ファイルと共有モードが衝突する。Get-Content は ReadWrite シェアで開くので通る。

## Resolution

[System.IO.File]::Open(path,'Open','Read','ReadWrite') で FileStream を開き StreamReader で読む。1行: $fs=[System.IO.File]::Open($p,'Open','Read','ReadWrite'); $sr=New-Object System.IO.StreamReader($fs); $raw=$sr.ReadToEnd(); $sr.Close()

## Evidence

2026-06-12 Win11 上の NSSM 管理 ComfyUI サービスの comfy.err.log で再現・解決を確認
