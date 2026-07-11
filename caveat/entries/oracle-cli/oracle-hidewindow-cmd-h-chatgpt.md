---
id: oracle-hidewindow-cmd-h-chatgpt
title: oracle の hideWindow（Cmd-H 相当）は ChatGPT の送信を壊す——プロンプトが下書き滞留し後続実行に混入する
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - oracle
  - chatgpt
  - hideWindow
  - browser-automation
  - macos
  - offscreen
environment:
  os: macOS
  arch: arm64
  node: 26.4.0
  oracle: 0.15.2
  chatgpt_ui: GPT-5.6 (2026-07)
source_project: null
source_session: 2026-07-11T04:49:12.617Z/7596a3094bf2
created_at: 2026-07-11
updated_at: 2026-07-11
last_verified: 2026-07-11
---

## Symptom

browser.hideWindow: true で oracle を実行すると「Prompt did not appear in conversation before timeout (send may have failed)」で失敗する。しかもプロンプトは composer の下書きとして残り、次回実行の送信に前回分が混入する（実測: 3 実行分のプロンプトが1メッセージとしてまとめて送信され、モデルが3件まとめて回答した）

## Cause

hideWindow は CDP 接続直後に AppleScript `set visible to false`（Cmd-H 相当）でアプリごと隠す実装。非表示アプリは描画が停止し、ChatGPT（新 UI）の送信トリガー/DOM 更新が発火しない

## Resolution

hideWindow を使わず、CHROME_PATH に画面外起動シム（実 Chrome に --window-position=-32000,-32000 を追加して exec する数行の bash）を指定する。描画が生きたままウィンドウだけ画面外＝送信・検知が正常動作（実測 19 秒完走・ウィンドウ非出現・プロセス残置なし。macOS の座標クランプは発生しなかった）。失敗後は ChatGPT 側に下書きが残っていないか確認する

## Evidence


