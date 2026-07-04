---
id: codex-cli-0-130-0-app-server-dual-approval-methods-json-rpc-id-type-must-be-preserved
title: 'Codex CLI 0.130.0 app-server: dual approval methods + JSON-RPC id type must be preserved'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - codex
  - codex-cli
  - app-server
  - json-rpc
  - approval
  - sandbox
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  codex_cli: 0.130.0
  platform: darwin
  transport: codex app-server stdio
source_project: null
source_session: 2026-05-11T02:04:48.205Z/5b602b0734cc
created_at: 2026-05-11
updated_at: 2026-05-11
last_verified: 2026-05-11
---

## Symptom

When embedding `codex app-server` (Codex CLI 0.130.0) as a stdio child and forwarding approvals to a remote client UI, two failure modes appear:

1. iPhone/remote client UI never receives any approval prompt even though `approval_policy` and `sandbox_policy` are set and the model invokes a sandboxed shell or apply_patch tool. The model just stalls without making progress.
2. After the client sends the approval response back to the server, Codex never resumes — the turn hangs until timeout, even though the client did send a JSON-RPC response with the right `requestId`.

## Cause

Two distinct upstream gotchas that both bite the same integration:

(A) Codex CLI 0.130.0 emits approvals over **two parallel server-request method families**. The "v2" / item-prefixed family is well-known: `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`, `item/tool/requestUserInput`. But the CLI ALSO sends bare `execCommandApproval` and `applyPatchApproval` server requests for the corresponding tools (see generated `ServerRequest.ts` enum). A client that handles only the `item/...` family silently drops the bare ones and the model stalls forever. The bare ones also do NOT carry `turnId` in `params` (only `conversationId` + `callId`), so the client has to track active turn out-of-band (e.g., from `turn/started` notification, or from the `turn/start` response) to attach the right `turnId` to its UI.

(B) JSON-RPC `id` is `number | string` and Codex CLI assigns numeric ids to its server requests (e.g., `id: 0`). If your bridge stringifies the id when forwarding to the UI and then `respondToServerRequest` writes the response back with the stringified id, Codex's pending-id table never matches and the request is treated as unresolved. The id type must round-trip exactly.

Bonus subtlety from the same area: `serverRequest/resolved` notification's `params.requestId` may also arrive as `number`, not `string`. A naive `typeof === "string"` guard drops the notification and the client never observes "approval resolved".

## Resolution

1. In your server-request normalizer, handle BOTH families. For `execCommandApproval` / `applyPatchApproval`, look up active `turnId` for the `conversationId` from a side table populated on `turn/started` notification AND on the `turn/start` response (the response can arrive before any notification, so populating only from notifications creates a race).
2. Keep a `Map<displayedRequestId, originalJsonRpcId>` in the bridge. On `respondToServerRequest`, look up and pass the original (number or string) id back, never the stringified version.
3. When parsing `serverRequest/resolved`, accept `params.requestId` as `string | number` and coerce to whatever your UI uses.

Reproducible with `codex app-server` (CLI 0.130.0) + a stdio JSON-RPC bridge + `approval_policy: on-request` + `sandbox: read-only` + a prompt that triggers the model to use the `exec_command` or `apply_patch` tool (e.g., `printf 'X' > foo.txt`).

## Evidence

Generated TS schema at `packages/codex-client/src/generated/codex-app-server/ServerRequest.ts` enumerates both `item/commandExecution/requestApproval` and bare `execCommandApproval` / `applyPatchApproval`. Reproduced live: `codex app-server` (0.130.0) sent `execCommandApproval` server request with `id: 0` (number) for an `exec_command` tool call under `sandbox_policy: { type: "read-only" }`; bridge that handled only `item/...` saw nothing on the wire UI side; bridge that stringified `id` had `respondToServerRequest("0", ...)` ignored by Codex; turn never completed. After (a) adding the bare-method normalize + active-turn side table + (b) preserving original numeric id, the `approval.requested` reached the UI, the user-side `accept` resolved the request, and the model's `printf '...' > foo.txt` ran and the turn completed.
