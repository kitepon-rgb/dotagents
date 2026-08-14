# H release Control 記録の workspace drift

- 発生日: 2026-08-14
- Control: `grok-factory-application-20260814`
- H task: `gf05-h-release`
- Worker Run: `gf05-h-release-parent`
- operation digest: `64cfda31f2872fcc6fcccf59496cad119c1b2bedfaab23dc878b44324ac5020f`

## 事実

承認済み操作は完了した。`claude-spotter@1.5.10` と `throughline@0.9.1` は npm
`latest` と Mac global installへ反映され、GF05のGrok 4.6 read-only観測も完了した。
実測結果は[`GF05.md`](GF05.md)を正とする。

親がH Runを`completed`へ記録しようとした時、Controlは`WORKSPACE_DRIFT`の
`advanced HEAD changed task scope`で拒否した。H taskのread/write scopeを
`evidence/grok-factory-application`に置いたままadmitし、その後GF05証拠commitが同scopeを
更新したため、fixed writerのbaselineから見たHEAD advanceがControl契約に違反した。

## 回復裁定

- 外部操作を再実行しない。既存npm artifactの再publish、global installの再実行、追加Grokは行わない。
- 元のH Runは、外部操作の失敗ではなくControl結果相関の失敗として証拠付き`failed`へ終端する。
- 元のH taskは本decisionで取消記録し、成功扱いへ改竄しない。
- 現在のregistry、global install、installed predicate、GF05証拠をread-only Taskで検証し、外部結果の受入相関を閉じる。
- 製品コード、Aiterm、Claude/Codex向けHook契約は変更しない。
