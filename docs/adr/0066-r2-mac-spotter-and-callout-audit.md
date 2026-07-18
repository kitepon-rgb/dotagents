# ADR 0066: R2 Mac Spotter実火の受入とcallout hook未達境界

日付: 2026-07-19

## Status

Accepted。

## Decision

Macの現在Codex入口でSpotter UserPromptSubmit hookの実火を受け入れる。一方、Codex callout hookは
synthetic契約を受け入れるが、native frontendでの4条件連鎖は未完のまま保持する。

### Spotter

- SessionStart / UserPromptSubmit / Stopは各1件登録、compatible / canonical。
- runtime JSONLは `spotter.hook_event.v1`、diagnostics parse error 0。
- 現在の連続した2 user messageに対応する直近2件はともに `success`、`pass=true`、不足toolなし。
- 直近100行の18:00Z以降にerror/failureは無い。
- log schemaにCodex thread IDが無いため、相関はhost/event/timestampとmessage数に限定する。
- diagnosticsの `configured-unverified` とtrust unknownは機械判定の限界として残し、実火receiptと分離する。

### Codex callout hook

- `tests/hooks/codex-smoke.sh` は全項目pass。隔離stateでは初回INFO、2回目沈黙、compact再武装、
  Stop pendingの生成、UserPromptSubmitでの配送・削除が成立する。
- native実火の確証はhistoric X5初回注入と現在session marker / snapshotまで。
- X2初回INFO、同session 2回目のfrontendゼロbyte、native compact後1回再武装、同一sessionの
  Stopから次の自然なpromptへのpending 1回配送は未観測である。
- state上のpending 2件やplacement marker 0件は、session相関と次prompt到来条件が不明なため
  欠陥とも成功とも断定しない。

## 境界

- Spotter hook再登録、log削除、hook trust、config変更、compact、新規threadは実施していない。
- Spotterの過去error/skippedは今回のcurrent-session成功と分離し、別問題を完了条件へ追加しない。
- callout hookのnative 4条件連鎖を完了扱いせず、次の自然なthread境界で実測する。
