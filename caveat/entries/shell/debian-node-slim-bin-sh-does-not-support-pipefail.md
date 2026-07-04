---
id: debian-node-slim-bin-sh-does-not-support-pipefail
title: Debian Node slim /bin/sh does not support pipefail
visibility: public
confidence: tentative
outcome: resolved
tags:
  - docker
  - debian
  - node-slim
  - shell
  - pipefail
environment:
  os: linux
  arch: x64
  node: 22.22.1
  base_image_family: Debian/Node slim
  shell: /bin/sh
  date_recorded: 2026-05-06
source_project: null
source_session: 2026-05-05T22:42:25.863Z/b35835b68c3b
created_at: 2026-05-05
updated_at: 2026-05-05
last_verified: 2026-05-05
---

## Context

Useful for Dockerfile or container entrypoint scripts based on Debian/Node slim images.

## Symptom

A script run under Debian/Node slim `/bin/sh` fails when it uses `set -o pipefail`.

## Cause

The `/bin/sh` implementation in Debian/Node slim images is not bash and does not support the `pipefail` shell option.

## Resolution

For `sh -s` scripts use `set -eu`; when `pipefail` is required, explicitly run the script with bash and ensure bash is installed in the image.

## Evidence

User-provided candidate from a prior container verification session.
