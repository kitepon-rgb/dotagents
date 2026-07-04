---
id: codex-api-continuation-can-reach-task-complete-without-running-configured-stop-commands
title: Throughline Codex capture check can miss natural Stop DB advance even when other Codex Stop hooks work
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - codex
  - hooks
  - throughline
  - stop-hook
  - api-continuation
  - hooks.json
  - codex_hooks
environment:
  os: Linux
  arch: x64
  node: v22.22.1
  codex_cli: 0.128.0-alpha.1
  codex_feature_codex_hooks: stable true
  originator: codex_vscode / API continuation
  shell: bash
  project: Throughline
  throughline_cli: 0.3.24
  codex_config: ~/.codex/hooks.json Stop absolute node + bin/throughline.mjs codex-hook stop; ~/.codex/config.toml [features].codex_hooks = true
source_project: null
source_session: 2026-05-06T12:35:48.468Z/bd19067fca7c
created_at: 2026-05-06
updated_at: 2026-05-06
last_verified: 2026-05-06
---

## Context

Throughline repo context: `throughline install` writes `~/.codex/hooks.json` Stop[0] command `throughline codex-hook stop` and enables `[features].codex_hooks = true` in `~/.codex/config.toml`. Existing Caveat and Spotter hooks remained after it. `throughline codex-hook stop --json` captures rollout via `src/cli/codex-hook.mjs`, `src/cli/codex-capture.mjs`, and then runs Codex-primary summarize logic. The observed current thread was `019dfd38-c530-71c3-b7b8-180bdd3054bc`; previous manual capture was `codex:019dfd15-db7b-7521-9f66-050268bef1c8`.

Important narrowing: this is not evidence that Codex Stop hooks are globally broken. The Caveat project at `/home/kite/projects/Caveat` has Codex Stop hook smoke/history where Stop hooks do run. The important config differences found afterward were hook sync mode and command shape: Caveat registers Codex Stop with `async: false` and invokes an absolute node + installed CLI script path, while the first Throughline Codex registration used `async: true` and bare `throughline codex-hook stop` by copying the Claude Stop UX/PATH choice. Treat this entry as a Throughline capture-observation trap and check Codex hook async mode plus command path before making host-wide claims.

## Symptom

In a Throughline Codex capture-confirmation session, an assistant final response was followed by rollout `task_complete`, but Throughline DB latest session stayed on the previous manually captured `codex:<thread_id>` instead of advancing to the current `CODEX_THREAD_ID`. The first reading was too broad: Caveat has separate evidence that Codex Stop hooks can work in the same WSL environment.

## Cause

The local hook parser and manual Throughline hook command were valid. The failed observation was specifically that this Throughline session's DB capture did not naturally advance after final. Caveat Stop hooks work elsewhere in the same Codex/WSL setup, and Caveat's Codex installer uses `async: false` plus an absolute node/script command. The actionable causes were the async-mode mismatch and PATH-dependent bare command shape, not a global Codex Stop hook failure.

## Resolution

Do not silently add a fallback path or claim automatic Throughline Stop capture from a single DB observation. Use `throughline doctor --codex` to compare current `CODEX_THREAD_ID`, Codex hook feature state, Throughline Stop hook command, and latest DB session. For Throughline, register the Codex Stop hook as synchronous (`async: false`) and invoke absolute node + installed `bin/throughline.mjs`, with install updating existing bare or `async: true` Throughline entries. If capture is still required before reinstalling, run the explicit/manual payload or `throughline codex-capture --codex-thread-id <id>` path. When investigating, compare against `/home/kite/projects/Caveat` Stop hook runs before making host-wide claims.

## Evidence

`rtk throughline doctor --codex` before manual reproduction: current Codex thread `019dfd38-c530-71c3-b7b8-180bdd3054bc`, latest DB session `codex:019dfd15-db7b-7521-9f66-050268bef1c8`. Rollout tail showed `task_complete` after assistant final. `codex features list` showed `codex_hooks stable true`. Manual reproduction with stdin payload `{session_id, transcript_path, cwd}` piped to `throughline codex-hook stop --json` succeeded and captured `codex:019dfd38-c530-71c3-b7b8-180bdd3054bc` with 3 turns, 6 body rows, 73 details; summarize skipped with `within_l2_window`. Later correction from the user: Caveat project `\\wsl.localhost\Ubuntu-26.04\home\kite\projects\Caveat` / `/home/kite/projects/Caveat` has working Stop hook evidence, so avoid claiming Codex Stop hooks generally do not run. Caveat's `apps/cli/src/codexHookInstall.ts` registers hooks with `async: false`; Throughline's original `src/cli/install.mjs` registered Codex Stop with `async: true`. After changing Throughline Codex Stop to `async: false`, running `npm install -g .`, `throughline install`, then `codex exec --json -C /home/kite/projects/Throughline "Reply exactly: TL_CODEX_SYNC_STOP_SMOKE_20260506"` created child thread `019dfd4f-93ff-7522-8f89-bd1e1996c8d7`, and the next `throughline doctor --codex` showed latest DB session `codex:019dfd4f-93ff-7522-8f89-bd1e1996c8d7`.

Follow-up observation: the long-lived VSCode-origin parent thread `019dfd38-c530-71c3-b7b8-180bdd3054bc` had started before the `async:false` change. After a later assistant final, rollout showed another `task_complete`, but `throughline doctor --codex` still reported the exec child as latest DB. Treat that parent as a stale-hook-config probe, not evidence against the fixed synchronous hook. For VSCode-origin proof, start a fresh Codex session after install updates the hook shape.

Additional correction: Caveat's working hook also used an absolute node + CLI script command (`/usr/bin/node /home/kite/.npm-global/bin/caveat codex-hook stop`), while Throughline had used bare `throughline codex-hook stop`. Throughline install was updated to replace bare managed hooks with absolute node + `bin/throughline.mjs codex-hook stop`, keep `async: false`, and add `doctor --codex` hook diagnostics. After `npm install -g .` and `throughline install`, `~/.codex/hooks.json` Stop[0] became `/usr/bin/node /home/kite/projects/Throughline/bin/throughline.mjs codex-hook stop` with `async: false` / `timeoutSec: 300`, while Caveat and Spotter hooks remained. A new `codex exec --json -C /home/kite/projects/Throughline "Reply exactly: TL_CODEX_ABSOLUTE_STOP_SMOKE_20260506"` created child thread `019dfd5e-1248-7c11-8ddc-97e1b0701e10`, and `throughline doctor --codex` advanced latest DB session to `codex:019dfd5e-1248-7c11-8ddc-97e1b0701e10`.
