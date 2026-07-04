---
id: x-api-v2-post-2-tweets-returns-503-intermittently-naive-httperror-then-retry-path-burns-tokens-and-risks-duplicate-posts
title: X API v2 POST /2/tweets returns 503 intermittently — naive HTTPError-then-retry path burns tokens and risks duplicate posts
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - x-api
  - twitter-api
  - '503'
  - oauth1
  - retry
  - duplicate-post
  - transient-error
environment:
  os: linux
  arch: x64
  node: 22.22.1
  api: X API v2 (api.twitter.com/2/tweets)
  auth: OAuth1.0a user-context
  tier: Premium / verified blue
  client: Python requests + requests_oauthlib
source_project: null
source_session: 2026-05-05T08:18:01.046Z/bd49f3cb67e3
created_at: 2026-05-05
updated_at: 2026-05-05
last_verified: 2026-05-05
---

## Symptom

`POST https://api.twitter.com/2/tweets` returns HTTP 503 Service Unavailable in clusters lasting 10-15 minutes, despite the X infrastructure being healthy minutes before and after. Same request body (text, OAuth1 signature, account credentials) succeeds when re-tested 4 hours later. The 503 is not correlated with: account-tier (both Premium accounts hit it), text length (failed at 1813/2442 chars and succeeds at 5349/7236 bytes of pure CJK in a re-test), CJK weight, content category, or rate limits (no x-rate-limit-remaining warning). It is a transient X-side outage that leaks through as 503 to OAuth1 clients.</symptom>
<parameter name="cause">X API v2 POST endpoint occasionally times out internally and surfaces the failure as 503 to clients. There is no advance signal on `GET /2/users/me` or other read endpoints (those continue to succeed during the window). The X dev community thread "/v2/tweets API returns 503 but Tweet published" (devcommunity.x.com/t/v2-tweets-api-returns-503-but-tweet-published/177687) documents that some 503s actually accept the post on the backend, so naive retry-on-503 risks duplicate-post errors on the second attempt. Reading 503 as "always failed" or "always retriable" is incorrect — both cases occur.

## Cause



## Resolution

Three structural changes, not "retry harder":

1. **Make the HTTP wrapper return a structured error, not raise.** Catch 5xx / 429 / `requests.exceptions.RequestException` and return `{"status":"error","code":"x_api_unavailable"|"rate_limited","http_status":<int>,"body":"<truncated>","retriable":true}`. Keep `raise_for_status()` for 4xx (those are real auth/payload bugs). Do NOT retry inside the wrapper — one attempt, one structured result.

2. **Tell the LLM/model layer never to retry x_post within a session.** Document in skill/system prompt: on `status="error"`, emit a final `skipped` result and exit. Two reasons: (a) model-driven retry burns tokens unpredictably, (b) the dev-forum phantom-success case means a retry can post twice.

3. **At the orchestrator layer, treat `x_api_unavailable` as a hard break, not a "try the next candidate" skip.** Re-running another loop minutes later will hit the same X-side window. Surface the intent row (with `tweet_id=NULL`) to the next scheduled tick, which uses a fresh idempotency key and will succeed once X recovers.

Bonus: shorten the subprocess timeout once retries are gone — 900s was sized for retry loops, 420s is enough for the new straight-line path. This caps the worst-case stuck-process duration and prevents WAL-lock cascade failures into other jobs.

## Evidence

2026-05-05 12:00 JST incident: 3 sequential publish sessions hit 503 on JA account. Mid-day (16:50 JST) reproduction test from same code path with same OAuth credentials posted 1813-char and 2442-char pure-hiragana tweets (5349/7236 bytes — heavier CJK weight than the failed posts) at HTTP 201 in <200ms. `GET /2/users/me` confirmed both JA and EN accounts on `subscription_type: Premium`, `verified_type: blue`. JA timeline check confirmed none of the 503-flagged posts actually published, so this incident's 503 was a real failure (not the phantom-success variant from the dev forum thread). Naive retry behavior burned 3-4 model invocations per failed session (~30s each) and one session hit a 900s subprocess timeout while stuck in a retry loop, killing the apscheduler job and leaving a SQLite WAL lock that broke ingest jobs for hours.
