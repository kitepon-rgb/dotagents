---
id: pnpm-action-setup-v4-packagemanager-version
title: pnpm/action-setup@v4 は packageManager フィールドと version 入力の併記で即失敗する
visibility: private
confidence: confirmed
outcome: resolved
tags:
  - github-actions
  - pnpm
  - action-setup
  - packageManager
environment:
  os: darwin
  arch: arm64
  node: 26.4.0
source_project: null
source_session: 2026-07-03T23:10:24.564Z/73be05319442
created_at: 2026-07-03
updated_at: 2026-07-03
last_verified: 2026-07-03
---

## Context

NoveLore リファクタで CI 新設時（2026-07-04）。ci.yml の checks / e2e-db 両ジョブで発生、version 入力削除で両ジョブ green。

## Symptom

GitHub Actions で pnpm/action-setup@v4 に `with: version: 9` を指定し、かつ root package.json に `"packageManager": "pnpm@9.0.0"` がある状態で、ジョブがセットアップ段階（数十秒）で "Error: Multiple versions of pnpm specified" により即失敗する（checks/e2e-db 両ジョブとも）。

## Cause

pnpm/action-setup@v4 は package.json の packageManager フィールドを自動で読む。action の version 入力と両方があると、一致していても（9 vs 9.0.0 の表記差でも）二重指定としてエラーにする仕様。

## Resolution

action 側の `with: version:` を削除し、packageManager フィールドを単一ソースにする（uses: pnpm/action-setup@v4 を素で書く）。

## Evidence

run 28676822414 が28秒で failure・ログに "Error: Multiple versions of pnpm specified / Remove one of these versions to avoid version mismatch errors like ERR_PNPM_BAD_PM_VERSION"。修正後 run 28687162716 は checks/e2e-db とも success。
