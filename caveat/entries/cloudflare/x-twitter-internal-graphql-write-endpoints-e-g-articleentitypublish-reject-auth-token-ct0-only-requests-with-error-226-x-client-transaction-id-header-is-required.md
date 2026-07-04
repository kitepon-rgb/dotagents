---
id: x-twitter-internal-graphql-write-endpoints-e-g-articleentitypublish-reject-auth-token-ct0-only-requests-with-error-226-x-client-transaction-id-header-is-required
title: X (Twitter) internal GraphQL write endpoints (e.g. ArticleEntityPublish) reject auth_token+ct0-only requests with error 226 — x-client-transaction-id header is required
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - twitter
  - x
  - graphql
  - error-226
  - x-client-transaction-id
  - anti-automation
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  service: X (Twitter) internal GraphQL api (x.com/i/api/graphql)
  auth: web Bearer + auth_token/ct0/twid cookies
source_project: null
source_session: 2026-05-31T04:00:33.288Z/c96bc07fe212
created_at: 2026-05-31
updated_at: 2026-05-31
last_verified: 2026-05-31
---

## Context

Reverse-engineering X Article posting via internal GraphQL without third-party services.

## Symptom

Calling X's internal GraphQL API with only the fixed web Bearer + cookies (auth_token, ct0, twid) and x-csrf-token works for read/light-write ops (e.g. ArticleEntityDraftCreate, UpdateTitle, UpdateContent succeed), but a heavier write like ArticleEntityPublish fails with GraphQL error code 226 / AuthorizationError: "This request looks like it might be automated... we can't complete this action right now."

## Cause

Error 226 is X's anti-automation system (rolled out 2024-2025). Sensitive write endpoints require the `x-client-transaction-id` request header, a per-request value the official web client derives from x.com's homepage HTML (a meta verification key + loading-animation SVG path frames) plus the `ondemand.s` JS (byte indices), combined with the HTTP method+path+time. Cookies/Bearer alone are insufficient. Detection has also partly moved to behavioral/API-gateway profiling, so a valid transaction-id is necessary but not always sufficient.

## Resolution

Generate and attach `x-client-transaction-id` per request. Open-source implementations: iSarabjitDhiman/XClientTransaction (Python), swyxio/XClientTransactionJS (JS port), @lami/x-client-transaction-id (JSR/TS), langkor/x-client-transaction (Rust). The generator must periodically refresh its derived key because X rotates ondemand.s. Note which endpoints actually need it (publish/like/follow-class writes) vs which don't (draft create/update were observed to work without it).

## Evidence

Live 2026-05-31: via a self-hosted MCP, set_credentials/create_draft/update_title/update_content all returned success against x.com/i/api/graphql, but x_article_publish (ArticleEntityPublish, queryId m4SHicYMoWO_qkLvjhDk7Q) returned {\"code\":226,\"kind\":\"Permissions\",\"name\":\"AuthorizationError\"}. Request sent Bearer + ct0 + cookies but no x-client-transaction-id.
