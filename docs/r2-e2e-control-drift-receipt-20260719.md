# R2 Mac Control workspace drift receipt（2026-07-19）

- Control: `r2-host-rollout-20260718`
- Task: `r2-mac-apply-config-entrypoint-docs-20260719`
- Worker Run: `r2-mac-apply-config-entrypoint-impl-20260719`
- Outcome: failed（実装差分の失敗ではなく、Control workspace baselineの不一致）

## 再現

1. Run予約時、`docs/r2-e2e-mac-receipt-20260719.md` はuntrackedでbaseline fingerprintへ記録された。
2. Worker稼働中、親が非交差のMac receipt 2件だけをpathspec commitした。
3. Worker Reportのschema修正後、`worker-report-import` は `WORKSPACE_DRIFT: worker report changed paths do not match workspace scope` を返した。

## 原因と裁定

非交差commit自体ではなく、予約時にuntrackedだったreceiptがtrackedへ状態遷移したため、baselineとの差がTaskの4pathだけにならなかった。Reportの`changed_paths`へ親receiptを偽装追加せず、旧Runをfailedで終端する。

検証済みの4pathは親の対象限定commitで収容する。その後、同一Taskへ新しいretry Runを作り、clean baselineからno-edit検証と空`changed_paths`のstrict Worker Reportを回収して受入を裁定する。

checkout、stash、reset、履歴改変、Report相関の緩和は行わない。
