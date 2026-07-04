---
id: sqlite-wal-bind-mount-wal-shm-journal-overlay-db
title: SQLite WAL モードのファイル単位 bind mount は `-wal`/`-shm`/`-journal` 補助ファイルが overlay 上に作られて DB が事実上分裂する
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker
  - sqlite
  - bind-mount
  - wal
environment:
  os: win32
  arch: x64
  node: 24.14.0
  container: docker
  db: sqlite
  mode: wal
source_project: null
source_session: 2026-04-29T11:32:49.660Z/6b52b18d2e91
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

SQLite DB を `./data.db:/app/data.db` のようにファイル単位で bind mount したコンテナで、書き込みがホストから見えない、コンテナ再起動でデータが巻き戻る、ホスト側 DB と中身が乖離する。SQLite が WAL モード (`PRAGMA journal_mode=WAL`) で動いているときに発生。

## Cause

SQLite WAL モードは DB 本体と同じディレクトリに `*.db-wal` `*.db-shm` `*.db-journal` の補助ファイルを作る。ファイル単位 bind mount だと DB 本体の inode は共有されるが、隣接して新規作成される補助ファイルはコンテナの overlay 上に作られる。SQLite はその overlay 上の WAL を「正本」として書き続けるため、最終 commit がホスト DB に伝わらず DB が分裂する。

## Resolution

ディレクトリ単位 bind mount に変更（`./data:/app/data`、その中に `auction.db` を置く形）。これで本体と補助ファイルが揃って同じ場所に作られる。既存運用ならホスト側で `sqlite3 db.sqlite "PRAGMA wal_checkpoint(TRUNCATE)"` で WAL をマージしてから移行。

## Evidence

2026-04-29 ServerManager auction-bot の DB 永続化方式見直しで顕在化。ファイル bind の挙動として SQLite 公式・コミュニティで広く既知。ディレクトリ bind 化で解消。
