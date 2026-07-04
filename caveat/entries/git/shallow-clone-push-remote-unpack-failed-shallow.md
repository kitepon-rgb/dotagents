---
id: shallow-clone-push-remote-unpack-failed-shallow
title: shallow clone を新しいリモートへ push すると remote unpack failed で拒否される（エラーに shallow の手掛かりが出ない）
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - git
  - shallow-clone
  - push
  - remote-migration
  - fork
  - index-pack
environment:
  os: darwin
  arch: arm64
  node: 26.4.0
source_project: null
source_session: 2026-07-04T05:45:45.082Z/66cfa0078fe9
created_at: 2026-07-04
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Context

外部フォーク（digitalsamba/claude-code-video-toolkit）の shallow clone を自分の private repo（新設・空）へ origin 切替して push しようとして遭遇。2回リトライ失敗→fsck クリーン→cat-file で該当 sha がローカルに不存在→shallow を確認して特定。unshallow 後は一発成功。

## Symptom

既存 clone に新しい空リポジトリを remote として追加し `git push origin main` すると、pack 転送は完走するのに `remote: fatal: did not receive expected object <sha>` → `error: remote unpack failed: index-pack failed` → `! [remote rejected]` で失敗する。リトライしても同一結果。ローカルの `git fsck --full` はクリーンで、エラーメッセージのどこにも shallow への言及が無いため、サーバ障害やオブジェクト破損を疑って時間を浪費する。

## Cause

clone が shallow（--depth 付き clone。`git rev-parse --is-shallow-repository` が true / `.git/shallow` が存在）だと、ローカル履歴がカットオフ以深のオブジェクトを持たない。新しい空リモートへの push では全履歴の親オブジェクトが必要になるため、受信側の index-pack が「期待したオブジェクトが届かない」として unpack を拒否する。既存の元リモート（同じ shallow 境界を知っている側）への push は通るので、罠は「リモートを乗り換えた時」だけ発火する。

## Resolution

`git fetch <元リモート> --unshallow` で全履歴を取得（`--is-shallow-repository` が false になったことを確認）→ push 再実行で成功。予防: リモート乗り換え・fork 私物化の前に `git rev-parse --is-shallow-repository` を確認する習慣。

## Evidence

2026-07-04 実測: push で `remote: fatal: did not receive expected object d696350b...` / `remote unpack failed: index-pack failed`。`git rev-parse --is-shallow-repository` => true、`.git/shallow` 1行。`git fetch upstream --unshallow` 後に同コマンドで false、直後の push 成功。
