---
id: aiterm-pty-send-mark-true-breaks-heredoc-eof-terminator-heredoc-never-closes-shell-hangs
title: aiterm pty_send mark:true breaks heredoc EOF terminator — heredoc never closes, shell hangs
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - aiterm-mcp
  - pty
  - heredoc
  - shell
  - mcp
environment:
  os: linux
  arch: x64
  node: 22.22.1
source_project: null
source_session: 2026-07-04T14:16:15.145Z/036decd095ef
created_at: 2026-07-04
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Context

Any workflow driving a persistent PTY via aiterm-mcp and sending multi-line heredoc payloads (commit messages, file writes via cat <<EOF).

## Symptom

Sending a heredoc (e.g. `git commit -F - <<'EOF' ... EOF`) via aiterm-mcp `pty_send` with `mark: true` leaves the shell hanging in heredoc continuation (dquote/heredoc prompt), waiting for input forever. The command never executes.

## Cause

`mark: true` appends `; printf '...<<<AITERM_DONE rc=%d>>>...' "$?"` to the LAST line of the sent text. A heredoc terminator must be a bare line; the terminating `EOF` becomes `EOF; printf ...`, so the heredoc never closes.

## Resolution

Do not combine `mark` with heredocs. `pty_send` appends Enter, so ending the payload with `EOF` yields a correct bare `EOF\n` terminator. Detect completion with `pty_read` `wait:true` + `until:'<expected output pattern>'` (e.g. `files? changed|insertion` for a git commit). If already stuck, `pty_key C-c` cancels the heredoc input (nothing is committed) and returns to the prompt.

## Evidence


