---
id: sqlite-comparing-an-iso-8601-t-offset-timestamp-against-datetime-now-as-raw-strings-breaks-ordering-within-the-same-date
title: 'SQLite: comparing an ISO-8601 ''T''/offset timestamp against datetime(''now'',...) as raw strings breaks ordering within the same date'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - sqlite
  - datetime
  - iso8601
  - string-comparison
  - timezone
  - flaky-test
  - time-dependent
environment:
  os: darwin
  arch: arm64
  node: 26.3.0
  db: SQLite (Python sqlite3, 3.12)
  timestamp_source: Python datetime.isoformat()
source_project: null
source_session: 2026-06-21T07:52:38.865Z/2e6a42239984
created_at: 2026-06-21
updated_at: 2026-06-21
last_verified: 2026-06-21
---

## Context

Implementing a "was there an event in the last N hours" guard in SQLite where the timestamp column was populated by Python isoformat(). Day-granularity queries elsewhere in the same codebase had the same latent pattern but were masked.

## Symptom

A SQL filter like `WHERE posted_at >= datetime('now','-24 hours')` works most of the time but a test asserting it is flaky — passes or fails depending on the wall-clock time-of-day it runs. e.g. a row stored 30h ago is wrongly counted as "within the last 24h" only at certain times of day, then correct at others.

## Cause

The column stores Python's `datetime.isoformat()` output, e.g. `2026-06-21T13:46:30+00:00` (capital 'T' separator, trailing `+00:00` offset). SQLite's `datetime('now', ...)` returns `2026-06-21 13:46:30` (SPACE separator, no offset). The comparison is a lexicographic TEXT compare, not a time compare. 'T' (0x54) > ' ' (0x20), so for two timestamps on the SAME calendar date, the ISO-'T' value always sorts as >= the space value regardless of the actual hour, and the `+00:00` suffix further skews it. The bug only manifests when the stored timestamp and the threshold fall on the same date — which depends on the current time-of-day — hence the time-dependent flakiness. At day-granularity (`-7 days`) the date prefix usually dominates so it's masked; at hour-granularity it bites often.

## Resolution

Normalize both sides with SQLite's `datetime()` so they share the canonical `YYYY-MM-DD HH:MM:SS` UTC form before the (now-correct) string compare: `WHERE datetime(posted_at) >= datetime('now', ?)`. `datetime()` parses ISO-8601 with the 'T' separator and a timezone offset and converts to UTC, so both operands become identically formatted. Verified boundary cases (2h/23h -> within, 25h/30h -> outside) pass deterministically regardless of time-of-day. (Alternative: store timestamps in SQLite's space-separated UTC form to begin with, or compare via `julianday()`/`strftime('%s',...)` epoch.)

## Evidence

Repro: store `datetime.now(timezone.utc).isoformat(timespec='seconds')` (e.g. '2026-06-21T11:46:30+00:00') as posted_at, query `posted_at >= datetime('now','-24 hours')`. At ~13:46 local the 30h-ago row (same UTC date as the 24h-ago threshold) returns TRUE (wrong). After switching to `datetime(posted_at) >= datetime('now','-24 hours')`, posted 2h/23h ago -> True, 25h/30h ago -> False, all correct. Manifested as a pytest that flipped pass/fail by time-of-day.
