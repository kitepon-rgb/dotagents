---
id: chatgpt-developer-mode-app-ui-app-discovery
title: 'ChatGPT developer-mode app: 既存会話への手動途中追加は人間UIで不可・接続済みappは無選択でも自動discoveryされる'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - chatgpt
  - developer-mode
  - mcp
  - apps
  - discovery
  - connector
environment:
  os: darwin
  arch: arm64
  node: 26.4.0
  surface: ChatGPT web
  plan: Personal Pro
  date: 2026-07-11
  developer_mode: 'ON'
source_project: null
source_session: 2026-07-11T07:38:26.933Z/30400b802cac
created_at: 2026-07-11
updated_at: 2026-07-11
last_verified: 2026-07-11
---

## Symptom

既存会話のcomposer「＋」からdeveloper-mode MCP appを途中追加しようとすると、検索欄がapp候補を返さずファイル候補に落ちて選択できない（同じappが新規チャットでは候補に出る）。これを「app切替不能」「account entitlementの問題」「planが非対応」と誤診しやすい。さらに「＋で選択しないとappのツールを使えない」という前提も誤りで、この前提のまま試験・運用を設計すると、UI操作の失敗だけを根拠にプロジェクトをBLOCKED判定する誤りにつながる（実際に一度誤判定が起きた）。

## Cause

ChatGPT web（2026-07-11時点）の挙動: (1) 接続済みdeveloper-mode appは、composerでの手動選択なしでも会話の必要に応じて自動でdiscovery・tools/callされる。(2) ＋での手動選択は「そのturnのdiscoveryを明示的に絞る」制御手段にすぎず必須ではない。(3) 既存会話への手動途中追加の入口は人間UIに安定して露出しない（Chrome DevTools Protocolの自動操作ではDOM経由で追加できた実績があり、UI表示層の問題）。(4) app候補リストの初回ロードが遅く、入力文字列がプレーンテキストとしてcomposerへ入るflakeもある。公式docsはSettings > Plugins / chatgpt.com/pluginsのplus buttonからの作成を案内するが、plus buttonの露出もセッションにより不安定（同一accountでAIブラウザセッションでは不在、人間の手動UIでは作成可能だった）。

## Resolution

途中追加のUI操作に固執しない。無選択のまま普通に依頼すれば、ChatGPTが接続済みappを自動で取得・呼び出しする（server側でapp別のMCP initialize→tools/call 200を実測）。手動選択はdiscoveryを絞る試験・制御用途にのみ使う。「作成入口・追加入口が見つからない」というUI観測をentitlementや製品仕様の断定・プロジェクト停止判断の根拠にしない（人間の実UIで確認する）。

## Evidence

2026-07-11、本番MCP server（2つのdeveloper-mode app、Streamable HTTP + OAuth）で実測。①明示選択したチャット×3では選択appのみdiscovery（非選択appへの接続0件をserver logで確認）。②無選択の同一会話で、選択appに無いツールが必要になった時点で別appのsessionが自動初期化されtools/call 200（server log 07:24）。③既存会話への手動途中追加は、ページリロード＋再試行でも検索欄がファイル候補しか返さず不可（新規チャットでは同appが選択可）。④同一accountでも作成入口（plus）の露出がセッションで異なる。
