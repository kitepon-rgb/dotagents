---
id: x-twitter-article-content-state-write-grammar-title-case-inline-styles-wrapped-entity-map-code-via-atomic-markdown-entity-only-header-one-two
title: 'X (Twitter) Article content_state write grammar: Title-case inline styles, WRAPPED entity_map, code via atomic+MARKDOWN entity, only header-one/two'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - twitter
  - x
  - article
  - draftjs
  - content_state
  - inline_style_ranges
  - entity_map
  - graphql
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  service: X (Twitter) internal GraphQL ArticleEntityUpdateContent
  format: Draft.js-derived content_state
source_project: null
source_session: 2026-05-31T05:48:57.771Z/2f28cfecd30d
created_at: 2026-05-31
updated_at: 2026-05-31
last_verified: 2026-05-31
---

## Context

Implementing a Markdown->content_state converter for self-hosted X Article posting (no third-party services).

## Symptom

Building an X Article body (ArticleEntityUpdateContent, queryId M7N2FrPrlOmu-YrVIBxFnQ) with a vanilla Draft.js raw content_state fails in confusing ways: top-level block `depth` -> 422 GRAPHQL_VALIDATION_FAILED; `style:"BOLD"` -> passes validation but EXECUTION 'Internal server error' at inline_style_ranges[].style; flat entity {type:"LINK",mutability:"MUTABLE",data} -> 422 at entity_map[0].type; `type:"code-block"` -> OperationalError 'Internal: Unspecified'; header-three..six -> server 500.

## Cause

X Articles use a Draft.js-DERIVED content_state with X-specific shapes, not vanilla Draft.js raw. (1) Inline style enum is Title-case: "Bold"|"Italic"|"Strikethrough" (uppercase passes the GraphQL string-enum check but the resolver only maps Title-case -> execution error). No inline Code/Underline. (2) entity_map is an ARRAY of WRAPPED entries {key:"0"(STRING), value:{type, mutability, data}}; the block's entity_ranges[].key is the NUMERIC index. Sending flat {type,...} makes X look for entity_map[0].value.type. (3) Links: value.type "LINK", data:{url}, mutability:"Mutable". (4) Code blocks: ONE block type:"atomic", text:" ", entity_ranges:[{offset:0,length:1,key}] -> entity {type:"MARKDOWN", mutability:"Mutable", data:{markdown:'```lang\ncode\n```'}}; append a trailing empty unstyled block if the body ends on atomic. (5) BODY IMAGES (verified 2026-05-31): same atomic-block wiring -> entity {type:"MEDIA", mutability:"Immutable" (NOTE: MEDIA is Immutable while LINK/MARKDOWN are Mutable), data:{entity_key:"<uuidv4>", media_items:[{local_media_id:<int>, media_category:"DraftTweetImage", media_id:"<from tweet_image upload>"}]}}; the image must be uploaded first (see the upload-403/Origin caveat). (6) Only header-one/header-two accepted on write; clamp deeper. (7) NESTED LISTS are unsupported on the write path: a top-level `depth` field 422s AND `depth` relocated into block.data ALSO 422s (verified 2026-05-31) — flatten is the only option. offsets/lengths are UTF-16 code units. Block keys: {key,text,type,data,entity_ranges,inline_style_ranges} only.

## Resolution

Emit the X-specific shapes above. All shapes verified live (each returned 200, no errors) and an end-to-end Markdown->content_state->publish produced a correctly rendered public article. Ground truth cross-corroborated by amaanq/teapot's READ-side parser of real article responses + multiple write implementations (Icy-Cat Obsidian plugin, dvcrn). To capture verbatim ground truth for any uncertain feature, read an existing article via ArticleEntityResultByRestId (queryId 8-OHhj8-KCAHUP8XjPaAYQ, fieldToggle withArticleRichContentState).

## Evidence

Live 2026-05-31 probes against ArticleEntityUpdateContent: style:"Bold" single range -> 200; style:"BOLD" -> exec 'Internal server error' at inline_style_ranges[].style; wrapped LINK entity {key:"0",value:{type:"LINK",mutability:"Mutable",data:{url}}}+entity_ranges{key:0} -> 200; flat LINK -> 422 at entity_map[0].type; atomic+MARKDOWN code -> 200; type:"code-block" -> OperationalError; header-one/two -> 200; top-level depth -> 422 at blocks[].depth; block.data.depth -> 422; MEDIA atomic body image with media_items -> 200 (full upload->embed flow rendered). GFM tables have no table block type — flatten rows to pipe-joined unstyled blocks.
