---
id: codex-link-p2p-relay-in-memory-state-docker-container-restart-device-session-wipe-bootstrap-token-host-init
title: 'codex-link-p2p Relay: in-memory state のみで Docker container restart で全 device session が wipe → bootstrap token から全 host を再 init 必要'
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - codex-link-p2p
  - relay
  - persistence
  - docker
  - bootstrap-token
  - device-session
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  repo: codex-link-p2p
  deploy: Docker compose at kitepon.dynv6.net
  relay_state: in-memory Map (no SQLite/Redis)
source_project: null
source_session: 2026-05-15T02:12:34.137Z/3d22c8606cff
created_at: 2026-05-15
updated_at: 2026-05-15
last_verified: 2026-05-15
---

## Symptom

codex-link-p2p の Relay (`services/relay/`) が `kitepon.dynv6.net` で Docker compose deploy されている状態で、Relay container が再起動 (deploy / OOM / 自宅サーバ電源 cycle 等) すると、Mac Host が `Unexpected server response: 401` で signaling WSS に接続できなくなる. Mac Host を再起動しても回復しない. iPhone 側も pairing 済 device が無効になり Onboarding からやり直し.

## Cause

`services/relay/src/state.ts` の Host registry / device session / HostAccess / pairing code が **すべて in-memory Map** で実装されており、永続化層 (SQLite / Redis / file) を持たない. Phase 17 (= MVP 後 phase) で永続化する計画だったが MVP 完成前に project archive となったため未実装のまま. container restart で `userIdToDevices` `deviceSessions` `hostsById` `hostAccess` 全部が空に戻る. SHA-256 hash された device session token が消えるので、Mac Host が持っている生 token を提示しても hash 比較で必ず miss → 401.

## Resolution

復旧手順 (Relay container restart 後):
1. user (Relay 運用者) が `CODEX_LINK_HOST_BOOTSTRAP_TOKEN` を控えていることを確認 (Docker env / `.env`)
2. Mac Host で再 init:
```sh
codex-link-host init \
  --relay https://codex-link-p2p.kitepon.dynv6.net \
  --bootstrap-token "$BOOTSTRAP_TOKEN" \
  --display-name "kite Mac"
```
3. Mac Host を再起動 (`pnpm --filter @codex-link/host start` or launchd reload)
4. iPhone 側は再 pair (新 pairing code を Mac Host で発行 → QR スキャン)

恒久対策 (本プロジェクトでは未実施): `services/relay/src/state.ts` を SQLite (better-sqlite3) backed に書き換え. schema:
- `users (id, created_at)`
- `devices (id, user_id, display_name, token_hash_sha256, created_at, revoked_at)`
- `hosts (id, user_id, display_name, capabilities_json, last_seen_at)`
- `host_access (user_id, host_id, granted_at, expires_at)`
- `pairing_codes (code, host_id, expires_at, redeemed_at)`

Relay 永続化なしで運用するなら (= 本プロジェクトの実態) container restart のたびに全 host から再 init を覚悟する. 自宅サーバの電源不安定 / docker compose down → up 系操作のたびに発生.

## Evidence

codex-link-p2p docs/roadmap.md "MVP 後 phase" の `Phase 17: 永続化 / 信頼性 (MVP 後 = nice to have). Relay state の永続化 (現状はメモリのみ)`. POSTMORTEM.md セクション 5.3 にも「Relay state の永続化を最後まで先送りした (Phase 17) ため、Relay コンテナ再起動で全 device session が wipe され、bootstrap からやり直しが必要だった. dogfood 中に実害が出た」と記録. dogfood セッション (2026-05-15) 中に実際に Mac Host が `Unexpected server response: 401` で停止 → bootstrap token で再 init → 復旧の流れを実行.
