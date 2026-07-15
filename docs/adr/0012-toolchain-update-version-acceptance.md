# ADR 0012: 基盤toolchain exact update契約の受入receipt

日付: 2026-07-16

## Status

Accepted。ADR 0011のnpm registry／Grok machine-readable update入力と、更新前後versionの
fail-closed契約だけを受け入れる。実host更新、publish、wire v2 Phase R1完了を本receiptから推測しない。

## Source evidence

- implementation commit: `fc3bf3f`
- implementation tree: `9aad82d2ea7074b74fc2e4fb9ab2529a929fae4e`
- decision path: `docs/adr/0011-toolchain-update-version-contract.md`
- decision git blob: `2cd1050cbe4b821fcea4ef895386ebe0f11eb38e`
- decision SHA-256: `71ea7fb55dabffe0d485c85b8fb27cfaf4ea05a882ba1ce0e3224d3a4540139e`

## Accepted contract

- npm latestはstdout全体をJSON parseしたsingle stringのstrict SemVerだけを受理する。schema drift、
  未知version、registry failureでは対象製品のinstallを開始しない。
- installed > latestは`downgrade_refused`として更新を開始せず、別製品の更新と最終factory reportを継続する。
- Grokはexact 7 keys、`installer=internal`、`channel=stable`、`error=null`、strict SemVer、
  current／latestと`updateAvailable`の整合をscanner／updater共通validatorで強制する。
- 更新後CLI消失、post-update schema／version不整合、部分失敗、PATH shadowを成功へ丸めず、
  owner-only toolchain ledgerとwire v2 scannerへ同じ固定reasonを投影する。

## Gate

- related Node: 17 PASS / 0 FAIL / 0 SKIP。
- updater fixture: `agents-update cron env: OK`。registry drift、未知version、downgrade、部分失敗、
  更新後CLI消失、PATH shadowを含む。
- static／distribution: `make lint-sh`、対象3 moduleの`node --check`、clean HOME install、
  `git diff --check` PASS。新CLIのextensionなしsymlinkを確認した。
- full `make ci`、実package update、network、credential、publish、deployは未実行。

## Queue transition

BugHub計画Wave 6.2の残TODOをDONEへ進める。factory master queue 9／Phase R1は継続し、
次のH不要な製品所有repo／adapter欠陥を依存順に選ぶ。
