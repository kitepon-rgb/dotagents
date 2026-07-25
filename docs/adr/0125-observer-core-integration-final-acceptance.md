# ADR 0125: Observer正式編入を11製品体制として受け入れる

- **状態:** Accepted
- **日付:** 2026-07-25
- **対象:** dotagents、Observer、ServerManager / BugHub、全host運用
- **関連:** [ADR 0123](0123-observer-core-integration-reinstatement.md)、
  [ADR 0124](0124-wire-v6-observer-enrollment.md)、
  [最終監査](../evidence/2026-07-25-observer-core-integration-final-audit.md)

## Context

Observerは自作製品として完成していたが、旧裁定で予約・未編入へ置かれていた。
本waveで製品公開、wire v6、BugHub、4 host cutover、rollbackを実装・実測した。
同時に、MarkItDownが管理対象であることを自作所有と混同した正典表現と、
更新後runnerが旧wireへ戻る欠陥が見つかった。

## Decision

1. 工場の現役管理対象を11製品とする。
2. 自作コアはObserverとServerManagerを含む10製品とする。
3. MarkItDownは第三者管理製品であり、自作コアに数えず公開CLIだけを使う。
4. Observerはwire v6の固定14製品目として本番運用し、macOS対応hostだけ
   `required`、非対応hostは`unsupported`とする。
5. v5 endpoint、履歴、major別outboxはhost別rollback資産として保持する。
6. `agents-update`のpost-update gateは現行v6 runnerを既定とする。
7. [最終監査](../evidence/2026-07-25-observer-core-integration-final-audit.md)を
   編入完了の受入証拠とし、Lattice planとControlを完了・archiveする。

## Consequences

- Observerの欠陥・release・更新・公開後smokeは他の自作コアと同じ所有責任で扱う。
- MarkItDown本体の欠陥は第三者範囲外であり、dotagents adapterの欠陥だけを修理する。
- 将来の固定製品追加は新wire major、server-first、host別dual-run、
  rollback実測を同じ工程で行う。

## Rollback

運用rollbackはhost configとschedulerをv5へ戻し、v5 report受理後にserver v6 flagを
退避`.env`から復元する。製品編入の裁定自体を戻す場合も履歴を削除せず、
新ADRと新wire majorで管理区分・期待matrix・更新経路を同時に変更する。
