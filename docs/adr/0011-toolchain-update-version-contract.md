# ADR 0011: 基盤toolchainのversion/update入力をexact contractへ固定する

日付: 2026-07-16

## Status

Accepted for implementation。実registry installやGrok updateは起動せず、fake CLI／fake registry fixtureだけを本Taskで扱う。

## Context

`agents-update`はnpm `view --json`の出力から正規表現で最初のsemverを拾うため、object、未知field、人間向け文に
埋め込まれたversionをlatestとして受理できる。またGrok checkはexact key数を確認する一方、installerを任意文字列、
non-null errorを正常、current／latestと`updateAvailable`の矛盾やdowngradeを許す。

2026-07-16のread-only実測ではGrok Build 0.2.99が次を返した。
`currentVersion=0.2.99`、`latestVersion=0.2.101`、`updateAvailable=true`、`installer=internal`、
`channel=stable`、`autoUpdate=null`、`error=null`。

## Decision

1. Claude Code／Codexのnpm latestは、stdout全体をJSON parseした単一stringのexact semverだけ受理する。
   object、array、複数JSON、人間向け文字列、未知versionではinstallを開始せず`registry_unavailable`で非0にする。
2. installed versionがlatestより新しい時は`@latest` installを開始せず`downgrade_refused`で非0にする。
   installed不明かつlatest既知は欠損修復としてinstallを許す。別製品の更新と最終factory reportは継続する。
3. Grok checkはexact 7 keys、strict semver、`installer=internal`、`channel=stable`、`error=null`、
   `autoUpdate=null|boolean`を要求する。current < latestの場合だけ`updateAvailable=true`、同値の場合だけfalseを許す。
   current > latestはdowngradeとして拒否する。
4. update後はcurrent=latestかつ`updateAvailable=false`だけ成功とし、CLI消失、schema drift、partial updateを
   successへ丸めない。
5. validatorはfactory scannerとshell updaterから同じlibrary／CLIを使い、二つの近似実装を維持しない。

## Acceptance

- shared validatorのschema／semantic focused testを先に追加する。
- updater fixtureでinvalid registry、downgrade refusal、post-version missing、partial failure、PATH shadowを固定する。
- scanner fixtureで同じGrok inputのpass／unverified写像を固定する。
- related gateはTODO完了候補で一回、full `make ci`はPhase R1 gateまで実行しない。
