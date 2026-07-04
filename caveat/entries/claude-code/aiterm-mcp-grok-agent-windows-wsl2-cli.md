---
id: aiterm-mcp-grok-agent-windows-wsl2-cli
title: aiterm-mcp の grok_agent が Windows+WSL2 で常に「CLI が見つからない」と誤判定する
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - aiterm-mcp
  - grok
  - wsl
  - wsl2
  - windows
  - path
  - mcp-server
  - env-var
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-07-04T11:18:10.852Z/b3b9aea8da92
created_at: 2026-07-04
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Symptom

Windows上でaiterm-mcp（aiterm MCPサーバ）のgrok_agent/composer_agentツールを呼ぶと、Grok CLI(grok.exe)を~/.grok/bin/にインストール済み・PATH追加済み・grok loginでログイン済みであっても常に「aiterm: Grok Build(Grok) の CLI が見つかりません（~/.grok/bin/grok か PATH が必要）」というエラーになる。実際にはWSL2側にもgrok CLIが正常にインストールされ、対話的シェルからは`grok --version`や`grok -p "..."`が問題なく動く。

## Cause

aiterm-mcpはWindowsネイティブのNode.jsプロセスとして動作し、その永続端末(PTY)バックエンドはWSL2上のtmuxセッション（`wsl tmux -S ... `）。しかしCLI存在チェック(resolveAgentBin, dist/core.js)は下記の欠陥を持つ: (1) `os.homedir()`（Windows側のホーム、例 C:\Users\<user>）に `.grok/bin/grok`（拡張子なし）を連結してfs.existsSyncするが、Windows実体は`grok.exe`のため常にfalse。(2) フォールバックの`where grok`もWindows側のPATHを見るが、これはaiterm-mcpサーバプロセス起動後にUser PATHを追加してもプロセス自体の環境変数は更新されないため反映されない。(3) さらに本質的な問題として、たとえWindows側でパスが解決できても、実際のエージェント起動コマンドはWSL2のbashセッションへ文字列としてそのまま送信されるため、Windowsスタイルのパス(`C:\Users\...\grok.exe`)を返しても実行時に無効になる——正しく機能させるにはWSL側のパス（例: `/home/<wsluser>/.grok/bin/grok`）が必要。加えてWSL側でもgrokのPATH追加が`~/.bashrc`にしかなく、非対話シェルでは反映されない場合がある。また、Windowsユーザー名とWSLのユーザー名が異なるケース（例: Windows側`kite_`、WSL側`kite`）でもホームパス導出がずれる。

## Resolution

aiterm-mcpは`GROK_BIN`環境変数によるオーバーライドを最優先でサポートしている（`process.env.GROK_BIN`があれば存在チェックをスキップしてそのまま使う）。これをWindowsのユーザー環境変数として設定する際、値には**WSL側の絶対パス**を指定する（例: `GROK_BIN=/home/<wsluser>/.grok/bin/grok`）。Windows側のパスではなく、実際にコマンドが実行されるWSL bash文脈で解釈可能な文字列にすること。Codex側は`CODEX_BIN`が同型の仕組みを持つが、Codex CLIはWindowsネイティブでもWSL側でも動くため、この問題は基本的にGrok CLI（WSL2でのみ動作を確認しているケース）で顕在化しやすい。設定後は**aiterm-mcpサーバプロセスの再起動が必須**（環境変数は既存プロセスに反映されないため、Claude Code/エディタ拡張の再起動などでMCPサーバを再起動する）。

## Evidence

dist/core.js 内 resolveAgentBin (Windows Node.js プロセス側実行) と buildAgentCmd (WSL bash tmux セッションへ文字列送信) を実読。実機で: (1) `~/.grok/bin/grok` (Windows側 C:\Users\<user>\.grok\bin\grok.exe) 設置後もgrok_agent失敗を確認、(2) WSL2側に既存のgrok CLI (0.2.82) がありインタラクティブシェルでは動作確認、(3) 非対話 `wsl bash -c 'command -v grok'` では見つからず(.bashrcのPATH追加が非対話シェルで無効)、(4) `/usr/local/bin/grok`へのsymlink追加後も検出改善せず(Windows側プロセスでのチェックのため無関係と判明)、(5) GROK_BIN環境変数(User)をWSLパスで設定後も同一セッション内では改善せず(プロセス再起動待ちのため未検証)。
