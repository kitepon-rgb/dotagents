---
id: github-actions-windows-corepack-enable-setup-node-pnpm-shell-c-program-is-not-recognized
title: GitHub Actions Windows で corepack enable を setup-node より先に実行すると pnpm シムがスペース入りパスに生成され、無クオートの shell 実行が 'C:\Program' is not recognized で死ぬ
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - github-actions
  - windows
  - corepack
  - pnpm
  - setup-node
  - shell
  - quoting
  - spawnsync
  - dep0190
environment:
  os: win32
  arch: x64
  node: 22 / 24
  ci: GitHub Actions windows-2022 / windows-2025-vs2026
source_project: null
source_session: 2026-07-04T13:06:42.085Z/5fbc021260fe
created_at: 2026-07-04
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Symptom

Windows ランナーの CI ジョブが `'C:\Program' is not recognized as an internal or external command` で失敗する（ubuntu/macos は緑）。ローカルの Windows 開発機では再現しないことが多く、5月末〜7月まで原因不明のまま全 windows ジョブが赤で放置された。エラー行の直前は正常で、Node スクリプトから pnpm/corepack を spawnSync(shell:true) で起動した瞬間に落ちる。

## Cause

二段の合わせ技。①ワークフローで `corepack enable` を `actions/setup-node` より**先**に実行すると、シムはプリインストール node の場所 `C:\Program Files\nodejs`（スペース入り）に生成される（setup-node 後なら hostedtoolcache＝スペース無し）。②Node の `spawnSync(command, args, {shell:true})` は command をクオートせずに cmd.exe へ連結するため、スペース入りパスの実行ファイルは `'C:\Program' is not recognized` になる。ローカル開発機は pnpm が %APPDATA%\Roaming\npm（スペース無し）にあるため再現しない＝環境差で潜伏する。

## Resolution

shell:true を使う箇所は「単一コマンド文字列＋トークン毎クオート」に統一する: `spawnSync([cmd, ...args].map(q).join(' '), {shell:true})`、`q = s => /[\s&|<>^()]/.test(s) ? `"${s}"` : s`。これは Node 24 の「shell:true + args 配列」非推奨（DEP0190）も同時に解消する。ワークフロー側の順序入替（setup-node → corepack enable）でも CI は直るが、スペース入りパス一般には無力なのでコード側クオートが根本対処。検証はスペース入りディレクトリに置いたスタブ cmd を環境変数で差して赤→緑を確認するのが確実（Caveat リポ PR #23 で実証・windows-2022/2025×Node22/24 全緑）。

## Evidence

kitepon-rgb/Caveat の CI run 28705492850（修正前・release-smoke ステップで全 windows ジョブ失敗）→ PR #23（scripts/pnpm.mjs のクオート修正）で run 28707106767 全6ジョブ pass（2026-07-04）。FOX Windows 実機でスペース入りパスのスタブにより修正前=再現・修正後=成功の赤緑確認済み。
