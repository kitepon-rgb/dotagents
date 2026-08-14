# GF04TR — Throughline非Claude envelope最小修理

- 実施日: 2026-08-14
- 対象repo: `kitepon/Throughline`
- baseline: `d1cd078dc88c9ef8c94f41b6a5d723dba9f2db24`
- red fixture commit: `e5a5cf9513ed95839a7fd4d172d21afa1b0fc04b`
- repair commit: `360a663`
- 非実施: 正式Grok host化、payload変換、Grok transcript reader、追加Grok、製品push

## 結論

Grok形common keysの`sessionId`と`hookEventName`を持ち、Claudeの`session_id`を持たない入力だけを識別するpredicateを追加した。Claude用SessionStart、UserPromptSubmit、Stopはstdin JSON parse直後にpredicateを評価し、trueなら無出力でreturnする。

値をClaude形へ変換せず、DB、state、VS Code task、handoff、transcript処理、runtime error記録より前に終了する。ThroughlineをGrok hostとして扱わず、GF03で確定したunsupported no-op境界だけを実装した。

## 変更

- `src/hook-envelope.mjs`: 変換を行わないunsupported predicateだけを追加。
- `src/session-start.mjs`
- `src/prompt-submit.mjs`
- `src/turn-processor.mjs`

各entrypointの追加はimportとJSON parse直後のearly returnだけである。既存Claude／Codex hook、handoff、DB schema、transcript契約は変更していない。

## 検証

focused fixture:

```bash
node --import ./src/test-env.mjs --test \
  --test-name-pattern='Grok camelCase envelopes' \
  src/hook-entrypoints.test.mjs
```

結果: 1 test、1 pass、0 fail。SessionStart、UserPromptSubmit、StopのGrok wireがすべてexit 0、stdout／stderrなし、隔離HOME状態とVS Code task作成なしになった。

関連gate:

```bash
node --import ./src/test-env.mjs --test \
  src/hook-entrypoints.test.mjs \
  src/runtime-error-hook.test.mjs \
  src/cli/codex-hook.test.mjs
```

結果: 33 tests、33 pass、0 fail。Claude hook entrypoint、runtime error hook、Codex hookの既存契約を維持した。

- `git diff --check`: 成功。
- `git show --check --stat --oneline 360a663`: 成功。
- `git status --short --branch`: clean、`main...origin/main [ahead 2]`。
- `origin/main..HEAD`はred fixtureとrepairの2 commitだけ。監査pass前のため未push。

## 境界

追加Grok実測は行っていない。監査passまではcommitをpushせず、GF05／GF06へ進まない。
