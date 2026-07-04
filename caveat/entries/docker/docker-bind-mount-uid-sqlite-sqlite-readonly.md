---
id: docker-bind-mount-uid-sqlite-sqlite-readonly
title: Docker bind mount UID不一致でSQLiteがSQLITE_READONLYクラッシュループ
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - docker
  - sqlite
  - bind-mount
  - uid
  - permissions
  - crash-loop
  - sqlite-readonly
  - monitoring-blind-spot
environment:
  os: Ubuntu Server 26.04 LTS
  arch: x64
  node: 24.14.0
  runtime: Docker rootful
  lang: Node.js + better-sqlite3
  mount_type: bind directory
source_project: null
source_session: 2026-04-30T09:57:12.934Z/c218bdf0055b
created_at: 2026-04-30
updated_at: 2026-04-30
last_verified: 2026-04-30
---

## Context

SQLite + Docker bind mount + 任意のホスト OS の組み合わせで発生する一般的な罠。

特に踏みやすい状況:
- Dockerfile の base image を変更した（Alpine → Debian など、デフォルト USER の UID が変わる）
- Dockerfile に明示的に `USER` を追加した／削除した
- ホスト側の bind mount dir をユーザーが手動で作成した（自分の UID で chown される）
- ファイル単位 bind mount からディレクトリ単位 bind mount に移行した直後（後者は dir 権限が顕在化する）
- 監視が「コンテナが running か」だけ見ていて RestartCount を見ていない

SQLite 以外でも、補助ファイルをディレクトリ内に作るタイプのストレージ（LMDB, RocksDB, ファイルロック系）で同種のトラップが起こりうる。「ファイルは書けるのにディレクトリが書けない」という非対称が問題の本質。

## Symptom

SQLite を使うアプリが Docker コンテナで動作中、起動直後（DBの初回書き込み時）に以下で例外を投げて exit 1 する。Docker `restart: always` がこれを連続再起動させ、約10〜15秒周期のクラッシュループになる:

```
[Error: SQLITE_READONLY: attempt to write a readonly database] {
  errno: 8,
  code: 'SQLITE_READONLY'
}
```

DB ファイル単体には rw 権限があり、ホスト側からは普通に書ける状態なのに発生する点が紛らわしい。60秒間隔の `docker ps` 監視ポーリングは `state=restarting` の遷移（1秒未満）を取りこぼすため、`Up Less than a second` のような瞬間的な状態を稀にしか捕捉できず「監視は正常」と誤判定しやすい。`RestartCount` の増分を見ないと気付けない。

## Cause

**コンテナ内のプロセス実行 UID と、ホスト bind mount 元ディレクトリの所有 UID が不一致**。

SQLite は更新時に `auction.db` 本体だけでなく `auction.db-journal` / `auction.db-wal` / `auction.db-shm` といった補助ファイルを **ディレクトリ内に作成** する必要がある。したがって SQLite を書き込みモードで開くには、ファイルの rw 権限ではなく **ディレクトリへの書き込み権限** が必須。

例:
- ホスト `/home/kite/auction-bot/data/` 所有者: `kite:kite` (UID 1000)、permission `drwxrwxr-x` (775)
- コンテナ内プロセス: `uid=100(app) gid=101(app)`
- 結果: コンテナ内ユーザーは「その他」扱い。`drwxrwxr-x` の other ビットは r-x のみで w なし → ディレクトリへ書き込めない → SQLite が補助ファイル作成失敗 → `SQLITE_READONLY`

DB ファイル単体が `-rw-rw-rw-` (666) でも、**ディレクトリが書けないと SQLite は「readonly」と判定する**。これが「ファイル権限は OK なのに readonly」と見える混乱の根源。

## Resolution

**コンテナ実行 UID とホスト dir 所有 UID を一致させる**。3 つのアプローチ:

1. **Dockerfile 側を合わせる**（推奨、再現性高い）
   `USER node` (Alpine/Debian の組込み node ユーザーは UID 1000 が標準) のようにホストと同じ UID/GID で動かす。今回の auction-bot 復旧はこの経路。

2. **ホスト側の所有者を合わせる**
   `sudo chown -R 100:101 /home/kite/auction-bot/data/` のようにコンテナ UID に合わせる。応急処置として速い。

3. **ホスト dir を 777 にする**
   楽だが他ユーザーからも書ける状態になるため非推奨。

確認手段:
```
docker exec <container> id
ls -la /path/to/host/bind-dir
docker exec <container> sh -c "touch /app/data/.write-test && rm /app/data/.write-test"
```

3つ目の `touch` テストが Permission denied なら確定。

**ガード**: Dockerfile で `USER` 行を変更したら、ホスト bind mount dir の所有 UID も同時に揃えること。逆も同じ。CLAUDE.md / README 等の運用文書に「コンテナ UID とホスト dir UID は一致必須」を不変条件として明記しておくと、将来同じ罠を踏みづらくなる。

## Evidence

2026-04-30 18:27 JST、ServerManager (kite_) で実害発生。auction-bot コンテナ (Dockerfile が一時的に `USER app` UID 100 になっていた) が SQLITE_READONLY でクラッシュループ。

確認した観察事実:
- `sudo docker inspect auction-bot` → RestartCount 増加、Status: restarting
- `sudo docker exec auction-bot id` → `uid=100(app) gid=101(app)`
- `ls -la /home/kite/auction-bot/data/` → `drwxrwxr-x 2 kite kite` (UID 1000)
- `sudo docker exec auction-bot touch /app/data/.write-test` → `touch: /app/data/.write-test: Permission denied`
- `sudo -u kite test -w /home/kite/auction-bot/data/` → YES（ホスト側からは書ける、つまりホストの権限は壊れていない）

修復: 子プロジェクト (HIT Auction System) の Dockerfile を `USER node` UID 1000 に戻して 2 コミット push、コンテナを再起動 → RestartCount 0、healthy、auction.db への書き込み再開。

参考コミット: ServerManager `c796fdb` (CLAUDE.md §10 強化)、logs/2026-04-30.md にインシデント記録。
