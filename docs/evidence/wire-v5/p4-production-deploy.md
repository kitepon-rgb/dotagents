# P4受入証拠 — 本番先行deployとcanary（H）

- 日付: 2026-07-25
- 対象: main-server（192.168.1.2）BugHub
- deploy revision: `ae78a5aef9502f8c4ba71e4c01f6192279de4287`

## wv5-0410 — 祖先確認

```
HEAD=ae78a5aef9502f8c4ba71e4c01f6192279de4287
git merge-base --is-ancestor HEAD origin/main → ✓ origin/mainの祖先
```

共通憲法「publish・本番deployの対象commitは所有repoの既定ブランチの祖先だけ」を
deploy前に機械確認した。AIShell 0.3.0とBugHubの2件で実害が出た経路であり、
今回は事前に通した。deploy前の本番revisionは`2242768`だった。

## wv5-0420 — backupとrollback set（H）

`deploy.sh --apply`がdeploy前に自動生成する。実在をserver上で確認した。

- SQLite backup: `data/backups/bughub-predeploy-20260724T225216Z.db`
- rollback set: `data/rollback/20260724T225220Z-47730/`
  - `db-snapshot`、`old-image`、`old-manifest`、`old-manifest-state`、
    `old-active-marker`、`old-active-marker-state`、`old-container-state`、`old-revision-mode`

## wv5-0430 — flag offでの先行deploy（H）

`FACTORY_V5_INGEST_ENABLED`をserverの`.env`へ**入れないまま**deployした。
未設定は`false`扱いなので、v5対応codeが載った状態でv5 endpointは閉じている。

dry-runは削除ゼロ・秘密混入なし・転送18ファイル。

deploy後の実測:

| 面 | 結果 |
|---|---|
| `/readyz` | `ready`、6 check全pass、`source_revision` = `ae78a5aef950`（revision_match） |
| `POST /api/factory/v5/reports` | **404**（flag未設定なので閉じている） |
| `POST /api/factory/v4/reports` | **401**（認証要求＝経路は生存。v4受理は継続） |

## wv5-0440 — flag onと本番canary（H）

`.env`をbackupしてから`FACTORY_V5_INGEST_ENABLED=true`を追記し、containerを再作成した。

| 面 | 結果 |
|---|---|
| `/readyz` | `ready`、6 check全pass |
| v2 / v4 / v5 endpoint | すべて**401**（3 majorが並存し、v5だけが新たに開いた） |

### 本番container内canary（DB書込みなし）

deployされた`/app/src/factory-contract.js`を本番container内で直接読み、validatorだけを実行した。

| 検査 | 結果 |
|---|---|
| deployed `V5_PRODUCT_IDS` = 13製品（`aishell`含む） | PASS |
| 固定12（v4）は不変 | PASS |
| 実v5 report（Mac実測）を受理 | PASS |
| 未知product（`observer`）を拒否 | PASS |
| `aishell`欠落を拒否 | PASS |
| `safe_context` allowlist外を拒否（`privacy.key_not_allowlisted`） | PASS |
| validation errorへpath値をechoしない | PASS |
| 非対応host（server profile / `not_applicable`）を受理 | PASS |
| v4受理の非回帰 | PASS |

**DB書込みは一切していない**。validatorのみを呼び、canary用の一時ファイルは
server / container 双方から削除した。

## rollback経路

- v5だけ止める: `.env`から`FACTORY_V5_INGEST_ENABLED`を除いてcontainer再作成。
  v4の受理・matrix・issueは変化しない（flagは独立）。`.env`のbackupも取得済み。
- revisionごと戻す: 上記rollback setと`deploy.sh`の`restore_previous`。
