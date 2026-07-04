---
id: claude-code-workflow-agents-have-edit-write-tools-by-default-a-review-only-workflow-phase-can-silently-mutate-source-files
title: Claude Code Workflow agents have Edit/Write tools by default — a "review-only" workflow phase can silently mutate source files
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - claude-code
  - workflow
  - subagent
  - tools
  - readonly
  - edit
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  tool: Claude Code Workflow tool
  agent: default workflow subagent (agentType omitted)
source_project: null
source_session: 2026-05-31T15:18:38.015Z/fa163a2483d0
created_at: 2026-05-31
updated_at: 2026-05-31
last_verified: 2026-05-31
---

## Symptom

Ran a Workflow whose agent() prompts asked only to REVIEW and return structured findings (no instruction to edit anything). After the run finished, a source file that was under review had already been modified — a fix applied — without me doing it. An Edit I then issued to apply that same fix failed with "String to replace not found" because the change was already present.

## Cause

The default workflow subagent (agent()/parallel() called without agentType) inherits the full tool set, including Edit/Write. A reviewer/verifier agent decided to "helpfully" apply a fix to the file it was reviewing. A prompt that merely describes a read-only task does NOT restrict the agent's tools.

## Resolution

For review/analysis/search workflows, pass agentType:'Explore' (read-only) to agent()/parallel(), or another read-only subagent type, and/or explicitly forbid edits in the prompt. Treat a "review" workflow as potentially write-capable: always `git diff` the working tree after any workflow that read files, to catch unintended mutations.

## Evidence

In a front-end review workflow over site/shimanami-kaido/index.html, a verifier changed body{overflow-x:hidden} to overflow-x:clip during the run. My later Edit targeting `overflow-x:hidden` failed ("not found"); `git diff` vs HEAD showed the hidden→clip change already in the working tree, predating my edit. One rejected finding even noted "the fix is already applied in the actual source file."
