# ADR 0127: peertableはwire v7の固定15製品目として編入する

- **状態:** Accepted
- **日付:** 2026-08-10
- **対象:** dotagents reporter、ServerManager / BugHub ingest、peertable adapter
- **関連:** [ADR 0124](0124-wire-v6-observer-enrollment.md)、[wire v7設計](../wire-v7-design.md)、[編入記録](../archive/2026-08_peertable-onboarding.md)

## Context

peertable（対等メンバー並列型のマルチエージェント円卓。npm `peertable`）を工場管理の
12製品目（自作コア11製品目）として編入することがオーナー裁定で決まった。peertableは
dotagentsが無くてもnpmから利用者へ届く独立製品であり、編入はdotagentsが統合契約だけを
持つことを意味する。

現役wire v6は固定14製品の完全報告契約で、clientとserverがexact-key検証を行う。v6を同じ
versionのまま15製品へ変更すると、既存client、server、fixture、保存済み証拠の意味を破壊する
（Observer編入時にv5へ足さずv6を起こしたのと同じ理由）。

peertableはroom serverという常駐面を持つが、これはSpotter hub・Lattice MCP・ServerManager等で
既出であり、peertable固有の新設計を要する論点ではない。LAN room の到達性と製品自体の健全性を
結合させると、room が落ちている端末やLAN外の端末でclientまでfailに丸まる。

## Decision

1. peertableはwire v7の固定15製品目`peertable`として編入する。
2. v7はv6の14製品順序を維持し、末尾へ`peertable`を加えた完全報告契約とする。
3. v6のschemaとendpointは変更せず、cutover期間中はv7と並存させる。**host別段階cutoverの途中は
   v6とv7が同時に現役であることが正常**であり、v6を凍結扱いにしない。
4. version入口は`peertable-client diagnostics --json`の`product.version`とする。peertableは
   `--version`フラグを持たず、`package.json`と`room/client.mjs`の`MCP_VERSION`の一致は製品側の
   `version_consistency` checkが機械検出する（drift検出を消さないため、後者を前者から読む形にしない）。
5. adapterはscan時に常に`PEERTABLE_URL=''`で`room_reachability`を`not_applicable`へ倒し、
   LAN room到達性を工場健全性判定へ結合させない（ServerManager server profileパターンの踏襲）。
6. adapterは`peertable-client diagnostics --json`の公開schemaだけを使い、room DB、member state、
   message本文、投稿token、room URLを読まず送らない。
7. `skill/`はpeertable repoが所有しnpm同梱で配る。dotagentsの`claude/skills/`や`install.sh`へ
   複製・移設しない（編入は融合ではない）。
8. v7はserver-firstで実装し、独立feature flag（`FACTORY_V7_INGEST_ENABLED`）、dual-run、
   host別cutover、host別v6 rollbackを必須とする。

## Consequences

- client、server、fixture、runbook、host matrixは同じ固定15製品集合へ同一waveで更新する。
- v6はpeertableを報告しないため、rollback後も既存14製品の意味が変わらない。
- 新しいwire majorのbinを足したwaveは、対象端末での`./install.sh`再実行までがcutover手順になる
  （symlink未配布だとscheduler jobが`Cannot find module`で落ちる。2026-08-10実被弾）。
- peertableのplatform拡大やruntime error projectionは別の製品決定なしに追加できない。
- peertableは自作コア製品となったため、push恒久裁定（PLAN.md原則2・共通憲法git鉄則）の対象に入る。

## Rejected alternatives

### v6へpeertableを後付けする

同一versionのschema変更になり、既存clientとserverのexact-key契約を破壊するため棄却する。

### peertableをLatticeへ内蔵する

2026-08-08に検討されたが同日撤回された。peertableは単体でユーザーへ届く独立製品であり、
内蔵は製品の独立性を失わせるため棄却する。

### room到達性を製品健全性へ含める

LAN room の生死で工場健全性が揺れ、room を持たないnpm単体利用者の平常状態をfailにするため棄却する。

### 全hostを一括cutoverする

不可逆でrollback単位が失われ、v6/v7の並存期間に得られる観測を捨てるため棄却する。
