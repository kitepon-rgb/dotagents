---
id: node-e-script-arg-process-argv-1-is-arg-not-eval
title: 'node -e SCRIPT ARG: process.argv[1] is ARG, not ''[eval]'''
visibility: public
confidence: tentative
outcome: resolved
tags:
  - node
  - cli
  - argv
  - eval
environment:
  os: linux+macos
  arch: arm64
  node: v24 / v26
source_project: null
source_session: 2026-05-17T11:10:21.936Z/e779ddf55c95
created_at: 2026-05-17
updated_at: 2026-05-17
last_verified: 2026-05-17
---

## Symptom

When passing positional arguments after an inline script to node, e.g. `node -e 'console.log(process.argv)' myslug`, code that reads `process.argv[2]` gets `undefined`. The script silently treats the arg as missing.

## Cause

Node's `-e/--eval` mode does **not** insert a `'[eval]'` placeholder into argv. With `-e SCRIPT ARG...`, `process.argv` is `[<node>, ARG1, ARG2, ...]` — so the first user arg is at **index 1**, not 2. The "argv[1] === '[eval]'" pattern only applies when a script is read from **stdin** (`node < script.js` / REPL-like invocation), not when `-e` or `-p` is used. Easy to confuse because some docs and older blog posts conflate the two modes.

## Resolution

Use `process.argv[1]` for the first positional after `-e SCRIPT`. Or verify with a one-liner before assuming: `ssh host "node -e 'console.log(JSON.stringify(process.argv))' foo"` — produces `["/path/to/node","foo"]`. If you need to be agnostic to invocation mode, slice from the end or pass arguments via stdin / env vars instead of positional argv.

## Evidence

Confirmed on Node v24.14.1 (Ubuntu) over ssh and Node v26.0.0 (macOS): `ssh host "node -e 'console.log(JSON.stringify(process.argv))' en_wikipedia_org"` → `["/home/kite/.nvm/versions/node/v24.14.1/bin/node","en_wikipedia_org"]`. No `[eval]` element present.</evidence>
<parameter name="confidence">confirmed
