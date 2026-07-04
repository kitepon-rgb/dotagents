---
id: claude-mermaid-docker-chromium-running-as-root-without-no-sandbox-mermaid-cli-p
title: claude-mermaid を Docker コンテナで動かすと chromium が `Running as root without --no-sandbox` で死ぬ (mermaid-cli `-p` フラグを渡す経路がない)
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker
  - puppeteer
  - chromium
  - mermaid
  - claude-mermaid
  - mcp
environment:
  os: linux
  arch: x64
  node: 22.22.1
source_project: null
source_session: 2026-05-03T14:09:44.457Z/e3ae0d4d6598
created_at: 2026-05-03
updated_at: 2026-05-03
last_verified: 2026-05-03
---

## Symptom

claude-mermaid (npm `claude-mermaid`、内部で `npx -y @mermaid-js/mermaid-cli` 経由 Puppeteer) を Node 公式 Docker image (root user 既定) で動かすと、初回の `mermaid_preview` / `mermaid_save` 呼び出しで `Failed to launch the browser process: ... Running as root without --no-sandbox is not supported. See https://crbug.com/638180`。MCP 接続自体は成立、tools/list も返るが、実際のレンダリングだけ失敗。</symptom>
<parameter name="cause">Puppeteer (Chromium) は root 実行時に `--no-sandbox` 強制要求。`@mermaid-js/mermaid-cli` は `-p <puppeteerConfigFile>` で puppeteer 起動オプションを受け付けるが、claude-mermaid の build/handlers.js は `npx -y @mermaid-js/mermaid-cli` 呼び出しに `-i / -o / -t / -b / -w / -H / -s` のみを渡し `-p` を一切露出しない (1.6.2 で確認)。env 経由で渡す手段もない。</cause>
<parameter name="resolution">Dockerfile で `/usr/bin/chromium` をラッパスクリプトに差し替え、すべての起動に `--no-sandbox --disable-dev-shm-usage` を強制注入する。`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` のままでよく、claude-mermaid 側のコード変更も不要。Dockerfile スニペット: `RUN mv /usr/bin/chromium /usr/bin/chromium-real && printf '#!/bin/sh\nexec /usr/bin/chromium-real --no-sandbox --disable-dev-shm-usage "$@"\n' > /usr/bin/chromium && chmod +x /usr/bin/chromium`。USER node に切り替える方法より既存環境変数への影響がなく確実。</resolution>
<parameter name="evidence">claude-mermaid 1.6.2 の `dist/build/handlers.js` 内 npx 引数配列に `-p` を含まないことを確認、Dockerfile ラッパ差し替え後 mermaid_preview が SVG を正常生成 (image-hub 経由 e2e テスト)。</evidence>
<parameter name="environment">{"claude-mermaid":"1.6.2","mermaid-cli":"^11.12.0","base-image":"node:22-bookworm-slim","container-user":"root"}

## Cause



## Resolution



## Evidence


