---
id: webrtc-connectionpath-prflx-peer-reflexive-nat-ui
title: 'WebRTC connectionPath: prflx (peer-reflexive) を NAT 越え扱いしないと UI が「接続中…」で永久フリーズ'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - webrtc
  - ice
  - prflx
  - nat-traversal
  - ui-state
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  webrtc_lib_ios: stasel/WebRTC
  webrtc_spec: RFC 8445 ICE
  test_device: iPhone 16 Pro Max + Mac
source_project: null
source_session: 2026-05-15T02:05:35.325Z/95a2e210060d
created_at: 2026-05-15
updated_at: 2026-05-15
last_verified: 2026-05-15
---

## Symptom

iOS / Web の WebRTC アプリで connection state バッジ (direct / NAT 越え / TURN relay) を `RTCPeerConnection.statistics(...)` の selected candidate pair から計算する実装にした時、**実際は P2P 直結が成立して DC で通信できているのに UI が「接続中…」のまま永久に切り替わらない**. データ自体は流れている (= app 機能は使えている) のでバッジだけがおかしい状態.

## Cause

selected candidate pair の `localCandidateType` / `remoteCandidateType` を見て path を判定する時、ICE candidate type は 4 種類: `host` (LAN 直結) / `srflx` (server-reflexive = STUN 経由で取得した public IP) / `prflx` (peer-reflexive = ICE checks 中に相手から発見された address) / `relay` (TURN 経由). 多くの実装は `host`/`srflx`/`relay` の 3 種だけ enum に持ち、**`prflx` を未知扱いして "unknown" → "接続中…" 表示** にしてしまう. しかし NAT 越え時には selected pair が `prflx` で stick することがよくある (特に symmetric NAT / hairpin NAT 経由). 結果、繋がっているのに UI だけが固まる.

## Resolution

connectionPath の判定で `prflx` を **NAT 越え (= srflx と同等)** に分類する:
```swift
enum ConnectionPath {
  case direct    // host / host
  case nat       // srflx or prflx involved
  case relay     // relay involved
}

func classify(local: String, remote: String) -> ConnectionPath {
  if local == "relay" || remote == "relay" { return .relay }
  if local == "host" && remote == "host" { return .direct }
  return .nat  // srflx, prflx, or mixed
}
```
codex-link-p2p commit `80604ef` の fix. WebRTC stack 側に踏み込まずに enum を 1 行追加するだけで解決. 同種の WebRTC アプリで「接続中…が消えない」症状を見たら最初に candidate type 4 種を全部処理しているか確認.

## Evidence

codex-link-p2p commit `80604ef` "fix(ios): pathBadge が常に「接続中…」のまま固まる問題を解消". 実機 iPhone 16 Pro Max + Mac で再現 → 修正で解消確認. POSTMORTEM.md セクション 5.2.
