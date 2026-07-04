---
id: markitdown-js-rc-0-markdown
title: markitdown は JS レンダリングページで rc=0 のまま空 Markdown を出力する
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - markitdown
  - rag
  - web-to-markdown
  - spa
  - silent-failure
environment:
  os: darwin
  arch: arm64
  node: 26.4.0
source_project: null
source_session: 2026-07-04T03:25:52.388Z/07a17810f6b8
created_at: 2026-07-04
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Context

dotagents の rag/ 整備で Obsidian 公式ヘルプ（商用ライセンスページ）を markitdown で固定しようとして遭遇。2 回リトライ（obsidian.md/help/teams/license と help.obsidian.md/teams/license）とも 1 バイト出力・rc=0。WebFetch では同ページの本文取得に成功＝ページ実在・markitdown 側の限界と切り分け。

## Symptom

markitdown '<URL>' > out.md が正常終了 (exit code 0) するのに出力ファイルが 1 バイト（改行のみ）。エラーメッセージ無し。パイプライン内だと成功に見えるため下流で気づきにくい。

## Cause

markitdown は静的 HTML の変換器で JS を実行しない。SPA / JS レンダリングのページ（実測: obsidian.md/help/*、help.obsidian.md）は初期 HTML に本文が無く、変換結果が空になる。markitdown は「本文ゼロ」を異常と見なさず rc=0 を返す。

## Resolution

①変換直後に必ずバイト数/行数を検証する（wc -c で閾値チェック。rc だけ見ない）②JS ページは WebFetch・ブラウザ系（Playwright / Chrome DevTools MCP）・Obsidian Web Clipper 等レンダリング可能な経路で取得し、取得方法をファイル冒頭に明記 ③同一サイトでも静的ページ（例: obsidian.md/pricing）は markitdown で正常変換できるので、失敗はページ単位で判定する。

## Evidence

P2=0 / RC=0 なのに wc -c => 1 byte（2026-07-04 実測、markitdown は uv tools 配下の現行版）。同コマンドで obsidian.md/pricing は 6463 bytes 正常。
