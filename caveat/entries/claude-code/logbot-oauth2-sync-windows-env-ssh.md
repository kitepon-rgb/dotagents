---
id: logbot-oauth2-sync-windows-env-ssh
title: LogBot /oauth2-sync は Windows 側 .env のみ更新 — サーバー側は ssh で別経路必要
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - openclaw
  - logbot
  - oauth2
  - x-api
  - docker
  - ssh
  - env-sync
  - mcp-container
environment:
  os: win32
  arch: x64
  node: 24.14.0
  project: OpenClaw
  server: kite@192.168.1.2 Ubuntu Server
  container_runtime: Docker rootful (旧 Podman)
  windows_env_path: c:/Users/kite_/Documents/Program/OpenClaw/.env
  server_env_path: ~/OpenCClaw/.env
  logbot_endpoint: 127.0.0.1:18800/oauth2-sync
  mcp_container: openclaw-mcp
source_project: null
source_session: 2026-04-29T06:35:30.979Z/c0ad82c53d01
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Context

OpenClaw リポジトリ (Windows 11 + Ubuntu Server サーバー)。LogBot は Windows 側で動作し SSH リバーストンネル経由で 192.168.1.2 のサーバーから 18800/18801 にアクセスされる。サーバーは 2026-04-29 に BazziteOS+Podman → Ubuntu Server+Docker rootful に移行済。openclaw-mcp コンテナは ~/OpenCClaw を /app に bind mount しているため、コンテナ内 writeTokensToEnv は host の ~/OpenCClaw/.env に書く。tokenCache はモジュール変数で起動後の更新は反映されるが、コンテナ再起動時は env_file: .env で初期値が読み込まれるため .env 自体が新しくないと意味がない。

## Symptom

scripts/oauth2-setup.js が「✅ LogBot 同期 OK (サーバー側 .env も更新された)」と成功表示するが、サーバー (kite@192.168.1.2) の ~/OpenCClaw/.env は更新されない。openclaw-mcp コンテナの env も古いトークンのまま。X OAuth2 リフレッシュが 400 で失敗継続し、ensureSubscription も再登録できない状態が続く。

## Cause

LogBot の /oauth2-sync POST ハンドラー (lib/api-server.js) は `path.join(__dirname, '../.env')` で **Windows 側 .env しか書き換えない設計**。サーバー側 .env は mcp コンテナの x-oauth2.js (tools/x-official/_x-oauth2.js) が次回 401 で pullTokensFromLogBot 経由で間接的に同期される想定だが、SSH リバーストンネル不通や LogBot 不通だとこの間接経路ごと死亡する。oauth2-setup.js の旧成功メッセージは設計と乖離していた。podman 時代の `podman restart` 案内も Docker rootful 移行 (2026-04-29) 後に陳腐化。

## Resolution

scripts/oauth2-setup.js に syncToServerViaSsh() を追加。再認可直後に execFile で `ssh kite@192.168.1.2 sed -i ~/OpenCClaw/.env` を実行してサーバー .env を直接書き換え、続けて `sudo docker restart openclaw-mcp` でコンテナ再起動。fail-loud で ssh 失敗時は手動コマンドを stderr に案内。OAUTH2_SERVER_HOST / OAUTH2_SERVER_ENV_PATH / OAUTH2_SERVER_CONTAINER で環境変数オーバーライド可能。token は base64url-ish ([A-Za-z0-9._~+/=:-]) で sed `|` デリミタや `&` 置換参照と衝突しない。検証: コンテナ再起動後の sudo docker logs で `[x-webhook] サブスクリプション確認: OK` と CRC 再検証 status=200 が出ることを確認。コミット 3e3b494。

## Evidence

確認時点: Windows .env mtime 15:23、サーバー ~/OpenCClaw/.env mtime 15:25 (UTC 06:25)、コンテナ start 15:25:36 JST、コンテナ env で新トークン (T281bVMwOHl0Um****) 確認、CRC 再検証 status=200 (webhook=2041800424345497601)、ensureSubscription 成功ログを sudo docker logs openclaw-mcp で確認。修正前は LogBot 経由のみで「同期 OK」と表示されていたが、サーバー側は実際には 4/27 のまま放置されていた。
