---
id: docker-single-file-bind-mount-editor-atomic-save-pins-container-to-stale-inode-caddy-reload-silently-loads-old-config-forever
title: Docker single-file bind-mount + editor atomic-save pins container to stale inode; caddy reload silently loads old config forever
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - docker
  - bind-mount
  - inode
  - caddy
  - atomic-save
  - reload
environment:
  os: Ubuntu (Docker host)
  arch: arm64
  node: 26.0.0
  proxy: Caddy v2 (official image)
  runtime: Docker, single-file bind-mount
source_project: null
source_session: 2026-05-31T03:06:07.963Z/c9e26a7f0106
created_at: 2026-05-31
updated_at: 2026-05-31
last_verified: 2026-05-31
---

## Context

Caddy reverse proxy in Docker fronting services behind a Cloudflare Tunnel; adding a new subdomain site block to the bind-mounted Caddyfile.

## Symptom

After appending a new site block to a Caddyfile that is bind-mounted into the caddy container as a single FILE (host/Caddyfile -> /etc/caddy/Caddyfile), `caddy reload` returns exit 0 ("using config from file", "adapted config to JSON") and `caddy validate` passes, but the new site is never served — requests to the new hostname get HTTP 421 Misdirected Request (or fall through to default_sni). The running config (admin API /config/) and even `caddy adapt` inside the container do NOT contain the new block, despite the host file clearly containing it.

## Cause

Docker bind-mounts of a single FILE resolve to the file's inode at container start. Editors (and many AI/file tools) save atomically: write a temp file then rename() over the target, which creates a NEW inode. The host path now points to the new inode (with the edit), but the container's mount is still pinned to the OLD inode (pre-edit content). So tools running INSIDE the container (validate/adapt/reload) read the stale old file and never see the change. Confirmed by comparing `stat -c %i` of the host file vs `docker exec <c> stat -c %i /path` — different inodes, and `docker exec <c> grep newblock /path` returns 0 while the host file has it.

## Resolution

`docker restart <container>` re-resolves the bind-mount to the host path's current inode; after restart the container reads the edited file and reload is not even needed. Permanent fix: bind-mount the DIRECTORY instead of the individual file, OR edit the file in place (truncate+write, no atomic rename) so the inode is preserved. Diagnose with: compare host inode (`stat -c %i hostfile`) vs container inode (`docker exec c stat -c %i /mountpath`); if they differ, the container is stale.

## Evidence

host inode 5505041 / 402 lines / grep xarticle=1; container /etc/caddy/Caddyfile inode 5518502 / 391 lines / grep xarticle=0. caddy reload exit 0 + validate "Valid configuration" yet running config (127.0.0.1:2019/config/) listed 7 hosts without the new one; `caddy adapt` in-container also omitted it. After `docker restart caddy`, container inode became 5505041/402 lines, running config included the host, and external curl returned HTTP 200.
