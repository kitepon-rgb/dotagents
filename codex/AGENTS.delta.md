# Codex固有差分

## Codex子の入口とaitermの境界

- **Codex親がCodex子を呼ぶ時はnative sub-agentを既定にする。** 同じ子へのfollow-upで対話と
  task相関を保ち、repoに密結合した実装・調査・反証をaitermの`codex_agent`へ流さない。
- aitermを永続shellとして使うことと、aitermからCodex子を起動することを混同しない。前者はshell操作の
  既定のまま、後者はnativeで満たせない隔離・durable external session・独立capacityの具体的利益が
  準備・回収コストを上回る時だけ例外的に選ぶ。単にaitermがCodexを起動できることや、慣性で
  external laneへ流れることは選定理由にしない。
- Grok／Composer等の別vendorをaitermで使う判断と、Codex→Codexの入口判断は別契約である。
