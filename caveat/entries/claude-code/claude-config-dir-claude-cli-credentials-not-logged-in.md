---
id: claude-config-dir-claude-cli-credentials-not-logged-in
title: CLAUDE_CONFIG_DIR を設定すると Claude CLI は credentials も同ディレクトリから読む — `Not logged in` の落とし穴
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-code
  - anthropic-max
  - config-dir
  - credentials
  - docker
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-29T11:26:07.376Z/8880e5bdde94
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

Claude CLI で `CLAUDE_CONFIG_DIR=/path/to/custom-config` を設定すると、`claude -p "say hi"` が `Not logged in · Please run /login` を返す。`~/.claude/.credentials.json` は存在し、host で env 未設定なら認証通る。Docker コンテナで `CLAUDE_CONFIG_DIR` を分離設定 (user scope MCP の隔離目的) すると顕在化。</symptom>
<parameter name="cause">Claude CLI は `CLAUDE_CONFIG_DIR` 設定時、user scope settings だけでなく **`.credentials.json` も同ディレクトリ** (`$CLAUDE_CONFIG_DIR/.credentials.json`) から読む。`~/.claude/.credentials.json` には fallback しない。CONFIG_DIR を別 dir に分離した瞬間、認証ファイルが見えなくなる。</cause>
<parameter name="resolution">`$CLAUDE_CONFIG_DIR/.credentials.json` を `~/.claude/.credentials.json` への relative symlink で配置。例: `cd $CLAUDE_CONFIG_DIR && ln -sf ../.claude/.credentials.json .credentials.json`。これで CONFIG_DIR 隔離 (user scope MCP 遮断) を維持しつつ認証は共有される。Docker コンテナで volume mount している場合は host 側で symlink を作成すれば mount 経由でコンテナ内からも辿れる。</resolution>
<parameter name="evidence">`docker exec ${CONTAINER} bash -c 'claude -p "say hi"'` が "Not logged in"。`CLAUDE_CONFIG_DIR=/home/node/.claude claude -p "say hi"` (= host のデフォルト dir) なら通る。`ln -sf ../.claude/.credentials.json $CLAUDE_CONFIG_DIR/.credentials.json` 後に通った。</evidence>
<parameter name="environment">{"os": "linux/win32", "claude_cli": "2.1.91", "context": "container CLAUDE_CONFIG_DIR isolation"}

## Cause



## Resolution



## Evidence


