# dotagents remote同期・BugHub計画archive証拠

- 日付: 2026-07-21
- 対象repo: `kitepon-rgb/dotagents`
- 対象タスク: `fm-0644`, `bf-0498`, `bf-0045`および`fm-0641`の子計画archive条件

## 実施結果

- オーナーはLatticeとAIShellを除く作業を明示承認した。この承認に基づき、dotagentsの12個の独立コミットを`main`へpushした。
- push結果は`c9f0fda..db7d377  main -> main`で成功した。
- push直後、ローカル`HEAD`と`origin/main`は`db7d377`で一致した。
- BugHub factory integrationの最終gate `bf-0497`は、`docs/evidence/2026-07-21-bughub-final-reconciliation.md`を証拠として完了済みである。
- 生きた計画`docs/plan_bughub-factory-integration.md`を`docs/archive/plan_bughub-factory-integration.md`へ退避した。
- 全タスクが終了した旧メモリ昇格queueを`docs/archive/queue_memory-promotion.md`へ退避した。
- ユーザー所有の未追跡`docs/evidence/fixtures/`は読取・変更・stageの対象外とした。
- Lattice製品repoとAIShellには書き込んでいない。

## rollback

remoteへ公開した履歴は改変しない。取り消しが必要な場合は、対象コミットまたはarchive移動を独立したrevertコミットで戻す。

## 完了記録の同期

本証拠とarchiveを先に独立コミット・pushし、その後にLattice工程の完了イベントを別コミット・pushする。これにより、完了イベントだけがremote未同期になる自己参照残件を残さない。
