---
id: oracle-0-15-2-gpt-5-6-chatgpt-ui-preset-browsermodellabel
title: oracle 0.15.2 は GPT-5.6 世代の ChatGPT UI にモデル選択が不追従（preset/browserModelLabel とも機能しない）
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - oracle
  - chatgpt
  - gpt-5.6
  - model-picker
  - mcp
environment:
  os: darwin
  arch: arm64
  node: 26.4.0
  oracle: 0.15.2
  chatgpt_ui: GPT-5.6 unified picker (2026-07)
source_project: null
source_session: 2026-07-11T04:48:31.689Z/254b30d4a718
created_at: 2026-07-11
updated_at: 2026-07-11
last_verified: 2026-07-11
---

## Symptom

oracle のブラウザ実行が「Unable to find model option matching "Pro" in the model switcher. Available: Advanced, GPT-5.6 Sol, Effort High, Speed Standard」で失敗。MCP consult に browserModelLabel:"GPT-5.6 Sol" を渡しても効かず、model に非 gpt 文字列を渡すとファジー解決で gpt-5.2 等の別モデルに化ける

## Cause

0.15.2 のモデルラベル表が GPT-5.5 世代（"Pro"）のままで、GPT-5.6 の統一 Intelligence ピッカーに未対応。さらに MCP 経路（dist/src/mcp/tools/consult.js buildConsultBrowserConfig）は runModel が gpt- 始まりだと browserModelLabel を無視する分岐になっている

## Resolution

modelStrategy を "ignore"（または "current"）にしてピッカー操作をスキップし、ChatGPT アカウントの現在値（モデル×Effort）で走らせる。Effort 側は browserThinkingTime の enum が新名称（extra-high 等）を受理し新 UI メニューでも動作する（実測）。preset chatgpt-pro-heavy は封印。upstream で修正進行中（steipete/oracle issue #303/#305・PR #304/#306、2026-07-10）＝対応リリース後に select/preset を再評価

## Evidence


