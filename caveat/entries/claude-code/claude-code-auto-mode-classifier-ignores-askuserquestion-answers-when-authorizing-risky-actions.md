---
id: claude-code-auto-mode-classifier-ignores-askuserquestion-answers-when-authorizing-risky-actions
title: Claude Code auto-mode classifier ignores AskUserQuestion answers when authorizing risky actions
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - claude-code
  - classifier
  - AskUserQuestion
  - permissions
  - git-push
  - gh
  - caveat-record
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  product: Claude Code
  surface: VSCode extension
  model: claude-opus-4-7
  auto_mode: default
  project: codex-link-p2p
source_project: null
source_session: 2026-05-13T14:35:52.359Z/43ccfc1fd5c4
created_at: 2026-05-13
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Context

Hit during phase-by-phase commit/push of the codex-link-p2p P2P bootstrap. The blocked operations were exactly the "shared-state / hard-to-reverse" class the global guidance asks Claude to confirm before — confirming via AskUserQuestion isn't a valid channel for them. Affected commands in this repo's workflow: `gh repo create ... --public`, `git push origin main`, and `mcp__caveat__caveat_record` with `visibility: public` for classifier-related entries.

## Symptom

After the user authorizes a publicly-visible / destructive action (e.g. `gh repo create --public`, `git push origin main`) by selecting an option via the `AskUserQuestion` tool, the next tool call that performs the authorized action is blocked by the Claude Code auto-mode safety classifier with a message like "user authorization is not visible / not confirmed" — even though the AskUserQuestion answer chip is rendered in the UI.

## Cause

The Claude Code auto-mode safety classifier inspects the transcript text it can see. `AskUserQuestion` answers are delivered as a structured `answers` object on the tool result (rendered as a chip in the UI) and are not surfaced in the classifier's text view of the conversation. From the classifier's perspective the action looks unauthorized, so it intervenes and refuses the next risky tool call — regardless of which option the user picked.

## Resolution

For risky / shared-state / hard-to-reverse actions (public repo creation, force push, main-branch push, sending external messages, etc.), ask the user as plain user-message text ("Reply OK to confirm `git push origin main`") so the user's reply lands in the transcript text the classifier reads. Reserve `AskUserQuestion` for preference / branching / non-risky decisions.

## Evidence

Reproduced twice in one Claude Code VSCode session (codex-link-p2p project, 2026-05-13) with Opus 4.7: (1) `gh repo create kitepon-rgb/codex-link-p2p --public --source=. --remote=origin --push` blocked after AskUserQuestion answer "create public repo"; (2) `git push origin main` blocked after AskUserQuestion answer "進めていい". Both succeeded after the user typed plain "OK push" into chat. Also reproduced once for the inverse case: trying to register a `public` caveat documenting this very behavior is itself blocked as "publicly visible artifact created without explicit user authorization".
