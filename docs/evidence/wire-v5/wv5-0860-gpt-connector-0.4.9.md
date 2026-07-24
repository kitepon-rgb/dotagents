# wv5-0860 受入証拠 — gpt-connector consult全面停止の修理と0.4.9 release（H）

- 日付: 2026-07-25
- 所有repo: gpt-connector
- release commit: `c39c692`（`origin/main`の祖先）

## 欠陥と最小再現

`consult`が**添付の有無に関わらず**全呼び出しで失敗した。

```
CHAT_FAILED: Cannot read properties of undefined (reading 'timeStamp')
```

`diagnostics`は`ready`を返していた——`cdpConnected: true`、`officialOrigin: true`、
`authenticated: true`、`bridgeBuildId`解決済み。**接続ではなくchat経路の欠陥**である。
添付なしの最小promptでも同一errorになることを実測し、upload経路を切り分けた。

## 原因

`src/page-bridge.ts`がChatGPT webapp内部の`builder(...)`へ`sourceEvent: undefined`を
渡していた。`timeStamp`はrepo内に一切存在しないDOM Eventのpropertyであり、上流が
`sourceEvent.timeStamp`を無条件に読むよう変更したためTypeErrorになっていた。

## 修理

DOM Eventと同じ時間基準（`performance.now()`由来の高分解能タイムスタンプ）を持つ
最小のevent様objectを渡す。上流が要求する入力を供給するのであって、迂回や握り潰しではない。

## gateが実際に捕まえた欠陥（3件）

本release中に、導入したばかりのgateとリポの既存gateが順に止めた。

1. **未着地commitからのpublish**: 祖先gateが未pushのHEADで停止。
2. **eslint no-undef**: gate script自身が`console`を使うが、eslintの`scripts/**/*.mjs`
   globalsに`console`/`process`が無く`pnpm check`が落ちた。**gateからlogを削るのではなく
   設定側を実態へ合わせた**。
3. **version定数の追従漏れ**: `src/version.ts`は`package.json`と一致することをtestが
   強制する。`npm version patch`はこのファイルを更新しないため、testが不整合を捕まえた。

## publish祖先gateの導入

AGENTS.mdの既存裁定「gate未実装の製品は、次にそのrepoでrelease作業を行うwaveで
同時に導入する」の適用。本waveでgpt-connectorをreleaseするため、ここで導入した。
`prepublishOnly`を`node scripts/verify-release-commit.mjs && pnpm check && pnpm build`
とし、祖先性とworking tree cleanを検証してからcheck/buildへ進む。
あわせて`npm pack`成果物（`*.tgz`）を`.gitignore`へ入れた。

## gate結果

| gate | 結果 |
|---|---|
| `pnpm check`（lint + typecheck + test） | exit 0、test 125/125 pass |
| `node scripts/verify-release-commit.mjs` | `release commit b4188df4a841 is landed on origin/main.` |

## publish・install・公開後smoke

- `npm publish --access public` → `+ gpt-connector@0.4.9`
- registry polling で `latest = 0.4.9`、`0.4.9 present = True`（1回目は伝播ラグで`0.4.8`、
  2回目で確定。断定せず再確認した）
- `npm install -g gpt-connector@0.4.9 --prefer-online` → `gpt-connector --version` = `0.4.9`
- **公開版CLIでconsult実行**: `state: succeeded`、`text: '0.4.9 ok'`、
  `resolvedModel: gpt-5-6-thinking`。修理前は同じ呼び出しが`CHAT_FAILED`だった

## 残っている条件

本セッションのMCP server processはセッション起動時の**0.4.8のまま**であり、
`mcp__gpt_connector__diagnostics`は`packageVersion: 0.4.8`を返す。MCP面での復旧は
次セッションのMCP再起動で反映される。CLI面（global 0.4.9）は復旧を実測済み。
