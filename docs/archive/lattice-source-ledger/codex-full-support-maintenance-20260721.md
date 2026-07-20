# Codex full support maintenance source ledger

2026-07-21 の実火で検出した、dotagents 所有の非クリティカル欠陥を Lattice へ移管するための凍結台帳。

- [ ] `cf-0283`: `bin/codex-callout-hook.sh` の Stop pending が dirty→clean 遷移を通知する際、既に clean な現行 porcelain を再集計して「0ファイル／コミット0」と誤表示する。pending 作成時の変更path/countを保持するか cleanup 遷移を明示し、dirty→clean の最小再現と focused hook test で固定する。
- [ ] `cf-0284`: Spotter 1.4.26 の Windows native で spotter diagnostics logs --project <dotagents> --json が、過去ログ由来の文字化けした tool 名 Agent�E�Eubagent_type=Explore�E�E をJSON keyへ不正出力し、ConvertFrom-Json が文字位置42956付近で失敗する。最小再現を固定し、Spotter所有repoでserializerを修理してWindows focused testとdotagents cf-0150診断をgreenにする。
- [ ] `cf-0285`: Lattice 0.9.0 でrevision migrationにより `carry_reconciled_metadata` されたdone taskを `lattice todo reopen` すると、active journalに対象done eventがないため `STORE_INCONSISTENT: invalid_reopen_binding` で失敗する。dotagentsでは再現・影響・対象taskを追跡し、本campaignではLattice製品repoを変更しない。
