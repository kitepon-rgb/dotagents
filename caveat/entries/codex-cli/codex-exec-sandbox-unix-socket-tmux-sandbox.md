---
id: codex-exec-sandbox-unix-socket-tmux-sandbox
title: codex exec の sandbox は Unix socket 作成を拒否＝tmux 依存テストが sandbox 内で全滅する
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - codex-cli
  - sandbox
  - seatbelt
  - tmux
  - unix-socket
  - delegation
  - macos
environment:
  os: macOS
  arch: arm64
  node: 26.4.0
  codex_cli: 0.144.1
  tmux: 3.7b
source_project: null
source_session: 2026-07-10T17:13:11.446Z/26537091cae2
created_at: 2026-07-10
updated_at: 2026-07-10
last_verified: 2026-07-10
---

## Context

aiterm-mcp のテスト＋README 更新を codex exec (gpt-5.6-terra) へ委譲した際に発生。委譲先は誠実に「実行環境が tmux の Unix socket 作成を拒否」と切り分けて報告してきた＝コード不具合と誤認せずに済んだ。

## Symptom

codex exec --sandbox workspace-write に「npm test を回して green まで自走」を委譲すると、tmux 依存テストが全件失敗する。tmux 側のエラーは `error creating /tmp/.../sockets/xxx.sock (Operation not permitted)`、テスト側の表面化は `tmux pipe-pane 失敗 ... (No such file or directory)` で、一見テスト回帰やコード不具合に見える。

## Cause

codex CLI の sandbox（macOS seatbelt）は workspace-write でもファイル書込とは別に Unix ドメインソケットの作成を許可しない。tmux はサーバ起動時に socket 作成が必須のため、tmux バックエンドのテストスイートは sandbox 内で原理的に動かない。

## Resolution

委譲契約側で「tmux 依存テストは sandbox 内で実行不能」を織り込む: 委譲先には tmux 非依存テスト＋build までを検証させ、フルスイートは統括が sandbox 外で再実行して採用判定する（実績: 委譲先報告 83 pass/100 fail〔全て socket 起因〕→統括のローカル再実行で 183 件全 green）。--dangerously-bypass-approvals-and-sandbox で回す選択肢はあるが委譲の隔離目的と矛盾する。

## Evidence

tmux 3.7b: `error creating /tmp/aiterm-tmux-check.XXXXXX/sockets/claude.sock (Operation not permitted)`。同一 working tree を sandbox 外で npm test → 183/183 green。
