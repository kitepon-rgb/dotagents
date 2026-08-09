# t-hpkg H承認パッケージ準備 — 完了証跡

## 何を作ったか

- `docs/evidence/2026-08-10-peertable-wire-v7-H-approval.md`（新規）: オーナー承認が要る3件の
  承認要求文書。
  1. peertable npm publish（version bump）: 現在npm公開版は`0.3.5`のまま（2026-08-10実測、
     `npm view peertable version`）で、t-gateが導入したrelease gate（peertable repo commit
     `3f8b5af`）は未publish。`0.3.5`→`0.3.6`（patch、API/診断契約変更なし）を提案。
  2. BugHub/ServerManager wire v7 enroll + 4host cutover: `lib/factory/v7.mjs`（commit
     `9be1e94`）が実装済みのwire v7固定15製品を、server-first・dual-run・host別段階cutoverで
     実運用へ乗せる段取り。factory-reporter-runbook.md §4a/§6の既存rollback手順をv7へ適用する
     設計とした。
  3. 公開後smoke: 1・2実行後の実機確認手順（`peertable-client diagnostics --json`の
     `overall: ready`、wire v7 reporter dry-runのv6非回帰）。
  各項目にOperation contract（JSON）とOperation digest（SHA256）を付け、AIShell/Observer前例
  （`docs/evidence/2026-07-25-aishell-0.4.7-H-approval.md`・
  `docs/evidence/2026-07-25-observer-H-approval.md`）と同型のフォーマットにした。承認欄
  （owner statement/approved at/承認範囲）は未記入のまま、オーナー記入待ちとして残した。
  push恒久裁定の「自作コア10製品」句更新（t-docsが引き継いだ論点）は3件のOperation digestに
  含めず、範囲外として明記した。

## どう確認したか

- **実行は一切していない**（受入条件どおり）。npm publish・server deploy・feature flag変更・
  host cutoverのいずれも本taskでは実行せず、承認要求文書の作成とroom報告だけで閉じた。
- peertable repo実物を確認: `grep '"version"' package.json`→`0.3.5`、
  `git log --oneline -10`→`3f8b5af`（release gate導入）が最新published tag相当
  （`41082a5 peertable 0.3.5の公開完了を記録`）の1つ先で未publish状態にあることを確認。
- `deploy/compose.yaml`を読み、main-server enroll対象（`192.168.1.2:18860`、
  host matrix記載と一致）を確認した上でOperation contractのhost一覧に反映。
- Operation digestはpython3 hashlib.sha256でJSON文字列から算出し、文書内の値と一致することを
  再計算で確認。
- 承認要求文書のフォーマットは既存H承認2件（aishell 0.4.7、Observer）を実際に読んで踏襲した
  （見出し構成・Operation contract/digest・目的/影響/rollback節）。

## スコープについて

- t-hpkgのtask記述「publish・wire v7 enroll・cutover・公開後smokeの承認要求文書（実行しない）」
  に厳密に一致させた。承認要求文書の作成そのものはH操作ではない（実行を伴わない）ため、
  親への事前承認確認なしに作成した。

記録者: tsumugi
