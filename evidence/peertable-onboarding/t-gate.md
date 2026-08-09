# t-gate peertable release gate導入 — 完了証跡

- 再スコープ（2026-08-10 note）どおり、台帳要求「publish対象は既定ブランチの祖先だけ」の機械gateをpeertable repoへ導入した。`prepublishOnly`診断gate（決定45）は0.3.x系で導入済みのため、本taskは祖先検証gateの追加とdiagnosticsとの連結のみ。
- 実装（peertable repo・独立commit `3f8b5af`・push済み）: `scripts/verify-release-commit.mjs` をaishell `scripts/verify-release-commit.mjs`（read-onlyで参照。aishell側は無変更）から移植。`package.json` に `verify:release-commit` を追加し、`prepublishOnly` を `verify:release-commit && diagnostics` の連結へ更新。
- 実測（2026-08-10）:
  - コミット前（dirty tree）: 実行するとworking tree差分を検出しfail — 意図どおり。
  - commit直後・push前: `origin/main の祖先ではありません` でfail — 意図どおり（未着地検知）。
  - `git push origin main` 後: `release commit 3f8b5af83c5a is landed on origin/main.` でexit 0。
  - `npm run prepublishOnly` フルチェーン: verify → diagnostics（`overall: ready`）まで通りexit 0。
  - スクリプト単体の分岐網羅（tmpの使い捨てgit repoで実行・非コミット）: 着地済clean→pass／未着地commit→fail／再push後→pass／untrackedファイル→fail／gitignore済みファイル→対象外でpass、全5ケースとも意図どおり。
- 不可侵原則の確認: aishell repoは無変更（read-onlyで読んだのみ）。peertableの単体成立は壊していない（新規依存追加なし、既存diagnostics契約は無変更）。version bump・npm publishは実行していない（H承認待ちのまま）。
- 記録者: hinata。
