---
id: docker-exec-e-key-val-ps-aux
title: '`docker exec -e KEY=VAL` の値はホスト側 ps aux に平文で見える（パスワード渡しのアンチパターン）'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker
  - security
  - argv-leak
  - ps
  - secrets
environment:
  os: linux
  arch: x64
  node: 24.14.0
  container: docker
source_project: null
source_session: 2026-04-29T13:28:52.265Z/ba590bf4b77e
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

コンテナ内コマンドにパスワードを渡すために `sudo docker exec -e MYSQL_PWD=$pw <container> mariadb-admin ping` のように書いたら、host の `ps aux | grep docker` でパスワードが平文表示される。`/proc/<pid>/cmdline` でも見える。

## Cause

`docker exec` は host 側のコマンド呼び出しで、`-e` に続く引数はシェル展開された後に host 側プロセスの argv に乗る。docker daemon を経由してコンテナ内に env を注入するが、注入前の host 側プロセスの argv は他ユーザー (同マシン上の任意のユーザー) からも `ps` で観測可能。コンテナ内の `printenv` には正しく届くが、その経路は host を通る。

## Resolution

パスワードは host argv に乗せない: (a) コンテナ内に既に env が定義されているなら `docker exec ... sh -c 'CMD --pwd="$VAR"'` で**コンテナ内側で展開**（single quote で host 側 shell 展開を抑止、host argv には `$VAR` の literal 文字列のみ表示）、(b) `docker exec --env-file /path/in/container/.env ...`、(c) パスワード認証自体を avoid して socket auth や cert auth に切り替える。

## Evidence

2026-04-29 ServerManager の nextcloud-db-1 ヘルスチェックを `-p${pw}` から `-e MYSQL_PWD=${pw}` に変更したところ code-reviewer が同じ問題を指摘。`sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mariadb-admin ping'` への再変更で host argv 露出を解消。
