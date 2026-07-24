# cf-0165 計画アーカイブ

- 実施日: 2026-07-21
- 対象: `codex-full-support/cf-0165`
- 結論: Codex全対応計画を`docs/archive/`へ移し、生きた文書の参照と状態表記を更新した。

## 変更

- `docs/plan_codex-full-support.md`を`docs/archive/plan_codex-full-support.md`へ移動
- アーカイブ先へLattice storeが現行状態の正本である旨を追記
- `README.md`、`docs/plan_factory-master.md`、`docs/r2-e2e-checklist.md`の現行参照をarchiveへ更新
- 既存Lattice証拠の内容とdigestは変更していない

## 検証

- 生きた文書一式のmarkdownlint: 0 issues
- archive専用の一時設定で`docs/archive/plan_codex-full-support.md`を明示検査: 1 file、0 issues
- `git diff --check`: exit 0
- 旧パス不存在、新パス存在: 確認済み
- `git status --short`: 本作業のLattice journal更新とユーザー所有の未追跡`docs/evidence/fixtures/`だけを残した

Lattice製品repoは変更していない。廃止済み`codex-rc`は利用していない。
`docs/evidence/fixtures/`は未読・未変更・未stageである。
