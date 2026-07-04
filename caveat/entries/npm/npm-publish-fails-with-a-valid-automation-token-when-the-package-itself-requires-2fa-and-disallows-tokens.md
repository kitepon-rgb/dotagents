---
id: npm-publish-fails-with-a-valid-automation-token-when-the-package-itself-requires-2fa-and-disallows-tokens
title: npm publish fails with a valid automation token when the package itself requires 2FA and disallows tokens
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - npm
  - publish
  - 2fa
  - automation-token
  - granular-token
  - E403
  - npm-access
  - claude-code
environment:
  os: macOS
  arch: arm64
  node: 26.0.0
  registry: registry.npmjs.org
  tool: npm cli
  context: non-interactive shell (Claude Code)
source_project: null
source_session: 2026-06-06T16:21:18.494Z/df7dc67486f1
created_at: 2026-06-06
updated_at: 2026-06-06
last_verified: 2026-06-06
---

## Context

Releasing an existing public npm package (version bump + publish) from a non-interactive agent shell. whoami worked throughout, so auth wasn't the issue — the trap was token TYPE plus a per-package publish-security setting, surfaced only through misleading 403 messages.

## Symptom

`npm publish` returns 403 even though `npm whoami` succeeds and a valid token is configured. The error text changes depending on the token/account state and sends you on a wild goose chase: (a) granular access token → `E403 "Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages"`; (b) after DISABLING account 2FA → same/worse E403 and the `--otp` path is now gone; (c) classic Automation token → `E403 "Two-factor authentication is required to publish this package but an automation token was specified"`.

## Cause

Two INDEPENDENT gates must both be satisfied, and the error messages don't make that obvious: (1) The token in ~/.npmrc must be a CLASSIC "Automation" token. Granular access tokens (even with the "Bypass 2FA" checkbox) get rejected for publish in this setup. Diagnostic: `npm token list` only lists CLASSIC tokens — if the `_authToken` value in ~/.npmrc does NOT appear in `npm token list` yet `npm whoami` works, the configured token is granular = wrong type. (2) The PACKAGE has a per-package "Publishing access" setting. If it is "Require two-factor authentication and disallow tokens", even a correct classic Automation token is refused with "...automation token was specified". Disabling account-level 2FA does not help and removes the OTP fallback — npm always enforces 2FA-grade security for publishes.

## Resolution

Satisfy BOTH gates: (1) Generate a CLASSIC token of type "Automation" on npmjs.com (NOT a Granular Access Token) and set it: `npm config set //registry.npmjs.org/:_authToken=npm_xxx`. Confirm it now shows in `npm token list`. (2) Set the package's Publishing access to "Require two-factor authentication OR automation tokens" (= mfa=automation) via npmjs.com/package/<pkg>/access, or `npm access set mfa=automation <pkg>`. Then `npm publish <path> --access public` succeeds with no OTP. Notes: in Claude Code, `npm access set mfa=...` is blocked by the auto-mode permission classifier as a security-weakening change — change it via the website or add a `Bash(npm access:*)` allow rule. Verify the publish with `curl -s https://registry.npmjs.org/<pkg>/<ver>` (HTTP 200 + version) or `npm view <pkg> version --prefer-online`, because `npm view` can return a stale cached version right after publishing.

## Evidence

Observed cascade in one session (~28 min lost): granular token → E403 "...bypass 2fa...required"; disable account 2FA → E403 again (no improvement); swap to classic Automation token (now visible in `npm token list`, whoami=ok) → E403 "...automation token was specified"; set package mfa=automation on the web → `+ pkg@x.y.z` success, confirmed via direct registry GET returning HTTP 200 and the new version. The initial `npm view` still showed the old version (cache lag); `--prefer-online`/curl showed the new one.
