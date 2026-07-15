# ADR 0007: Observer hook-config cross-repo受入receipt

## Status

Accepted。

## Receipt

- repo: `/Users/kite/Developer/Observer`
- Control: `observer-codex-host-runtime-20260715`
- implementation Task: `observer-hook-config-implementation`
- acceptance Task: `observer-hook-config-implementation-acceptance`
- code commit: `eb17841`（親Stop hookの設定fragmentを実装する）
- accepted contract commit: `88b71698fd50afefd7b18f3f6c85c719f9f9f9f1`
- immutable evidence: `docs/adr/0023-parent-stop-hook-config-cli.md`
- evidence SHA-256: `d683bc344cc82e13aaed65ec9e30979d45ecd1fe2a556f9b143757e4c9869ce3`
- Worker Report strict import: Control revision 28
- parent acceptance: Control revision 29
- Task finalization: Control revision 31／32
- accepted_at: `2026-07-15T06:25:35.319Z`

## Parent decision

Observer P3-4b1をdotagents adapterの受入済みupstream artifactとして採用する。dotagentsは
`observer.parent_stop_hook_fragment.v1`と`observer.parent_stop_hook_verification.v1`をconsumeし、
ObserverのMailbox、routing、renderを再実装しない。

このreceiptはfragment生成・read-only verifierの受入だけを示す。dotagents transaction、実HOME apply、
hook trust、Claude／Codex実火は未完了であり、成功へ含めない。
