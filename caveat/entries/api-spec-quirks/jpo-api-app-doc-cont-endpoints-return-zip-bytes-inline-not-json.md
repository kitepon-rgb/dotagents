---
id: jpo-api-app-doc-cont-endpoints-return-zip-bytes-inline-not-json
title: 'JPO 特許情報取得 API: app_doc_cont_* endpoints return ZIP bytes inline (not JSON)'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - jpo
  - patent
  - japan
  - api-spec-quirk
  - binary-response
  - zip
  - unicode-decode-error
  - httpx
  - json-vs-binary
environment:
  os: win32
  arch: x64
  node: 24.14.0
  api_base: https://ip-data.jpo.go.jp
  endpoint_family: app_doc_cont_*
  auth: OAuth2 Resource Owner Password Grant
  spec_url: https://ip-data.jpo.go.jp/api_guide/api_reference.js
source_project: null
source_session: 2026-05-01T08:09:02.360Z/9cb69145417a
created_at: 2026-05-01
updated_at: 2026-05-01
last_verified: 2026-05-01
---

## Context

Discovered while building an MCP server (IP-MCP) wrapping the JPO 特許情報取得 API for Claude clients. The trap surfaces when an LLM client invokes a tool that fetches examiner documents for any post-2019 Japanese patent that has small refusal-reason attachments — which is most of them.

## Symptom

UnicodeDecodeError: 'utf-8' codec can't decode byte 0x86 in position 11: invalid start byte — when calling `response.json()` on the response from JPO's app_doc_cont_opinion_amendment / app_doc_cont_refusal_reason / app_doc_cont_refusal_reason_decision endpoints. Crashes any tool that fetches refusal-reason / opinion / amendment documents for patents that have small attachments.

## Cause

JPO 特許情報取得 API (`https://ip-data.jpo.go.jp/api/patent/v1/app_doc_cont_*/`) returns documents in TWO different shapes from the same endpoint:

1. **Small documents (typically &lt;10 MB) → raw ZIP bytes inline.** Content-Type is `application/zip`, body starts with the PK\\x03\\x04 magic. There is NO JSON envelope wrapping it. Position 11 of a typical ZIP body is a "general purpose bit flag" / "compression method" byte that is often non-UTF-8 (e.g. 0x86), which is what surfaces in the decode error.

2. **Large documents (≥10 MB) → JSON envelope** with `result.statusCode` and a one-shot signed download URL in `result.data.URL`.

Most other JPO endpoints (`/case_number_reference/...`, `/app_progress/...`, `/registration_info/...`, etc.) always return the JSON envelope, so it is easy to write a single `get_json()` helper that calls `response.json()` unconditionally — and then have it crash only on the `app_doc_cont_*` family. The OpenAPI spec at https://ip-data.jpo.go.jp/api_guide/api_reference.js does describe both response shapes but the dual-mode behavior is easy to miss.

## Resolution

Detect binary vs JSON before parsing:

- Check Content-Type header for `zip`, `octet-stream`, or `pdf`
- AND/OR check the magic bytes: ZIP starts with `PK\\x03\\x04` (0x504b0304), PDF starts with `%PDF` (0x25504446)
- Only call `response.json()` (or equivalent) when the response is confirmed JSON

Concretely, a `get_raw(path)` helper that returns `(http_status, content_type, content_bytes)` plus an `is_binary` predicate, leaving the JSON-vs-binary routing to the caller. The same retry rules (HTTP 401 → re-fetch token; JSON statusCode 210 → re-fetch token; JSON statusCode 303 → exponential backoff) only apply on the JSON path; binary responses pass through immediately.

Reference implementation: https://github.com/kitepon-rgb/IP-MCP/blob/main/src/ip_mcp/jpo/client.py (`JpoClient.get_raw` + `JpoRawResponse`).

## Evidence

Live verification on 2026-05-01 against application 2009080841 (特開2010-228687):
- `GET /api/patent/v1/app_doc_cont_refusal_reason/2009080841` returned Content-Type `application/zip`, 1789 bytes, body starting with `0x504b03041400000` (valid ZIP local file header).
- The previous code path called `response.json()` unconditionally and crashed with `UnicodeDecodeError: byte 0x86 in position 11`.
- After switching to a Content-Type / magic-byte check, the same call returned cleanly as a binary blob that could then be base64-encoded for inline LLM consumption.
