---
name: orchestrate
description: 複数フェーズ・複数担当の大規模実装、監査、移行を Codex のnative・外部実行・相談レーンで安全に統括する時に使う。
---

# Orchestrate

まず[共通契約](../../../shared/orchestrate/contract.md)と[委譲契約](../../../shared/orchestrate/delegation-contract.md)を全文読む。使う時・使わない時、F/A/H、Control lifecycle、Packet/Report、反証、安全網、レーン分離、統括ゲートは共有文書が正本である。

## Codex appendix

- nativeはrouting smokeの確認後に同一子へfollow-upし、必要時のみinterruptする。external executionはsidecar/aitermの固有task/session/job handleでdispatch・observe・resumeし、Controlには参照と観測だけを記録する。
- A の委譲は、tightに結合した作業ならCodex nativeを既定にする。隔離、durable work、vendor固有機能、独立capacityが適合する時はsidecar/aitermを選ぶ。nativeでは`agent_type=<role>`と`fork_turns="none"`を指定し、最初のspawnは routing smoke のみとする。
- `verify-codex-agent-routing <role> <agent-path>` が role・model・effort・developer instructions の一致を確認してから、同じ子へ follow-up で実作業を渡す。
- `implementer` は仕様固定の実装・テスト、`refuter` は読み取り専用の敵対的検証、`sorter` は読み取り専用の分類・抽出を担う。model と effort は role TOML によって決まり、呼び出し側が手指定しない。
- native枠は工場全体の上限ではない。native枠が埋まった時、または隔離・独立枠・役割適合で有利な時は、external executionとして`codex-sidecar`またはaitermの`codex_agent` / `grok_agent` / `composer_agent`を積極利用する。Codex親から入れ子のCodexを起動してよい（オーナー恒久裁定 2026-07-14）。
- `gpt_connector` は親直轄のconsultation専用であり、Worker、external capacity、独立監査票、実装・shell・テストの担当として扱わない。timeout後は同じslugをsessionsで回収し、重複送信しない。
- Codexの入口はinstalled / registered / verified / execution-verifiedを区別し、external writerにはexecution-verifiedの入口だけを使う。
