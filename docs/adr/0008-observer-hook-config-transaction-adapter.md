# ADR 0008: Observer親hook設定を二file transactionで配布する

## Status

Accepted。

## Context

ObserverはClaude／Codex別のcanonical `Stop` fragmentとcandidate verifierを所有する。dotagents側には、
その公開契約をconsumeしながら既存の他製品hookを保持し、Claude `settings.json`とCodex `hooks.json`を
片側だけ更新された状態へ残さない配布adapterが必要だった。

実装委譲中に見つかったWorker Report時刻案内の不整合は、親によるReport手補正を行わず、独立TODO、
[ADR 0006](0006-worker-report-canonical-timestamp-guidance.md)、commit `500763d`で先に修正した。

## Decision

- `bin/apply-observer-hook-config.sh`は既定dry-runとし、`--apply`を明示した時だけ設定を変更する。
- fragment生成とcandidate検証はObserver CLIへ委ね、dotagents内へprovider別fragment形状を複製しない。
- 既存hookを保持し、canonical Observer entryをproviderごとに一件へ正規化する。
- applyは両candidateを先に生成・検証し、既存fileを0600でbackupしてからatomic replaceする。
  二file目の置換に失敗した場合は一file目も元へ戻し、片側更新を成功扱いしない。
- 設定fileと親設定directoryのsymlinkは、broken symlinkを含めて拒否する。
- dry-run出力はprovider、path、変更有無だけに限定し、設定本文や秘密値を出さない。
- trust、model、effort、permission、credential、Spotter等の他製品hookは変更しない。
- actual apply、hook trust、Claude／Codex実火はH gateとして別TODOに残す。

## Evidence

- implementation commit: `2fb48cb`（Observer親hookを二設定へtransaction配線する）
- Control: `observer-factory-20260715`
- implementation Task: `dotagents-observer-hook-config-adapter`
- Worker Report strict import: revision 45
- parent acceptance: revision 46
- focused gate: `bash tests/install/observer-hook-config.sh` PASS
- Python syntax gate: `make lint-py` PASS
- accepted_at: `2026-07-15T06:44:08.400Z`

## Consequences

dotagentsはObserver製品の公開hook契約を再実装せず、二つの親host設定へtransactionとして配布できる。
isolated HOME fixtureの成功は実HOME適用やhost実火の成功を意味せず、それらはH gate完了まで未実施として扱う。
