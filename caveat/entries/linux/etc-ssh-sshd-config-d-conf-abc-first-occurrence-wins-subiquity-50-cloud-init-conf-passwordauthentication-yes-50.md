---
id: etc-ssh-sshd-config-d-conf-abc-first-occurrence-wins-subiquity-50-cloud-init-conf-passwordauthentication-yes-50
title: '`/etc/ssh/sshd_config.d/*.conf` は ABC 順 first-occurrence-wins。Subiquity 生成の `50-cloud-init.conf` の `PasswordAuthentication yes` を覆すには 50 未満の番号で先置きする必要がある'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - openssh
  - ubuntu
  - cloud-init
  - subiquity
  - sshd_config
environment:
  os: ubuntu-server
  arch: x64
  node: 24.14.0
  installer: subiquity
  service: openssh
source_project: null
source_session: 2026-04-29T11:32:01.246Z/1d43468a125b
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

Ubuntu Server を Subiquity でインストールし「Allow password authentication over SSH」を有効にした後、後から `/etc/ssh/sshd_config.d/60-hardening.conf` 等に `PasswordAuthentication no` を書いたのに無効化されない。`sshd -T | grep passwordauth` を見ると `yes` のまま。

## Cause

`/etc/ssh/sshd_config` の最初に `Include /etc/ssh/sshd_config.d/*.conf` がある。OpenSSH の Include は **ABC 順** で読まれ、**最初に出現した値が勝つ**（first occurrence wins、上書きされない）。Subiquity が生成する `50-cloud-init.conf` が `60-hardening.conf` より先に読まれて `yes` を確定する。

## Resolution

50 より小さい番号のファイルで先置きする（例 `49-no-password.conf` に `PasswordAuthentication no`）。あるいは `50-cloud-init.conf` を直接編集する（cloud-init は再実行されないので上書きしても OK）。`sshd -T | grep -i passwordauth` で実効値を必ず検証。

## Evidence

2026-04-29 Ubuntu 26.04 Subiquity インストール後の SSH ハードニング作業で発生。60 番台に置いた設定が効かず、49 番に変えた瞬間に `sshd -T` で no が確定した。
