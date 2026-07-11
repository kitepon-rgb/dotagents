---
id: chatgpt-com-cloudflare-headless
title: chatgpt.com はヘッドレスブラウザ自動化を Cloudflare が塞ぐ（headless 不可）
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - chatgpt
  - cloudflare
  - headless
  - browser-automation
  - oracle
environment:
  os: darwin
  arch: arm64
  node: 26.4.0
source_project: null
source_session: 2026-07-11T04:48:22.119Z/e188cffa544c
created_at: 2026-07-11
updated_at: 2026-07-11
last_verified: 2026-07-11
---

## Context

ChatGPT サブスクの chat 枠を MCP/CLI から使う調査（2026-07-11）

## Symptom

ChatGPT Web を headless Chrome で自動化しようとすると bot 検知に弾かれ、ログイン・チャット送信が成立しない

## Cause

chatgpt.com の Cloudflare/bot 検知が headless を判別してブロックする。独立した2製品が同じ結論を明記: steipete/oracle は実装コメント「disable headless; Cloudflare blocks it」で headless を意図的に無効化、Octo-Lex/ChatGPT-Web2API は README で「headless Chrome triggers ChatGPT's bot detection」

## Resolution

headful Chrome で自動化し、不可視化はウィンドウ側で行う（例: --window-position=-32000,-32000 で画面外起動）。検知回避ブラウザ（patchright/camoufox）の自作は ToS 違反＝アカウント BAN リスクがあり非推奨。なお Cmd-H 等でアプリごと隠すのは描画停止で別の罠（送信不発）を踏む

## Evidence


