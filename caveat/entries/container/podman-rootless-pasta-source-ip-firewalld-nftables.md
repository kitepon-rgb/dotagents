---
id: podman-rootless-pasta-source-ip-firewalld-nftables
title: Podman rootless (pasta) は source IP を書き換え、firewalld/nftables を完全バイパスする
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - podman
  - rootless
  - pasta
  - slirp4netns
  - firewalld
  - nftables
  - netfilter
  - network-security
  - remote_ip
  - caddy
environment:
  os: fedora / bazzite / ubuntu / debian
  arch: x64
  node: 24.14.0
  container: podman-rootless
  network_backend: pasta (default in Podman >=4.5) / slirp4netns (legacy)
  kernel: any
source_project: null
source_session: 2026-04-21T12:59:04.236Z/5cef27e709a4
created_at: 2026-04-21
updated_at: 2026-04-21
last_verified: 2026-04-21
---

## Context

自宅サーバー (BazziteOS / Fedora Silverblue) で管理 UI が外部監査で指摘されて発覚。Caddyfile に `@internal remote_ip private_ranges` の判定を書いていたが pasta 経由で全接続が private 扱いになり意味を成さず、さらに firewall-cmd で 8080 を閉じても pasta が bypass するため外部から到達できていた。

## Symptom

rootless Podman で `podman run -p 8080:80` のように port publishing したコンテナを「LAN だけに公開したい」と思って以下を試しても全て効かない:

1. `firewall-cmd --zone=public --remove-port=8080/tcp` でポートを塞ぐ → 外部から 8080 が通る
2. nftables で DROP ルールを追加 → 同上、効かない
3. Caddy / nginx 側で `remote_ip private_ranges` (reverse-proxy 判定) を使って LAN 限定にする → **全接続が private と判定される** (or 逆に全接続が同一 IP に見える)、判定機能が完全に無意味化

結果、「外部に出したくない管理画面 / デバッグエンドポイント / 内部 API」が意図せず全世界公開になる。外部スキャンや監査で指摘されて初めて気付くケースが多い。

## Cause

rootless Podman の default network backend である **pasta** (旧 slirp4netns も類似) は user namespace 内で動作するため:

1. **netfilter / nftables を完全にバイパスする** — host の firewalld ルールは root namespace の netfilter hook に刺さるが、pasta の port forwarding は user namespace 内のソケット中継として実装されており、host 側 firewall を経由しない
2. **source IP を pasta プロセスの IP に書き換える** — コンテナから見るとすべての受信接続が `10.0.2.2` (slirp4netns) / pasta の gateway IP から来ているように見える。X-Forwarded-For も reverse-proxy 側で付与しない限り失われる

公式ドキュメントには書いてあるが「rootless だから動かない」で挫折した人が多く、セキュリティ設定画面で `remote_ip` を使った LAN 限定 ACL を書いて「一見動いている」ように見えることが罠。

## Resolution

外部遮断には以下のいずれか (理想は両方):

1. **コンテナの bind address を LAN IP に限定する** — `-p 192.168.1.2:8080:80` または compose の `ports: ["192.168.1.2:8080:80"]`。これがユーザー空間で物理的に外部 NIC に listen しない唯一の方法
2. **reverse proxy (Caddy/nginx) 側で該当パスを 403/404 化** — `remote_ip` 判定ではなく、パス自体を無条件拒否する。管理 UI は別ポート (LAN bind) に分離する

`remote_ip` / X-Real-IP 系の IP allowlist は pasta 環境では意味がないので、source-IP ベースの ACL に依存する設計自体を避ける。どうしても IP で絞りたい場合は rootful Podman に移行するか、別途 host 側で TLS パススルー + LAN 限定 listener を組む。

## Evidence

- pasta 公式: https://passt.top/passt/about/ — "pasta implements user-mode networking bypassing the host's netfilter"
- Podman issue tracker に同種の報告多数 (rootless / firewalld / netfilter で検索)
- Caddy の `remote_ip` matcher は L4 の source IP を見るだけなので、pasta で書き換えられた IP しか取れない
