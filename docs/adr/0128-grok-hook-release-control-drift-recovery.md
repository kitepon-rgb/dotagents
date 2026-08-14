# ADR 0128: Grok Hook releaseのControl drift回復

- 状態: Accepted
- 日付: 2026-08-14

## 決定

Grok Hook修理のnpm公開・Mac global install・Grok 4.6観測はGF05の実測結果として受け入れる。
一方、元のH Worker Runは、admit後に同Runのscope内へGF05証拠commitが入ったことで
`WORKSPACE_DRIFT`になったため、成功へ書き換えず`failed`で終端し、H taskを取消記録する。

外部操作は再実行しない。現在のnpm `latest`、global install、installed predicate、Aiterm完了receiptを
別のread-only Taskで検証し、その受入を外部結果のControl相関とする。

## 根拠

- [`../../evidence/grok-factory-application/GF05.md`](../../evidence/grok-factory-application/GF05.md)
- [`../../evidence/grok-factory-application/H-release-control-drift.md`](../../evidence/grok-factory-application/H-release-control-drift.md)
- 元H operation digest:
  `64cfda31f2872fcc6fcccf59496cad119c1b2bedfaab23dc878b44324ac5020f`

## 非決定

- Spotter、Throughline、Aiterm、Claude/Codex向けHook契約を追加変更しない。
- npm artifactの再publish、global installの再実行、追加Grokを行わない。
- PostToolUseFailure非dispatchをSpotter／Throughlineの欠陥へ付け替えない。
