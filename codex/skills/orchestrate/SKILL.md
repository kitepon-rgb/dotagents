---
name: orchestrate
description: 統括レーン（①計画に中断が組込済み②受入が多段連鎖③複数repoの書込調整④裁定証跡が必要、のいずれか確定）の実装、監査、移行を Codex のnative・外部実行・相談レーンで安全に統括する時に使う。技法は通常レーンでも参照可、Control儀式は統括レーンだけ。
---

# Orchestrate

まず[共通契約](../../../shared/orchestrate/contract.md)と[委譲契約](../../../shared/orchestrate/delegation-contract.md)を全文読む。使う時・使わない時、F/A/H、Control lifecycle、Packet/Report、反証、安全網、レーン分離、統括ゲートは共有文書が正本である。

## Codex appendix

- nativeはrouting smokeの確認後に同一子へfollow-upし、必要時のみinterruptする。external executionはsidecar/aitermの固有task/session/job handleでdispatch・observe・resumeし、Controlには参照と観測だけを記録する。aitermレーンの運用型（完了受信・レーン構成・親専任）は[aiterm-dispatch.md](../../../shared/orchestrate/aiterm-dispatch.md)を先に読む。
- Controlへ記録済みのnative Runを`agents.interrupt_agent`で止める時は、先に`worker-cancel-request`を記録する。interrupt receiptを回収してから`observe-worker=cancelled`へ進め、外部interruptを先行させない。
- nativeへ実作業をfollow-upする前に、`delegation-packet`と`worker-report-skeleton`の出力をそれぞれ安全な一意pathへ保存し、follow-up本文で両方の実pathを明示する。schemaを親が要約転記したり、field一覧だけで代用したりしない。子には両原本を読んでskeletonのexact shapeを保ったまま埋めるよう指示し、pathを渡せない時はdispatchしない。
- 統括レーンで委譲すると裁定したAは、tightに結合した作業ならCodex native、隔離、durable work、vendor固有機能、独立capacityが適合する時はsidecar/aitermを選ぶ。通常レーンは委譲を既定にしない。nativeでは`agent_type=<role>`と`fork_turns="none"`を指定し、最初のspawnはrouting smoke のみにする。
- `verify-codex-agent-routing <role> <agent-path>` が role・model・effort・developer instructions の一致を確認してから、同じ子へ follow-up で実作業を渡す。
- `implementer` は仕様固定の実装・テスト、`refuter` は読み取り専用の敵対的検証、`sorter` は読み取り専用の分類・抽出を担う。model と effort は role TOML によって決まり、呼び出し側が手指定しない。
- native枠は工場全体の上限ではない。native枠が埋まった時、または隔離・独立枠・役割適合で有利な時は、external executionとして`codex-sidecar`またはaitermの`codex_agent` / `grok_agent` / `composer_agent`を積極利用する。Codex親から入れ子のCodexを起動してよい（オーナー恒久裁定 2026-07-14）。
- `gpt_connector` は親直轄のconsultation専用であり、Worker、external capacity、独立監査票、実装・shell・テストの担当として扱わない。timeout後は同じslugをsessionsで回収し、重複送信しない。
- Codexの入口はinstalled / registered / verified / execution-verifiedを区別し、external writerにはexecution-verifiedの入口だけを使う。
