---
id: claude-code-stop-hook-assistant-15
title: 'Claude Code Stop hook: 「assistant 単独で構造的に達成不可能な完了条件」を積むと 15+ 回の無限ループ + コスト浪費'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-code
  - stop-hook
  - settings
  - infinite-loop
  - cost
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  tool: Claude Code
  feature: Stop hook in .claude/settings.json
source_project: null
source_session: 2026-05-15T02:11:56.829Z/3ab9f64b606a
created_at: 2026-05-15
updated_at: 2026-05-15
last_verified: 2026-05-15
---

## Symptom

Claude Code の Stop hook (`.claude/settings.json` の `hooks.Stop`) に「MVP 達成まで進めろ」「Phase X が完了するまで止まるな」のような完了条件を書いた時、その完了条件が **assistant の操作では構造的に満たせない** 性質 (例: ユーザによる連続 7 日間の業務利用、Apple Store 審査通過、外部発表) を含んでいると、assistant が「待機」「user 手番」と返しても hook が `Condition NOT satisfied` と判定して再 invoke を 15+ 回繰り返す. 1 回ごとに full context を消費するため API トークンコストが大量発生.

## Cause

Stop hook は assistant の最終応答テキストを見て completion 判定するため、assistant 側で「これは私には満たせない」と論理的に説明しても hook はその説明を「= 未達」として扱い再 invoke する. hook が判定する completion 条件と、その条件が assistant に物理的に達成可能かは別レイヤなので、不可能条件を hook に入れても hook は気付かない. 特に「user の業務利用」「外部審査」「7 日経過」のような **時間 / 第三者依存** の条件は assistant では絶対に "satisfied" 状態を作れない.

## Resolution

Stop hook に積む完了条件は **assistant の作業範囲内で観測可能** なものに限定する:
- ✅ "all tests pass": `pnpm test` 等で assistant が確認可能
- ✅ "no uncommitted changes": `git status` で確認可能
- ✅ "PR opened": `gh pr view` で確認可能
- ❌ "MVP 達成": user の判断で決まる、assistant では決められない
- ❌ "7 日 dogfood 完了": 時間経過 + user 行動が必須
- ❌ "App Store approval": 第三者プロセス

不可能条件を踏んでしまった場合の対処:
1. `.claude/settings.json` から該当 hook を削除 / disable
2. ESC で hook の再 invoke を中断
3. 既に発生したコスト分は諦める

予防: hook の completion 判定文を書く時に「私 (assistant) が `git` か filesystem か WebFetch だけで verify できる条件か?」を自問する. `MVP` `dogfood` `release` `approval` 等のキーワードが入っていたら危険信号.

## Evidence

codex-link-p2p セッション 2026-05-15 transcript: Stop hook `[MVP達成まで進めろ]` が `Phase 14c (実機 7 日 dogfood)` の未達を理由に 15+ 回連続で `Condition NOT satisfied` を返した. assistant は毎回「Phase 14c は構造的に user の手番」と応答するも hook は無視. POSTMORTEM.md セクション 5.4 にも記録.
