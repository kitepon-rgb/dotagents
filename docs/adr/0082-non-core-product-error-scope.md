# ADR 0082: 非コア製品エラーをdotagents ToDoから除外する

- Status: Accepted
- Date: 2026-07-20
- Scope: dotagents factory TODO ownership
- Supersedes: 非コア製品の欠陥をmaintenanceまたはH承認待ちへcarry overする従来運用

## Decision

原因と修理所有者がdotagentsのコア製品、ServerManager/BugHub、dotagents所有integrationのいずれにも属さない製品欠陥は、dotagentsのToDo、maintenance queue、H承認待ちへ登録しない。第三者製品と、Claude Code CLI・Codex CLI・Grok Buildなど別区分の基盤toolchain本体の欠陥が対象である。

外部製品名が入力や症状へ現れるだけでは除外しない。dotagentsが所有するadapter、設定生成、host routing、compatibility projectionの実装不備なら、修理所有者はdotagentsなので工場欠陥として残す。判定軸は製品名ではなく、根本原因と正規修理repoの所有者である。

## Existing-task audit

次のactive taskは非コア製品本体またはdotagents非所有設定の修理であり、successor revisionでactive topologyから除外する。旧plan version、journal、snapshotは履歴として保持する。

| task | 除外理由 |
|---|---|
| `gpt56-rewiring/gw-0075` | Codex upstreamのspawn応答へrole/model/effort/sandboxを追加する要求であり、dotagents実装ではない |
| `factory-master/fm-0652` | Windows nativeの外部`node_repl` MCP commandがWSL pathを保持する問題。dotagents内に当該commandの生成・adapter実装はなく、非コア製品/host設定の所有境界 |
| `factory-master/fm-0653` | Codex CLI 0.144.6のmodels cache schema欠落とrefresh timeoutであり、基盤toolchain本体の問題 |

新規Codex sessionで見つけた`sprite-forge` MCPのHTTP 501は、`fm-0654`として登録する直前の未コミットrevisionを破棄し、active taskにも履歴versionにも残さない。

## Deliberate keeps

- `bughub-factory-integration/bf-0037`は基盤toolchainの修理ではなく、installed/latest、update結果、host compatibilityをBugHubで観測するdotagents工場契約なので残す。
- コア製品のinstallerがWindows用commandを誤生成する欠陥や、dotagentsのhost設定生成が誤る欠陥は、外部CLI上で発症しても所有repoがコア/dotagentsなので残す。

## Consequences

外部製品の不具合を発見しても、dotagents工程表へ「いつか直す」taskを作らない。現在の工場作業を塞ぐ場合は、外部blockの事実だけを当該受入条件へ記録し、外部製品の修理をdotagentsの完了条件へ取り込まない。
