# cf-0281 hook trust・任意OAuth受入記録

- 実施日: 2026-07-21
- 対象: `codex-full-support/cf-0281`
- 結論: required hook trustは4 hostで完了。required MCPのOAuth待ちはなし。任意・第三者MCPの未認証／transport失敗は理由付きWARNとして保持。

## host別hook trust

| host | 直接証拠 | 結果 |
|---|---|---|
| Mac | Codex 0.144.6の`/hooks`でPreToolUse 1、PostToolUse 2、SessionStart 4、UserPromptSubmit 4、Stop 4を個別表示 | 15/15がactiveかつ`Trusted` |
| main-server | [ADR 0105](../adr/0105-cf0216-main-server-remote-acceptance.md)と[trust receipt](2026-07-21-cf0216-main-server-codex-hook-trust.json) | `/hooks`の15件を個別review、未trust 0 |
| FOX WSL2 | [cf-0150進捗](2026-07-21-cf0150-spotter-cross-host-progress.md) | project trustと表示10 hookへ`Trust all and continue`を実行、続く新規promptでhook event実火 |
| FOX Windows native | [ADR 0074](../adr/0074-codex-hook-cross-host-acceptance.md) | PowerShell canonical hookのtrust再承認後、callout Completedとstate生成 |

Macでは設定やhook有効状態を変更していない。全hookが既にactiveかつtrustedだったため、`/hooks`の個別表示だけで閉じた。trustを戻す場合は同じCodex正規UIから対象hookを無効化またはtrust撤回する。

## MCP OAuthの扱い

Mac Codex起動時に次を観測した。

- `X-HERMES-MCP`: 未ログイン。工場core必須MCPではない任意面のため、credentialを追加せずWARNとして保持。
- `sprite-forge`: HTTP 501でtransport初期化失敗。OAuth問題ではなく、dotagents所有adapterの欠陥とも確認されていない第三者面のため本taskへ混ぜない。

core必須MCPの接続は既存の新規session受入で直接確認済みであり、追加OAuth UI待ちはない。任意・認証依存MCPは[Codex全対応計画](../plan_codex-full-support.md#7-新規-codex-session-e2e)どおり理由付きWARNで、FAILやrequired greenへ変換しない。

## 境界

Lattice製品は変更していない。廃止済み`codex-rc`は実行・調査・復旧していない。ユーザー所有の未追跡`docs/evidence/fixtures/`は読まず、変更・stageもしない。
