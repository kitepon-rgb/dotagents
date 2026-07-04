---
id: foundation-models-ios26-sensitivecontentanalysisml-code-15-mac-apple-intelligence
title: Foundation Models 生成が iOS26 シミュで SensitiveContentAnalysisML Code=15 失敗（ホスト Mac の Apple Intelligence 未有効が原因）
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - foundation-models
  - apple-intelligence
  - simulator
  - ios26
  - guardrail
  - SensitiveContentAnalysisML
  - swift
environment:
  os: macOS 26.5
  arch: arm64
  node: 26.3.0
  chip: Apple M5
  xcode: '26.5'
  sim_runtime: iOS 26.5
  framework: FoundationModels 1.5.2
  deployment_target: iOS 17.0 (機能は @available(iOS 26) でゲート)
source_project: null
source_session: 2026-06-18T00:08:57.427Z/80a45e8915e1
created_at: 2026-06-18
updated_at: 2026-06-18
last_verified: 2026-06-18
---

## Context

オンデバイス生成（カスタムカテゴリの en+ja 例文生成）の品質検証フックをシミュで走らせた際に発生。build/link/availability は正常だったため、原因切り分けに時間を要した。

## Symptom

iOS 26 シミュレータで FoundationModels の `LanguageModelSession.respond(to:generating:)` が必ず throw する。`SystemLanguageModel.default.availability` は `.available` を返すのに、生成だけ失敗。エラーは `FoundationModels.LanguageModelSession.GenerationError Code=-1` が `Error Domain=com.apple.SensitiveContentAnalysisML Code=15` を内包し、その下に `NSCocoaErrorDomain Code=4865 "データが見つからないため、読み込めませんでした"`（NSCoderValueNotFoundError）。安全性モデル `com.apple.fm.language.instruct_300m.safety` のロード失敗。

## Cause

iOS/iPadOS/visionOS シミュレータは各自のモデルを持たず、**ホスト Mac の Apple Intelligence モデルと ML スタックを借りて**推論する。ホスト Mac で Apple Intelligence が有効化されていない（=ガードレール用 safety モデル含む資産が未ダウンロード）と、ベース言語モデルの availability は .available を返すのに、実際の生成時に安全性解析モデルがロードできず Code=15 で落ちる。availability はガードレール資産の有無まで反映しない。

## Resolution

ホスト Mac（macOS 26+・Apple Silicon・対応地域/言語）で システム設定 > Apple Intelligence と Siri をオンにし、モデルのダウンロード完了を待ってから シミュレータで再実行する。または Apple Intelligence 対応の実機（iPhone 15 Pro / 16 以降）で実行する。これで生成が通る。Code=15 はモデルカタログ/safety モデル不在のサインであり、コードや入力内容(ガードレール拒否=guardrailViolation とは別物)の問題ではない。

## Evidence

availability=.available の直後に8トピックの respond() が全て同一エラーで失敗。エラー文字列に `com.apple.SensitiveContentAnalysisML Code=15` と `NSCocoaErrorDomain Code=4865`。Apple Developer Forums thread/787199 および Apple エンジニア Richard Wei (WWDC25) 「Simulators use the host Mac's model and ML stack for inference; host Mac must run macOS 26 with Apple Intelligence enabled」と一致。
