---
id: x-api-cannot-read-encrypted-x-chat-e2ee-direct-messages-webhook-and-2-dm-events-both-go-blind
title: X API cannot read encrypted "X Chat" (E2EE) Direct Messages — webhook and /2/dm_events both go blind
visibility: public
confidence: confirmed
outcome: impossible
tags:
  - x-api
  - twitter-api
  - direct-messages
  - dm_events
  - account-activity
  - encryption
  - e2ee
  - x-chat
  - webhook
environment:
  os: linux
  arch: x64
  node: 22.22.1
  api: X API v2
  endpoints: Account Activity webhook + /2/dm_events
  feature: X Chat E2EE / encrypted DMs
source_project: null
source_session: 2026-05-21T15:17:42.266Z/a9342470a422
created_at: 2026-05-21
updated_at: 2026-05-21
last_verified: 2026-05-21
---

## Context

Building a DM auto-reply feature: poll for new inbound DMs, generate a reply. Spent ~3 hours assuming the webhook/subscription was misconfigured (re-registered webhook, re-subscribed, re-authorized OAuth2) and then suspecting X DM spam-throttling, before finding the X developer-forum threads that name the real cause.

## Symptom

X Account Activity webhook delivers direct_message_events for a DM conversation, and GET /2/dm_events returns those messages — until at some point new inbound DMs stop appearing entirely. The webhook delivers no more direct_message_events for that conversation, and GET /2/dm_events (and the per-conversation GET /2/dm_conversations/with/{participant_id}/dm_events) return only messages up to a hard cutoff timestamp, never the newer ones. Non-DM events (favorites, retweets, follows, tweet_create) keep being delivered fine. The recipient can still see the new DMs in the X app. created_at timestamps on the API responses confirm an abrupt cutoff with nothing after it.

## Cause

The DM conversation was upgraded to X Chat (X's end-to-end-encrypted messaging). The X API v2 only supports legacy (unencrypted) DMs. Once a conversation becomes an encrypted X Chat conversation, its messages are end-to-end encrypted and the X API has no access to them — neither the Account Activity webhook nor any of the DM lookup endpoints (/2/dm_events, /2/dm_events/{id}, /2/dm_conversations/{id}/dm_events, /2/dm_conversations/with/{participant_id}/dm_events) return them. The cutoff timestamp is the moment the conversation was upgraded to X Chat. Confirmed by X's own developer relations on the X developer forum.

## Resolution

Not fixable in code. X developer relations (devcommunity.x.com threads 257336 and 259751, answered by an X staff member): "The X API only supports legacy DMs. If a DM conversation is upgraded to an X Chat / encrypted conversation, the DM messages will not be available via the API." Disabling encryption for a conversation is explicitly "not an option", and X Chat support for the API is only "being explored" for the future. Workaround scope: DM auto-reply / DM ingestion via the X API works ONLY for legacy (non-encrypted) DM conversations. Sending DMs via the API (POST /2/dm_conversations/...) still works regardless — encryption only blocks API READ of inbound messages. Diagnosis tip: query GET /2/dm_events with dm_event.fields=sender_id,text,event_type,created_at; if there is a hard created_at cutoff with the recipient seeing newer messages in-app, the conversation is encrypted. As X migrates DMs to X Chat broadly, API-based DM reading degrades for everyone.

## Evidence

Live: webhook delivered 2 direct_message_events at 11:31 and 11:59 UTC, then zero afterward despite the user sending many more DMs over the following hours. GET /2/dm_events and GET /2/dm_conversations/with/{participant_id}/dm_events both returned identical data ending at the 11:59:25Z message, nothing newer. favorite/retweet/follow/tweet_delete events kept arriving at the same webhook normally. Re-registering the webhook (fresh webhook id), re-creating the Account Activity subscription, and re-running OAuth2 authorization (with dm.read/dm.write scopes confirmed) all changed nothing. The user confirmed they had upgraded the conversation to encrypted X Chat during testing — matching the cutoff exactly. X staff confirmation: https://devcommunity.x.com/t/dm-webhooks-stop-delivering-events-after-api-reply-dm-lookup-inconsistency/257336 and https://devcommunity.x.com/t/x-api-stops-returning-new-direct-messages-in-the-dm-events-endpoint/259751
