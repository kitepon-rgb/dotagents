# ADR 0112: Windows post-trust hook受入とcf-0092境界訂正

- Status: Accepted
- Date: 2026-07-21
- Scope: Lattice `codex-full-support/cf-0092`、`cf-0150`、`cf-0281`
- Corrects: [ADR 0111](0111-cf0092-windows-native-session-baseline-acceptance.md) のmodels cache error非再現という表現

## Decision

FOX Windows nativeのCodex CLI `/hooks`で、更新後にmodifiedとなった6 hookを個別reviewした。
正規のThroughline 3 hookとSpotter 3 hookだけであることを確認してtrustし、最終一覧で
SessionStart 4/4、UserPromptSubmit 4/4、Stop 4/4、PostToolUse 2/2、review 0を確認した。

続く新規Codex sessionでSpotterのSessionStart、UserPromptSubmit、Stopが自動実火し、
Spotter ledgerへ同一hostの3 eventが追加された。これにより`cf-0150`のWindows Spotter不足と、
`cf-0281`のWindows required hook trust不足を解消する。

models cache schema errorはpost-trust新規session開始時に再びログへ出た。ただしsessionは応答し、
hook lifecycleも完走した。ADR 0111の正しい受入根拠は「errorが消滅した」ではなく、同じWindows
sessionでfresh／resume／4面収集が完走し、観測欠落がなくなったことである。warning自体は
第三者基盤toolchainの既知事象として残し、dotagentsやLatticeの修理対象へ拡張しない。

## 直接証拠

- `/hooks` review前: modified 6件
- 個別review:
  - Throughline: PostToolUse、UserPromptSubmit、Stop
  - Spotter: SessionStart、UserPromptSubmit、Stop
- `/hooks` review後: SessionStart 4/4、UserPromptSubmit 4/4、Stop 4/4、PostToolUse 2/2、review 0
- post-trust session: `019f81a5-74f7-7a73-bcba-432754578d4e`
- response: `CF0150_WINDOWS_SPOTTER_OK`
- Spotter ledger: 23 events、Claude 19／Codex 4、parse error 0
- Codex Spotter events: SessionStart 2（手動probe 1＋自動実火1）、UserPromptSubmit 1、Stop 1
- Spotter runtime error store: records 0、open 0、unacknowledged 0
- remote `git status --short`: 出力なし

## 境界

post-trust sessionではSpotter以外を含むhookの一部`Failed`表示が残った。Spotter 3 eventはledgerで
直接相関したため本受入へ含めるが、他製品hookの全greenは導出しない。

core MCPはSTDIOでありOAuth非適用。任意・認証依存MCPのOAuthは実施しておらずWARNのまま保持する。
Lattice製品repoは変更していない。廃止済み`codex-rc`とユーザー所有fixtureは未使用である。
