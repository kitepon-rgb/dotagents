---
id: xcodegen-widget-extension-embed-true-provisioning-profile-smoke-test-build-app-build
title: 'XcodeGen + Widget extension: embed=true は provisioning profile 未登録だと smoke test build をブロック (主 app build まで失敗)'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - xcodegen
  - xcodebuild
  - provisioning-profile
  - widget-extension
  - code-signing
  - live-activity
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  build_tool: XcodeGen + xcodebuild
  platform: iOS
  extension_type: WidgetKit (Live Activity)
source_project: null
source_session: 2026-05-15T02:06:50.337Z/2db6f8f848a1
created_at: 2026-05-15
updated_at: 2026-05-15
last_verified: 2026-05-15
---

## Symptom

XcodeGen の project.yml で `dependencies: - target: CodexLinkWidget, embed: true, codeSign: true` を main app に書いた状態で、配布証明書 / provisioning profile を登録していない (= 開発初期 / smoke test 期間) Apple Developer account で `xcodebuild -scheme YourApp` すると、**主 app の build まで失敗**する:
```
error: No profiles for 'dev.example.app.LiveActivity' were found
```
Widget extension が無くても主 app の機能 (= 本来テストしたい WebRTC / Codex 同期等) は smoke test できるはずなのに、Widget の codesign 失敗で全体がブロックされる.

## Cause

embed=true で extension を主 app に同梱する設定にすると、xcodebuild は extension にも codesign を要求する. provisioning profile が無いと extension 単体でも archive できず、結果として依存先の主 app build も失敗する. Live Activity 用 Widget は extension の Bundle ID が main app の suffix (`dev.example.app.LiveActivity`) になるので、main app の wildcard provisioning profile では cover されず、別途 explicit profile が必要 (Apple Developer account に extension 用 App ID を登録 + profile 発行 + Xcode signing config に紐付け).

## Resolution

smoke test / 開発初期で Widget 配布証明書が用意できない期間の回避:
```yaml
targets:
  YourApp:
    dependencies:
      # Widget extension: smoke test 期間中は provisioning profile 未登録
      # のため一時的に embed を外す. Live Activity package 自体は生きて
      # いるが、Widget extension が無いと iOS から表示はされない.
      # Widget 復帰時は下記を有効化:
      # - target: CodexLinkWidget
      #   embed: true
      #   codeSign: true
```
注意: embed を外すと **iOS 上で Live Activity が一切表示されなくなる** (関連 caveat: "iOS Live Activity (ActivityKit) は Widget extension target が必須") が、主 app の他機能 (WebRTC / chat / approval 等) の smoke test は通せる. Widget 復帰時は (1) Apple Developer Console で extension Bundle ID 登録, (2) explicit provisioning profile 発行, (3) embed 行を uncomment, の 3 ステップ. codex-link-p2p commit `42fabf0` の project.yml 修正参照.

## Evidence

codex-link-p2p commit `42fabf0` の apps/ios/project.yml diff. dogfood セッション中に xcodebuild error "No profiles for 'dev.codexlink.ios.LiveActivity' were found" を踏み、smoke test 続行のため embed をコメントアウト. POSTMORTEM 参照.
