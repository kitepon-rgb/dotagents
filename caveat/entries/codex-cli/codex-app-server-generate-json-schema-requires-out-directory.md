---
id: codex-app-server-generate-json-schema-requires-out-directory
title: codex app-server generate-json-schema requires --out directory
visibility: public
confidence: tentative
outcome: resolved
tags:
  - codex-cli
  - app-server
  - json-schema
  - cli
environment:
  os: linux
  arch: x64
  node: 22.22.1
  tool: Codex CLI
  subcommand: app-server generate-json-schema
  date_recorded: 2026-05-06
source_project: null
source_session: 2026-05-05T22:42:25.712Z/800377084481
created_at: 2026-05-05
updated_at: 2026-05-05
last_verified: 2026-05-05
---

## Context

Useful when probing Codex app-server JSON-RPC protocol support or generating local schemas before implementing an app-server client.

## Symptom

Running `codex app-server generate-json-schema --experimental` without an output directory fails instead of printing the schema to stdout.

## Cause

The Codex CLI schema generation subcommand requires an explicit `--out <DIR>` argument.

## Resolution

Invoke it with an output directory, for example `codex app-server generate-json-schema --experimental --out /tmp/codex-schema`, then read the generated schema files from that directory.

## Evidence

User-provided candidate from a prior reproduced app-server probe session.
