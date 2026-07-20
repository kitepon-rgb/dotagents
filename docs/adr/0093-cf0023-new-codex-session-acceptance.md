# ADR 0093: cf-0023 新規 Codex session 最終受入

## 状態

受入済み

## Decision

ADR 0092で定めた6面を、Macの正規Codex CLIから開始した新規session
`019f7ebb-200a-79f2-9d08-075a221b12ca` で直接観測したため、Lattice task `cf-0023` を完了とする。

| 受入面 | 直接観測結果 |
|---|---|
| 規範 | repoの`AGENTS.md`を読み、人格「ベル」、日本語応答、Lattice工程正本、廃止済み`codex-rc`不使用を応答へ反映 |
| skills | 配布済み`gpt-connector`を可視化し、`SKILL.md`全文読了後に明示選択 |
| subagents | native sorter `/root/cf0023_sorter_routing_smoke` を`fork_turns=none`で起動し、同じ子へのfollow-upも成功 |
| hooks | SessionStartのdocs plan・active Control・Lattice工程案内と、UserPromptSubmitの統括レーン案内をsession内で観測 |
| 必須MCP | `gpt_connector.diagnostics`、`caveat_search`、Lattice提供`codegraph_status`が各1回成功 |
| session継続 | 同じthread IDをresumeし、`CF0023_TURN1`から`CF0023_TURN2`、さらに`CF0023_TURN3`へ記憶を維持 |

親rolloutのSHA-256は
`342948c783878a1378347836c755e0da552be1992059b8198e703dffaab4b182`、
native sorter rolloutのSHA-256は
`ab24e7b002668505de38631e384b74e11674766e57de0b0206c5d480d623724b`。

## Routing verifierの扱い

新規sessionはread-only sandboxで動かしたため、`verify-codex-agent-routing`そのものはshellの
here-document用一時ファイルを作れず失敗した。同じ配布scriptの検証本体をstdinから実行し、
`sorter / gpt-5.6-luna / low / read-only / developer_instructions applied`をgreenとした。
これは検証内容のfallbackではなく、同一検証本体に対するread-only互換の実行方法である。
親session側の正規script実行も別途greenを完了条件とする。

## dotagents所有設定の修正

初回turnとresume turnで、`~/.codex/config.toml`に旧`codex_hooks = true`と現行`hooks = true`が
併存し、Codex CLIが非推奨エラーを出した。`apply-codex-config.sh --dry-run`で1行削除だけであることを確認後、
同scriptの`--apply`で旧キーを除去した。事前backupは
`/Users/kite/Archives/dotagents-codex-config-20260720T090053Z.tar.gz`。
適用後dry-runは差分なし、`verify-install --profile official`はgreen、同一threadの第3 turnでは
`codex_hooks`非推奨エラーが消失した。

これはdotagents所有の設定projectionを正規適用器で収束させたものであり、Lattice製品・repoは変更していない。

## 境界

- 全現役入口・全hostは`cf-0026`、全skillは`cf-0106`、Throughlineのcapture/restore/handoffは`cf-0125`が所有する。
- models cacheの`supports_reasoning_summaries`欠落は既存task `fm-0653`の所有であり、本taskでは修理しない。
- `sprite-forge` HTTP 501とplugin manifest/icon警告は第三者面で、dotagentsのToDoへ登録しない。
- hookの注入結果は観測したが、hook processのexit statusそのものは観測していない。
- Lattice本体は変更していない。廃止済み`codex-rc`は利用・探索・復活のいずれも行っていない。

## 検証

- 新規Codex sessionの3 turnがすべてexit 0
- native sorter起動と同じ子へのfollow-upが成功
- 必須3 MCPのread-only操作が成功
- `apply-codex-config.sh --dry-run`: 適用後差分なし
- `verify-install.sh --profile official`: green
- 親sessionの`verify-codex-agent-routing`: green
- `make lint`、`git diff --check`、GitHub Actions CIを最終gateとする

## Rollback

repo上の受入記録は本ADRを追加したcommitのrevertで戻せる。端末設定は上記tar backupから
`~/.codex/config.toml`を復元できる。ただし旧`codex_hooks`は非推奨キーのため、通常は復元しない。
