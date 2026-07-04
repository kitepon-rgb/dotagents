---
id: discord-privileged-intent-review-a-bot-that-resolves-only-known-user-ids-does-not-need-the-server-members-guild-members-intent
title: 'Discord privileged-intent review: a bot that resolves only known user IDs does NOT need the Server Members (GUILD_MEMBERS) intent'
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - discord
  - discord.js
  - gateway-intents
  - privileged-intents
  - guild-members
  - message-content
environment:
  os: linux
  arch: x64
  node: '>=18'
  discord.js: 14.26.0
source_project: null
source_session: 2026-06-21T09:29:32.344Z/34906d900e6f
created_at: 2026-06-21
updated_at: 2026-06-21
last_verified: 2026-06-21
---

## Context

Relevant because Discord changed the privileged-intent review trigger (≈2026) from "100 servers" to "10,000 unique users", so smaller bots inflated by being listed in a large bot-directory server can hit the review and want to minimize what they must justify.

## Symptom

A Discord bot crosses the user-reach threshold and Discord demands privileged-intent review (Server Members + Message Content) by a deadline, threatening to revoke both intents. You want to minimize the review surface and aren't sure whether the Server Members (GUILD_MEMBERS) intent can be dropped.

## Cause

GUILD_MEMBERS is only required for fetching the ENTIRE member list. In discord.js v14 the member operations route differently: `members.fetch(singleId)` and `members.search({query})` are pure REST calls (GET /guilds/{id}/members/{user} and .../members/search) and are intent-independent; `members.fetch({user:[ids]})` sends the gateway REQUEST_GUILD_MEMBERS op with `user_ids`, and per the Discord gateway spec specifying user_ids does NOT require GUILD_MEMBERS (only `query`/`limit` full-list requests do). Therefore a bot that only ever resolves KNOWN user IDs (e.g. reactors, participants, stored records) never needs the Server Members privileged intent.

## Resolution

Remove GUILD_MEMBERS from the client intents and apply for only the privileged intent you truly need (e.g. MESSAGE_CONTENT). Deploy the code that no longer requests the intent BEFORE turning the portal toggle off (requesting an intent disabled in the portal makes login fail; requesting fewer than enabled is always fine). Verify by logging in: the gateway reaches READY without a disallowed-intents error, and per-ID member name resolution still works. Bonus resilience: persisting display names at write-time gives a DB fallback so names render even if a live member fetch fails.

## Evidence

discord.js v14.26 GuildMemberManager.js: _fetchSingle -> client.rest.get(Routes.guildMember); _fetchMany -> op GatewayOpcodes.RequestGuildMembers with user_ids; search -> client.rest.get(Routes.guildMembersSearch). Full-list path (Routes.guildMembers) is the only one needing the intent and is never called by an ID-only bot. Empirically confirmed: after removing GUILD_MEMBERS the production bot logged "Bot ready!" (gateway READY, no disallowed-intent error) and name resolution kept working.
