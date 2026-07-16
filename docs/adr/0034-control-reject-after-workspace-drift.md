# ADR 0034: workspace進行後のControl reject回復契約

日付: 2026-07-16

## Status

Accepted。正規工場運用で再現したControl回収欠陥を常設割込ゲートで修正し、Observer P5-1b4bへ戻る。

## Context

Observer Controlで、親が`worker-report-import`より先に`observe-worker=completed`を記録したRunを作った。
その後workspaceを正当にcommitすると、旧resultを採用しない`reject`までcurrent workspace fingerprint一致を
要求して`WORKSPACE_DRIFT`となり、Runを未裁定のままTask finalizationを永久に塞いだ。

正規順は`dispatched/running → worker-report-import → accept/reject`であり、順序誤り自体は親の責任である。
一方、不採用resultを履歴上rejectするためにworkspaceを旧状態へcheckout／stash／復元させる設計は、他者変更と
正しい後続作業を危険にさらし、Controlの不変履歴にも不要である。

## Decision

- `accept`は従来どおり、保存済みworkspace identityとcompletion fingerprintがcurrent workspaceに完全一致する時だけ
  許可する。後続変更を旧Worker成果として誤採用しない。
- `reject`はcompleted Run、保存済みresult digest、未裁定状態、親verification evidenceを厳密に照合したうえで、
  current workspace fingerprintを採用対象として再検証しない。
- rejectはworkspaceをcheckout、stash、reset、削除、書換えせず、Control manifestへ不変の棄却Decisionだけを追記する。
- run ID、assignment、result digest、executor handle、evidence等の既存相関は緩めない。

## Evidence

- focused: completed writer後にwrite scopeを進め、`accept`が`WORKSPACE_DRIFT`を維持し、同じresultの`reject`が
  workspaceを変更せず成功してTask finalizationを解放するfixture 1/1 green。
- related: accept/reject、Task finalization境界の3/3 green。
- static: `make lint-js` green。
- full regression: 工場Phase gateへ集約し、この割込TODOでは未実施。

## Parent refutation

1. workspace drift後の旧resultをacceptできないか。
   - accept側のidentity／fingerprint比較は変更せず、負系で`WORKSPACE_DRIFT`を確認した。
2. 別Runや別resultをrejectできないか。
   - run state、未裁定、保存済みresult digest一致、verification evidenceの既存検証を維持する。
3. rejectがcurrent workspaceを巻き戻したり消したりしないか。
   - fixtureで後続file内容が完全一致のまま残ることを確認した。

## Rollback

本commitをrevertし、rejectにもcurrent completion fingerprint一致を要求する旧fail-closed挙動へ戻す。
Observer側のControlを閉じる前にrevertした場合、未裁定Runが再びfinalizationを塞ぐため適用順に注意する。
