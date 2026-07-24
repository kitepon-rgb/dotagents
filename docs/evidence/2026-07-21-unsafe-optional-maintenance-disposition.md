# 旧一括maintenance taskの終了裁定

- 日付: 2026-07-21
- 対象: `fm-0629`, `fm-0633`, `fm-0636`
- 結論: 現行工程から終了する。

## 裁定理由

### `fm-0629`

「GitHub側のみのrepo 20件超」という件数だけで対象inventoryが固定されていない。repoのarchive／削除は
repoごとの現役性、未push資産、stash、秘密、オーナー裁定を確認する必要があり、一括taskの実行は危険である。
廃止済み`codex-rc`はローカルで使用せず、GitHub履歴だけを残す既存裁定を維持するが、それを他repoへ一般化しない。

### `fm-0633`

旧archive文書でも「オーナー確認後」の任意項目で、対象repo、必要command、最小権限、rollbackが定義されていない。
包括的permission allowlistの横展開は現在の承認境界を弱めるため、実装しない。

### `fm-0636`

旧archive文書で任意項目として記録されたSmartClaude-UpdateToolsは、現行の工場コア製品でも
`agents-update`のcurated packageでもない。FOX Windows上の現役性を示す受入証拠もなく、古いtoolを
再導入する推測統合を行わない。

必要なrepo固有の終活、権限追加、更新対象追加が将来発生した場合は、具体的対象と現行契約を持つ
別の原子的taskとして扱う。
