# Elastic Orchestrator Worker Report skeleton decision

Date: 2026-07-15

Status: Accepted

## Context

`dotagents.delegation-packet.v1` correctly binds a Worker Report to Control, Task, Run, assignment, executor handle, validation refs, and packet digest. Its embedded `report_template` lists only top-level required and prohibited fields. During Observer dogfood, two native implementer runs returned semantically correct reports whose nested validation and evidence objects did not match `dotagents.worker-report.v1`; the parent had to normalize them manually before `worker-report-import`.

Manual normalization preserves safety because import remains strict, but it is not an acceptable standard workflow. The child needs a concrete exact-shape artifact before dispatch, while the immutable delegation packet v1 must remain byte-compatible.

## Decision

- Add the read-only CLI command `worker-report-skeleton` without changing `dotagents.delegation-packet.v1`.
- Input remains `{ cwd, control_id, worker_run_id }`.
- Read-only Runは`planned | admitted`、write Runはbaseline確定後の`admitted`で通常packet projectionを使う。`dispatched | running | unknown`では既存のrecovery projectionを使い、terminal Runは拒否する。
- Output schema is `dotagents.worker-report-skeleton.v1` with exact fields `schema_version`, `packet_digest`, `report`, and `placeholders`.
- `report` has exactly the fields accepted by `dotagents.worker-report.v1`. Correlation fields, executor handle, completed statuses, and Task validation refs are prefilled. Digest, timestamp, evidence ref, changed paths, and claims use explicit placeholder values described by `placeholders` and cannot be mistaken for an importable report。時刻placeholderはstrict importerと同じ`YYYY-MM-DDTHH:mm:ss.sssZ`（ミリ秒3桁・UTC `Z`）を明示する。
- The parent saves both packet and skeleton before dispatch and gives both paths to the child. A child fills values without renaming fields or inventing extra validation entries.
- The command is pure/read-only: it does not dispatch, observe, mutate Control, read executor product state, or inspect secrets.
- A focused fixture fills the generated skeleton with valid evidence, changed paths, claims, and digests, then imports it directly without parent schema normalization.

## Consequences

- Existing packet consumers and digest correlation remain unchanged.
- write Runのskeletonはadmission前に生成できないため、baseline HEAD確定前のstale digestを子へ渡さない。
- Packet-loss recovery and skeleton recovery share the same active-run state gate and never imply redispatch.
- The skeleton is guidance plus correlation, not evidence. Import remains the only validator and continues to reject placeholders, missing validations, failed results, scope drift, and extra fields.
