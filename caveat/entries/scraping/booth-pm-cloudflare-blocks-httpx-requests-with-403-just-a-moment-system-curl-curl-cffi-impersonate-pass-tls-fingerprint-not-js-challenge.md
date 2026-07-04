---
id: booth-pm-cloudflare-blocks-httpx-requests-with-403-just-a-moment-system-curl-curl-cffi-impersonate-pass-tls-fingerprint-not-js-challenge
title: booth.pm (Cloudflare) blocks httpx/requests with 403 'Just a moment' — system curl & curl_cffi impersonate pass (TLS fingerprint, not JS challenge)
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - cloudflare
  - booth.pm
  - tls-fingerprint
  - ja3
  - curl_cffi
  - curl-impersonate
  - httpx
  - '403'
  - anti-bot
environment:
  os: darwin
  arch: arm64
  node: 26.3.0
  client: httpx 0.28.1 / curl_cffi / system curl
  python: '3.12'
  site: booth.pm (Cloudflare-fronted)
source_project: null
source_session: 2026-06-21T04:13:34.026Z/c76063da029b
created_at: 2026-06-21
updated_at: 2026-06-21
last_verified: 2026-06-21
---

## Context

Building an ingest scraper for a booth.pm shop's product list. RSS/JSON deliberately blocked, so HTML scraping was required; chose system-curl subprocess first (zero new dep, already in container), with curl_cffi as the hardening upgrade if plain curl ever starts getting challenged.

## Symptom

Fetching a booth.pm shop page (e.g. https://&lt;shop&gt;.booth.pm/) with Python httpx/requests returns HTTP 403 with body "Just a moment..." (Cloudflare interstitial), even with a full set of browser-like headers (User-Agent, Accept, Accept-Language, Sec-Fetch-*, Upgrade-Insecure-Requests). The shop's .rss/.json endpoints separately return 406 Not Acceptable. So scraping via standard Python HTTP clients yields 0 items.

## Cause

Cloudflare bot detection blocks at the TLS/HTTP2 fingerprint (JA3/JA4 + Akamai HTTP2) layer, not the HTTP-header layer. Python's ssl-based clients (httpx/requests over httpcore) present a non-browser TLS fingerprint that Cloudflare challenges regardless of headers. It is NOT a JS managed challenge: system `curl` (which cannot execute JS) passes, proving the block is purely fingerprint-based at this site/time.

## Resolution

Use a client whose TLS+HTTP2 fingerprint Cloudflare accepts. Two verified options: (1) shell out to the system `curl` binary (`curl -sSL --compressed -A &lt;browser-UA&gt; URL`) — works because curl's OpenSSL fingerprint passes; (2) use curl_cffi with browser impersonation: `from curl_cffi import requests as r; r.get(url, impersonate="chrome")` — returns 200 + full HTML in-process (verified chrome/chrome124/safari all 200, no challenge). For booth.pm specifically, product metadata is server-rendered in `data-item="..."` HTML-entity-encoded JSON, so html.unescape + json.loads after fetch. Caveat: neither defeats an escalated JS managed challenge / Turnstile (needs a headless browser) nor an IP-reputation block (needs a clean IP/proxy).

## Evidence

Measured 2026-06-21: httpx.Client(headers=full_browser) GET https://qo-shop.booth.pm/ -&gt; 403, body contains "Just a moment...", data-item count 0. items.rss/items.json -&gt; 406. System curl -sSL -A chromeUA -&gt; 200, 107KB HTML, 3 data-item. curl_cffi impersonate in {None,'chrome','chrome124','safari'} -&gt; all 200, ~107-108KB, 3 data-item, no challenge. httpx http2=True untested (h2 pkg not installed).
