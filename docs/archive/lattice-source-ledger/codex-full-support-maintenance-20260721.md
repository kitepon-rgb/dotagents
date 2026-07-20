# Codex full support maintenance source ledger

2026-07-21 の実火で検出した、dotagents 所有の非クリティカル欠陥を Lattice へ移管するための凍結台帳。

- [ ] `cf-0283`: `bin/codex-callout-hook.sh` の Stop pending が dirty→clean 遷移を通知する際、既に clean な現行 porcelain を再集計して「0ファイル／コミット0」と誤表示する。pending 作成時の変更path/countを保持するか cleanup 遷移を明示し、dirty→clean の最小再現と focused hook test で固定する。
