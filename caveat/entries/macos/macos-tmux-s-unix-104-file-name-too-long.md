---
id: macos-tmux-s-unix-104-file-name-too-long
title: macOS の tmux -S ソケットは UNIX ソケットパス 104 バイト上限で "File name too long" になる
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - tmux
  - unix-socket
  - macos
  - ENAMETOOLONG
  - mkdtemp
  - aiterm-mcp
environment:
  os: darwin
  arch: arm64
  node: 26.4.0
source_project: null
source_session: 2026-07-04T10:58:48.264Z/0d1f42c92353
created_at: 2026-07-04
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Context

aiterm-mcp v0.7.1 の characterization テスト追加中（2026-07-04）。core-tmux.test.mjs と同じ隔離ソケット方式を踏襲したのに新ファイルだけ落ちて数分溶けた。第三者再現可能な外部仕様罠なので public 昇格候補（オーナー承認待ち）。

## Symptom

テスト用に mkdtemp した TMPDIR 配下へ tmux ソケット（claude-tmux-sockets/claude.sock）を置いたら、tmux new-session が "error connecting to /var/folders/.../claude.sock (File name too long)" で失敗。既存テスト（prefix "aiterm-test-"）は通るのに、新テスト（prefix "aiterm-agent-test-"＝6字長い）だけ落ちた。

## Cause

macOS（BSD 系）の sockaddr_un.sun_path は 104 バイト上限（Linux は 108）。/var/folders/ 配下の一時ディレクトリは元々深く、mkdtemp の prefix が数文字伸びるだけで上限を跨ぐ。エラーは tmux からの "File name too long"（ENAMETOOLONG）で、パス長が原因だと直感しづらい。

## Resolution

ソケットを置く一時ディレクトリの prefix を短くする（aiterm-mcp では "aiterm-agent-test-" → "aiterm-agt-" で解消。test/core-agent.test.mjs にコメントで理由を明記）。設計時はソケットのフルパスを 100 バイト以内に収める。

## Evidence


