---
id: caveat-rare-anchor-gate-must-anchor-on-topical-text-not-symptom-text
title: Caveat rare-anchor gate must anchor on topical_text, not symptom_text
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - caveat
  - search
  - hooks
  - fts
environment:
  caveat_schema: v3
  observed_version: 0.14.1
  fixed_version: 0.14.2
  observed_date: 2026-05-06
source_project: Caveat
source_session: 2026-05-06T00:00:00.000Z/topical-anchor
created_at: 2026-05-06
updated_at: 2026-05-06
last_verified: 2026-05-06
---

## Context

Caveat v0.12 introduced schema v3 with two derived role-text columns: `topical_text` for title + tags + environment values, and `symptom_text` for the `## Symptom` section. The prompt-surfacing gate was meant to require both topic relevance and failure-state relevance without hand-written stopword lists.

## Symptom

Generic operational-status or mistrigger-question wording can surface unrelated caveats whose long Symptom prose happens to contain the same conversational fragments. The prompt overlaps a failure-state phrase but not the caveat's curated topic.

## Cause

The v0.12 rare-anchor gate was wired to the output of the symptom gate: it accepted entries when a prompt token in `symptom_text` was also on the rarest document-frequency tier. That lets a symptom prose fragment prove both "the user described a failure state" and "this is the caveat's topic". But schema v3 already split these roles. `symptom_text` answers "what broke"; `topical_text` answers "what this caveat is about".

## Resolution

Keep the gates independent. G2 requires at least one matched prompt token in `symptom_text`. G3 requires at least one matched prompt token in `topical_text`, and that topical token must be on the prompt's minimum document-frequency tier. Do not add stopword lists, thresholds, embeddings, or schema migrations for this class; the v3 columns already contain the needed structure.

## Evidence

Fixed in Caveat 0.14.2 by changing `packages/core/src/claudeHooks.ts::findCaveatsForPrompt` to track `symptomTokens` and `topicalTokens` separately. Added regression tests for the two symptom-only false-positive classes and a positive control where symptom evidence and a rare topical anchor are independent. `corepack pnpm -r test` and `corepack pnpm -r typecheck` passed.
