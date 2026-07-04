---
id: tqdm-get-content-tail-r
title: tqdm の進行中プログレスは Get-Content -Tail に映らない（\r 更新の未改行行）
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - tqdm
  - powershell
  - carriage-return
  - progress
  - monitoring
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
source_project: null
source_session: 2026-06-12T01:44:36.919Z/27569a969166
created_at: 2026-06-12
updated_at: 2026-06-12
last_verified: 2026-06-12
---

## Symptom

サービスログへリダイレクトされた tqdm プログレスバーを Get-Content -Tail で監視すると、ジョブが何分走っても「0%| 0/24」の初期行しか見えず、進捗が止まっているように誤読する。

## Cause

tqdm は \r（キャリッジリターン）で同一行を上書き更新し改行を出さない。Get-Content は \n 区切りで行を返すため、進行中の巨大な未改行行は 100% 完了して改行が出るまで -Tail に現れない。

## Resolution

ファイルを raw で読み（共有違反に注意）、"`r" で split した末尾要素を見ると live の進捗行が取れる。例: ($raw -split "`r" | Select-Object -Last 2)。進捗の有無だけならファイル長の増分監視でも代用可。

## Evidence

2026-06-12 ComfyUI(NSSM) の KSampler 進捗監視で再現。-Tail は 0/24 のまま、raw split で実進捗を取得
