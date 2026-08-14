# GF04SR — Spotter非Claude envelope最小修理

- 実施日: 2026-08-14
- 対象repo: `kitepon/Spotter`
- baseline: `84ececa3b6fa40ff0b13a8d75f31b1e4d37b1a0d`
- red fixture commit: `0eefee63660927ba4d2f46ea6884f7e6d5e4c02b`
- repair commit: `1468e36`
- 非実施: 正式Grok host化、payload変換、tool DB／auditor／installer／diagnostics拡張、追加Grok、製品push

## 結論

Claude hook共通libへ、Grok形common keysの`sessionId`と`hookEventName`を持ち、Claudeの`session_id`を持たない入力だけを識別するpredicateを追加した。5つのClaude hook入口はstdin JSONを読んだ直後、このpredicateがtrueなら無出力でreturnする。

値をClaude形へ変換せず、project marker探索、daemon、evaluation store、tool記録、Stop監査、hook eventより前に終了する。SpotterをGrok hostとして扱わず、GF03で確定したunsupported no-op境界だけを実装した。

## 変更

- `src/hooks/lib.mjs`: `isUnsupportedNonClaudeEnvelope`を追加。
- `src/hooks/session-start.mjs`
- `src/hooks/user-prompt.mjs`
- `src/hooks/pre-tool-use.mjs`
- `src/hooks/stop.mjs`
- `src/hooks/session-end.mjs`

各entrypointの追加はimportとJSON読取直後のearly returnだけである。既存Claude／Codex処理、出力schema、daemon契約は変更していない。

## 検証

focused fixture:

```bash
node --test --test-name-pattern='Grok camelCase envelopes' test/hooks.test.mjs
```

結果: 1 test、1 pass、0 fail。SessionStart、UserPromptSubmit、PreToolUse、Stop、SessionEndのGrok wireがすべてexit 0、stdout／stderrなし、`.spotter`追加状態なしになった。

関連gate:

```bash
node --test \
  test/hooks.test.mjs \
  test/codex-hook-cmd.test.mjs \
  test/parent-output-projector.test.mjs
```

結果: 123 tests、123 pass、0 fail。Claude hook、Codex hook command、共通parent projectorの既存契約を維持した。

- `git diff --check`: 成功。
- `git show --check --stat --oneline 1468e36`: 成功。
- `git status --short --branch`: clean、`main...origin/main [ahead 2]`。
- `origin/main..HEAD`はred fixtureとrepairの2 commitだけ。監査pass前のため未push。

## 境界

追加Grok実測は行っていない。監査passまではcommitをpushせず、GF05／GF06へ進まない。
