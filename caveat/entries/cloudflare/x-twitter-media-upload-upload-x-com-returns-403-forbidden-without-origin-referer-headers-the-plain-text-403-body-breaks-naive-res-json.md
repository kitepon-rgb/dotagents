---
id: x-twitter-media-upload-upload-x-com-returns-403-forbidden-without-origin-referer-headers-the-plain-text-403-body-breaks-naive-res-json
title: X (Twitter) media upload (upload.x.com) returns 403 Forbidden without Origin/Referer headers; the plain-text 403 body breaks naive res.json()
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - twitter
  - x
  - media-upload
  - '403'
  - origin
  - referer
  - multipart
  - formdata
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  service: X (Twitter) media upload upload.x.com/i/media/upload.json
  runtime: Node 22 undici fetch/FormData
source_project: null
source_session: 2026-05-31T07:06:35.334Z/46c4b44056b8
created_at: 2026-05-31
updated_at: 2026-05-31
last_verified: 2026-05-31
---

## Context

Implementing body/cover image upload for a self-hosted X Article MCP server.

## Symptom

Uploading media to https://upload.x.com/i/media/upload.json (INIT/APPEND/FINALIZE) with a valid web Bearer + auth_token/ct0 cookies + x-csrf-token returns HTTP 403 Forbidden (body: plain text 'Forbidden: The server understood the request, but is refusing to fulfill it.'). If the client does res.json() on that body it throws a misleading 'Unexpected non-whitespace character after JSON at position 4 (line 1 column 5)' — because JSON.parse('403 Forbidden...') parses 403 then chokes at the space+F.

## Cause

upload.x.com's edge rejects the request as non-same-site when the web client's Origin/Referer are absent. Auth alone is insufficient. Fix: send Origin: https://x.com and Referer: https://x.com/. Two more gotchas on the same flow: (1) the APPEND step sends multipart FormData — do NOT set Content-Type yourself (let the HTTP client set the multipart boundary; a stray Content-Type: application/json corrupts the body). (2) include a fresh x-client-transaction-id (anti-automation). And always read the response as text and check res.ok before JSON.parse so a non-JSON error body is surfaced verbatim instead of a bogus parse error.

## Resolution

Verified live 2026-05-31: adding Origin: https://x.com + Referer: https://x.com/ to the upload requests turned INIT 403 -> 200 returning media_id_string. Headers used: Bearer + cookies + x-csrf-token + x-twitter-auth-type + x-client-transaction-id + Origin + Referer, with Content-Type removed (so undici sets the multipart boundary on APPEND). The returned media_id is then embedded directly in the article content_state as a MEDIA entity (body image) or attached via ArticleEntityUpdateCoverMedia (cover). media_category=tweet_image at upload time.

## Evidence

INIT without Origin/Referer -> 403 'Forbidden: The server understood the request, but is refusing to fulfill it.'; naive res.json() on it -> 'Unexpected non-whitespace character after JSON at position 4'. With Origin/Referer added -> 200 {media_id_string:...}; full body-image flow (upload -> MEDIA atomic block -> ArticleEntityUpdateContent) returned 200.
