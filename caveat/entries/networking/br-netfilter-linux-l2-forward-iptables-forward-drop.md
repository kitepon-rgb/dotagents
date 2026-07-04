---
id: br-netfilter-linux-l2-forward-iptables-forward-drop
title: '`br_netfilter` がロードされていると Linux ブリッジの L2 forward が iptables FORWARD に流れて DROP される（透過橋渡し殺し）'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - linux
  - bridge
  - iptables
  - docker
  - networking
  - kernel-module
environment:
  os: linux
  arch: x64
  node: 24.14.0
  kernel: 6.x
  container: docker
source_project: null
source_session: 2026-04-29T11:31:45.685Z/3abb0cf8f50e
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

2 つの物理 NIC を Linux bridge (`br0`) に組んで透過 L2 橋渡しさせたい構成で、bridge 経由の端末↔ルーター通信が ufw/iptables の FORWARD ポリシーや DOCKER-USER の DROP に引っかかって全部落ちる。Docker をインストールしてからさらに悪化することが多い。

## Cause

`br_netfilter` カーネルモジュールがロードされると、bridge を通る純粋な L2 forward まで netfilter (iptables の FORWARD) に上げる仕様になっている。Docker や一部の Kubernetes 構成は依存パッケージ経由でこのモジュールを自動ロードする。Docker のコンテナ通信は L3 forward なのでこのモジュールには依存しない。

## Resolution

`/etc/modprobe.d/blacklist-br_netfilter.conf` に `blacklist br_netfilter` を書いて永久にロード禁止。`lsmod | grep br_netfilter` で常時不在を確認。すでにロードされていれば `modprobe -r br_netfilter`。代償: conntrack-on-bridge が必要な特殊機能（一部の Kubernetes CNI、bridge 上で動くフィルタ）は使えなくなる。

## Evidence

2026-04-29 ServerManager 10G 橋渡し構成構築時に発生。br0 を組んだ瞬間 PC ↔ ルーター通信が DOCKER-USER で drop。blacklist 後は L2 forward が netfilter を通らず直行。
