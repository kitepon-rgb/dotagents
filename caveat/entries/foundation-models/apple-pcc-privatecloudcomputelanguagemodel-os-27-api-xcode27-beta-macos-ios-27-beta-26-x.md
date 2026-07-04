---
id: apple-pcc-privatecloudcomputelanguagemodel-os-27-api-xcode27-beta-macos-ios-27-beta-26-x
title: 'Apple PCC (PrivateCloudComputeLanguageModel) は OS 27 専用API: ビルドは Xcode27 beta、実行は macOS/iOS 27 beta 必須（26.x 不可）'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - foundation-models
  - private-cloud-compute
  - apple-intelligence
  - ios27
  - macos27
  - xcode27
  - wwdc26
  - entitlement
environment:
  os: macOS 26.5
  arch: arm64
  node: 26.3.0
  chip: Apple M5
  xcode: 26.5 (PCC無し) / 27.0 beta1 27A5194q (PCC有り)
  framework: 'FoundationModels: 本体26.0 / PCCシンボル27.0'
  entitlement: com.apple.developer.private-cloud-compute (managed・paid team)
source_project: null
source_session: 2026-06-18T04:42:49.761Z/e1cca01cbe64
created_at: 2026-06-18
updated_at: 2026-06-18
last_verified: 2026-06-18
---

## Symptom

Foundation Models の Private Cloud Compute を使おうとすると、release macOS 26.5 + Xcode 26.5 では `PrivateCloudComputeLanguageModel` シンボルが SDK に存在しない（`UseCase` のみ）。Xcode 27 beta を入れればコンパイルは通るが、release の macOS/iOS 26.x 上では `if #available(iOS 27, macOS 27, *)` が false になり PCC 呼び出しが実行されない（＝品質テスト不可）。Simulator でも動かない。

## Cause

WWDC26(2026-06-09)で年次が「26」→「27」に改名（iOS27/macOS27 "Golden Gate"/Xcode27/Swift6.4）。`PrivateCloudComputeLanguageModel` は全プラットフォームで introducedAt 27.0・beta=true（FoundationModels 本体は 26.0 だが PCC シンボルのみ 27.0）。クライアントAPIが 27 OS にしか無いため、実行には 27 OS が必須。Simulator は独自AIスタックを持たずホスト Mac のスタックを借りるため、ホストが macOS 27+AI でない限り不可（Apple の Known Issues も「PCC は simulator で動かないことがある→実機 OS27 を使え」）。

## Resolution

ビルド: Xcode 27.0 beta1 (27A5194q) を side-by-side 導入（host は macOS 26.4+ で可＝26.5 のままビルド可・Apple Silicon 専用）。実行: macOS 27 beta（メイン起動OSは不可逆＝別APFSボリューム/外付けSSD か 予備機 推奨）か iOS 27 beta 実機（Apple Intelligence オン・要ネット）。エンタイトルメント `com.apple.developer.private-cloud-compute` は managed capability＝アカウント付与に加え App ID で有効化＋development profile へ埋め込み＋**paid Developer Program team 必須**（Personal Team 不可）。Xcode 27 beta の取得は Apple ID サインイン必須（匿名DL不可）。

## Evidence

ローカル: iPhoneOS26.5 SDK の FoundationModels swiftinterface に PCC シンボル無し（UseCase のみ）を実確認。Web 検証(8エージェント): Apple doc availability JSON が PrivateCloudComputeLanguageModel=introducedAt 27.0/beta、Xcode 27 release notes / system-requirements、WWDC26 session 319/241、Foundation Models Known Issues(simulator)、entitlements/com.apple.developer.private-cloud-compute。両レンズ検証で OS27 必須は supported（反証ゼロ）。
