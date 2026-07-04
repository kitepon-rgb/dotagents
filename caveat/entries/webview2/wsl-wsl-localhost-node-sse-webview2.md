---
id: wsl-wsl-localhost-node-sse-webview2
title: WSL共有(\\wsl.localhost)越しに実行したNodeサーバのSSEを、ホストのWebView2が受信できない
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - wsl2
  - webview2
  - sse
  - eventsource
  - node
  - interop
  - unc
  - 9p
  - wsl.localhost
environment:
  os: Windows 11 + WSL2 (Ubuntu 26.04, NAT networking)
  arch: x64
  node: 22.22.1
  runtime: Node.js 24 (host node.exe) / WebView2 Evergreen Runtime
  mechanism: WSL interop, server script run from \\wsl.localhost UNC share
source_project: null
source_session: 2026-06-17T13:17:12.789Z/0606c0a7b48e
created_at: 2026-06-17
updated_at: 2026-06-17
last_verified: 2026-06-17
---

## Context

WSL2上で開発するプロジェクトの画面を、Windowsホスト側のWebView2窓に表示するため、WSL interopでホストのnode.exeにサーバ（SSEで状態をブロードキャストする）を実行させ、窓をそのサーバへ接続させていた。サーバスクリプトのパスを`wslpath -w`でWindows形式に変換し`\\wsl.localhost\…`を直接渡していたのが原因。

## Symptom

WSL2上のNode HTTPサーバ（SSE/EventSourceエンドポイント付き）を、Windowsホストのnode.exeでinterop起動する際、スクリプトを `\\wsl.localhost\<distro>\…`（9P/UNC共有）から直接実行すると、ホスト上のWebView2(Edge Chromium)がSSEストリームを一切受信できない。静的GET（HTML/CSS/画像）は正常配信され画面に表示されるが、`/events`等のSSEによるライブ更新が全く届かない。切り分け上の罠：WSL側のcurlでもホスト側のcurl.exeでも、静的GETもSSEストリームも200で正常に流れる——WebView2(Chromium)のネットワーク経路だけが受信に失敗する。システムプロキシは無関係（未設定でも発生）。

## Cause

WSL共有(9P/UNC `\\wsl.localhost`)越しに起動したNodeプロセスが返すSSE(チャンク/ストリーミング)レスポンスを、ホストWebView2のネットワークスタックが安定して受け取れない。単発の静的レスポンスは通るが、持続ストリーミング接続が確立しない（あるいはモジュールスクリプト/サブリソースの取得が共有越しで不安定になり、ページ側のEventSourceが機能しない）。同じサーバをWindowsローカルのファイルから実行すると発生しない。

## Resolution

サーバスクリプトとその静的アセット一式を、`\\wsl.localhost`共有から実行せず、Windowsローカルのディレクトリ（例: %LOCALAPPDATA%配下）へコピーしてから、そのローカルコピーをホストのnode.exeで実行する（mtimeゲートで再コピーを抑制）。ローカル実行にすればWebView2はSSEを正常受信し、ライブ更新が届く。サーバ自体のコード変更は不要——実行元をローカルにするだけ。

## Evidence

窓は背景画像など静的アセットを表示し<audio>要素も配置されるが、状態変化の演出が一切再生されずBGMも鳴らない。サーバ側の発火ログ(events)は溜まるのに、窓側の再生トレース(playback)が1件も出ない＝窓がSSEを受信していない。実行元をWSL共有→Windowsローカルコピーに変えただけで、再生トレースが出て演出が正しく動き出した。WSL/ホスト双方のcurlでは/events含め全て200で通っていた。
