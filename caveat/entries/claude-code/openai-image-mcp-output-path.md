---
id: openai-image-mcp-output-path
title: openai-image MCP の output_path は反映されず、画像はディスクに書かれない
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - mcp
  - openai-image
  - gpt-image-2
  - output_path
  - silent-failure
  - image-generation
environment:
  os: linux
  arch: x64
  node: 22.22.1
source_project: null
source_session: 2026-05-17T18:22:28.197Z/3ec9fe8ec8c7
created_at: 2026-05-17
updated_at: 2026-05-17
last_verified: 2026-05-17
---

## Symptom

`mcp__openai-image__generate_image` を `output_path="/abs/path/og.png"` で呼び出すと、戻り値の TextContent は「生成画像を保存しました: /abs/path/og.png」と表示するが、実ファイルは作成されていない。ディレクトリは事前に mkdir 済み、書き込み権限あり、絶対パス指定、相対パスでも同様。`/tmp/og.png` のように MCP サーバの CWD に依存しない場所を指定しても発生する。Image コンテンツブロック自体は正常に返ってきており、Claude Code クライアントではインライン表示される。</symptom>
<parameter name="cause">MCP サーバ実装 (`openai-image` server) が `output_path` 引数を受け取った後、内部で保存処理を行わずに「保存しました」というメッセージだけを TextContent として返している、もしくは MCP サーバプロセスのサンドボックスがクライアント側のファイルシステムに書き込めない。Claude Code から見ると MCP サーバの戻り値は成功扱いになるが、ファイル実体は無いまま処理が進む。同じセッション内で `/home/kite/projects/HermesAgent/.github/og.png`, `/tmp/hermes-og.png` の 2 パスで連続再現 (HermesAgent リポでの polish-github 作業中)。</cause>
<parameter name="evidence">tool 戻り値: `生成画像を保存しました:\n- /home/kite/projects/HermesAgent/.github/og.png` と表示。直後の `ls -la /home/kite/projects/HermesAgent/.github/og.png` は `No such file or directory`。同じく `/tmp/hermes-og.png` 指定でも `ls /tmp/hermes-og.png` は失敗。`find /home /tmp -name '*.png' -newer ...` でも該当ファイルなし。一方、同ホストの別リポ (`/home/kite/projects/ConnectC2X/.github/og.png` 等) には過去に生成された og.png が存在しており、MCP サーバ自体は過去のセッションでは書き込み成功実績がある。</evidence>
<parameter name="resolution">回避策 1: README hero 用なら SVG を Write tool で直接書いて `.github/og.svg` を作成 (GitHub README はインライン SVG をレンダする)。回避策 2: 重要な PNG が必要なら、Claude Code クライアント側に返ってくる Image コンテンツブロックをユーザーに手動保存してもらう、または別の画像生成経路 (Bash + curl で OpenAI Images API 直叩き、要 OPENAI_API_KEY) を使う。根本対処: MCP サーバ実装側の `output_path` ハンドラを修正する必要がある (このセッションでは未対処、未報告)。GitHub Social preview は PNG/JPG/GIF のみ受け付けるため、SVG だけでは Settings UI の Social preview アップロードはできず、ユーザー側で別途 PNG を用意する必要がある。</resolution>
<parameter name="context">プロジェクト: HermesAgent (kitepon-rgb/HermesAgent) の polish-github 作業中、OG バナーを `.github/og.png` に生成しようとして発生。MCP は output_path に絶対パスを 2 回連続指定したが、いずれも書き込み無し。最終的には README の hero 参照を SVG に切り替えてリリースを進めた。</context>
<parameter name="environment">{"mcp_server": "openai-image", "model": "gpt-image-2", "client": "Claude Code (VSCode extension)", "host_os": "Linux WSL2"}

## Cause



## Resolution



## Evidence


