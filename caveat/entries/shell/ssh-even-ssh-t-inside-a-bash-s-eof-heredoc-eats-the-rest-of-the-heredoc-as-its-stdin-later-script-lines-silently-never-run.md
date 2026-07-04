---
id: ssh-even-ssh-t-inside-a-bash-s-eof-heredoc-eats-the-rest-of-the-heredoc-as-its-stdin-later-script-lines-silently-never-run
title: ssh (even ssh -T) inside a `bash -s <<EOF` heredoc eats the rest of the heredoc as its stdin — later script lines silently never run
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - shell
  - ssh
  - heredoc
  - stdin
  - bash
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  shell: bash/zsh
  context: ssh host 'bash -s' <<heredoc
  client_os: macOS
source_project: null
source_session: 2026-05-31T15:18:45.831Z/61691e35142b
created_at: 2026-05-31
updated_at: 2026-05-31
last_verified: 2026-05-31
---

## Symptom

A remote script sent via `ssh host 'bash -s' <<'EOF' ... EOF` stops executing right after a line that runs `ssh -T git@github.com`. Output appears up to and including that ssh command, then nothing — every following command (git remote set-url, git pull, cleanup) silently does not run, with no error and exit appears clean.

## Cause

ssh reads from stdin by default. When the outer shell's stdin IS the heredoc feeding `bash -s`, the inner ssh slurps the remaining heredoc bytes as its own stdin, so the parent bash never sees the rest of the script. `-T` (disable PTY) does not change this; ssh still consumes stdin.

## Resolution

Redirect the inner command's stdin away from the heredoc: `ssh -T host </dev/null` (or `ssh -n host`). The same applies to ANY stdin-reading command (ssh, cat, ffmpeg, etc.) invoked inside a heredoc-fed shell — give it `</dev/null` or an explicit input.

## Evidence

Hit twice in one session: `ssh -T git@github.com-dobojo` and later `ssh -T git@github.com`, each placed inside a `ssh kite@host 'bash -s' <<'EOF'` block, truncated the remainder of the script. Removing the ssh-test line (or redirecting its stdin) let the full script execute.
