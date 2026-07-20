# ADR 0111: cf-0092 FOX Windows native同一session baseline受入

- Status: Accepted
- Date: 2026-07-21
- Scope: Lattice `codex-full-support/cf-0092`
- Supersedes: [ADR 0099](0099-cf0092-partial-baseline-and-windows-blocker.md) のWindows models cache blocker

## Decision

FOX Windows nativeのCodex CLI 0.144.6で新しいsessionを起動し、同じsessionを2回resumeした。
ADR 0099で再現したmodels cache schema errorは発生せず、同一sessionへskills、agents、MCP、
hooksの4面を直接相関できたため、`cf-0092`のWindows blockerを解消する。

hook runtimeの一部`Failed`は観測事実として保持し、全hook greenへ丸めない。Windows Spotterの
実火欠落は`cf-0150`が所有し、`cf-0092`完了からSpotter受入を導出しない。

## 同一session証拠

- host: FOX Windows native (`windows-workstation`)
- Codex: `codex-cli 0.144.6`
- session: `019f819a-64d2-79b0-90c5-22430c8284b6`
- fresh result: `CF0092_WINDOWS_FRESH_OK`
- same-session resume result: `CF0092_WINDOWS_RESUME_OK`
- models cache schema error: fresh／resume／4面収集の全turnで再現なし
- official skill surface: `C:\Users\kite_\.agents\skills`
- installed dotagents skills: `auto-deploy-on-push`、`gpt-connector`、`oracle`、`orchestrate`、
  `polish-github`、`run-observer-parent-watch`
- `orchestrate/SKILL.md`: readable
- agent definitions:
  - implementer: `gpt-5.6-terra`／medium／workspace-write
  - refuter: `gpt-5.6-sol`／high／read-only
  - sorter: `gpt-5.6-luna`／low／read-only
- registered core MCP: `aiterm`、`caveat`、`gpt_connector`、`lattice`（すべてenabled、STDIO）
- Codex hook config: SessionStart 4、UserPromptSubmit 4、Stop 4、PreToolUse 1、PostToolUse 2
- runtime: SessionStart／UserPromptSubmit／Stopは実行表示あり。一部`Failed`を保持
- session transcript:
  `C:\Users\kite_\.codex\sessions\2026\07\21\rollout-2026-07-21T07-16-47-019f819a-64d2-79b0-90c5-22430c8284b6.jsonl`

## 境界

baselineは存在・読取・登録・runtime観測を受け入れる。agent実行そのもの、各MCPのlive tool call、
全hook成功を本taskから導出しない。これらは既存のrouting／connector／hook taskが所有する。

Windows Spotter 1.4.27の直接hook commandは終了コード0でledgerへ1件記録できたが、上記Codex
sessionの自動実火ではledgerが増えなかった。この差分は`cf-0150`の未完了条件として残す。

Lattice製品repoは変更していない。廃止済み`codex-rc`は利用していない。ユーザー所有fixtureは
未読・未変更・未stageである。

