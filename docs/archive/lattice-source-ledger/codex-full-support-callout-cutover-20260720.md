# Lattice ToDo archive
Plan: codex-full-support
Batch: codex-full-support-callout-cutover-20260720
Revision: 556a643b85fdfcbc1da0917cdc83b4f65e8f980edec808afed2003a311c9f7dd

- [ ] `make ci` → 対象端末の `./install.sh --profile <official|legacy>` / config dry-run/apply / 同じ profile を指定した `./bin/verify-install.sh --profile <official|legacy>` → pathspec コミット → オーナー GO → push（実端末 apply は H1 待ち）
- [ ] 知識還流（caveat/rag）・プラン正本のチェック消化
- [ ] 他端末波及チェックリスト（pull → `./install.sh --profile official` → Claude `settings.json` 断片マージ / Codex applier の dry-run→承認済み apply → `./bin/verify-install.sh --profile official` → 実火1件）— 全端末済みでプランを archive へ
- [ ] **WSL2 interop 安全化**: `apply-codex-config` が書く hook command を interpreter 明示起動
