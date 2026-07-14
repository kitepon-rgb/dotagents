# Elastic Orchestrator v1 Registry／placement dogfood

- Control ID: `elastic-v1-dogfood-20260714`
- 実証日: 2026-07-15
- 目的: fixtureだけでなく、同一実ControlでRegistry observationからstrict report importまで通す。

## 縦切り契約

read-onlyの`task-final-registry-placement`を追加し、実行時に確認済みのCodex native sorterを
`execution-verified`として観測する。capacityは固定3を工場全体へ一般化せず、このtask時点の
native admission、hard/soft 3、observed 0を時刻付きsnapshotとして記録する。

候補`run-final-registry-placement`は次の順序を飛ばさない。

1. Registry observationを記録する。
2. `placement-dry-run`でeligibleを確認する。
3. `placement-reserve`で同じ候補をmaterializeする。
4. `admit-worker`後にDelegation Packetをstanding sorterへ渡す。
5. dispatchを観測し、sorterが返したread-only検証をstrict Worker Reportとしてimportする。
6. 親がresult digestと証拠を照合してacceptする。

対象検証は`shasum -a 256 shared/orchestrate/executor-adapters.md`。変更pathは空でなければ失敗とし、
report、Task、assignment、packet digest、agent pathの相関を要求する。実行結果とreceipt revisionは
完了後の親Decisionへ記録する。
