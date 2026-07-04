---
id: claude-cli-root-user-dangerously-skip-permissions
title: Claude CLI は root user で `--dangerously-skip-permissions` を拒否する
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-code
  - docker
  - non-root
  - permissions
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-29T11:26:17.046Z/b3624f57eb5b
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

Docker コンテナを default の root user で動かすと、`claude --dangerously-skip-permissions ...` 起動時に stderr に `--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons` を出して exit code 1 で死ぬ。bellbot 等の常駐セッションが 5 連敗ガードまで再 spawn を繰り返してクォータを焼く可能性。</symptom>
<parameter name="cause">Claude CLI のセキュリティ制約。root で `--dangerously-skip-permissions` を許すと sudo 権限で任意コードが走るため明示的に拒否。コンテナの default user が root だと該当する (node:24-slim 等もデフォルト root)。</cause>
<parameter name="resolution">Dockerfile に `USER node` (or 任意の non-root) を追加 + 必要なディレクトリの所有権を chown。host bind mount 利用時は host のファイル所有 UID と container 内 user の UID を一致させる必要 (node:24-slim の `node` user は UID 1000、host user が 1000 なら問題なし)。</resolution>
<parameter name="evidence">`[bell-claude] stderr: --dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons` `[bell-claude] claude process exited code=1 (intentional=false)` が連続 → `USER node` 追加で解消。</evidence>
<parameter name="environment">{"os": "linux", "claude_cli": "2.1.91", "context": "Docker container with default root user"}

## Cause



## Resolution



## Evidence


