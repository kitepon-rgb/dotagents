---
id: chrome-devtools-mcp-api-playwright-mcp-screenshot-capture
title: chrome-devtools-mcp が起動済みプロファイルのロックで全API拒否／playwright-mcp の screenshot が capture 段でハング
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - chrome-devtools-mcp
  - playwright-mcp
  - screenshot
  - profile-lock
  - headless-chrome
  - file-protocol-blocked
environment:
  os: macOS (Darwin 25.5.0)
  arch: arm64
  node: 26.4.0
  tools: chrome-devtools-mcp, playwright-mcp
  browser: Google Chrome (managed by chrome-devtools-mcp)
source_project: null
source_session: 2026-06-29T11:57:09.006Z/bf97597c26c3
created_at: 2026-06-29
updated_at: 2026-06-29
last_verified: 2026-06-29
---

## Context

ローカルのCSS(CSS-in-JS文字列)変更を、本物のアプリを起動せず最小再現HTMLで実描画して確認しようとした場面。dev server未起動・file://不可・既存Chrome残存が重なって12回連続でツール失敗した。

## Symptom

ローカルHTMLを実描画検証しようとして2系統が同時に詰まる。(1) chrome-devtools-mcp: navigate_page / new_page / list_pages が軒並み "The browser is already running for /Users/<user>/.cache/chrome-devtools-mcp/chrome-profile. Use --isolated to run multiple browser instances." を返し、新規起動も既存への再アタッチもできず何も操作できない。(2) playwright-mcp: file:// へ navigate すると "Access to file: protocol is blocked"。HTTP配信に切り替えても browser_take_screenshot / page.screenshot が "waiting for fonts to load... fonts loaded" まで進んだ後、capture 段で必ずタイムアウト（5s既定でも timeout:60000 指定でも、fullPage/clip/animations:disabled いずれでも）。

## Cause

(1) chrome-devtools-mcp は固定の単一プロファイル(~/.cache/chrome-devtools-mcp/chrome-profile)を排他ロックする。前回起動した Chrome プロセスが残っているとロックを掴んだままで、MCP は既存インスタンスへ再アタッチせず、二重起動も拒否するため全APIが即エラーになる。(2) playwright-mcp は file:// スキームをブロックする。さらに当該環境では CDP 経由の screenshot がフォント読込完了後の実キャプチャ段で返ってこない（ハング）。

## Resolution

(1) プロファイルを掴んでいる古い Chrome の main プロセスを特定して kill する: `ps aux | grep chrome-devtools-mcp/chrome-profile`（複数出るうち /Contents/MacOS/Google Chrome が main）→ `kill <main_pid>`。その後 chrome-devtools の navigate_page / take_screenshot が正常動作する。注意: take_screenshot の filePath はワークスペースroot配下しか許可されない（scratchpadは弾かれる→リポジトリ内の .playwright-mcp/ 等に保存）。(2) file:// が要るときは簡易HTTPサーバー(`python3 -m http.server <port>`)で配信して http:// で開く。screenshot がハングする環境では playwright をやめて chrome-devtools-mcp の take_screenshot を使う(fullPage可・成功)。

## Evidence

chrome-devtools: navigate_page/new_page/list_pages すべて "The browser is already running for .../chrome-profile. Use --isolated"。playwright: navigate file:// → "Access to \"file:\" protocol is blocked"。screenshot → "TimeoutError: page.screenshot: Timeout 60000ms exceeded. Call log: taking page screenshot / waiting for fonts to load... / fonts loaded"（その後ハング）。kill main PID 後に chrome-devtools navigate=Successfully、take_screenshot=Took a screenshot で復旧。
