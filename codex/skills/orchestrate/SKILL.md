---
name: orchestrate
description: 複数フェーズ・複数担当の大規模実装、監査、移行を Codex のnative・外部実行・相談レーンで安全に統括する時に使う。
---

# Orchestrate

まず [共通契約](../../../shared/orchestrate/contract.md) を全文読む。F/A/H、反証、安全網、レーン分離、統括ゲートは同契約が正本である。

## Codex appendix

- A の委譲は Codex ネイティブ子を使う。`agent_type=<role>` と `fork_turns="none"` を指定し、最初の spawn は routing smoke のみとする。
- `verify-codex-agent-routing <role> <agent-path>` が role・model・effort・developer instructions の一致を確認してから、同じ子へ follow-up で実作業を渡す。
- `implementer` は仕様固定の実装・テスト、`refuter` は読み取り専用の敵対的検証、`sorter` は読み取り専用の分類・抽出を担う。model と effort は role TOML によって決まり、呼び出し側が手指定しない。
- native枠は工場全体の上限ではない。native枠が埋まった時、または隔離・独立枠・役割適合で有利な時は、external executionとして`codex-sidecar`またはaitermの`codex_agent` / `grok_agent` / `composer_agent`を積極利用する。Codex親から入れ子のCodexを起動してよい（オーナー恒久裁定 2026-07-14）。
- `gpt_connector` はconsultation専用であり、実装・shell・テストを担うworkerとして扱わない。timeout後は同じslugをsessionsで回収し、重複送信しない。
- 外部子にはtask ID、repo/cwd、read/write範囲、成功条件、検証を明示する。共有worktreeはread-only、writerは専用worktreeを原則とし、共有writerは明示した非交差範囲だけに限定する。子にbranch切替・commit・push・merge・rebase・reset・stash・他者変更のrevert・H操作・秘密の読取/転記をさせない。
- timeoutは失敗でなく状態不明。session/jobを回収し、同一taskを重複起動しない。installed / registered / verified / execution-verifiedを区別し、writerにはexecution-verifiedの入口だけを使う。親が統合と最終検証を担うため、実diff・範囲・検証を自ら確認する。

## 実行順

1. 共通契約のベースライン、F/A/H、統括ゲートを満たす計画を確認する。
2. 細かな編集ごとに監査せず、TODO完了候補ごとに親がdiff・受け入れ条件・関連testを1回確認する。
3. Phase完了時だけ、複数視点の Find、Dedup、existence/value の独立反証、Critic、親裁定による重い監査を行う。
4. 実装は A の非交差 wave に限定し、各 wave を親が diff と検証で受け入れる。
5. 重要な発見と検証結果を必要な正本へ還流する。
