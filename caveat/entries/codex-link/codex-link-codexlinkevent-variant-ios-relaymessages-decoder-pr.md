---
id: codex-link-codexlinkevent-variant-ios-relaymessages-decoder-pr
title: 'Codex Link: 新規 CodexLinkEvent variant を増やしたら iOS 側 RelayMessages decoder も同 PR 内で更新する'
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - codex-link
  - protocol
  - decoder
  - ios
  - swift-codable
  - fan-out
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  repo: codex-link
  ios_swift: '6.0'
  ios_min: '17.0'
  ts_strict: 'true'
source_project: null
source_session: 2026-05-11T08:34:36.972Z/e1eb4a2f681f
created_at: 2026-05-11
updated_at: 2026-05-11
last_verified: 2026-05-11
---

## Symptom

Mac Host / Relay 側に新しい `CodexLinkEvent` variant (例: `host.account.updated`) を足してデプロイすると、iOS app は WebSocket で受信した瞬間にそれをデコードできず、connection state が `.failed` に落ちる。Sim 上では status strip に `Connection failed` (truncated `C...`) と `Decoding...` という赤い `latestError` が出る。会話画面までは遷移できるが「Decoding…」が消えず、原因の event 名が UI に出ないため、最初は Relay 接続障害だと誤読しやすい。

## Cause

`apps/ios/Sources/CodexLinkIOS/RelayMessages.swift` の `CodexLinkEvent.init(from:)` は `default: throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown Codex Link event type: \(type)")` で未知 type を厳格に拒否する設計になっており、Codable の strict decoding なので欠けた case に当たれば即 throw する。iOS app の `describe(error)` は Swift エラーを `String(describing: error)` で文字列化するため "Decoding error: …" のような文字列が `latestError` に入り、`StatusStrip` が `.lineLimit(1)` で「Decoding...」とだけ見せる結果になる。

protocol 拡張は `packages/protocol/src/index.ts` だけ更新しても TypeScript 側は通るが、Swift 側 (`RelayMessages.swift` + `CodexLinkModels.swift` + `SessionProjection.swift`) が手動の Codable 実装で同期していないと WebSocket 経路全体が落ちる。Swift 側に `host.account.updated` を入れ忘れた状態で iOS で Sim 検証して気付いた。

## Resolution

protocol を変更する PR では必ず以下 4 ファイルを同 PR でセットで触る:

1. `packages/protocol/src/index.ts` (wire 型 / `CodexLinkEvent` union)
2. `apps/mac-host/src/codex-events.ts` (Mac Host が emit する場合)
3. `apps/ios/Sources/CodexLinkIOS/CodexLinkModels.swift` (iOS で参照する型を追加)
4. `apps/ios/Sources/CodexLinkIOS/RelayMessages.swift` (Codable の `init(from:)` と `encode(to:)` 双方に case 追加 + `CodingKeys` の追加)
5. `apps/ios/Sources/CodexLinkIOS/SessionProjection.swift` (`apply(_:)` の switch も網羅)

iOS test は Codable の round-trip を `ProjectionTests.swift` 風に追加しておくと、protocol 拡張時に Swift 側追従漏れがあれば test が落ちる。

将来的な対策候補: Relay/iOS の手書き Codable 二重管理をやめて codegen にする、もしくは iOS decoder の default を `throw` から「diagnostic.reported に降格して接続を維持」にする。後者は protocol 拡張時の安全弁として比較的軽い。

## Evidence

2026-05-11 セッションで Phase 8 の `host.account.updated` event を Mac Host から Relay 経由で iPhone まで流した時に再現。iOS Sim 上の status strip に `C...` (Connection failed truncated) + 赤字 `Decoding...` が表示。`apps/ios/Sources/CodexLinkIOS/RelayMessages.swift:202-207` の dataCorruptedError throw が原因と特定。`CodexLinkModels.swift` に `HostChatGptAccount` を追加、`RelayMessages.swift` に `case "host.account.updated":` を追加、`SessionProjection.swift` で受信時 Host.chatgptAccount を更新する 3 箇所修正で `Connection failed` 表示が消え、Sim 上で `KaitonoMacBook-Air.local` 緑表示 + `Idle` まで遷移、composer から real turn (`Reply with exactly OK` → `OK`) も流せた。修正コミット: `e94b407 Decode host.account.updated on iPhone side`。
