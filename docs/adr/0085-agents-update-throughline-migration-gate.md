# ADR 0085: agents-update Throughline migration gate

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `factory-master/fm-0645`
- Product decision: Throughline `docs/adr/0018-product-owned-database-migration.md`

## Context

`agents-update` はNPM製品を更新した後、factory reporterのread-only post-update gateを実行する。
ThroughlineのDB schemaが更新された場合、診断は旧schemaを変更せず`not_ready`にするため、利用者が
通常CLIを先に手動実行しない限り初回更新が失敗していた。

## Decision

1. `throughline` packageの更新処理直後に、製品所有入口 `throughline migrate --json` を実行する。
2. migrationは全NPM更新完了後へ遅延せず、更新されたThroughline CLIがPATHで解決された時点で行う。
3. exit非0、JSON schema不正、`error`状態、before/after version不整合は`agents-update`失敗とする。
   factory reporterは従来どおり実行して実状態を記録し、migration失敗をgreenへ丸めない。
4. `migrated`、`already_current`、DB不在の`not_applicable`だけを成功として受理する。
5. updater側はDBを直接開かず、SQLやschema versionを複製しない。migration所有者はThroughlineとする。

## Safety and validation

- shell回帰testはThroughline package処理より前・直後・factory reporter前の順序を固定する。
- migration command失敗が最終exit 1へ伝播することを固定する。
- 既存のpackage更新、toolchain ledger、factory reporter finalization契約は維持する。

## Rollback

本変更をrevertすると従来の更新順に戻る。DB schema downgradeやDB削除は行わない。schema更新前DBへの
復帰が必要な場合は、各hostの更新前backupと対応版Throughline packageを使う。

## Non-goals

- Lattice本体・Lattice repoの変更
- dotagentsでのThroughline SQL／migration実装
- migration失敗のsilent fallback
