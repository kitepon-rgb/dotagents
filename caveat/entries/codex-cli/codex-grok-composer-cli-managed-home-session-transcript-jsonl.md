---
id: codex-grok-composer-cli-managed-home-session-transcript-jsonl
title: 'Codex/Grok/Composer CLI: managed home 配下の session transcript JSONL の構造と最終回答の在り処'
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - codex-cli
  - grok-cli
  - transcript
  - jsonl
  - aiterm-mcp
environment:
  os: macOS
  arch: arm64
  node: 26.4.0
  codex: 0.144.1
  grok: 0.2.87
  via: aiterm-mcp
source_project: null
source_session: 2026-07-11T05:12:49.563Z/1792b494f182
created_at: 2026-07-11
updated_at: 2026-07-11
last_verified: 2026-07-11
---

## Symptom

agent CLI（Codex/Grok/Composer）の対話 TUI が書く session transcript から、直近ターンの最終 assistant 応答を平文で取り出したいが、vendor ごとにパスとレコード構造が違う。

## Cause

各 vendor CLI は home（CODEX_HOME / GROK_HOME）配下に構造化 JSONL を書く。Codex: sessions/YYYY/MM/DD/rollout-<ISO時刻>-<vendor_session_id>.jsonl。最終回答は type==response_item の payload.role==assistant で content[].output_text（複数ブロックあり）。payload.internal_chat_message_metadata_passthrough.turn_id が Stop hook の turn_id と一致するので per-turn join できる。別経路として type==event_msg の payload.type==agent_message・phase==final_answer・message(平文) もある。Grok/Composer（同構造）: sessions/<encodeURIComponent(cwd)>/<vendor_session_id>/chat_history.jsonl。cwd の / は %2F にエンコードされる。各行 type==system|user|reasoning|assistant で content は assistant のみ平文文字列（codex は配列、こちらは文字列＝混同注意）。per-row の turn_id は無いので、ターン境界は「synthetic_reason を持たない最後の type==user 行より後ろの assistant 行群」で判定する。

## Resolution

パスは metadata の codex_home/grok_home ＋ vendor_session_id ＋（grok は encodeURIComponent(cwd)）で導出。対象ターンは latestAgentDoneEvent の turn_id。フォーマットは外部仕様でバージョンで変わり得るため、抽出ゼロ/ファイル不在は黙って劣化させず明示エラーにする（aiterm 実装済み）。

## Evidence

2026-07-11 実測（Codex v0.144.1・Grok Build 0.2.87・macOS）。プローブ文字列を各 vendor に1ターン出力させ、managed home を find+grep で逆引き。Codex rollout の assistant response_item passthrough turn_id が aiterm events.jsonl の agent_done turn_id（019f4f85-34d5-...）と一致を確認。Grok/Composer chat_history の最終 assistant 行が平文 content。aiterm-mcp の readAgentTranscript(core.ts) 実装＋実機 E2E で、screen tail が下24行しか出さない40行回答を全40行回収、Grok も encodeURIComponent(cwd) パス導出で回収成功。
