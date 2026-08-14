# GF04S — Spotter Grok envelope負系fixture

- 実施日: 2026-08-14
- 対象repo: `kitepon/Spotter`
- baseline: `84ececa3b6fa40ff0b13a8d75f31b1e4d37b1a0d`
- fixture commit: `0eefee63660927ba4d2f46ea6884f7e6d5e4c02b`
- 変更ファイル: `test/hooks.test.mjs`だけ
- 非実施: 製品source変更、既存Claude／Codex fixture削除、製品push、追加Grok起動、実装修理

## 結論

GrokのcamelCase wireを実Hook entrypointへ渡す負系fixtureを追加した。SessionStart、UserPromptSubmit、PreToolUse、Stop、SessionEndの全件で、期待するunsupported no-opはexit 0、stdout／stderrなし、Spotter状態作成なしである。

現行codeではSessionStart、UserPromptSubmit、PreToolUse、Stopがsnake_case `session_id`必須検証でexit 2となり、SessionEndはexit 0でも同じ不一致をstderrへ出した。全件stdoutは空で、`.spotter`配下は既存fixture用`marker.json`だけだった。setupや依存解決の失敗ではなく、Grok wireとClaude hook入力契約の差だけでredになっている。

## 固定した入力

全eventにGrok共通fieldの`hookEventName`、`sessionId`、`cwd`、`workspaceRoot`、`timestamp`、`permissionMode`を持たせた。event固有fieldは次のとおり。

- SessionStart: `source`
- UserPromptSubmit: `prompt`
- PreToolUse: `toolUseId`、`toolName`、`toolInput`、`toolInputTruncated`
- Stop: `reason`、`stopHookActive`、`lastAssistantMessage`、`backgroundTasks`、`sessionCrons`
- SessionEnd: `reason`

Claude形への変換やGrok監査開始を期待値に含めず、Hookの副作用より前に無視する境界だけを固定した。

## red実測

実行コマンド:

```bash
node --test --test-name-pattern='Grok camelCase envelopes' test/hooks.test.mjs
```

結果はtest 1、pass 0、fail 1、runner完走。assertion diffは次を示した。

| event | 現行status | 現行stderr | 期待 |
|---|---:|---|---|
| SessionStart | 2 | `hook input missing required string "session_id"` | exit 0、無出力 |
| UserPromptSubmit | 2 | 同上 | exit 0、無出力 |
| PreToolUse | 2 | 同上 | exit 0、無出力 |
| Stop | 2 | 同上 | exit 0、無出力 |
| SessionEnd | 0 | `session-end unexpected error`と同じ`session_id`不一致 | exit 0、無出力 |

`spotterEntries`のactual／expectedはいずれも`marker.json`だけで、daemon・DB・hook event・runtime errorのproject状態は作られていない。失敗位置は全件input contractであり、tool denyやStop continuationを起こすexit 2をfixtureがそのまま検出した。

## 変更境界と検証

- `git diff origin/main..HEAD --name-only`: `test/hooks.test.mjs`だけ。
- `git show --check HEAD`: 成功。
- `git status --short --branch`: clean、`main...origin/main [ahead 1]`。
- fixture commitは監査用にlocal保持し、redのままremote mainへpushしていない。

この証拠の監査passまでは実装修理へ進まない。GF04S／GF04Tの両方がcloseしても、親のGF04G Control safety_net完了まではGF04SRを開始しない。
