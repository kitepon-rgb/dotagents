# Grok Hook 修理リリース承認

- 承認者: クオ（owner）
- 承認発言: `いいよ`
- 承認日時: 2026-08-14T08:41:33Z
- 目的: Grok の Hook で確認済みの unsupported no-op 修理を実効配布面へ届け、Aiterm 親からの Grok 4.6 観測を可能にする。
- 対象操作: `claude-spotter` 1.5.9 → 1.5.10 と `throughline` 0.9.0 → 0.9.1 を各正規 release gate 後に npm `latest` へ公開し、この Mac の global install を更新する。
- 影響: npm の公開 `latest` と `/opt/homebrew/lib/node_modules` の実効 Hook が更新される。Aiterm 本体、Claude/Codex 向け契約、その他の製品は変更しない。
- rollback: global install を `claude-spotter@1.5.9` と `throughline@0.9.0` へ戻し、npm の `latest` tag を旧版へ戻す。公開済み artifact は削除せず、必要なら forward fix する。
- 実行者: 親ベルのみ。円卓 Worker/Auditor は release 準備と敵対的監査まで。
- 実行後: global install の版と修理 predicate を確認してから、Aiterm 親が `grok-4.6` を read-only で1回だけ起動し、GF05 の Hook イベントを観測する。

## 操作の正規表現

```json
{"install":{"scope":"global"},"operation":"grok-hook-patch-release","packages":[{"from":"1.5.9","name":"claude-spotter","to":"1.5.10"},{"from":"0.9.0","name":"throughline","to":"0.9.1"}],"publish":{"registry":"npm","tag":"latest"},"rollback":{"claude-spotter":"1.5.9","throughline":"0.9.0"}}
```

- SHA-256: `64cfda31f2872fcc6fcccf59496cad119c1b2bedfaab23dc878b44324ac5020f`
