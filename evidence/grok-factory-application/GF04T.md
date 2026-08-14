# GF04T — Throughline Grok envelope負系fixture

- 実施日: 2026-08-14
- 対象repo: `kitepon/Throughline`
- baseline: `d1cd078dc88c9ef8c94f41b6a5d723dba9f2db24`
- fixture commit: `e5a5cf9513ed95839a7fd4d172d21afa1b0fc04b`
- 変更ファイル: `src/hook-entrypoints.test.mjs`だけ
- 非実施: 製品source変更、既存Claude／Codex fixture削除、製品push、追加Grok起動、実装修理

## 結論

Claude用SessionStart、UserPromptSubmit、Stopの実entrypointへGrokのcamelCase wireを渡す負系fixtureを追加した。期待値は全件exit 0、stdout／stderrなし、Throughline DB／state／runtime errorとVS Code taskの作成なしである。

現行codeではSessionStartとStopがsnake_case `session_id`必須検証でexit 1となる。UserPromptSubmitはexit 0だが、unsupported判定より前にVS Code task provisioningへ入り、`tasks.json`とsystem-reminderを作る。setupや依存解決の失敗ではなく、Grok wireの境界が副作用より後ろにあることをredとして固定した。

## 固定した入力

全eventにGrok共通fieldの`hookEventName`、`sessionId`、`cwd`、`workspaceRoot`、`timestamp`、`permissionMode`を持たせた。event固有fieldは次のとおり。

- SessionStart: `source`
- UserPromptSubmit: `prompt`
- Stop: `reason`、`stopHookActive`、`lastAssistantMessage`、`backgroundTasks`、`sessionCrons`

fixtureは隔離HOMEと隔離projectでsubprocessを実行する。VS Code副作用を隠さないため`TERM_PROGRAM=vscode`、`THROUGHLINE_NO_VSCODE=0`を明示した。Claude形への変換、DB作成、handoff、task provisioningは期待値に含めない。

## red実測

実行コマンド:

```bash
node --import ./src/test-env.mjs --test \
  --test-name-pattern='Grok camelCase envelopes' \
  src/hook-entrypoints.test.mjs
```

結果はtest 1、pass 0、fail 1、runner完走。assertion diffは次を示した。

| event | 現行status | 現行出力／副作用 | 期待 |
|---|---:|---|---|
| SessionStart | 1 | stderr `Missing session_id in SessionStart payload` | exit 0、無出力 |
| UserPromptSubmit | 0 | stdoutにsetup system-reminder、`.vscode/tasks.json`作成 | exit 0、無出力・taskなし |
| Stop | 1 | stderr `Missing session_id in Stop payload` | exit 0、無出力 |

`throughlineStateExists`はfalseであり、DB／state／runtime errorは作られていない。一方、`vscodeTaskExists`はtrueで、UserPromptSubmitがunsupported wireを副作用前に除外できていないことを独立に示す。

## 変更境界と検証

- `git diff origin/main..HEAD --name-only`: `src/hook-entrypoints.test.mjs`だけ。
- `git show --check HEAD`: 成功。
- `git status --short --branch`: clean、`main...origin/main [ahead 1]`。
- fixture commitは監査用にlocal保持し、redのままremote mainへpushしていない。

この証拠の監査passまでは実装修理へ進まない。GF04S／GF04Tの両方がcloseしても、親のGF04G Control safety_net完了まではGF04TRを開始しない。
