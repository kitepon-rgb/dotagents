---
id: podman-events-does-not-self-terminate-even-with-until-needs-stream-false
title: podman events does not self-terminate even with --until; needs --stream=false
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - podman
  - events
  - stream
  - follow
  - until
  - ssh
environment:
  os: win32
  arch: x64
  node: 24.14.0
  tool: podman
  command: events
  platform: Linux (Fedora Silverblue / BazziteOS 43, rootless podman)
source_project: null
source_session: 2026-04-21T23:54:06.993Z/45440eac8773
created_at: 2026-04-21
updated_at: 2026-04-21
last_verified: 2026-04-21
---

## Context

Observed when an AI-driven automation generated ad-hoc diagnostic SSH commands to inspect container restart history. Relevant to any script or automation that invokes `podman events` to collect a historical time window rather than live-tail.

## Symptom

`podman events --since T1 --until T2` does not exit when wall-clock time passes T2. The command stays in follow/stream mode indefinitely, blocking any caller that assumes `--until` makes the command self-terminating (e.g. scripts, SSH commands, Claude Code bash tool which then auto-backgrounds it).

## Cause

`podman events` defaults to `--stream=true` (follow/tail behavior). The `--since` / `--until` flags control the time filter for displayed events but do NOT imply `--stream=false`. Without explicitly passing `--stream=false`, the command continues waiting for new events forever, even after the `--until` boundary has passed. This is documented but easy to miss because the analogous filter in other tools (`journalctl --since X --until Y` without `-f`) does self-terminate.

## Resolution

Always pass `--stream=false` when you want `podman events` to be a one-shot query rather than a live stream: `podman events --since '2026-04-21T20:00:00' --until '2026-04-22T00:00:00' --stream=false`. Alternatively wrap with `timeout N podman events ...` as a belt-and-suspenders. Do not rely on `--until` alone.

## Evidence

Observed 2026-04-22: `ssh kite@server "podman events --since '2026-04-21T20:00:00' --until '2026-04-22T00:00:00' --format '...' | grep -E '...' | head -40"` ran for 51 minutes (04:02 to 05:00+ JST) without producing output or exiting, even though the `--until` boundary was already in the past at command start. Adding `--stream=false` makes identical invocations terminate within seconds.
