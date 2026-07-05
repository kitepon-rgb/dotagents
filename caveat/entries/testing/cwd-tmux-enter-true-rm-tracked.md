---
id: cwd-tmux-enter-true-rm-tracked
title: 破壊コマンドゲートの赤テストを「修正ビルド前」にルート cwd の実 tmux へ enter=true で送ると rm が発火して tracked ファイルが消える
visibility: private
confidence: confirmed
outcome: resolved
tags:
  - aiterm-mcp
  - tmux
  - destructive-command
  - test-safety
  - rm-rf
  - cwd
  - sandbox
environment:
  os: darwin
  arch: arm64
  node: 26.4.0
source_project: null
source_session: 2026-07-05T11:25:48.571Z/160e1f7cfc86
created_at: 2026-07-05
updated_at: 2026-07-05
last_verified: 2026-07-05
---

## Context

aiterm-mcp（Node/TS の tmux ベース永続 PTY MCP サーバ）。core.ts の send() は destructive gate を send-keys の前に実行するが、gate を通過すると enter=true で即実行される。test/core-tmux.test.mjs は本番ソケットを汚さぬよう TMPDIR を mkdtemp へ向けるが、tmux session の cwd は openSession が設定せず node プロセス cwd（=リポジトリルート）を継承していた。

## Symptom

aiterm-mcp で破壊コマンドゲート（core.ts の DESTRUCTIVE 配列）を widen する作業中、新しい遮断ケース（rm -rf ./*、rm -rf .. 等）を test/core-tmux.test.mjs の BLOCKED 配列に追加し、core.ts を修正する前に（＝dist/ が旧 regex のまま）テストを実行した。BLOCKED テストは assert.throws(() => core.send(SESS, cmd)) を enter 既定=true で呼ぶ設計で、旧 regex は新ケースを弾かないため send がゲートを通過し、コマンドが Enter 付きで実 tmux セッションへ送信・実行された。セッションの cwd がプロジェクトルートだったため rm -rf ./* がルート直下の非隠しファイル（CLAUDE.md/README/docs/ 等）を削除した。rm -rf .. は cwd を消せず失敗し親ディレクトリ（他プロジェクト）は無傷。.git は隠しゆえ残り全て git restore で復旧。

## Cause

「破壊コマンドが遮断されること」を、実シェルへ Enter 付きで送って throw を期待する形でテストしていた。ゲートが（未ビルド/バグで）すり抜けた瞬間にコマンドが実行される＝安全網が凶器になる構造。加えてテスト session の cwd がプロジェクトルートで、rm の対象が実資産だった。「赤を見るための実行」を、修正をビルドする前に行ったのが引き金。

## Resolution

多層防御でテストを構造的に安全化: (1) before() で session を使い捨てサンドボックス（fs.mkdtempSync 配下）へ cd してから走らせ、万一すり抜けても実害を temp に限定。(2) BLOCKED 送信を enter:false にし、ゲートがすり抜けても Enter を送らず未実行にする（ゲートの throw は send-keys より前なので enter の有無に関わらず発火し、テストの意味は保たれる）。運用面: 破壊系の赤テストは必ず修正をビルドしてから、かつ破壊コマンドを実行し得る経路では cwd をサンドボックス化する。復旧は git restore（消えたのは tracked ファイルのみ・.git は隠しで無傷）＋ npm ci（node_modules 破損）。

## Evidence

git status で CLAUDE.md/README.md/README.ja.md/CHANGELOG.md/LICENSE/CODE_OF_CONDUCT.md/CONTRIBUTING.md/SECURITY.md/glama.json/docs/* が deleted。親ディレクトリ /Users/kite/Developer は全プロジェクト無傷。node_modules/.bin/tsc 消失→npm ci で復旧。git restore で tracked 全復元後、npm test 111 pass/0 fail。
