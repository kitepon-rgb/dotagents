# ADR 0091: cf-0021 CI修正後の最終受入

## 状態

受入済み（ADR 0090 の最終証拠を更新）

## 経緯

ADR 0090 で `cf-0021` を一度受け入れた後、GitHub CIが今回追加した
`tests/skills/smoke.sh` のShellCheck `SC2088` / `SC2016` 違反を検出した。focused smokeだけを
根拠に完了扱いせず、Lattice taskをreopenした。

## 修正

検査対象文字列の意味は変えず、次のようにShellCheck-safeへ直した。

- literal `~` は変数から組み立てる。
- Markdownのbacktickと `$skill` はdouble quote内で明示escapeする。

変更は `tests/skills/smoke.sh` だけで、修正commitは `0759b66`。

## 最終検証

- `shellcheck tests/skills/smoke.sh`: 成功
- `bash tests/skills/smoke.sh`: `skills smoke: OK`
- `make lint`: 全検査成功、markdownlint 174ファイル 0 error、Claude/Codex hook smoke green
- GitHub Actions CI run `29727917491`: success (`make ci` green)
- `git diff --check`: 成功

主要3 workflowの定義、正規入口、Claude固有入口の禁止範囲はADR 0090から変更しない。
本ADRを `cf-0021` の最終証拠とする。

## 非実施

- workflow skill本体の変更
- `audit-gauntlet` の復活
- Lattice製品またはLattice repoの変更
