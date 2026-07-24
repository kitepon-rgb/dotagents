# Codex external lanes execution acceptance — 2026-07-20

## Scope

Lattice `bughub-factory-integration/bf-0392`について、Codex親から利用するCodex Sidecar、aiterm、
別Codex、Grok、Composer、gpt-connectorの導入・登録・検証・実行証拠を再照合した。

## Capability state

| surface | installed / registered | verified | execution-verified |
|---|---|---|---|
| Codex Sidecar | 4 hostで0.3.8、CLI/core/MCP一致 | factory diagnosticsとauditor preset ready | 配布CLIのread-only review完了 |
| aiterm別Codex | 配布CLI経由 | 起動・terminal状態・transcript回収 | Terra×mediumのread-only診断を`agent_done`後に回収・close |
| aiterm Grok / Composer | 隔離tgzとregistry版 | 再認証要求なし、terminal receipt確認 | tgzで各2回、registry版で各1回を`agent_done`後に回収・close |
| gpt-connector | 4 hostでenabled、Mac 0.4.7 | diagnostics ready、official、authenticated | caller既知slugを1回consultし、別の新規Claude sessionから再送なしで回収 |

根拠はADR 0072、0073、0075、`docs/evidence/2026-07-20-gpt-connector-cross-parent-host-acceptance.md`、
およびarchive済みsource ledgerの当該実測記録である。timeoutや未回収を成功へ丸めた記録はなく、
Oracleや別providerへの暗黙fallbackもない。

## Writer boundary

Codex Sidecarのread-only external executionはexecution-verifiedだが、`codex_work` writer自体は未実証で
unverifiedのまま維持する。installed、registered、verified、execution-verifiedを一つのgreenへ潰さず、
writer利用を本taskのread-only証拠から許可しない。

## Decision

`bf-0392`が要求するconnector配線、状態区別、別Codex、Grok／Composer、Sidecar、gpt-connectorの
回収smokeは満たされている。writer未実証を明示した境界ごと受け入れる。
