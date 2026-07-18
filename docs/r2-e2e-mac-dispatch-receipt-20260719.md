# R2 Mac Codex native dispatch receipt（2026-07-19）

- Control: `r2-host-rollout-20260718`
- Task: `r2-mac-apply-config-entrypoint-docs-20260719`
- Worker Run: `r2-mac-apply-config-entrypoint-impl-20260719`
- Executor: `codex-native@v1`
- Agent path: `/root/routing_smoke_impl`
- Dispatch: routing smoke合格済みの同一agent pathへ `followup_task` で実作業を送信済み。
- Packet: `/tmp/dotagents-r2-host-rollout-20260719/r2-mac-apply-config-entrypoint-impl-20260719.packet.json`
- Worker Report skeleton: `/tmp/dotagents-r2-host-rollout-20260719/r2-mac-apply-config-entrypoint-impl-20260719.report-skeleton.json`
- 保存先訂正: Controlディレクトリ配下の未知entryは `STATE_PATH_UNSAFE` でfail closedするため、内容不変でControl外の一意pathへ移した。
- 禁止事項: branch切替、commit、push、merge、rebase、reset、stash、revert、H操作、`--apply`。
