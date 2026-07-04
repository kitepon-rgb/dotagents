---
id: apt-install-fail2ban-jail-local-ignoreip-journalctl-lan-pc-ban
title: '`apt install fail2ban` は jail.local 無しで自動起動 → デフォルト ignoreip で journalctl の過去の認証失敗を読んで LAN PC を即 ban する'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - fail2ban
  - ubuntu
  - debian
  - ssh
  - dpkg
environment:
  os: ubuntu-debian
  arch: x64
  node: 24.14.0
  package: fail2ban
source_project: null
source_session: 2026-04-29T11:31:50.925Z/38372f0b2b45
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

新規 Ubuntu/Debian サーバーで `apt install fail2ban` した直後、LAN 内の作業 PC からの SSH が突然繋がらなくなる。`fail2ban-client status sshd` を見ると banned に LAN PC の IP。インストール直後で誰もログインしていない時間帯のはずなのに、なぜか即 ban されている。

## Cause

dpkg の post-install が `systemctl start fail2ban` を自動で呼ぶ。jail.local が無い状態で起動するとデフォルト設定（ignoreip に LAN を含まない `127.0.0.1/8` のみ）で動き、systemd-journald が保持している**過去の sshd 認証失敗ログ**（パスワード入力ミス、鍵ネゴ失敗など）を遡って読み込むため、過去の作業 PC のミスが即時 banaction に変換される。

## Resolution

必ず `apt install` の**前に** `/etc/fail2ban/jail.local` を先置きして ignoreip に LAN レンジを書いておく。あるいは `apt install -y --no-start` で自動 start を抑止 → jail.local 配置 → `systemctl start fail2ban`。すでに ban されていたら `fail2ban-client set sshd unbanip <ip>`。

## Evidence

2026-04-29 ServerManager Ubuntu 26.04 移行で実害発生。apt install fail2ban 直後に作業 PC が ban、SSH 不能。コンソールから unban + jail.local 書き直しで復旧。
