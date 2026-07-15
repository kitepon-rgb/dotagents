# ADR 0019: R1 local closureの反証結果

日付: 2026-07-16

## Status

Rejected closure。ADR 0012〜0017の製品／ローカル修正receiptは維持するが、ADR 0018が主張した
factory v2 adapter受入と、BugHub自己監視をH-only残件とする分類は採用しない。R1を閉じず、
下記2件のH不要TODOを先に完遂する。

## Surviving findings

### P1: auditor presetをfactory adapterが名前で検証しない

- Spotter callerは`--preset auditor`を必須指定する。
- dotagents scannerは`factory-diagnostics --project <cwd>`だけを実行し、Sidecar既定のreview dry-runを許す。
- adapterはpreset集約件数と任意workflowしか検査しないため、`auditor`削除・改名・誤配線でもgreenになり得る。
- scannerから`--preset auditor`を渡し、`readOnlyDryRun.workflow=auditor`をexactに固定し、negative fixtureを追加する。

### P1: Pi5 bridge/tickerの版管理済みsource receiptがない

- dotagentsのtracked sourceはmain-server側external-event connectorを所有するが、Pi5 bridge/ticker本体は含まない。
- 配布済みという計画記録だけでは、再配布、rollback、`run(deps)` fixtureの所有境界を再現できない。
- 所有repoのimmutable commit/pathを特定して受け入れるか、未収録なら所有repoへsourceとfixtureを収録する。

## Gate impact

- ADR 0018の`.codex-sidecar.yml`実在、Spotter caller一致、Sidecar 0.3.7 direct diagnostics greenは有効。
- ADR 0018の「factory v2 adapterのlocal契約を受け入れた」という結論は本ADRでsupersedeする。
- R1 full `make ci`はMarkdown lint修復後greenだが、欠けたnegative契約を証明しないためclosure根拠にはしない。
- R1は上記2件のfocused／related gateと後続receiptまで未完のまま維持する。

## Audit provenance

Codex native `refuter`（routing verified: refuter／gpt-5.6-sol／high、developer instructions applied）へ
一回だけ独立反証を依頼した。P0なし、上記P1 2件がreal／worth-itとして生存した。
