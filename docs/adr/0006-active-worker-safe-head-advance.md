# ADR 0006: active fixed Worker中の非交差fast-forward commitを検証して受理する

日付: 2026-07-15

## Context

ThroughlineのObserver DB projection Workerが同じworktreeの4 source/testを変更している間に、親が
非交差の`docs/adr/0005`と`0006`だけをpathspec commitした。Worker Report importは成果pathが
write scope内でも、予約時と完了時のHEAD不一致を一律`WORKSPACE_DRIFT`として拒否した。

dotagentsの外部実行契約は明示した非交差範囲なら共有worktreeでの並行書込を許す。HEADを無条件に
許すのは危険だが、Taskと無関係な親commitまで一律拒否すると、契約どおりの並行作業を回収できない。

## Decision

1. fixed workspaceのwrite Runで予約後にHEADが変わった場合、以下をすべて満たす時だけ
   `changedPaths`比較を続行する。
   - 予約HEADが現HEADの祖先である。
   - 予約HEADから現HEADまでの全commitが触れたpathをboundedに列挙できる。
   - その全pathがTaskの`read_scope`と`write_scope`の双方に非交差である。
   - baseline fingerprintと完了fingerprintにstaged変更がなく、現indexが現HEADと一致し、
     `assume-unchanged`／`skip-worktree`等の特殊path flagを持たない。
2. 上記を満たしても、ignored file集合／digestと未commit worktree差分の比較は従来どおり行い、
   未commit差分がwrite scope外なら拒否する。
3. 非祖先、履歴改変、関連scopeへのcommit、Worker成果のcommit、staged変更、index不一致／特殊flag、
   commit path列挙の上限超過／失敗は`WORKSPACE_DRIFT`でfail closedにする。
4. `resume-check`は同じ判定を使う。安全な非交差fast-forwardはreview情報へ出すがblockerにせず、
   不安全または検証不能なHEAD変化だけを`writer-head-changed` blockerにする。
5. executor-isolated workspaceはbase SHA固定契約を維持し、本例外を適用しない。
6. active fixed Worker中の親commitは、明示した非交差scopeへのpathspec commitだけを許す。
   条件を証明できないcommitはWorker完了まで待つ。

## Consequences

- 親の非交差な文書commitとWorkerの未commit source成果を、同じRunのprovenanceを保って回収できる。
- Taskが読む依存や書く成果を親がcommitした場合は従来どおり拒否される。
- HEAD差だけを無視せず、履歴方向、commit path、index、未commit fingerprintを独立に検証する。
