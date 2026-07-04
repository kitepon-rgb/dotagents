---
id: booth-react-textarea-fill-value
title: 'BOOTH 商品説明エディタ: React 制御 textarea は fill/.value= では保存されない'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - booth
  - react
  - controlled-input
  - textarea
  - browser-automation
  - chrome-devtools
  - cdp
environment:
  os: linux
  arch: x64
  node: 22.22.1
  site: manage.booth.pm
  framework: React
  tooling: chrome-devtools-mcp / CDP
source_project: null
source_session: 2026-06-01T10:06:28.074Z/def5af7c2890
created_at: 2026-06-01
updated_at: 2026-06-01
last_verified: 2026-06-01
---

## Context

BOOTH の商品説明はブロック構造（各セクションが「見出し」+「本文」の textarea 群）。本文欄は name 属性が無いため、内容の一部文字列で対象 textarea を特定すると uid 再採番に強い。

## Symptom

ブラウザ自動操作で BOOTH の商品説明（manage.booth.pm の商品編集ページ）の本文 textarea に、自動化ツールの fill や el.value= で値を入れると画面表示は変わる。だが「公開で保存する」を押しても保存されず、ページを再読込すると編集前の旧内容に戻っている（保存トーストは出るのに反映されない）。

## Cause

商品説明の本文欄は React 制御の textarea。DOM の .value を直接書き換えても（自動化ツールの fill 含め）React の内部 state が更新されず、保存時に送信されるのは旧 state。そのため「保存しました」表示が出ても旧内容が永続化される。加えて、自動操作ブラウザと人間が保存ボタンを押すブラウザが別コンテキスト（別タブ/別プロセス）だと、一方の編集はもう一方の保存に乗らないため、これも「反映されない」症状になる。

## Resolution

(1) 値の投入はネイティブ value セッターで行う: const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; set.call(el, newValue); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); これで React の onChange が発火し内部 state が更新される。(2) 編集と「公開で保存する」のクリックは必ず同一ブラウザ（同一コンテキスト）内で行う。(3) 保存後はキャッシュ無視で再読込し、textarea の値が残っているかを検証してから完了とみなす。

## Evidence

保存→再読込で全項目が旧内容に戻ることを2回再現。ネイティブセッター＋input/change dispatch で値を投入し、同一ブラウザ内で保存→キャッシュ無視リロードしたところ、全編集項目がサーバー側に残存することを確認。
