# cf-0150 Spotter cross-host progress — 2026-07-21

## Scope

Lattice `codex-full-support/cf-0150` の途中受入として、dotagents projectに対する
Spotter 1.4.26 の正規 `spotter install -y`、marker、Claude/Codex hook、host別catalog、
Throughline auditor context、`spotter.hook_event.v1` の実火を4 hostで確認した。

Latticeは工程storeとしてだけ利用し、Lattice製品repoは変更していない。廃止済み
`codex-rc`も利用・探索していない。

## Result

| host | install / doctor | marker / context | Spotter hooks | local catalog | hook ledger |
|---|---|---|---|---|---|
| Mac | `spotter install -y`、doctor 0 warnings | v2 / Throughline default | Claude 5、Codex 3 | Claude 140、Codex 109 | 6,778 events、Claude 5,861 / Codex 917、parse error 0 |
| main-server | 同上、doctor 0 warnings | v2 / Throughline default | Claude 5、Codex 3 | Claude 64、Codex 46 | 97 events、Claude 53 / Codex 44、parse error 0、runtime error 0 |
| FOX WSL2 | 同上、doctor 0 warnings | v2 / Throughline default | Claude 5、Codex 3 | Claude 159、Codex 44 | trust前46件から、remote TUIで10 hookをtrust後49件へ増加。Codex SessionStart / UserPromptSubmit / Stop各1件、parse error 0、runtime error 0 |
| FOX Windows native | install成功 | v2 / Throughline default | Claude 5、Codex 3 | installで両catalog更新 | 現在19件はClaude SessionEndのみ。Codex新規sessionは`cf-0092`の基盤toolchain blockerが残る |

FOX WSL2では親がremote Codex TUIを直接操作し、project trustと表示された10 hookの
`Trust all and continue`をH承認の範囲で実行した。続くread-only promptは
`CF0150_WSL_TRUSTED_HOOK_OK`を返し、Spotter runtimeに次の3 eventが記録された。

- `SessionStart`: `refresh_spawned`
- `UserPromptSubmit`: `skipped` (`context_not_fresh`)
- `Stop`: `skipped` (`short_final_no_tools`)

statusがskipでも、3 hookのcommand実行と`spotter.hook_event.v1`記録自体は直接観測済みである。

## Remaining blocker and maintenance finding

FOX Windows nativeのCodex新規sessionは、既存Lattice task `cf-0092`に記録済みの
Codex CLI models cache schema errorにより未受入である。基盤toolchain本体はdotagentsの
修理対象外なので、`cf-0150`全体をgreenへ拡張しない。

加えてWindowsの
`spotter diagnostics logs --project C:\Users\kite_\Documents\Program\dotagents --json`
は、過去ログ由来の文字化けしたtool名
`Agent�E�Eubagent_type=Explore�E�E`付近で閉じquoteを失ったJSONを出力し、
PowerShell `ConvertFrom-Json`が文字位置42956付近で失敗した。marker・hook install・raw ledger
自体とは別のSpotter serializer欠陥であり、`cf-0284`としてmaintenance queueへ分離する。

## Acceptance boundary

この証拠でMac、main-server、FOX WSL2の`cf-0150`要件は直接受入できる。FOX Windows nativeの
Codex `spotter.hook_event.v1`実火が欠けるため、`cf-0150`は完了扱いにしない。
