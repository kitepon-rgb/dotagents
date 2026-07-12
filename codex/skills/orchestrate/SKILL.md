---
name: orchestrate
description: 複数フェーズ・複数担当の大規模実装、監査、移行を Codex ネイティブ委譲で安全に統括する時に使う。
---

# Orchestrate

まず [共通契約](../../../shared/orchestrate/contract.md) を全文読む。F/A/H、反証、安全網、レーン分離、統括ゲートは同契約が正本である。

## Codex native appendix

- A の委譲は Codex ネイティブ子を使う。`agent_type=<role>` と `fork_turns="none"` を指定し、最初の spawn は routing smoke のみとする。
- `verify-codex-agent-routing <role> <agent-path>` が role・model・effort・developer instructions の一致を確認してから、同じ子へ follow-up で実作業を渡す。
- `implementer` は仕様固定の実装・テスト、`refuter` は読み取り専用の敵対的検証、`sorter` は読み取り専用の分類・抽出を担う。model と effort は role TOML によって決まり、呼び出し側が手指定しない。
- 親 Codex から aiterm や MCP を経由して入れ子の Codex を起動しない。ネイティブ委譲の並列性、深さ、使用量の制御を維持する。
- 共有 worktree では担当ごとに非交差の書き込み範囲を割り当てる。子にブランチ切替・commit・他者変更の revert をさせず、親が統合と最終検証を担う。

## 実行順

1. 共通契約のベースライン、F/A/H、統括ゲートを満たす計画を確認する。
2. 監査は複数視点の Find、Dedup、existence/value の独立反証、Critic、親の裁定で進める。
3. 実装は A の非交差 wave に限定し、各 wave を親が diff と検証で受け入れる。
4. 重要な発見と検証結果を必要な正本へ還流する。
