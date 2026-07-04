---
id: ios-live-activity-activitykit-widget-extension-target-app-target
title: iOS Live Activity (ActivityKit) は Widget extension target が必須 — 主 app target に書いても表示されない
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - ios
  - live-activity
  - activitykit
  - widgetkit
  - xcodegen
  - dynamic-island
environment:
  os: iOS
  arch: arm64
  node: 26.0.0
  min_deployment: '17.0'
  build_tool: XcodeGen + xcodebuild
  framework: ActivityKit + WidgetKit
source_project: null
source_session: 2026-05-15T02:05:10.244Z/ce45a8fb679e
created_at: 2026-05-15
updated_at: 2026-05-15
last_verified: 2026-05-15
---

## Symptom

iOS app に `import ActivityKit` + `ActivityAttributes` + `Activity.request(...)` を実装し、`NSSupportsLiveActivities = true` を Info.plist に追加しても、Dynamic Island / Lock screen に Live Activity が **一切表示されない**. ビルドエラーも実行時エラーも出ない. `Activity.request` の Promise も resolve するが、UI には何も出ない. 主 app target に `ActivityConfiguration` の WidgetBundle を入れても無視される.

## Cause

iOS Live Activity の UI レンダリング (Lock screen view + Dynamic Island の expanded / compactLeading / compactTrailing / minimal region) は **WidgetKit extension** で実装する必要があり、主 app target ではなく **独立した app-extension target** (Bundle ID = main app の suffix, e.g. `dev.example.app.LiveActivity`) として切り出さないと iOS から認識されない. 主 app target に ActivityConfiguration を書いても OS は extension を探しに行くので発見できず無視する. ActivityKit の `Activity.request` 自体は extension が無くても成功してしまうので silent failure になる.

## Resolution

XcodeGen を使う場合 project.yml に追加:
```yaml
targets:
  CodexLinkWidget:
    type: app-extension
    platform: iOS
    deploymentTarget: "17.0"
    sources: [Widget]
    info:
      path: Widget/Info.plist
      properties:
        NSExtension:
          NSExtensionPointIdentifier: com.apple.widgetkit-extension
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: dev.example.app.LiveActivity
  YourApp:
    dependencies:
      - target: CodexLinkWidget
        embed: true
        codeSign: true
```
Widget/ ディレクトリに `@main struct CodexLinkWidgetBundle: WidgetBundle` を置き、その中で `CodexLinkTurnLiveActivityWidget()` を返す. ActivityAttributes 定義は **app target と Widget target の両方から参照される** ので shared SwiftPM package or 共通 Sources/ に置くこと.

## Evidence

codex-link-p2p Phase 13 (`790594d`) で Widget extension target を追加したことで Live Activity が表示されるようになった. project.yml の `CodexLinkWidget` target 定義 + `dev.codexlink.ios.LiveActivity` Bundle ID. Apple 公式 docs (`developer.apple.com/documentation/activitykit`) にも明記されているが、初見だと「app target に書けば動く」と思い込む典型例.
