---
id: drizzle-orm-node-postgres-wraps-db-errors-in-drizzlequeryerror-the-real-pg-error-code-constraint-detail-is-in-cause-not-message
title: drizzle-orm (node-postgres) wraps DB errors in DrizzleQueryError — the real pg error (code/constraint/detail) is in .cause, not .message
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - drizzle
  - drizzle-orm
  - postgres
  - node-postgres
  - error-handling
  - DrizzleQueryError
  - cause
environment:
  os: darwin
  arch: arm64
  node: '26'
  drizzle-orm: 0.38.4
  driver: drizzle-orm/node-postgres
  pg: 8.22.0
  postgres: '17'
source_project: null
source_session: 2026-06-29T00:21:37.566Z/b72cabb839ea
created_at: 2026-06-29
updated_at: 2026-06-29
last_verified: 2026-06-29
---

## Symptom

A catch block that classifies DB failures by regex-testing `error.message` (e.g. `/duplicate key|unique|_pkey|foreign key|constraint/i`) silently stops matching after upgrading drizzle-orm. Unique/PK/FK violations all fall through to a generic "write failed" branch, and the only detail available is the raw SQL: `error.message` is `"Failed query: insert into \"entity\" (...) values ($1, $2, ...) ..."` with no constraint name. Constraint-specific error classification (e.g. mapping entity_pkey → a friendly "use a new id" message) appears dead even though the code looks correct.

## Cause

drizzle-orm 0.38.x wraps every query-execution error in a `DrizzleQueryError`. Its `.message` is the failed SQL text ("Failed query: ... params: ..."), NOT the database error message. The underlying node-postgres `DatabaseError` — which carries `.code` (SQLSTATE, e.g. 23505 unique_violation / 23503 foreign_key_violation), `.constraint` (e.g. "entity_pkey"), `.detail` ("Key (id)=(...) already exists."), `.table` — is attached as `error.cause`. So any error handler that only inspects `error.message` loses all of this and cannot distinguish constraint types. Before the wrapping was introduced (older drizzle), the thrown error WAS the pg DatabaseError directly, so `error.message` worked — making this a silent regression on upgrade.

## Resolution

Walk the cause chain and read the pg fields, not `error.message`. e.g.:
```ts
function pgError(e: unknown) {
  let cur: unknown = e;
  for (let d = 0; d < 5 && cur && typeof cur === "object"; d++) {
    const o = cur as Record<string, unknown>;
    if (typeof o.code === "string" && /^[0-9A-Z]{5}$/.test(o.code))
      return { code: o.code, constraint: o.constraint, detail: o.detail, table: o.table };
    cur = o.cause;
  }
  return null;
}
```
Then classify on `code`/`constraint` (23505 + constraint name → which unique/PK; 23503 → FK) and surface `detail` instead of the raw SQL. Works for both the query builder (`.insert().onConflictDoUpdate()`) and `db.execute(sql\`...\`)` since the wrapping happens at the shared session layer.

## Evidence

Reproduced on a real Postgres 17 DB by inserting an entity row id=X at node A, then inserting the same id at node B (different node) through `.insert(entity).values({...}).onConflictDoUpdate({target:[nodeId,key]})`. Caught error dump:
error.constructor: DrizzleQueryError
error.message: "Failed query: insert into \"entity\" (\"id\", \"work_id\", \"node_id\", ...) values ($1, $2, $3, ...)"
has .cause: true
cause.constructor: DatabaseError
cause.code: 23505
cause.constraint: entity_pkey
cause.detail: "Key (id)=(...) already exists."
cause.table: entity
cause.message: "duplicate key value violates unique constraint \"entity_pkey\""
