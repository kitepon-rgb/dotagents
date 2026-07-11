---
id: oracle-chrome-cookie-copyprofilesource-macos-keychain
title: oracle の Chrome cookie 同期（copyProfileSource）は macOS Keychain 許可を毎回要求し、失敗すると未ログインのまま走る
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - oracle
  - chatgpt
  - keychain
  - cookie-sync
  - manual-login
  - macos
environment:
  os: macOS
  arch: arm64
  node: 26.4.0
  oracle: 0.15.2
source_project: null
source_session: 2026-07-11T04:48:49.991Z/2553ae4f5d3d
created_at: 2026-07-11
updated_at: 2026-07-11
last_verified: 2026-07-11
---

## Symptom

oracle ブラウザ実行のたびに macOS Keychain（Chrome Safe Storage）の許可ポップアップが出る。さらに同期失敗時はエラーで止まらず「No cookies were applied; log in to ChatGPT in Chrome」を出しつつ未ログイン状態で実行が進み、後段（モデル選択等）で失敗する

## Cause

copyProfileSource/cookieSync 経路は実 Chrome の Keychain 暗号化 cookie を毎回復号するため。cookie 不適用は fail-fast にならない設計

## Resolution

manual-login 永続プロファイル方式へ切替: `oracle --engine browser --browser-manual-login --browser-keep-browser` で一度だけ専用プロファイル（~/.oracle/browser-profile）にログインし、config.json に browser.manualLogin: true を置く（copyProfileSource とは排他＝必ず削除）。以後 Keychain アクセスゼロ・再ログイン不要。注意: 初回ログインで Google SSO が自動化ブラウザを「安全でないブラウザ」として弾くことがある（パスキー認証で通過を実測。ダメなら ChatGPT のメールコードログイン）

## Evidence


