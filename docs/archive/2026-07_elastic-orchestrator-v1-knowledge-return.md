# Elastic Orchestrator v1 knowledge return

- Control ID: `elastic-v1-dogfood-20260714`
- 還流日: 2026-07-15
- 方針: 実dogfoodで再現した契約だけを、所有先ごとに分離して戻す。

## 正典とtests

- Control／adapter／campaign／phase／finalization契約は`shared/orchestrate/`へ反映した。
- 実装回帰は`tests/orchestrate/`へ固定し、unsupported state、証拠digest、worktree drift、receipt容量、
  provider固有failureをnegative testで保持した。
- handoffで再現した旧Decision digest問題は、同一pathのgit履歴だけをboundedに検証する回帰へ戻した。
- 実行・回収・親裁定はdogfood discovery／decision／capacity／acceptance／final audit文書へ分離した。

## RAG

既に`rag/INDEX.md`から到達可能な`rag/orchestration/openai-cdc-prompt-concepts.md`へ、今回の実測原則を
追記する。`rag/INDEX.md`自体はユーザー所有dirtyのため、このwaveでは一切編集しない。新しい孤立記事を
作らず既存indexed compileへ戻すことで、検索到達性とdirty保護を両立する。

## Caveat

Caveat自身が所有する`~/.caveat/own`へ、mutableなDecision文書へ複数revisionのdigestを記録すると
retentionが壊れる罠を追加する。dotagents配下へCaveat stateを複製せず、公開可否・sync・indexは
Caveatの責務に保つ。追加後にCaveat検索でIDが返ることだけを検証し、push／syncは行わない。

## 採用しなかった一般化

- `64 concurrent agents`や固定3枠を工場全体の上限へしない。
- gpt-connectorをWorkerや監査票へ昇格しない。
- provider待機時刻を実行重複へ数えない。
- 同期sidecar結果をdurable resume成功の証拠へ流用しない。
- Grok／Composerのlogin-requiredを別providerへのfallbackで隠さない。
