---
id: x-article-delete-unpublish-graphql-ops-articleentitydelete-articleentityunpublish-x-has-no-private-visibility-unpublish-make-non-public
title: 'X Article delete & unpublish GraphQL ops: ArticleEntityDelete / ArticleEntityUnpublish; X has no ''private'' visibility (unpublish == make non-public)'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - twitter
  - x
  - article
  - graphql
  - delete
  - unpublish
  - visibility
  - queryid
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  service: X (Twitter) internal GraphQL article ops
  auth: web Bearer + cookies + x-client-transaction-id
source_project: null
source_session: 2026-05-31T06:26:31.433Z/e16f54f211b6
created_at: 2026-05-31
updated_at: 2026-05-31
last_verified: 2026-05-31
---

## Context

Adding delete + make-non-public tools to a self-hosted X Article MCP server.

## Symptom

Need to delete an X Article or make a published X Article non-public via the internal API, but no delete/unpublish operation is documented and ArticleEntityPublish's visibilitySetting only offers Public|Subscribers (no Private/Self/Unlisted).

## Cause

Two dedicated mutations exist (separate from publish): ArticleEntityDelete (queryId e4lWqB6m2TA8Fn_j9L9xEA) permanently destroys the article+linked tweet (IRREVERSIBLE); ArticleEntityUnpublish (queryId WbeMAOZdMHilHrqhgpjObw) reverts lifecycle Published->Draft, removing it from public view (REVERSIBLE — re-Publish to restore). There is NO 'set visibility private' op and no Private enum value, so 'make a published article non-public' == ArticleEntityUnpublish. Both take variables {articleEntityId} (Title-cased camelCase, like Publish/UpdateTitle — NOT the snake_case article_entity that only UpdateContent uses) and work with features {} (empty). Same request envelope as other article ops: POST x.com/i/api/graphql/<queryId>/<OperationName> with {variables, features, queryId} + Bearer + cookies + x-csrf-token + x-client-transaction-id.

## Resolution

Verified live 2026-05-31: x_article_delete on a throwaway draft -> 200; a subsequent op on the deleted id fails with GraphQL code 214 BadRequestError (proves destruction). x_article_unpublish on a published demo article -> 200; the linked tweet's oEmbed went 200 -> 404 (proves it left public view; lifecycle reverted to Draft). queryIds corroborated across fa0311/TwitterInternalAPIDocument, mvanhorn/printing-press-library, and the Icy-Cat Obsidian X-article plugin, and match the same deploy snapshot as the project's 6 already-known article queryIds. Caveat: X rotates queryIds per redeploy; if a call 404s, re-pull from fa0311 GraphQL.json and re-verify against known-good hashes.

## Evidence

delete: ArticleEntityDelete e4lWqB6m2TA8Fn_j9L9xEA {articleEntityId} features{} -> 200; deleted id then 214. unpublish: ArticleEntityUnpublish WbeMAOZdMHilHrqhgpjObw {articleEntityId} features{} -> 200; tweet oEmbed 200->404. visibilitySetting enum = {Public, Subscribers} only.
