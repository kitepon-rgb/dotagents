---
id: docker-user-j-drop-outbound-dns-image-pull-api
title: DOCKER-USER 末尾の `-j DROP` はコンテナの outbound (DNS/image pull/外部 API) も全滅させる
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker
  - iptables
  - ufw
  - networking
  - firewall
environment:
  os: ubuntu-26.04
  arch: x64
  node: 24.14.0
  container: docker-rootful
  firewall: iptables+ufw
source_project: null
source_session: 2026-04-29T11:31:30.073Z/e447d952782f
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

外部 → コンテナ公開ポートを遮断する目的で `iptables -A DOCKER-USER -j DROP` を末尾に置いたら、コンテナ → 外部の通信（DNS 解決、`docker pull`、healthcheck の curl、apt update など）が全部タイムアウト。コンテナ起動は成功しているのにアプリが何も外部に届かない。

## Cause

DOCKER-USER は Docker が iptables の forward 全般にフックさせる入口チェーン。外部 → コンテナだけでなくコンテナ → 外部の outbound パケットも経由するため、末尾の DROP に巻き込まれる。INPUT/OUTPUT の感覚で書くと事故る。

## Resolution

DROP の前に Docker 側ブリッジからの incoming を ACCEPT する前置ルールを置く: `iptables -I DOCKER-USER -i docker0 -j ACCEPT; iptables -I DOCKER-USER -i br-+ -j ACCEPT`。これでコンテナ発の forward は素通り、外部発のみ末尾 DROP に到達する。さらに公開ポート bind を `0.0.0.0` ではなく LAN IP / 127.0.0.1 に絞ることで二重防御。

## Evidence

2026-04-29 Ubuntu 26.04 移行で実害発生。DOCKER-USER に外部遮断ルールだけ追加した直後に nextcloud のメール送信、auction-bot の外部 API 呼び出し、`docker pull` が全部止まった。前置 ACCEPT 2 行を入れた瞬間に復旧。
