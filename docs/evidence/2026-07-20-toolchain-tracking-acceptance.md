# 基盤toolchain 3製品のBugHub追跡受入

- 対象: `claude-code`、`codex-cli`、`grok-build`
- dotagents source HEAD: `fe80236`
- 契約受入: [ADR 0012](../adr/0012-toolchain-update-version-acceptance.md)
- 4 host実績: [ADR 0077](../adr/0077-r3-scheduler-rollback-canary-e2e-acceptance.md)

## 実装確認

- `factory-toolchain-ledger`は3製品を固定IDで別recordとして保存し、更新前version、
  latest、operation結果、更新後version、post-update gate、固定reason、観測時刻を保持する。
- Claude CodeとCodex CLIはnpm registryのexact SemVerを使い、Grok Buildは
  stable/internalのmachine-readable self-update契約を使う。
- factory v2 scannerはClaudeの必須hookとCodexのconfig parser・native routing・必須hookを
  個別検証し、toolchain ledgerを12製品full reportへ投影する。
- 1製品の更新失敗またはpost-gate failureは、その製品の`last_update` failureとして残り、
  他製品の成功では消えない。runnerの最終gateも非0になる。

## 検証

- 2026-07-20 focused test: 36 pass / 0 fail / 0 skip。
- 対象: toolchain contract、owner-only ledger、並行3製品record、factory v2 scan、
  v2 reporter、registry/schema drift、downgrade、Grok flag不整合、部分failure。
- ADR 0077でMac、main-server、FOX WSL2、FOX Windows nativeの最新v2 reportが
  schema 2.0・固定12製品で受理され、outboxなし、BugHub readiness greenを確認済み。

## 判定

基盤CLI 3製品のversion・更新結果・host／親別互換性は製品別に追跡され、
一部failureを全体成功へ丸めない受入条件を満たす。
