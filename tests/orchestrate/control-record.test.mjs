import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, chmod, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { join } from "node:path";

import {
  addLinkedWorktree, canonicalDigest, cleanupDir, createBareRepo, createFingerprintBoundaryFiles, createGitRepo, createOversizedFingerprintFile,
  createNonGitDir, createOwnerFixtures, evidence, installSentinelBin, loadControl, makeConsultation, makeTask,
  makeApproval, makeBudget, makeBudgetReservation, makePlacementCandidate, makeRegistryObservation, makeTempDir, makeTransitionReceipt, makeWorkerRun, OWNER_SCHEMA, readPersistedManifest, runGit, spawnOrchestrate,
  taskAdmissionDigest, terminalWorkerObservation, completedWorkerObservation, workerObservation, writeJson,
} from "./helpers.mjs";

const api = await loadControl();
const CONTROL = "control-record-contract";

function code(expected) {
  return (error) => {
    assert.ok(error instanceof api.ControlRecordError, `ControlRecordError expected, got ${error?.constructor?.name}`);
    assert.equal(error.code, expected);
    return true;
  };
}

async function withRepo(t, fn) {
  const base = await makeTempDir();
  t.after(() => cleanupDir(base));
  return fn(await createGitRepo(base));
}

async function withFault(point, fn) {
  const previousNodeEnv = process.env.NODE_ENV; const previousFault = process.env.DOTAGENTS_ORCHESTRATE_TEST_FAULT;
  process.env.NODE_ENV = "test"; process.env.DOTAGENTS_ORCHESTRATE_TEST_FAULT = point;
  try { return await fn(); }
  finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
    if (previousFault === undefined) delete process.env.DOTAGENTS_ORCHESTRATE_TEST_FAULT; else process.env.DOTAGENTS_ORCHESTRATE_TEST_FAULT = previousFault;
  }
}

async function initialized(t, overrides = {}) {
  const base = await makeTempDir();
  t.after(() => cleanupDir(base));
  const repo = await createGitRepo(base);
  const result = await api.init({ cwd: repo.root, control_id: CONTROL, objective_ref: "docs/control-record-plan.md", actor_id: "parent-001", document_refs: ["docs/control-record-plan.md"], budget: makeBudget(), ...overrides });
  assert.equal(result.revision, 0);
  assert.equal(result.manifest.record_revision, 0);
  assert.equal(result.manifest.control_id, overrides.control_id ?? CONTROL);
  assert.deepEqual(await readPersistedManifest(repo.commonDir, overrides.control_id ?? CONTROL), result.manifest);
  return { repo, result };
}

test("純粋APIは同期で厳格schema・scopeを検証し、unknown fieldを拒否する", () => {
  const manifest = {
    schema_version: "dotagents.orchestration-control.v15", record_revision: 0, control_id: CONTROL, status: "active",
    declaration: { objective_ref: "docs/control-record-plan.md", project_root_realpath: "/project", common_dir_realpath: "/project/.git", git_dir_realpath: "/project/.git", git_dir_file_id: "1:1", base_sha: "0".repeat(40), initial_dirty: false, initial_status_digest: "a".repeat(64), initial_workspace_digest: "b".repeat(64), created_at: "2026-07-14T00:00:00.000Z", created_by: "parent-001" },
    continuation: { predecessor_control_id: null, root_control_id: CONTROL, sequence: 0 },
    durability: { protocol_version: "fsync-rename-fsync.v1", file_sync: "required", directory_sync: "required", atomic_rename: "required" }, budget: makeBudget(),
    role_effect_policy: { policy_version: "dotagents.role-effect.v1", read_only_roles: ["refuter", "sorter", "verifier"], approval_required_write_roles: ["integrator"] },
    document_refs: ["docs/control-record-plan.md"], tasks: [], task_cancellations: [], worker_runs: [], consultations: [], registry_observations: [], task_finalizations: [], control_finalization: null,
    transition_receipts: [makeTransitionReceipt()], last_update: { actor_id: "parent-001", updated_at: "2026-07-14T00:00:00.000Z" },
  };
  assert.deepEqual(api.validateManifest(manifest), manifest);
  assert.throws(() => api.validateManifest({ ...manifest, prompt: "must never persist" }), code("INVALID_SCHEMA"));
  assert.deepEqual(api.normalizeScope({ kind: "directory", path: "lib/orchestrate" }), { kind: "directory", path: "lib/orchestrate" });
  for (const path of ["../escape", "/absolute", "a\\b", ".", "a/*", "a/../b"]) assert.throws(() => api.normalizeScope({ kind: "directory", path }), code("INVALID_SCOPE"));
  assert.equal(api.scopesOverlap({ kind: "directory", path: "a/b" }, { kind: "file", path: "a/b/c.mjs" }), true);
  assert.equal(api.scopesOverlap({ kind: "directory", path: "a/b" }, { kind: "file", path: "a/bc.mjs" }), false);
});

test("すべてのI/O APIはcwdを必須にし、non-gitを拒否してbareをread-onlyとして初期化する", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const nonGit = await createNonGitDir(base); const source = await createGitRepo(base, "bare-source"); const bare = await createBareRepo(base, source);
  await assert.rejects(api.init({ control_id: CONTROL, objective_ref: "docs/x.md", actor_id: "parent", document_refs: ["docs/x.md"], budget: makeBudget() }), code("INVALID_INPUT"));
  await assert.rejects(api.init({ cwd: nonGit, control_id: CONTROL, objective_ref: "docs/x.md", actor_id: "parent", document_refs: ["docs/x.md"], budget: makeBudget() }), code("NOT_GIT_REPOSITORY"));
  const bareControl = await api.init({ cwd: bare.root, control_id: CONTROL, objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  assert.equal(bareControl.manifest.declaration.project_root_realpath, null);
  const read = await api.taskRecord({ cwd: bare.root, control_id: CONTROL, actor_id: "parent", expected_revision: bareControl.revision, task: makeTask({ task_id: "bare-read", effect: "read", write_scope: [] }) });
  assert.equal(read.manifest.tasks[0].effect, "read");
  await assert.rejects(api.taskRecord({ cwd: bare.root, control_id: CONTROL, actor_id: "parent", expected_revision: read.revision, task: makeTask() }), code("BARE_WRITE_FORBIDDEN"));
});

test("init/status はgit由来のdeclarationを保存し、重複controlとrevision競合を拒否する", async (t) => {
  const { repo, result } = await initialized(t);
  const status = await api.status({ cwd: repo.root, control_id: CONTROL });
  assert.deepEqual(status, result.manifest);
  assert.equal(status.declaration.base_sha, repo.baseSha);
  assert.equal(status.declaration.common_dir_realpath, repo.commonDir);
  assert.equal(status.transition_receipts.length, 1);
  assert.deepEqual(status.transition_receipts[0].subject, { kind: "control", id: CONTROL });
  assert.match(status.transition_receipts[0].receipt_digest, /^[0-9a-f]{64}$/);
  await assert.rejects(api.init({ cwd: repo.root, control_id: CONTROL, objective_ref: "docs/control-record-plan.md", actor_id: "parent-001", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() }), code("CONTROL_EXISTS"));
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: 1, task: makeTask() }), code("REVISION_CONFLICT"));
});

test("status briefとresume checkはopaque状態・workspace drift・evidence retentionを要約する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "brief-control" });
  const ready = await api.resumeCheck({ cwd: repo.root, control_id: "brief-control" });
  assert.equal(ready.outcome, "ready");
  await writeFile(join(repo.root, "docs", "resume-dirty.md"), "dirty\n");
  const changed = await api.resumeCheck({ cwd: repo.root, control_id: "brief-control" });
  assert.equal(changed.outcome, "review-required");
  assert.ok(changed.review_reasons.some((entry) => entry.code === "control-dirty-state-changed"));

  const statusControl = await api.init({ cwd: repo.root, control_id: "brief-state-control", objective_ref: "docs/control-record-plan.md", actor_id: "parent-001", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "brief-state-control", actor_id: "parent-001", expected_revision: statusControl.revision, task: makeTask({ task_id: "brief-task", effect: "read", write_scope: [], required_capabilities: ["report.structured", "workspace.read"] }) });
  const registry = await api.registryObservationRecord({ cwd: repo.root, control_id: "brief-state-control", actor_id: "parent-001", expected_revision: task.revision, observation: makeRegistryObservation({ registry_observation_id: "brief-registry" }) });
  const worker = await api.workerRunRecord({ cwd: repo.root, control_id: "brief-state-control", actor_id: "parent-001", expected_revision: registry.revision, worker_run: makeWorkerRun({ worker_run_id: "brief-worker", task_id: "brief-task", assignment_id: "brief-worker-assignment", write_mode: "none", workspace_cwd: repo.root, lineage: { ...makeWorkerRun().lineage, root_assignment_id: "brief-worker-assignment" } }) });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "brief-state-control", actor_id: "parent-001", expected_revision: worker.revision, worker_run_id: "brief-worker" });
  const dispatched = await api.observeWorker({ cwd: repo.root, control_id: "brief-state-control", actor_id: "parent-001", expected_revision: admitted.revision, worker_run_id: "brief-worker", observation: workerObservation("dispatched") });
  const consultation = await api.consultationRecord({ cwd: repo.root, control_id: "brief-state-control", actor_id: "parent-001", expected_revision: dispatched.revision, consultation: makeConsultation({ consultation_id: "brief-consultation", task_id: "brief-task", assignment_id: "brief-consultation-assignment" }) });
  const consultationDispatched = await api.observeConsultation({ cwd: repo.root, control_id: "brief-state-control", actor_id: "parent-001", expected_revision: consultation.revision, consultation_id: "brief-consultation", observation: { state: "dispatched", source: "gpt-connector", observed_version: "gpt-5.6", observed_at: "2026-07-14T00:01:00.000Z", raw_state: "dispatched" } });
  const unknown = await api.observeConsultation({ cwd: repo.root, control_id: "brief-state-control", actor_id: "parent-001", expected_revision: consultationDispatched.revision, consultation_id: "brief-consultation", observation: { state: "unknown", source: "gpt-connector", observed_version: "gpt-5.6", observed_at: "2026-07-14T00:02:00.000Z", raw_state: "unknown" } });
  const brief = await api.statusBrief({ cwd: repo.root, control_id: "brief-state-control" });
  assert.equal(brief.active.worker_runs[0].executor_handle.idempotency_key, "idempotency-001");
  assert.equal(brief.active.consultations[0].slug, "known-session-slug");
  assert.deepEqual(brief.unknown.consultation_ids, ["brief-consultation"]);
  assert.ok(brief.unknown.registry_observations[0].fields.includes("capacity:hard_inflight_limit"));
  assert.deepEqual(brief.uncollected.worker_run_ids, ["brief-worker"]);
  assert.deepEqual(brief.uncollected.consultation_ids, ["brief-consultation"]);
  assert.equal(unknown.revision, brief.record_revision);
});

test("resume checkはfile evidenceのretentionを検証し、opaque evidenceを内容複製せず列挙する", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base)); const repo = await createGitRepo(base);
  const proofPath = join(repo.root, "docs", "retained-proof.md"); const proofBody = "retained evidence\n";
  await writeFile(proofPath, proofBody);
  const proof = { type: "file", ref: "docs/retained-proof.md", digest: createHash("sha256").update(proofBody).digest("hex"), observed_at: "2026-07-14T00:00:00.000Z" };
  const opaque = { type: "executor-receipt", ref: "connector:codex-sidecar:retention", digest: "f".repeat(64), observed_at: "2026-07-14T00:00:00.000Z" };
  const init = await api.init({ cwd: repo.root, control_id: "retention-control", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "retention-control", actor_id: "parent", expected_revision: init.revision, task: makeTask({ task_id: "retention-task", effect: "read", write_scope: [], required_capabilities: ["report.structured", "workspace.read"] }) });
  const template = makeWorkerRun(); const capabilities = template.workflow_capabilities.map((entry) => ({ ...entry, evidence: proof }));
  const worker = await api.workerRunRecord({
    cwd: repo.root, control_id: "retention-control", actor_id: "parent", expected_revision: task.revision,
    worker_run: makeWorkerRun({ worker_run_id: "retention-worker", task_id: "retention-task", assignment_id: "retention-assignment", write_mode: "none", workspace_cwd: repo.root, workflow_capabilities: capabilities, execution_verification: { ...template.execution_verification, evidence: opaque }, lineage: { ...template.lineage, root_assignment_id: "retention-assignment" } }),
  });
  const retained = await api.resumeCheck({ cwd: repo.root, control_id: "retention-control" });
  assert.equal(retained.outcome, "ready");
  assert.deepEqual(retained.evidence_retention.local, [{ type: "file", ref: proof.ref, digest: proof.digest, status: "retained", observed_digest: proof.digest, error_code: null }]);
  assert.deepEqual(retained.evidence_retention.opaque, [{ type: "executor-receipt", ref: opaque.ref, digest: opaque.digest }]);
  await writeFile(proofPath, "changed evidence\n");
  const mismatch = await api.resumeCheck({ cwd: repo.root, control_id: "retention-control" });
  assert.equal(mismatch.outcome, "blocked"); assert.ok(mismatch.blocking_reasons.some((entry) => entry.code === "evidence-digest-mismatch"));
  await rm(proofPath);
  const missing = await api.resumeCheck({ cwd: repo.root, control_id: "retention-control" });
  assert.equal(missing.outcome, "blocked"); assert.ok(missing.blocking_reasons.some((entry) => entry.code === "evidence-missing"));
  await symlink("../README.md", proofPath);
  const unsafe = await api.resumeCheck({ cwd: repo.root, control_id: "retention-control" });
  assert.equal(unsafe.outcome, "blocked"); assert.ok(unsafe.blocking_reasons.some((entry) => entry.code === "evidence-unsafe"));
  assert.equal(worker.revision, 2);
});

test("resume checkは予約中writerのHEAD移動をblockedにする", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "resume-writer-head" });
  const task = await api.taskRecord({
    cwd: repo.root, control_id: "resume-writer-head", actor_id: "parent", expected_revision: result.revision,
    task: makeTask({ task_id: "resume-writer-task", isolation: "none", write_scope: [{ kind: "file", path: "README.md" }] }),
  });
  const run = await api.workerRunRecord({
    cwd: repo.root, control_id: "resume-writer-head", actor_id: "parent", expected_revision: task.revision,
    worker_run: makeWorkerRun({ task_id: "resume-writer-task", workspace_cwd: repo.root }),
  });
  await api.admitWorker({ cwd: repo.root, control_id: "resume-writer-head", actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
  await writeFile(join(repo.root, "README.md"), "writer moved HEAD\n");
  runGit(repo.root, ["add", "README.md"]); runGit(repo.root, ["commit", "-q", "-m", "move writer head"]);
  const resumed = await api.resumeCheck({ cwd: repo.root, control_id: "resume-writer-head" });
  assert.equal(resumed.outcome, "blocked");
  assert.ok(resumed.blocking_reasons.some((entry) => entry.code === "writer-head-changed" && entry.subject_id === "run-001"));
});

test("resume checkは予約中writerのignored成果物driftをblockedにする", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base)); const repo = await createGitRepo(base);
  await writeFile(join(repo.root, ".gitignore"), "build/\n");
  runGit(repo.root, ["add", ".gitignore"]); runGit(repo.root, ["commit", "-q", "-m", "ignore build"]);
  const init = await api.init({ cwd: repo.root, control_id: "resume-writer-ignored", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const task = await api.taskRecord({
    cwd: repo.root, control_id: "resume-writer-ignored", actor_id: "parent", expected_revision: init.revision,
    task: makeTask({ task_id: "resume-writer-ignored-task", isolation: "none", write_scope: [{ kind: "directory", path: "build" }] }),
  });
  const run = await api.workerRunRecord({
    cwd: repo.root, control_id: "resume-writer-ignored", actor_id: "parent", expected_revision: task.revision,
    worker_run: makeWorkerRun({ task_id: "resume-writer-ignored-task", workspace_cwd: repo.root }),
  });
  await api.admitWorker({ cwd: repo.root, control_id: "resume-writer-ignored", actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
  await mkdir(join(repo.root, "build")); await writeFile(join(repo.root, "build", "out.txt"), "ignored output\n");
  const resumed = await api.resumeCheck({ cwd: repo.root, control_id: "resume-writer-ignored" });
  assert.equal(resumed.outcome, "blocked");
  assert.ok(resumed.blocking_reasons.some((entry) => entry.code === "writer-workspace-drift" && entry.subject_id === "run-001"));
});

test("resume checkはplanned writerのignored成果物差をreviewへ送る", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base)); const repo = await createGitRepo(base);
  await writeFile(join(repo.root, ".gitignore"), "build/\n");
  runGit(repo.root, ["add", ".gitignore"]); runGit(repo.root, ["commit", "-q", "-m", "ignore planned build"]);
  const init = await api.init({ cwd: repo.root, control_id: "resume-planned-ignored", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "resume-planned-ignored", actor_id: "parent", expected_revision: init.revision, task: makeTask({ task_id: "resume-planned-ignored-task", isolation: "none", write_scope: [{ kind: "directory", path: "build" }] }) });
  const template = makeWorkerRun(); const opaque = evidence("resume-planned-ignored", "executor-receipt");
  await api.workerRunRecord({ cwd: repo.root, control_id: "resume-planned-ignored", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "resume-planned-ignored-task", workspace_cwd: repo.root, workflow_capabilities: template.workflow_capabilities.map((entry) => ({ ...entry, evidence: opaque })), execution_verification: { ...template.execution_verification, evidence: opaque } }) });
  await mkdir(join(repo.root, "build")); await writeFile(join(repo.root, "build", "out.txt"), "planned ignored output\n");
  const resumed = await api.resumeCheck({ cwd: repo.root, control_id: "resume-planned-ignored" });
  assert.equal(resumed.outcome, "review-required");
  assert.ok(resumed.review_reasons.some((entry) => entry.code === "worker-workspace-content-changed" && entry.subject_id === "run-001"));
});

test("resume checkはlinked worktree上のplanned Worker内容変更をreviewへ送る", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base)); const repo = await createGitRepo(base);
  const proofBody = "worker evidence\n"; await writeFile(join(repo.root, "docs", "execution-proof.md"), proofBody);
  runGit(repo.root, ["add", "docs/execution-proof.md"]); runGit(repo.root, ["commit", "-q", "-m", "add worker evidence"]);
  const linked = await addLinkedWorktree(repo, "resume-read-worker");
  const proof = { type: "file", ref: "docs/execution-proof.md", digest: createHash("sha256").update(proofBody).digest("hex"), observed_at: "2026-07-14T00:00:00.000Z" };
  const init = await api.init({ cwd: repo.root, control_id: "resume-read-worker", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "resume-read-worker", actor_id: "parent", expected_revision: init.revision, task: makeTask({ task_id: "resume-read-task", effect: "read", write_scope: [], isolation: "none", required_capabilities: ["report.structured", "workspace.read"] }) });
  const template = makeWorkerRun();
  await api.workerRunRecord({
    cwd: repo.root, control_id: "resume-read-worker", actor_id: "parent", expected_revision: task.revision,
    worker_run: makeWorkerRun({
      worker_run_id: "resume-read-run", task_id: "resume-read-task", assignment_id: "resume-read-assignment",
      workspace_cwd: linked.root, write_mode: "none",
      workflow_capabilities: template.workflow_capabilities.map((entry) => ({ ...entry, evidence: proof })),
      execution_verification: { ...template.execution_verification, evidence: proof },
      lineage: { ...template.lineage, root_assignment_id: "resume-read-assignment" },
    }),
  });
  assert.equal((await api.resumeCheck({ cwd: repo.root, control_id: "resume-read-worker" })).outcome, "ready");
  await writeFile(join(linked.root, "README.md"), "linked worker changed\n");
  const resumed = await api.resumeCheck({ cwd: repo.root, control_id: "resume-read-worker" });
  assert.equal(resumed.outcome, "review-required");
  assert.ok(resumed.review_reasons.some((entry) => entry.code === "worker-workspace-content-changed" && entry.subject_id === "resume-read-run"));
});

test("Control stateはPOSIX owner-only modeをread時にも強制する", async (t) => {
  if (process.platform === "win32") return;
  const { repo } = await initialized(t, { control_id: "mode-control" });
  const controlDir = join(repo.commonDir, "dotagents", "orchestrate", "controls", "mode-control");
  const manifestPath = join(controlDir, "manifest.json");
  await chmod(manifestPath, 0o644);
  await assert.rejects(api.status({ cwd: repo.root, control_id: "mode-control" }), code("STATE_PATH_UNSAFE"));
  await chmod(manifestPath, 0o600); await chmod(controlDir, 0o755);
  await assert.rejects(api.status({ cwd: repo.root, control_id: "mode-control" }), code("STATE_PATH_UNSAFE"));
});

test("receipt capacityは閉鎖用slotを予約し、archive済みControlからだけ後継へ継続する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "capacity-root" });
  const manifest = structuredClone(result.manifest);
  for (let revision = 1; revision <= 253; revision++) {
    const previous = manifest.transition_receipts.at(-1);
    manifest.transition_receipts.push(makeTransitionReceipt({
      revision, operation: "task-record", subject: { kind: "task", id: `synthetic-${revision}` },
      previous_state: null, next_state: "recorded", previous_receipt_digest: previous.receipt_digest,
    }));
  }
  manifest.record_revision = 253;
  manifest.last_update = { actor_id: "parent-001", updated_at: "2026-07-14T00:00:00.000Z" };
  await writeJson(join(repo.commonDir, "dotagents", "orchestrate", "controls", "capacity-root", "manifest.json"), manifest);
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: "capacity-root", actor_id: "parent", expected_revision: 253, task: makeTask({ task_id: "would-poison" }) }), code("CONTROL_CAPACITY_RESERVED"));
  await assert.rejects(api.init({ cwd: repo.root, control_id: "too-early", predecessor_control_id: "capacity-root", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() }), code("CONTINUATION_NOT_READY"));
  const finalized = await api.finalizeControl({
    cwd: repo.root, control_id: "capacity-root", actor_id: "parent", expected_revision: 253,
    acceptance_matrix_ref: "docs/acceptance.md", final_audit_evidence: [evidence("docs/audit.md")],
    regression_evidence: [evidence("tests", "command")], knowledge_return_refs: ["docs/knowledge.md"],
    parent_decision: evidence("docs/decision.md", "decision"), finalized_by: "parent",
  });
  const archived = await api.archive({ cwd: repo.root, control_id: "capacity-root", actor_id: "parent", expected_revision: finalized.revision });
  assert.equal(archived.manifest.transition_receipts.length, 256);
  const successor = await api.init({ cwd: repo.root, control_id: "capacity-successor", predecessor_control_id: "capacity-root", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  assert.deepEqual(successor.manifest.continuation, { predecessor_control_id: "capacity-root", root_control_id: "capacity-root", sequence: 1 });
  await assert.rejects(api.init({ cwd: repo.root, control_id: "capacity-root", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() }), code("CONTROL_EXISTS"));
});

test("257件目のControlはcommit前に拒否し既存Controlをpoisonしない", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "control-000" });
  const controls = join(repo.commonDir, "dotagents", "orchestrate", "controls");
  for (let index = 1; index < 256; index++) {
    const controlId = `control-${String(index).padStart(3, "0")}`;
    const manifest = structuredClone(result.manifest);
    manifest.control_id = controlId;
    manifest.continuation = { predecessor_control_id: null, root_control_id: controlId, sequence: 0 };
    manifest.transition_receipts = [makeTransitionReceipt({
      actor_id: manifest.last_update.actor_id,
      recorded_at: manifest.last_update.updated_at,
      subject: { kind: "control", id: controlId },
    })];
    await mkdir(join(controls, controlId), { mode: 0o700 });
    await writeJson(join(controls, controlId, "manifest.json"), manifest);
  }
  const input = { cwd: repo.root, control_id: "control-256", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() };
  await assert.rejects(api.init(input), code("CONTROL_CAPACITY_REACHED"));
  const existing = await api.taskRecord({ cwd: repo.root, control_id: "control-000", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "still-operational" }) });
  assert.equal(existing.revision, 1);
  await assert.rejects(access(join(controls, "control-256")));
});

test("TaskはF/A/H、scope、approval、global task_id一意性を正しく記録する", async (t) => {
  const { repo, result } = await initialized(t);
  const a = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: result.revision, task: makeTask() });
  assert.equal(a.revision, 1); assert.deepEqual((await readPersistedManifest(repo.commonDir, CONTROL)).tasks[0].doc_ref, makeTask().doc_ref); assert.match((await readPersistedManifest(repo.commonDir, CONTROL)).tasks[0].admission_digest, /^[0-9a-f]{64}$/);
  assert.deepEqual(await readdir(join(repo.commonDir, "dotagents", "orchestrate", "controls", CONTROL)), ["manifest.json"]);
  const f = makeTask({ task_id: "task-f", classification: "F", effect: "read", write_scope: [] });
  const fRecorded = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: a.revision, task: f });
  assert.equal(fRecorded.manifest.tasks.at(-1).classification, "F");
  const h = makeTask({ task_id: "task-h", classification: "H", effect: "read", write_scope: [], approval: makeApproval() });
  const hRecorded = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: fRecorded.revision, task: h });
  assert.equal(hRecorded.manifest.tasks.at(-1).approval.approval_ref, "docs/approval.md");
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: hRecorded.revision, task: makeTask({ task_id: "bad-h", classification: "H", approval: null }) }), code("INVALID_SCHEMA"));
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: hRecorded.revision, task: makeTask() }), code("DUPLICATE_ID"));
});

test("H Task admissionはapproval snapshotのoperation digestと有効期限を照合する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "approval-control" });
  const approval = makeApproval();
  const task = await api.taskRecord({
    cwd: repo.root, control_id: "approval-control", actor_id: "parent", expected_revision: result.revision,
    task: makeTask({ task_id: "h-task", classification: "H", effect: "read", write_scope: [], approval }),
  });
  const wrong = await api.workerRunRecord({
    cwd: repo.root, control_id: "approval-control", actor_id: "parent", expected_revision: task.revision,
    worker_run: makeWorkerRun({ worker_run_id: "h-wrong", assignment_id: "h-wrong", task_id: "h-task", write_mode: "none", operation_digest: "f".repeat(64), workspace_cwd: repo.root }),
  });
  await assert.rejects(api.admitWorker({ cwd: repo.root, control_id: "approval-control", actor_id: "parent", expected_revision: wrong.revision, worker_run_id: "h-wrong" }), code("APPROVAL_MISMATCH"));
  const right = await api.workerRunRecord({
    cwd: repo.root, control_id: "approval-control", actor_id: "parent", expected_revision: wrong.revision,
    worker_run: makeWorkerRun({ worker_run_id: "h-right", assignment_id: "h-right", task_id: "h-task", write_mode: "none", operation_digest: approval.operation_digest, workspace_cwd: repo.root }),
  });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "approval-control", actor_id: "parent", expected_revision: right.revision, worker_run_id: "h-right" });
  assert.equal(admitted.manifest.worker_runs.find((run) => run.worker_run_id === "h-right").state, "admitted");

  const expiredTask = await api.taskRecord({
    cwd: repo.root, control_id: "approval-control", actor_id: "parent", expected_revision: admitted.revision,
    task: makeTask({ task_id: "h-expired-task", classification: "H", effect: "read", write_scope: [], approval: makeApproval({ approved_at: "2020-01-01T00:00:00.000Z", expires_at: "2020-01-02T00:00:00.000Z" }) }),
  });
  const expiredRun = await api.workerRunRecord({
    cwd: repo.root, control_id: "approval-control", actor_id: "parent", expected_revision: expiredTask.revision,
    worker_run: makeWorkerRun({ worker_run_id: "h-expired", assignment_id: "h-expired", task_id: "h-expired-task", write_mode: "none", operation_digest: "d".repeat(64), workspace_cwd: repo.root }),
  });
  await assert.rejects(api.admitWorker({ cwd: repo.root, control_id: "approval-control", actor_id: "parent", expected_revision: expiredRun.revision, worker_run_id: "h-expired" }), code("APPROVAL_EXPIRED"));
});

test("role/effect policy snapshotはread-only roleと未承認integrator writeを拒否する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "role-effect-control" });
  for (const role of ["sorter", "refuter", "verifier"]) {
    await assert.rejects(api.taskRecord({
      cwd: repo.root, control_id: "role-effect-control", actor_id: "parent", expected_revision: result.revision,
      task: makeTask({ task_id: `${role}-write`, role }),
    }), code("ROLE_EFFECT_FORBIDDEN"));
  }
  await assert.rejects(api.taskRecord({
    cwd: repo.root, control_id: "role-effect-control", actor_id: "parent", expected_revision: result.revision,
    task: makeTask({ task_id: "integrator-write", role: "integrator" }),
  }), code("ROLE_EFFECT_FORBIDDEN"));
  const allowed = await api.taskRecord({
    cwd: repo.root, control_id: "role-effect-control", actor_id: "parent", expected_revision: result.revision,
    task: makeTask({ task_id: "integrator-h-write", role: "integrator", classification: "H", approval: makeApproval() }),
  });
  assert.equal(allowed.manifest.tasks[0].role, "integrator");
  assert.deepEqual(allowed.manifest.role_effect_policy.read_only_roles, ["refuter", "sorter", "verifier"]);
});

test("Registry observationは根拠付きtri-stateとcapacityを保存し、将来adapterをdispatch許可へ昇格させない", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "registry-primary" });
  const codexNative = makeRegistryObservation({ registry_observation_id: "registry-codex-native" });
  const nativeRecorded = await api.registryObservationRecord({
    cwd: repo.root, control_id: "registry-primary", actor_id: "parent-001", expected_revision: result.revision, observation: codexNative,
  });
  assert.deepEqual(nativeRecorded.manifest.registry_observations, [codexNative]);
  assert.deepEqual(nativeRecorded.manifest.transition_receipts.at(-1).subject, { kind: "registry-observation", id: "registry-codex-native" });
  assert.equal(nativeRecorded.manifest.transition_receipts.at(-1).operation, "registry-observation-record");

  const sidecar = makeRegistryObservation({
    registry_observation_id: "registry-sidecar", executor: {
      adapter_id: "codex-sidecar", contract_version: "v1", instance_id: "local-default", handle_schema_id: "codex-sidecar.idempotency-key.v1",
    },
    workflow_id: "work",
    enabled: { value: "false", evidence: evidence("docs/sidecar-disabled.md") },
    capacity: {
      admission: { value: "false", evidence: evidence("docs/sidecar-admission.md") },
      hard_inflight_limit: { knowledge: "known", value: 3, evidence: evidence("docs/sidecar-hard-limit.md") },
      soft_inflight_limit: { knowledge: "known", value: 2, evidence: evidence("docs/sidecar-soft-limit.md") },
      observed_inflight: { knowledge: "known", value: 0, evidence: evidence("docs/sidecar-observed.md") },
    },
  });
  const sidecarRecorded = await api.registryObservationRecord({
    cwd: repo.root, control_id: "registry-primary", actor_id: "parent-001", expected_revision: nativeRecorded.revision, observation: sidecar,
  });
  assert.equal(sidecarRecorded.manifest.registry_observations[1].capacity.soft_inflight_limit.value, 2);

  const aiterm = makeRegistryObservation({
    registry_observation_id: "registry-aiterm", executor: {
      adapter_id: "aiterm", contract_version: "v1", instance_id: "local-default", handle_schema_id: "aiterm.session.v1",
    },
    workflow_id: "interactive-session",
  });
  const aitermRecorded = await api.registryObservationRecord({
    cwd: repo.root, control_id: "registry-primary", actor_id: "parent-001", expected_revision: sidecarRecorded.revision, observation: aiterm,
  });
  assert.equal(aitermRecorded.manifest.registry_observations.length, 3);

  const future = makeRegistryObservation({
    registry_observation_id: "registry-future", executor: {
      adapter_id: "future-adapter", contract_version: "v9", instance_id: "future-instance", handle_schema_id: "future.handle.v1",
    },
    workflow_id: "future-workflow", enabled: { value: "unknown", evidence: null },
    capacity: {
      ...codexNative.capacity,
      hard_inflight_limit: { knowledge: "unknown", value: null, evidence: evidence("docs/future-capacity-unknown.md") },
    },
  });
  let futureRecorded = await api.registryObservationRecord({
    cwd: repo.root, control_id: "registry-primary", actor_id: "parent-001", expected_revision: aitermRecorded.revision, observation: future,
  });
  assert.equal(futureRecorded.manifest.registry_observations.at(-1).executor.adapter_id, "future-adapter");
  const futureRefresh = makeRegistryObservation({ ...future, registry_observation_id: "registry-future-refresh", expires_at: "2026-07-14T02:00:00.000Z" });
  futureRecorded = await api.registryObservationRecord({
    cwd: repo.root, control_id: "registry-primary", actor_id: "parent-001", expected_revision: futureRecorded.revision, observation: futureRefresh,
  });
  assert.equal(futureRecorded.manifest.registry_observations.at(-1).registry_observation_id, "registry-future-refresh");
  await assert.rejects(api.workerRunRecord({
    cwd: repo.root, control_id: "registry-primary", actor_id: "parent-001", expected_revision: futureRecorded.revision,
    worker_run: makeWorkerRun({ executor: future.executor, workflow_id: future.workflow_id }),
  }), code("ADAPTER_UNKNOWN"));

  const invalid = async (registry_observation_id, overrides, expected = "INVALID_SCHEMA") => {
    await assert.rejects(api.registryObservationRecord({
      cwd: repo.root, control_id: "registry-primary", actor_id: "parent-001", expected_revision: futureRecorded.revision,
      observation: makeRegistryObservation({ registry_observation_id, ...overrides }),
    }), code(expected));
  };
  await invalid("registry-missing-known-evidence", { enabled: { value: "true", evidence: null } });
  await invalid("registry-unknown-with-value", { capacity: { ...codexNative.capacity, observed_inflight: { knowledge: "unknown", value: 0, evidence: null } } });
  await invalid("registry-soft-over-hard", { capacity: { ...sidecar.capacity, soft_inflight_limit: { knowledge: "known", value: 4, evidence: evidence("docs/too-soft.md") } } });
  await invalid("registry-expiry-before-verification", { expires_at: "2026-07-13T23:59:59.000Z" });
  await invalid("registry-future-evidence", { enabled: { value: "true", evidence: evidence("docs/future-evidence.md", "file", { observed_at: "2026-07-14T00:00:01.000Z" }) } });
  await invalid("registry-gpt-connector", { executor: { adapter_id: "gpt-connector", contract_version: "v1", instance_id: "chat", handle_schema_id: "gpt-connector.slug.v1" } }, "EXECUTOR_FORBIDDEN");
  await invalid("registry-unknown-field", { unexpected: true });

  const second = await api.init({ cwd: repo.root, control_id: "registry-secondary", objective_ref: "docs/control-record-plan.md", actor_id: "parent-001", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  await assert.rejects(api.registryObservationRecord({
    cwd: repo.root, control_id: "registry-secondary", actor_id: "parent-001", expected_revision: second.revision,
    observation: makeRegistryObservation({ registry_observation_id: "registry-codex-native" }),
  }), code("DUPLICATE_ID"));
});

test("Placement dry-runはRegistry由来の候補をcanonical順で評価し、状態を変更しない", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "placement-control", budget: makeBudget({ max_wall_time_seconds: 3600, max_cost_microusd: 1000000 }) });
  const task = await api.taskRecord({
    cwd: repo.root, control_id: "placement-control", actor_id: "parent-001", expected_revision: result.revision,
    task: makeTask({ task_id: "placement-task", effect: "read", write_scope: [], isolation: "none", required_capabilities: ["report.structured", "workspace.read"] }),
  });
  const observedAt = "2026-07-14T00:00:00.000Z";
  const capacity = (overrides = {}) => ({
    admission: { value: "true", evidence: evidence("docs/placement-admission.md") },
    hard_inflight_limit: { knowledge: "known", value: 2, evidence: evidence("docs/placement-hard.md") },
    soft_inflight_limit: { knowledge: "known", value: 2, evidence: evidence("docs/placement-soft.md") },
    observed_inflight: { knowledge: "known", value: 0, evidence: evidence("docs/placement-observed.md") },
    ...overrides,
  });
  const observation = (registry_observation_id, overrides = {}) => makeRegistryObservation({
    registry_observation_id,
    executor: { adapter_id: "codex-native", contract_version: "v1", instance_id: registry_observation_id, handle_schema_id: "codex-native.agent-id.v1" },
    capacity: capacity(), ...overrides,
  });
  const inputs = [
    observation("placement-eligible"),
    observation("placement-admission-unknown", { capacity: capacity({ admission: { value: "unknown", evidence: null } }) }),
    observation("placement-soft-exhausted", { capacity: capacity({ soft_inflight_limit: { knowledge: "known", value: 1, evidence: evidence("docs/placement-soft-low.md") }, observed_inflight: { knowledge: "known", value: 1, evidence: evidence("docs/placement-observed-one.md") } }) }),
    observation("placement-disabled", { enabled: { value: "false", evidence: evidence("docs/placement-disabled.md") } }),
    observation("placement-enabled-unknown", { enabled: { value: "unknown", evidence: null } }),
    observation("placement-expired", { expires_at: "2026-07-14T00:15:00.000Z" }),
    observation("placement-adapter-unknown", { executor: { adapter_id: "future-adapter", contract_version: "v1", instance_id: "future", handle_schema_id: "future.handle.v1" }, workflow_id: "future-workflow" }),
    observation("placement-verification-insufficient", { verification: { stage: "installed", observed_version: "test-version", observed_at: observedAt, evidence: evidence("docs/placement-installed.md") } }),
    observation("placement-capability-missing", { workflow_capabilities: [{ capability_id: "workspace.read", value: "true", evidence: evidence("docs/placement-read.md") }] }),
    observation("placement-hard-exhausted", { capacity: capacity({ observed_inflight: { knowledge: "known", value: 2, evidence: evidence("docs/placement-observed-full.md") } }) }),
  ];
  let revision = task.revision;
  for (const entry of inputs) {
    const recorded = await api.registryObservationRecord({ cwd: repo.root, control_id: "placement-control", actor_id: "parent-001", expected_revision: revision, observation: entry });
    revision = recorded.revision;
  }
  const candidate = (candidate_id, registry_observation_id, overrides = {}) => makePlacementCandidate({ candidate_id, registry_observation_id, workspace_cwd: repo.root, ...overrides });
  const output = await api.placementDryRun({
    cwd: repo.root, control_id: "placement-control", task_id: "placement-task", evaluated_at: "2026-07-14T00:30:00.000Z",
    candidates: [
      candidate("z-budget-unknown", "placement-eligible", { budget_reservation: makeBudgetReservation({ wall_time_seconds: null }) }),
      candidate("y-budget-exceeded", "placement-eligible", { budget_reservation: makeBudgetReservation({ wall_time_seconds: 3601 }) }),
      candidate("x-hard-exhausted", "placement-hard-exhausted"), candidate("w-capability", "placement-capability-missing"),
      candidate("v-verification", "placement-verification-insufficient"), candidate("u-adapter", "placement-adapter-unknown"),
      candidate("t-expired", "placement-expired"), candidate("s-enabled-unknown", "placement-enabled-unknown"),
      candidate("r-disabled", "placement-disabled"), candidate("q-soft-review", "placement-soft-exhausted"),
      candidate("p-admission-review", "placement-admission-unknown"), candidate("o-registry-missing", "placement-missing"),
      candidate("a-eligible", "placement-eligible"),
    ],
  });
  assert.deepEqual(output, {
    control_id: "placement-control", control_revision: revision, task_id: "placement-task", evaluated_at: "2026-07-14T00:30:00.000Z",
    candidates: output.candidates,
  });
  assert.deepEqual(output.candidates.map((entry) => entry.candidate_id), [...output.candidates.map((entry) => entry.candidate_id)].sort());
  const resultById = new Map(output.candidates.map((entry) => [entry.candidate_id, entry]));
  assert.deepEqual(resultById.get("a-eligible"), { candidate_id: "a-eligible", registry_observation_id: "placement-eligible", eligibility: "eligible", reasons: [] });
  for (const [candidateId, eligibility, reason] of [
    ["p-admission-review", "review-required", "capacity-review-required"], ["q-soft-review", "review-required", "capacity-review-required"],
    ["r-disabled", "ineligible", "enabled-false"], ["s-enabled-unknown", "ineligible", "enabled-unknown"],
    ["t-expired", "ineligible", "registry-expired"], ["u-adapter", "ineligible", "adapter-unknown"], ["o-registry-missing", "ineligible", "registry-missing"],
    ["v-verification", "ineligible", "verification-insufficient"], ["w-capability", "ineligible", "capability-mismatch"],
    ["x-hard-exhausted", "ineligible", "capacity-hard-exhausted"], ["y-budget-exceeded", "ineligible", "budget-exceeded"], ["z-budget-unknown", "ineligible", "budget-unknown"],
  ]) {
    assert.equal(resultById.get(candidateId).eligibility, eligibility);
    assert.ok(resultById.get(candidateId).reasons.includes(reason));
  }
  assert.equal((await api.status({ cwd: repo.root, control_id: "placement-control" })).record_revision, revision);
  const foundation = await api.taskRecord({
    cwd: repo.root, control_id: "placement-control", actor_id: "parent-001", expected_revision: revision,
    task: makeTask({ task_id: "placement-foundation", effect: "read", write_scope: [], isolation: "none", required_capabilities: ["report.structured", "workspace.read"] }),
  });
  const blocked = await api.taskRecord({
    cwd: repo.root, control_id: "placement-control", actor_id: "parent-001", expected_revision: foundation.revision,
    task: makeTask({ task_id: "placement-blocked", effect: "read", write_scope: [], isolation: "none", depends_on: ["placement-foundation"], required_capabilities: ["report.structured", "workspace.read"] }),
  });
  const blockedPlacement = await api.placementDryRun({
    cwd: repo.root, control_id: "placement-control", task_id: "placement-blocked", evaluated_at: "2026-07-14T00:30:00.000Z",
    candidates: [candidate("blocked-dependency", "placement-eligible")],
  });
  assert.deepEqual(blockedPlacement.candidates, [{ candidate_id: "blocked-dependency", registry_observation_id: "placement-eligible", eligibility: "ineligible", reasons: ["dependency-not-ready"] }]);
  assert.equal((await api.status({ cwd: repo.root, control_id: "placement-control" })).record_revision, blocked.revision);
  await assert.rejects(api.placementDryRun({
    cwd: repo.root, control_id: "placement-control", task_id: "placement-task", evaluated_at: "2026-07-14T00:30:00.000Z",
    candidates: [candidate("duplicate", "placement-eligible"), candidate("duplicate", "placement-eligible")],
  }), code("INVALID_INPUT"));
  await assert.rejects(api.placementDryRun({
    cwd: repo.root, control_id: "placement-control", task_id: "placement-task", evaluated_at: "2026-07-14T00:30:00Z",
    candidates: [candidate("malformed-time", "placement-eligible")],
  }), code("INVALID_SCHEMA"));
  await assert.rejects(api.placementDryRun({
    cwd: repo.root, control_id: "placement-control", task_id: "placement-task", evaluated_at: "2026-07-14T00:30:00.000Z",
    candidates: [{ ...candidate("unknown-field", "placement-eligible"), unexpected: true }],
  }), code("INVALID_SCHEMA"));
});

test("Placement dry-runは同一executor/workflowのadmitted予約をRegistry observed_inflightへ合成する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "placement-capacity-reservation" });
  const task = await api.taskRecord({
    cwd: repo.root, control_id: "placement-capacity-reservation", actor_id: "parent-001", expected_revision: result.revision,
    task: makeTask({ task_id: "capacity-task", effect: "read", write_scope: [], isolation: "none", required_capabilities: ["report.structured", "workspace.read"] }),
  });
  const workerCapabilities = makeWorkerRun().workflow_capabilities;
  const observation = makeRegistryObservation({
    registry_observation_id: "capacity-registry", workflow_capabilities: workerCapabilities,
    capacity: {
      admission: { value: "true", evidence: evidence("docs/capacity-admission.md") },
      hard_inflight_limit: { knowledge: "known", value: 1, evidence: evidence("docs/capacity-hard.md") },
      soft_inflight_limit: { knowledge: "known", value: 1, evidence: evidence("docs/capacity-soft.md") },
      observed_inflight: { knowledge: "known", value: 0, evidence: evidence("docs/capacity-observed.md") },
    },
  });
  const observed = await api.registryObservationRecord({
    cwd: repo.root, control_id: "placement-capacity-reservation", actor_id: "parent-001", expected_revision: task.revision, observation,
  });
  const recorded = await api.workerRunRecord({
    cwd: repo.root, control_id: "placement-capacity-reservation", actor_id: "parent-001", expected_revision: observed.revision,
    worker_run: makeWorkerRun({
      worker_run_id: "capacity-existing-run", task_id: "capacity-task", assignment_id: "capacity-existing-assignment",
      executor: observation.executor, workflow_id: observation.workflow_id, workflow_capabilities: workerCapabilities,
      write_mode: "none", workspace_cwd: repo.root, executor_handle: { agent_id: "capacity-existing-agent" },
      lineage: { ...makeWorkerRun().lineage, root_assignment_id: "capacity-existing-assignment" },
    }),
  });
  const admitted = await api.admitWorker({
    cwd: repo.root, control_id: "placement-capacity-reservation", actor_id: "parent-001", expected_revision: recorded.revision, worker_run_id: "capacity-existing-run",
  });
  const placement = await api.placementDryRun({
    cwd: repo.root, control_id: "placement-capacity-reservation", task_id: "capacity-task", evaluated_at: "2026-07-14T00:30:00.000Z",
    candidates: [makePlacementCandidate({
      candidate_id: "capacity-new-candidate", registry_observation_id: "capacity-registry", workspace_cwd: repo.root,
      executor_handle: { agent_id: "capacity-new-agent" },
    })],
  });
  assert.deepEqual(placement.candidates, [{
    candidate_id: "capacity-new-candidate", registry_observation_id: "capacity-registry", eligibility: "ineligible", reasons: ["capacity-hard-exhausted"],
  }]);
  assert.equal((await api.status({ cwd: repo.root, control_id: "placement-capacity-reservation" })).record_revision, admitted.revision);
  const sameTimestamp = await api.observeWorker({
    cwd: repo.root, control_id: "placement-capacity-reservation", actor_id: "parent-001", expected_revision: admitted.revision,
    worker_run_id: "capacity-existing-run", observation: workerObservation("dispatched", {
      source: "codex-native", observed_at: "2026-07-14T00:00:00.000Z",
    }),
  });
  const ambiguousPlacement = await api.placementDryRun({
    cwd: repo.root, control_id: "placement-capacity-reservation", task_id: "capacity-task", evaluated_at: "2026-07-14T00:30:00.000Z",
    candidates: [makePlacementCandidate({
      candidate_id: "capacity-ambiguous-candidate", registry_observation_id: "capacity-registry", workspace_cwd: repo.root,
      executor_handle: { agent_id: "capacity-ambiguous-agent" },
    })],
  });
  assert.deepEqual(ambiguousPlacement.candidates, [{
    candidate_id: "capacity-ambiguous-candidate", registry_observation_id: "capacity-registry", eligibility: "review-required", reasons: ["capacity-review-required"],
  }]);
  assert.equal((await api.status({ cwd: repo.root, control_id: "placement-capacity-reservation" })).record_revision, sameTimestamp.revision);
});

test("Placement dry-runはF/H・workspace・global write conflictを実行せずに拒否する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "placement-policy-control" });
  const capabilities = makeWorkerRun().workflow_capabilities;
  const capacity = {
    admission: { value: "true", evidence: evidence("docs/policy-admission.md") },
    hard_inflight_limit: { knowledge: "known", value: 8, evidence: evidence("docs/policy-hard.md") },
    soft_inflight_limit: { knowledge: "known", value: 8, evidence: evidence("docs/policy-soft.md") },
    observed_inflight: { knowledge: "known", value: 0, evidence: evidence("docs/policy-observed.md") },
  };
  const nativeRegistry = makeRegistryObservation({ registry_observation_id: "policy-native", workflow_capabilities: capabilities, capacity });
  const parentRegistry = makeRegistryObservation({
    registry_observation_id: "policy-parent", workflow_capabilities: capabilities, capacity,
    executor: { adapter_id: "parent", contract_version: "v1", instance_id: "parent-session", handle_schema_id: "parent.correlation.v1" }, workflow_id: "direct",
  });
  let revision = result.revision;
  for (const observation of [nativeRegistry, parentRegistry]) {
    const recorded = await api.registryObservationRecord({ cwd: repo.root, control_id: "placement-policy-control", actor_id: "parent-001", expected_revision: revision, observation });
    revision = recorded.revision;
  }
  const writeTask = (task_id, overrides = {}) => makeTask({
    task_id, effect: "write", isolation: "none", required_capabilities: ["report.structured", "workspace.write"],
    write_scope: [{ kind: "directory", path: "docs" }], ...overrides,
  });
  for (const entry of [
    writeTask("placement-f-write", { classification: "F" }),
    writeTask("placement-h-write", { classification: "H", approval: makeApproval({ expires_at: "2099-07-14T00:00:00.000Z" }) }),
    writeTask("placement-dedicated-write", { isolation: "dedicated-worktree" }),
    writeTask("placement-conflict-write"),
  ]) {
    const recorded = await api.taskRecord({ cwd: repo.root, control_id: "placement-policy-control", actor_id: "parent-001", expected_revision: revision, task: entry });
    revision = recorded.revision;
  }
  const candidate = (candidate_id, registry_observation_id, overrides = {}) => makePlacementCandidate({
    candidate_id, registry_observation_id, workspace_cwd: repo.root, write_mode: "direct", ...overrides,
  });
  const evaluate = (task_id, candidates) => api.placementDryRun({
    cwd: repo.root, control_id: "placement-policy-control", task_id, evaluated_at: "2026-07-14T00:30:00.000Z", candidates,
  });
  const f = await evaluate("placement-f-write", [
    candidate("f-external", "policy-native", { executor_handle: { agent_id: "f-external-agent" } }),
    candidate("f-parent", "policy-parent", { executor_handle: { correlation_id: "f-parent-correlation" } }),
  ]);
  assert.deepEqual(f.candidates, [
    { candidate_id: "f-external", registry_observation_id: "policy-native", eligibility: "ineligible", reasons: ["policy-forbidden"] },
    { candidate_id: "f-parent", registry_observation_id: "policy-parent", eligibility: "eligible", reasons: [] },
  ]);
  const h = await evaluate("placement-h-write", [candidate("h-mismatch", "policy-native", { executor_handle: { agent_id: "h-agent" } })]);
  assert.deepEqual(h.candidates, [{ candidate_id: "h-mismatch", registry_observation_id: "policy-native", eligibility: "ineligible", reasons: ["policy-forbidden"] }]);
  const dedicated = await evaluate("placement-dedicated-write", [candidate("dedicated-main", "policy-native", { executor_handle: { agent_id: "dedicated-agent" } })]);
  assert.deepEqual(dedicated.candidates, [{ candidate_id: "dedicated-main", registry_observation_id: "policy-native", eligibility: "ineligible", reasons: ["workspace-invalid"] }]);
  const existing = await api.workerRunRecord({
    cwd: repo.root, control_id: "placement-policy-control", actor_id: "parent-001", expected_revision: revision,
    worker_run: makeWorkerRun({
      worker_run_id: "placement-conflict-existing", task_id: "placement-conflict-write", assignment_id: "placement-conflict-existing-assignment",
      executor: nativeRegistry.executor, workflow_id: nativeRegistry.workflow_id, workflow_capabilities: capabilities,
      workspace_cwd: repo.root, executor_handle: { agent_id: "placement-conflict-existing-agent" },
      lineage: { ...makeWorkerRun().lineage, root_assignment_id: "placement-conflict-existing-assignment" },
    }),
  });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "placement-policy-control", actor_id: "parent-001", expected_revision: existing.revision, worker_run_id: "placement-conflict-existing" });
  const conflict = await evaluate("placement-conflict-write", [candidate("conflict-new", "policy-native", { executor_handle: { agent_id: "conflict-new-agent" } })]);
  assert.deepEqual(conflict.candidates, [{ candidate_id: "conflict-new", registry_observation_id: "policy-native", eligibility: "ineligible", reasons: ["write-conflict"] }]);
  assert.equal((await api.status({ cwd: repo.root, control_id: "placement-policy-control" })).record_revision, admitted.revision);
});

test("Placement dry-runは古いRegistry snapshotをsupersedeし、同時刻の競合snapshotをreviewへ送る", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "placement-refresh-control" });
  const task = await api.taskRecord({
    cwd: repo.root, control_id: "placement-refresh-control", actor_id: "parent-001", expected_revision: result.revision,
    task: makeTask({ task_id: "refresh-task", effect: "read", write_scope: [], isolation: "none", required_capabilities: ["report.structured", "workspace.read"] }),
  });
  const capacity = {
    admission: { value: "true", evidence: evidence("docs/refresh-admission.md") },
    hard_inflight_limit: { knowledge: "known", value: 2, evidence: evidence("docs/refresh-hard.md") },
    soft_inflight_limit: { knowledge: "known", value: 2, evidence: evidence("docs/refresh-soft.md") },
    observed_inflight: { knowledge: "known", value: 0, evidence: evidence("docs/refresh-observed.md") },
  };
  const old = makeRegistryObservation({ registry_observation_id: "refresh-old", capacity, verification: { stage: "execution-verified", observed_version: "old", observed_at: "2026-07-14T00:00:00.000Z", evidence: evidence("docs/refresh-old.md") }, expires_at: "2026-07-14T02:00:00.000Z" });
  const freshDisabled = makeRegistryObservation({ registry_observation_id: "refresh-disabled", capacity, enabled: { value: "false", evidence: evidence("docs/refresh-disabled.md") }, verification: { stage: "execution-verified", observed_version: "fresh", observed_at: "2026-07-14T00:10:00.000Z", evidence: evidence("docs/refresh-fresh.md") }, expires_at: "2026-07-14T02:00:00.000Z" });
  const oldRecorded = await api.registryObservationRecord({ cwd: repo.root, control_id: "placement-refresh-control", actor_id: "parent-001", expected_revision: task.revision, observation: old });
  const freshRecorded = await api.registryObservationRecord({ cwd: repo.root, control_id: "placement-refresh-control", actor_id: "parent-001", expected_revision: oldRecorded.revision, observation: freshDisabled });
  const candidate = (candidate_id, registry_observation_id) => makePlacementCandidate({ candidate_id, registry_observation_id, workspace_cwd: repo.root });
  const output = await api.placementDryRun({
    cwd: repo.root, control_id: "placement-refresh-control", task_id: "refresh-task", evaluated_at: "2026-07-14T00:20:00.000Z",
    candidates: [candidate("old-candidate", "refresh-old"), candidate("fresh-candidate", "refresh-disabled")],
  });
  assert.deepEqual(output.candidates, [
    { candidate_id: "fresh-candidate", registry_observation_id: "refresh-disabled", eligibility: "ineligible", reasons: ["enabled-false"] },
    { candidate_id: "old-candidate", registry_observation_id: "refresh-old", eligibility: "ineligible", reasons: ["registry-superseded"] },
  ]);
  const tied = makeRegistryObservation({ registry_observation_id: "refresh-tied", capacity: { ...capacity, hard_inflight_limit: { knowledge: "known", value: 3, evidence: evidence("docs/refresh-tied-hard.md") } }, verification: { stage: "execution-verified", observed_version: "tied", observed_at: "2026-07-14T00:10:00.000Z", evidence: evidence("docs/refresh-tied.md") }, expires_at: "2026-07-14T02:00:00.000Z" });
  const tiedRecorded = await api.registryObservationRecord({ cwd: repo.root, control_id: "placement-refresh-control", actor_id: "parent-001", expected_revision: freshRecorded.revision, observation: tied });
  const ambiguous = await api.placementDryRun({
    cwd: repo.root, control_id: "placement-refresh-control", task_id: "refresh-task", evaluated_at: "2026-07-14T00:20:00.000Z", candidates: [candidate("tied-candidate", "refresh-tied")],
  });
  assert.deepEqual(ambiguous.candidates, [{ candidate_id: "tied-candidate", registry_observation_id: "refresh-tied", eligibility: "review-required", reasons: ["registry-refresh-ambiguous"] }]);
  assert.equal((await api.status({ cwd: repo.root, control_id: "placement-refresh-control" })).record_revision, tiedRecorded.revision);
});

test("Placement dry-runはRegistry観測済みのRun heartbeatをcapacityへ二重加算しない", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "placement-heartbeat-control" });
  const task = await api.taskRecord({
    cwd: repo.root, control_id: "placement-heartbeat-control", actor_id: "parent-001", expected_revision: result.revision,
    task: makeTask({ task_id: "heartbeat-task", effect: "read", write_scope: [], isolation: "none", required_capabilities: ["report.structured", "workspace.read"] }),
  });
  const capabilities = makeWorkerRun().workflow_capabilities;
  const recorded = await api.workerRunRecord({
    cwd: repo.root, control_id: "placement-heartbeat-control", actor_id: "parent-001", expected_revision: task.revision,
    worker_run: makeWorkerRun({ worker_run_id: "heartbeat-run", task_id: "heartbeat-task", assignment_id: "heartbeat-assignment", workflow_capabilities: capabilities, write_mode: "none", workspace_cwd: repo.root, executor_handle: { idempotency_key: "heartbeat-key" }, lineage: { ...makeWorkerRun().lineage, root_assignment_id: "heartbeat-assignment" } }),
  });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "placement-heartbeat-control", actor_id: "parent-001", expected_revision: recorded.revision, worker_run_id: "heartbeat-run" });
  const dispatched = await api.observeWorker({
    cwd: repo.root, control_id: "placement-heartbeat-control", actor_id: "parent-001", expected_revision: admitted.revision, worker_run_id: "heartbeat-run",
    observation: workerObservation("dispatched", { observed_at: "2026-07-14T00:00:00.000Z", dispatch_evidence: [evidence("docs/heartbeat-dispatch.md", "file", { observed_at: "2026-07-14T00:00:00.000Z" })] }),
  });
  const registry = makeRegistryObservation({
    registry_observation_id: "heartbeat-registry", executor: makeWorkerRun().executor, workflow_id: makeWorkerRun().workflow_id, workflow_capabilities: capabilities,
    capacity: {
      admission: { value: "true", evidence: evidence("docs/heartbeat-admission.md", "file", { observed_at: "2026-07-14T00:10:00.000Z" }) },
      hard_inflight_limit: { knowledge: "known", value: 2, evidence: evidence("docs/heartbeat-hard.md", "file", { observed_at: "2026-07-14T00:10:00.000Z" }) },
      soft_inflight_limit: { knowledge: "known", value: 2, evidence: evidence("docs/heartbeat-soft.md", "file", { observed_at: "2026-07-14T00:10:00.000Z" }) },
      observed_inflight: { knowledge: "known", value: 1, evidence: evidence("docs/heartbeat-observed.md", "file", { observed_at: "2026-07-14T00:10:00.000Z" }) },
    }, verification: { stage: "execution-verified", observed_version: "test-version", observed_at: "2026-07-14T00:10:00.000Z", evidence: evidence("docs/heartbeat-verification.md", "file", { observed_at: "2026-07-14T00:10:00.000Z" }) }, expires_at: "2026-07-14T02:00:00.000Z",
  });
  const observed = await api.registryObservationRecord({ cwd: repo.root, control_id: "placement-heartbeat-control", actor_id: "parent-001", expected_revision: dispatched.revision, observation: registry });
  const running = await api.observeWorker({
    cwd: repo.root, control_id: "placement-heartbeat-control", actor_id: "parent-001", expected_revision: observed.revision, worker_run_id: "heartbeat-run",
    observation: workerObservation("running", { observed_at: "2026-07-14T00:20:00.000Z", source: "codex-sidecar" }),
  });
  const output = await api.placementDryRun({
    cwd: repo.root, control_id: "placement-heartbeat-control", task_id: "heartbeat-task", evaluated_at: "2026-07-14T00:30:00.000Z",
    candidates: [makePlacementCandidate({ candidate_id: "heartbeat-candidate", registry_observation_id: "heartbeat-registry", workspace_cwd: repo.root, executor_handle: { idempotency_key: "heartbeat-candidate-key" } })],
  });
  assert.deepEqual(output.candidates, [{ candidate_id: "heartbeat-candidate", registry_observation_id: "heartbeat-registry", eligibility: "eligible", reasons: [] }]);
  assert.equal((await api.status({ cwd: repo.root, control_id: "placement-heartbeat-control" })).record_revision, running.revision);
});

test("Placement reservationは同一revisionの配置判断をplanned Workerへ原子的に固定する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "placement-reserve-control" });
  const task = await api.taskRecord({
    cwd: repo.root, control_id: "placement-reserve-control", actor_id: "parent-001", expected_revision: result.revision,
    task: makeTask({ task_id: "reserve-task", effect: "read", write_scope: [], isolation: "none", required_capabilities: ["report.structured", "workspace.read"] }),
  });
  const registry = makeRegistryObservation({
    registry_observation_id: "reserve-registry", executor: { adapter_id: "codex-native", contract_version: "v1", instance_id: "reserve-instance", handle_schema_id: "codex-native.agent-id.v1" },
    expires_at: "2099-07-14T00:00:00.000Z",
    capacity: {
      admission: { value: "true", evidence: evidence("docs/reserve-admission.md") },
      hard_inflight_limit: { knowledge: "known", value: 1, evidence: evidence("docs/reserve-hard.md") },
      soft_inflight_limit: { knowledge: "known", value: 1, evidence: evidence("docs/reserve-soft.md") },
      observed_inflight: { knowledge: "known", value: 0, evidence: evidence("docs/reserve-observed.md") },
    },
  });
  const observed = await api.registryObservationRecord({ cwd: repo.root, control_id: "placement-reserve-control", actor_id: "parent-001", expected_revision: task.revision, observation: registry });
  const candidate = (candidate_id) => makePlacementCandidate({ candidate_id, registry_observation_id: "reserve-registry", workspace_cwd: repo.root, executor_handle: { agent_id: `${candidate_id}-agent` } });
  const first = await api.reservePlacement({
    cwd: repo.root, control_id: "placement-reserve-control", actor_id: "parent-001", expected_revision: observed.revision,
    task_id: "reserve-task", candidate: candidate("reserve-first"), review_decision: null,
  });
  const run = first.manifest.worker_runs.at(-1);
  assert.equal(run.worker_run_id, "reserve-first");
  assert.equal(run.state, "planned");
  assert.deepEqual(run.placement_reservation, {
    registry_observation_id: "reserve-registry", candidate_digest: run.placement_reservation.candidate_digest,
    selected_from_revision: observed.revision, eligibility: "eligible", review_reasons: [], review_decision: null,
    selected_by: "parent-001", selected_at: run.placement_reservation.selected_at,
  });
  const materializedCandidate = {
    candidate_id: run.worker_run_id, registry_observation_id: run.placement_reservation.registry_observation_id,
    assignment_id: run.assignment_id, workspace_cwd: run.workspace.worktree_root_realpath ?? run.workspace.git_dir_realpath,
    write_mode: run.write_mode, operation_digest: run.operation_digest, budget_reservation: run.budget_reservation,
    lineage: run.lineage, executor_handle: run.executor_handle,
    recorded_workspace_fingerprint: run.recorded_workspace_fingerprint,
  };
  assert.equal(run.placement_reservation.candidate_digest, canonicalDigest(materializedCandidate));
  const receipt = first.manifest.transition_receipts.at(-1);
  assert.deepEqual(receipt.subject, { kind: "worker-run", id: "reserve-first" });
  assert.equal(receipt.subject_digest, canonicalDigest(run.placement_reservation));
  const forgedCandidate = structuredClone(first.manifest); forgedCandidate.worker_runs.at(-1).placement_reservation.candidate_digest = "0".repeat(64);
  assert.throws(() => api.validateManifest(forgedCandidate), code("INVALID_SCHEMA"));
  const forgedReceipt = structuredClone(first.manifest); const forgedLastReceipt = forgedReceipt.transition_receipts.at(-1);
  forgedLastReceipt.subject_digest = "0".repeat(64); const digestPayload = structuredClone(forgedLastReceipt); delete digestPayload.receipt_digest;
  forgedLastReceipt.receipt_digest = canonicalDigest(digestPayload);
  assert.throws(() => api.validateManifest(forgedReceipt), code("INVALID_SCHEMA"));
  const forgedInstance = structuredClone(first.manifest); forgedInstance.worker_runs.at(-1).executor.instance_id = "forged-instance";
  assert.throws(() => api.validateManifest(forgedInstance), code("INVALID_SCHEMA"));
  const forgedVerification = structuredClone(first.manifest); forgedVerification.worker_runs.at(-1).execution_verification.observed_version = "forged-version";
  assert.throws(() => api.validateManifest(forgedVerification), code("INVALID_SCHEMA"));
  const forgedCapabilityEvidence = structuredClone(first.manifest); forgedCapabilityEvidence.worker_runs.at(-1).workflow_capabilities[0].evidence.ref = "docs/forged-capability.md";
  assert.throws(() => api.validateManifest(forgedCapabilityEvidence), code("INVALID_SCHEMA"));
  const forgedRole = structuredClone(first.manifest); forgedRole.worker_runs.at(-1).role_ref = "refuter";
  assert.throws(() => api.validateManifest(forgedRole), code("INVALID_SCHEMA"));
  await assert.rejects(api.reservePlacement({
    cwd: repo.root, control_id: "placement-reserve-control", actor_id: "parent-001", expected_revision: observed.revision,
    task_id: "reserve-task", candidate: candidate("reserve-stale"), review_decision: null,
  }), code("REVISION_CONFLICT"));
  await assert.rejects(api.reservePlacement({
    cwd: repo.root, control_id: "placement-reserve-control", actor_id: "parent-001", expected_revision: first.revision,
    task_id: "reserve-task", candidate: candidate("reserve-second"), review_decision: null,
  }), code("PLACEMENT_INELIGIBLE"));

  const reviewInit = await api.init({ cwd: repo.root, control_id: "placement-reserve-review", objective_ref: "docs/control-record-plan.md", actor_id: "parent-001", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const reviewTask = await api.taskRecord({
    cwd: repo.root, control_id: "placement-reserve-review", actor_id: "parent-001", expected_revision: reviewInit.revision,
    task: makeTask({ task_id: "reserve-review-task", effect: "read", write_scope: [], isolation: "none", required_capabilities: ["report.structured", "workspace.read"] }),
  });
  const reviewObservedAt = "2020-07-14T00:00:00.000Z";
  const reviewRegistry = makeRegistryObservation({
    registry_observation_id: "reserve-review-registry", executor: { adapter_id: "codex-native", contract_version: "v1", instance_id: "reserve-review-instance", handle_schema_id: "codex-native.agent-id.v1" },
    enabled: { value: "true", evidence: evidence("docs/reserve-review-enabled.md", "file", { observed_at: reviewObservedAt }) },
    workflow_capabilities: makeRegistryObservation().workflow_capabilities.map((entry) => ({ ...entry, evidence: evidence("docs/reserve-review-capabilities.md", "file", { observed_at: reviewObservedAt }) })),
    verification: { stage: "execution-verified", observed_version: "test-version", observed_at: reviewObservedAt, evidence: evidence("docs/reserve-review-verification.md", "file", { observed_at: reviewObservedAt }) }, expires_at: "2099-07-14T00:00:00.000Z",
  });
  const reviewObserved = await api.registryObservationRecord({ cwd: repo.root, control_id: "placement-reserve-review", actor_id: "parent-001", expected_revision: reviewTask.revision, observation: reviewRegistry });
  const reviewCandidate = makePlacementCandidate({ candidate_id: "reserve-review", registry_observation_id: "reserve-review-registry", assignment_id: "reserve-review-assignment", workspace_cwd: repo.root, executor_handle: { agent_id: "reserve-review-agent" } });
  const reviewDryRun = await api.placementDryRun({ cwd: repo.root, control_id: "placement-reserve-review", task_id: "reserve-review-task", evaluated_at: "2026-07-14T00:30:00.000Z", candidates: [reviewCandidate] });
  assert.deepEqual(reviewDryRun.candidates[0], { candidate_id: "reserve-review", registry_observation_id: "reserve-review-registry", eligibility: "review-required", reasons: ["capacity-review-required"] });
  await assert.rejects(api.reservePlacement({
    cwd: repo.root, control_id: "placement-reserve-review", actor_id: "parent-001", expected_revision: reviewObserved.revision,
    task_id: "reserve-review-task", candidate: reviewCandidate, review_decision: null,
  }), code("PLACEMENT_REVIEW_REQUIRED"));
  const reviewed = await api.reservePlacement({
    cwd: repo.root, control_id: "placement-reserve-review", actor_id: "parent-001", expected_revision: reviewObserved.revision,
    task_id: "reserve-review-task", candidate: reviewCandidate, review_decision: evidence("docs/reserve-review-decision.md", "decision"),
  });
  assert.equal(reviewed.manifest.worker_runs.at(-1).placement_reservation.eligibility, "review-required");
  assert.equal(reviewed.manifest.worker_runs.at(-1).placement_reservation.review_decision.type, "decision");
});

test("WorkerとConsultationは分離され、同一read Taskを参照でき、gpt executorを拒否する", async (t) => {
  const { repo, result } = await initialized(t);
  const ctask = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: result.revision, task: makeTask({ task_id: "consultation-task", effect: "read", write_scope: [] }) });
  const consultation = makeConsultation();
  const recorded = await api.consultationRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: ctask.revision, consultation });
  assert.deepEqual(recorded.manifest.consultations, [consultation]);
  const worker = await api.workerRunRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: recorded.revision, worker_run: makeWorkerRun({ task_id: "consultation-task", write_mode: "none", workspace_cwd: repo.root }) });
  assert.equal(worker.manifest.worker_runs[0].task_id, consultation.task_id);
  const dispatched = await api.observeConsultation({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: worker.revision, consultation_id: "consultation-001", observation: { state: "dispatched", source: "gpt-connector", observed_version: "gpt-5.6", observed_at: "2026-07-14T00:01:00.000Z", raw_state: "dispatched" } });
  const completed = await api.observeConsultation({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: dispatched.revision, consultation_id: "consultation-001", observation: { state: "completed", source: "gpt-connector", observed_version: "gpt-5.6", observed_at: "2026-07-14T00:02:00.000Z", raw_state: "completed", decision_ref: "docs/consultation-decision.md" } });
  assert.equal(completed.manifest.consultations[0].decision_ref, "docs/consultation-decision.md");
  const second = await api.consultationRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: completed.revision, consultation: makeConsultation({ consultation_id: "consultation-failed", assignment_id: "consultation-failed-assignment" }) });
  const secondDispatched = await api.observeConsultation({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: second.revision, consultation_id: "consultation-failed", observation: { state: "dispatched", source: "gpt-connector", observed_version: "gpt-5.6", observed_at: "2026-07-14T00:03:00.000Z", raw_state: "dispatched" } });
  const failedEvidence = [evidence("connector:gpt-connector:consultation-failed", "executor-receipt")];
  const failed = await api.observeConsultation({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: secondDispatched.revision, consultation_id: "consultation-failed", observation: { state: "failed", source: "gpt-connector", observed_version: "gpt-5.6", observed_at: "2026-07-14T00:04:00.000Z", raw_state: "failed", terminal_evidence: failedEvidence } });
  assert.deepEqual(failed.manifest.consultations[1].terminal_evidence, failedEvidence);
  await assert.rejects(api.consultationRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: failed.revision, consultation: makeConsultation({ consultation_id: "bad-consultation", workspace: { kind: "worktree" } }) }), code("INVALID_SCHEMA"));
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: failed.revision, worker_run: makeWorkerRun({ executor: { adapter_id: "gpt-connector", contract_version: "v1", instance_id: "chat", handle_schema_id: "gpt-connector.slug.v1" } }) }), code("EXECUTOR_FORBIDDEN"));
});

test("Task取消とWorker cancel requestは既存実行を変えず、証拠付きの終端だけを許す", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "cancel-control" });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "cancel-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "cancel-task", effect: "read", write_scope: [] }) });
  const run = await api.workerRunRecord({ cwd: repo.root, control_id: "cancel-control", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ worker_run_id: "cancel-run", task_id: "cancel-task", assignment_id: "cancel-assignment", write_mode: "none", workspace_cwd: repo.root, lineage: { ...makeWorkerRun().lineage, root_assignment_id: "cancel-assignment" } }) });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "cancel-control", actor_id: "parent", expected_revision: run.revision, worker_run_id: "cancel-run" });
  const decision = evidence("docs/cancel-decision.md", "decision");
  const cancelledTask = await api.taskCancelRecord({ cwd: repo.root, control_id: "cancel-control", actor_id: "parent", expected_revision: admitted.revision, task_id: "cancel-task", decision });
  assert.equal(cancelledTask.manifest.worker_runs[0].state, "admitted");
  await assert.rejects(api.admitWorker({ cwd: repo.root, control_id: "cancel-control", actor_id: "parent", expected_revision: cancelledTask.revision, worker_run_id: "cancel-run" }), code("INVALID_TRANSITION"));
  const requested = await api.requestWorkerCancel({ cwd: repo.root, control_id: "cancel-control", actor_id: "parent", expected_revision: cancelledTask.revision, worker_run_id: "cancel-run", decision });
  assert.equal(requested.manifest.worker_runs[0].state, "admitted");
  assert.deepEqual(requested.manifest.worker_runs[0].cancel_request.executor_handle, { idempotency_key: "idempotency-001" });
  await assert.rejects(api.requestWorkerCancel({ cwd: repo.root, control_id: "cancel-control", actor_id: "parent", expected_revision: requested.revision, worker_run_id: "cancel-run", decision }), code("DUPLICATE_ID"));
  await assert.rejects(api.observeWorker({ cwd: repo.root, control_id: "cancel-control", actor_id: "parent", expected_revision: requested.revision, worker_run_id: "cancel-run", observation: workerObservation("cancelled") }), code("EVIDENCE_REQUIRED"));
  const terminal = await api.observeWorker({ cwd: repo.root, control_id: "cancel-control", actor_id: "parent", expected_revision: requested.revision, worker_run_id: "cancel-run", observation: terminalWorkerObservation("cancelled") });
  assert.equal(terminal.manifest.worker_runs[0].state, "cancelled");
  const brief = await api.statusBrief({ cwd: repo.root, control_id: "cancel-control" });
  assert.equal(brief.active.worker_runs.length, 0);
});

test("Task取消は既存Consultationを変えず新規dispatchだけを拒否し、active Runのterminal観測を許す", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "cancel-active-control" });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "cancel-active-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "cancel-active-task", effect: "read", write_scope: [] }) });
  const plannedConsultation = await api.consultationRecord({ cwd: repo.root, control_id: "cancel-active-control", actor_id: "parent", expected_revision: task.revision, consultation: makeConsultation({ consultation_id: "cancel-planned-consultation", task_id: "cancel-active-task", assignment_id: "cancel-planned-consultation-assignment" }) });
  const activeConsultation = await api.consultationRecord({ cwd: repo.root, control_id: "cancel-active-control", actor_id: "parent", expected_revision: plannedConsultation.revision, consultation: makeConsultation({ consultation_id: "cancel-active-consultation", task_id: "cancel-active-task", assignment_id: "cancel-active-consultation-assignment", slug: "cancel-active-slug" }) });
  const consultationDispatched = await api.observeConsultation({ cwd: repo.root, control_id: "cancel-active-control", actor_id: "parent", expected_revision: activeConsultation.revision, consultation_id: "cancel-active-consultation", observation: { state: "dispatched", source: "gpt-connector", observed_version: "gpt-5.6", observed_at: "2026-07-14T00:01:00.000Z", raw_state: "dispatched" } });
  const worker = await api.workerRunRecord({ cwd: repo.root, control_id: "cancel-active-control", actor_id: "parent", expected_revision: consultationDispatched.revision, worker_run: makeWorkerRun({ worker_run_id: "cancel-active-run", task_id: "cancel-active-task", assignment_id: "cancel-active-worker-assignment", write_mode: "none", workspace_cwd: repo.root, lineage: { ...makeWorkerRun().lineage, root_assignment_id: "cancel-active-worker-assignment" } }) });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "cancel-active-control", actor_id: "parent", expected_revision: worker.revision, worker_run_id: "cancel-active-run" });
  const workerDispatched = await api.observeWorker({ cwd: repo.root, control_id: "cancel-active-control", actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "cancel-active-run", observation: workerObservation("dispatched") });
  const cancelled = await api.taskCancelRecord({ cwd: repo.root, control_id: "cancel-active-control", actor_id: "parent", expected_revision: workerDispatched.revision, task_id: "cancel-active-task", decision: evidence("docs/cancel-active-decision.md", "decision") });
  assert.equal(cancelled.manifest.consultations.find((entry) => entry.consultation_id === "cancel-planned-consultation").state, "planned");
  assert.equal(cancelled.manifest.consultations.find((entry) => entry.consultation_id === "cancel-active-consultation").state, "dispatched");
  assert.equal(cancelled.manifest.worker_runs[0].state, "dispatched");
  await assert.rejects(api.observeConsultation({ cwd: repo.root, control_id: "cancel-active-control", actor_id: "parent", expected_revision: cancelled.revision, consultation_id: "cancel-planned-consultation", observation: { state: "dispatched", source: "gpt-connector", observed_version: "gpt-5.6", observed_at: "2026-07-14T00:02:00.000Z", raw_state: "dispatched" } }), code("TASK_CANCELLED"));
  const consultationTerminal = await api.observeConsultation({ cwd: repo.root, control_id: "cancel-active-control", actor_id: "parent", expected_revision: cancelled.revision, consultation_id: "cancel-active-consultation", observation: { state: "failed", source: "gpt-connector", observed_version: "gpt-5.6", observed_at: "2026-07-14T00:03:00.000Z", raw_state: "failed", terminal_evidence: [evidence("docs/cancel-active-consultation-terminal.md", "executor-receipt")] } });
  const workerTerminal = await api.observeWorker({ cwd: repo.root, control_id: "cancel-active-control", actor_id: "parent", expected_revision: consultationTerminal.revision, worker_run_id: "cancel-active-run", observation: terminalWorkerObservation("failed") });
  assert.equal(workerTerminal.manifest.consultations.find((entry) => entry.consultation_id === "cancel-active-consultation").state, "failed");
  assert.equal(workerTerminal.manifest.worker_runs[0].state, "failed");
});

test("Worker cancel requestはplannedとterminalを拒否し、取消record相関の改竄をfail closedにする", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "cancel-schema-control" });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "cancel-schema-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "cancel-schema-task", effect: "read", write_scope: [] }) });
  const worker = await api.workerRunRecord({ cwd: repo.root, control_id: "cancel-schema-control", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ worker_run_id: "cancel-schema-run", task_id: "cancel-schema-task", assignment_id: "cancel-schema-assignment", write_mode: "none", workspace_cwd: repo.root, lineage: { ...makeWorkerRun().lineage, root_assignment_id: "cancel-schema-assignment" } }) });
  const decision = evidence("docs/cancel-schema-decision.md", "decision");
  await assert.rejects(api.requestWorkerCancel({ cwd: repo.root, control_id: "cancel-schema-control", actor_id: "parent", expected_revision: worker.revision, worker_run_id: "cancel-schema-run", decision }), code("INVALID_TRANSITION"));
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "cancel-schema-control", actor_id: "parent", expected_revision: worker.revision, worker_run_id: "cancel-schema-run" });
  const cancelledTask = await api.taskCancelRecord({ cwd: repo.root, control_id: "cancel-schema-control", actor_id: "parent", expected_revision: admitted.revision, task_id: "cancel-schema-task", decision });
  for (const mutate of [
    (manifest) => { manifest.task_cancellations[0].cancelled_from_revision += 1; },
    (manifest) => { manifest.task_cancellations[0].cancelled_by = "attacker"; },
    (manifest) => { manifest.task_cancellations[0].decision = evidence("docs/forged-decision.md", "decision"); },
  ]) {
    const tampered = structuredClone(cancelledTask.manifest); mutate(tampered);
    assert.throws(() => api.validateManifest(tampered), code("INVALID_SCHEMA"));
  }
  const requested = await api.requestWorkerCancel({ cwd: repo.root, control_id: "cancel-schema-control", actor_id: "parent", expected_revision: cancelledTask.revision, worker_run_id: "cancel-schema-run", decision });
  const strayReceipt = structuredClone(requested.manifest); strayReceipt.worker_runs[0].cancel_request = null;
  assert.throws(() => api.validateManifest(strayReceipt), code("INVALID_SCHEMA"));
  const handleMismatch = structuredClone(requested.manifest); handleMismatch.worker_runs[0].cancel_request.executor_handle = { idempotency_key: "forged-handle" };
  assert.throws(() => api.validateManifest(handleMismatch), code("INVALID_SCHEMA"));
  const terminal = await api.observeWorker({ cwd: repo.root, control_id: "cancel-schema-control", actor_id: "parent", expected_revision: requested.revision, worker_run_id: "cancel-schema-run", observation: terminalWorkerObservation("cancelled") });
  await assert.rejects(api.requestWorkerCancel({ cwd: repo.root, control_id: "cancel-schema-control", actor_id: "parent", expected_revision: terminal.revision, worker_run_id: "cancel-schema-run", decision }), code("INVALID_TRANSITION"));
});

test("Executor envelopeはworkflowとhandle schemaを分離し、未知adapterをstatus限定で保持する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "executor-envelope-control" });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "executor-envelope-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "executor-task", effect: "read", write_scope: [], required_capabilities: ["workspace.read", "report.structured"] }) });
  const known = await api.workerRunRecord({
    cwd: repo.root, control_id: "executor-envelope-control", actor_id: "parent", expected_revision: task.revision,
    worker_run: makeWorkerRun({
      task_id: "executor-task", write_mode: "none", workspace_cwd: repo.root, workflow_id: "review", executor_handle: null,
      executor: { adapter_id: "codex-sidecar", contract_version: "v1", instance_id: "local-default", handle_schema_id: "codex-sidecar.synchronous.v1" },
      workflow_capabilities: [
        { capability_id: "readonly.enforceable", value: "true", evidence: evidence("docs/execution-proof.md") },
        { capability_id: "report.structured", value: "true", evidence: evidence("docs/execution-proof.md") },
        { capability_id: "workspace.read", value: "true", evidence: evidence("docs/execution-proof.md") },
        { capability_id: "workspace.write", value: "false", evidence: evidence("docs/execution-proof.md") },
      ],
    }),
  });
  assert.deepEqual(known.manifest.worker_runs[0].executor, {
    adapter_id: "codex-sidecar", contract_version: "v1", instance_id: "local-default",
    handle_schema_id: "codex-sidecar.synchronous.v1",
  });
  assert.equal(known.manifest.worker_runs[0].workflow_id, "review");

  const persisted = await readPersistedManifest(repo.commonDir, "executor-envelope-control");
  persisted.worker_runs[0].executor = {
    adapter_id: "future-adapter", contract_version: "v9", instance_id: "future-instance",
    handle_schema_id: "future.handle.v3",
  };
  persisted.worker_runs[0].workflow_id = "future-workflow";
  persisted.worker_runs[0].executor_handle = { opaque_id: "future-handle", generation: 3 };
  const statePath = join(repo.commonDir, "dotagents", "orchestrate", "controls", "executor-envelope-control", "manifest.json");
  await writeFile(statePath, `${JSON.stringify(persisted)}\n`, { mode: 0o600 });

  const readable = await api.status({ cwd: repo.root, control_id: "executor-envelope-control" });
  assert.equal(readable.worker_runs[0].executor.adapter_id, "future-adapter");
  assert.deepEqual(readable.worker_runs[0].executor_handle, { opaque_id: "future-handle", generation: 3 });
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: "executor-envelope-control", actor_id: "parent", expected_revision: readable.record_revision, task: makeTask({ task_id: "must-not-mutate" }) }), code("ADAPTER_UNKNOWN"));
});

test("未知または矛盾したExecutor契約は新規Runへ使えない", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "executor-rejection-control" });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "executor-rejection-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "executor-task", effect: "read", write_scope: [] }) });
  const unknown = makeWorkerRun({
    task_id: "executor-task", write_mode: "none", workspace_cwd: repo.root, workflow_id: "future-workflow", executor_handle: null,
    executor: { adapter_id: "future-adapter", contract_version: "v1", instance_id: "future", handle_schema_id: "future.handle.v1" },
  });
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "executor-rejection-control", actor_id: "parent", expected_revision: task.revision, worker_run: unknown }), code("ADAPTER_UNKNOWN"));
  const mismatch = makeWorkerRun({
    task_id: "executor-task", write_mode: "none", workspace_cwd: repo.root, workflow_id: "review", executor_handle: null,
    executor: { adapter_id: "codex-sidecar", contract_version: "v1", instance_id: "local-default", handle_schema_id: "codex-sidecar.idempotency-key.v1" },
  });
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "executor-rejection-control", actor_id: "parent", expected_revision: task.revision, worker_run: mismatch }), code("ADAPTER_UNKNOWN"));
});

test("workflow capability snapshotはTask要件とsidecarのread/write境界をfail-closedにする", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "workflow-capability-control" });
  const task = await api.taskRecord({
    cwd: repo.root, control_id: "workflow-capability-control", actor_id: "parent", expected_revision: result.revision,
    task: makeTask({ task_id: "review-task", effect: "read", write_scope: [], required_capabilities: ["workspace.read", "report.structured"] }),
  });
  const reviewCapabilities = [
    { capability_id: "readonly.enforceable", value: "true", evidence: evidence("docs/execution-proof.md") },
    { capability_id: "report.structured", value: "true", evidence: evidence("docs/execution-proof.md") },
    { capability_id: "workspace.read", value: "true", evidence: evidence("docs/execution-proof.md") },
    { capability_id: "workspace.write", value: "false", evidence: evidence("docs/execution-proof.md") },
  ];
  const review = makeWorkerRun({
    task_id: "review-task", write_mode: "none", workspace_cwd: repo.root, workflow_id: "review", executor_handle: null,
    executor: { adapter_id: "codex-sidecar", contract_version: "v1", instance_id: "local-default", handle_schema_id: "codex-sidecar.synchronous.v1" },
    workflow_capabilities: reviewCapabilities,
  });
  const recorded = await api.workerRunRecord({ cwd: repo.root, control_id: "workflow-capability-control", actor_id: "parent", expected_revision: task.revision, worker_run: review });
  assert.equal(recorded.manifest.worker_runs[0].workflow_capabilities.find((entry) => entry.capability_id === "workspace.write").value, "false");

  const forgedWrite = structuredClone(review);
  forgedWrite.worker_run_id = "forged-write"; forgedWrite.assignment_id = "forged-write";
  forgedWrite.lineage.root_assignment_id = "forged-write";
  forgedWrite.workflow_capabilities.find((entry) => entry.capability_id === "workspace.write").value = "true";
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "workflow-capability-control", actor_id: "parent", expected_revision: recorded.revision, worker_run: forgedWrite }), code("CAPABILITY_MISMATCH"));

  const unknownRequired = structuredClone(review);
  unknownRequired.worker_run_id = "unknown-required"; unknownRequired.assignment_id = "unknown-required";
  unknownRequired.lineage.root_assignment_id = "unknown-required";
  unknownRequired.workflow_capabilities.find((entry) => entry.capability_id === "report.structured").value = "unknown";
  unknownRequired.workflow_capabilities.find((entry) => entry.capability_id === "report.structured").evidence = null;
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "workflow-capability-control", actor_id: "parent", expected_revision: recorded.revision, worker_run: unknownRequired }), code("CAPABILITY_MISMATCH"));

  const missingEvidence = structuredClone(review);
  missingEvidence.worker_run_id = "missing-evidence"; missingEvidence.assignment_id = "missing-evidence";
  missingEvidence.lineage.root_assignment_id = "missing-evidence";
  missingEvidence.workflow_capabilities[0].evidence = null;
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "workflow-capability-control", actor_id: "parent", expected_revision: recorded.revision, worker_run: missingEvidence }), code("INVALID_SCHEMA"));
});

test("Budget Envelopeは件数・外部Run・wall time・costとunknownを予約時に検査する", async (t) => {
  const { repo, result } = await initialized(t, {
    control_id: "budget-control",
    budget: makeBudget({ max_worker_runs: 3, max_consultations: 1, max_external_runs: 1, max_wall_time_seconds: 1000, max_cost_microusd: 1000 }),
  });
  assert.deepEqual(result.manifest.budget, makeBudget({ max_worker_runs: 3, max_consultations: 1, max_external_runs: 1, max_wall_time_seconds: 1000, max_cost_microusd: 1000 }));
  const task = await api.taskRecord({ cwd: repo.root, control_id: "budget-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "budget-task", effect: "read", write_scope: [] }) });
  const external = await api.workerRunRecord({
    cwd: repo.root, control_id: "budget-control", actor_id: "parent", expected_revision: task.revision,
    worker_run: makeWorkerRun({ task_id: "budget-task", write_mode: "none", workspace_cwd: repo.root, budget_reservation: makeBudgetReservation({ wall_time_seconds: 400, cost_microusd: 400 }) }),
  });

  const secondExternal = makeWorkerRun({
    worker_run_id: "external-two", assignment_id: "external-two", task_id: "budget-task", write_mode: "none", workspace_cwd: repo.root,
    budget_reservation: makeBudgetReservation({ wall_time_seconds: 100, cost_microusd: 100 }),
  });
  secondExternal.lineage.root_assignment_id = "external-two";
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "budget-control", actor_id: "parent", expected_revision: external.revision, worker_run: secondExternal }), code("BUDGET_EXCEEDED"));

  const parentRun = makeWorkerRun({
    worker_run_id: "parent-run", assignment_id: "parent-run", task_id: "budget-task", write_mode: "none", workspace_cwd: repo.root,
    executor: { adapter_id: "parent", contract_version: "v1", instance_id: "parent-session", handle_schema_id: "parent.correlation.v1" },
    workflow_id: "direct", executor_handle: { correlation_id: "parent-run" },
    budget_reservation: makeBudgetReservation({ wall_time_seconds: 500, cost_microusd: 500 }),
  });
  parentRun.lineage.root_assignment_id = "parent-run";
  const parentRecorded = await api.workerRunRecord({ cwd: repo.root, control_id: "budget-control", actor_id: "parent", expected_revision: external.revision, worker_run: parentRun });

  const consultation = makeConsultation({ task_id: "budget-task", budget_reservation: makeBudgetReservation({ wall_time_seconds: 100, cost_microusd: 100 }) });
  const consulted = await api.consultationRecord({ cwd: repo.root, control_id: "budget-control", actor_id: "parent", expected_revision: parentRecorded.revision, consultation });
  const secondConsultation = makeConsultation({ consultation_id: "consultation-two", assignment_id: "consultation-two", task_id: "budget-task", budget_reservation: makeBudgetReservation({ wall_time_seconds: 1, cost_microusd: 1 }) });
  await assert.rejects(api.consultationRecord({ cwd: repo.root, control_id: "budget-control", actor_id: "parent", expected_revision: consulted.revision, consultation: secondConsultation }), code("BUDGET_EXCEEDED"));

  const unknownControl = await api.init({
    cwd: repo.root, control_id: "budget-unknown-control", objective_ref: "docs/control-record-plan.md", actor_id: "parent",
    document_refs: ["docs/control-record-plan.md"], budget: makeBudget({ max_wall_time_seconds: 1000, max_cost_microusd: 1000 }),
  });
  const unknownTask = await api.taskRecord({ cwd: repo.root, control_id: "budget-unknown-control", actor_id: "parent", expected_revision: unknownControl.revision, task: makeTask({ task_id: "budget-unknown-task", effect: "read", write_scope: [] }) });
  const unknownRun = makeWorkerRun({ worker_run_id: "budget-unknown-run", assignment_id: "budget-unknown-assignment", task_id: "budget-unknown-task", write_mode: "none", workspace_cwd: repo.root, budget_reservation: makeBudgetReservation({ wall_time_seconds: null }) });
  unknownRun.lineage.root_assignment_id = "budget-unknown-assignment";
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "budget-unknown-control", actor_id: "parent", expected_revision: unknownTask.revision, worker_run: unknownRun }), code("BUDGET_UNKNOWN"));

  const unknownLimitControl = await api.init({
    cwd: repo.root, control_id: "budget-unknown-limit-control", objective_ref: "docs/control-record-plan.md", actor_id: "parent",
    document_refs: ["docs/control-record-plan.md"], budget: makeBudget({ max_cost_microusd: null }),
  });
  const unknownLimitTask = await api.taskRecord({ cwd: repo.root, control_id: "budget-unknown-limit-control", actor_id: "parent", expected_revision: unknownLimitControl.revision, task: makeTask({ task_id: "budget-unknown-limit-task", effect: "read", write_scope: [] }) });
  const knownReservation = makeWorkerRun({ worker_run_id: "budget-known-run", assignment_id: "budget-known-assignment", task_id: "budget-unknown-limit-task", write_mode: "none", workspace_cwd: repo.root });
  knownReservation.lineage.root_assignment_id = "budget-known-assignment";
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "budget-unknown-limit-control", actor_id: "parent", expected_revision: unknownLimitTask.revision, worker_run: knownReservation }), code("BUDGET_UNKNOWN"));
});

test("Worker state遷移・evidence・retry reservationをrevision連鎖で保存する", async (t) => {
  const { repo, result } = await initialized(t);
  const task = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: result.revision, task: makeTask() });
  const run = await api.workerRunRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: task.revision, worker_run: makeWorkerRun({ workspace_cwd: repo.root }) });
  assert.equal(run.manifest.worker_runs[0].state, "planned");
  assert.deepEqual(Object.keys(run.manifest.worker_runs[0].workspace).sort(), ["common_dir_realpath", "git_dir_file_id", "git_dir_realpath", "head_at_record", "head_at_reservation", "kind", "worktree_root_realpath"]);
  assert.equal(run.manifest.worker_runs[0].workspace.worktree_root_realpath, repo.root);
  assert.equal("workspace_cwd" in run.manifest.worker_runs[0], false);
  const taskDocument = join(repo.root, "docs", "control-record-plan.md");
  const originalDocument = await readFile(taskDocument, "utf8");
  await writeFile(taskDocument, `${originalDocument}changed after admission\n`);
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: run.revision, worker_run_id: "run-001" });
  assert.equal(admitted.manifest.worker_runs[0].state, "admitted");
  assert.equal(admitted.manifest.tasks[0].admission_digest, taskAdmissionDigest(admitted.manifest.tasks[0]));
  await writeFile(taskDocument, originalDocument);
  assert.equal(admitted.manifest.worker_runs[0].admission.write_reservation, true);
  const dispatched = await api.observeWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: admitted.revision, worker_run_id: "run-001", observation: workerObservation("dispatched") });
  assert.equal(dispatched.manifest.worker_runs[0].state, "dispatched");
  assert.deepEqual(dispatched.manifest.worker_runs[0].dispatch_evidence, [evidence("docs/dispatch-proof.md")]);
  const failed = await api.observeWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: dispatched.revision, worker_run_id: "run-001", observation: terminalWorkerObservation() });
  assert.equal(failed.manifest.worker_runs[0].state, "failed");
  assert.deepEqual(failed.manifest.worker_runs[0].terminal_evidence, [evidence("docs/executor-terminal-proof.md")]);
  assert.deepEqual(failed.manifest.transition_receipts.map((entry) => entry.operation), ["control-init", "task-record", "worker-run-record", "worker-admit", "worker-observe", "worker-observe"]);
  assert.deepEqual(failed.manifest.transition_receipts.at(-2).evidence, [evidence("docs/dispatch-proof.md")]);
  assert.deepEqual(failed.manifest.transition_receipts.at(-1).evidence, [evidence("docs/executor-terminal-proof.md")]);
  const tampered = structuredClone(failed.manifest);
  tampered.transition_receipts[1] = makeTransitionReceipt({ ...tampered.transition_receipts[1], actor_id: "attacker" });
  assert.throws(() => api.validateManifest(tampered), code("INVALID_SCHEMA"));
  const missingReceipt = structuredClone(failed.manifest); missingReceipt.transition_receipts.pop();
  assert.throws(() => api.validateManifest(missingReceipt), code("INVALID_SCHEMA"));
  const retry = await api.workerRunRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: failed.revision, worker_run: makeWorkerRun({ worker_run_id: "run-002", workspace_cwd: repo.root }) });
  assert.equal(retry.manifest.worker_runs.at(-1).assignment_id, "assignment-001");
  await assert.rejects(api.observeWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: retry.revision, worker_run_id: "run-001", observation: workerObservation("running") }), code("INVALID_TRANSITION"));
});

test("Task snapshotは文書全体OIDから独立し、同一Control依存のready gateとcycle検査を持つ", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "dependency-control" });
  const foundation = await api.taskRecord({ cwd: repo.root, control_id: "dependency-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "foundation-task" }) });
  const dependentTask = makeTask({ task_id: "dependent-task", depends_on: ["foundation-task"] });
  const dependent = await api.taskRecord({ cwd: repo.root, control_id: "dependency-control", actor_id: "parent", expected_revision: foundation.revision, task: dependentTask });
  assert.equal(dependent.manifest.tasks[1].admission_digest, taskAdmissionDigest(dependent.manifest.tasks[1]));
  const tampered = structuredClone(dependent.manifest); tampered.tasks[1].title = "digestを更新していない改ざん";
  assert.throws(() => api.validateManifest(tampered), code("INVALID_SCHEMA"));
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: "dependency-control", actor_id: "parent", expected_revision: dependent.revision, task: makeTask({ task_id: "unknown-dependency", depends_on: ["missing-task"] }) }), code("INVALID_SCHEMA"));
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "dependency-control", actor_id: "parent", expected_revision: dependent.revision, worker_run: makeWorkerRun({ worker_run_id: "wrong-role-run", task_id: "dependent-task", assignment_id: "wrong-role-assignment", role_ref: "refuter", workspace_cwd: repo.root }) }), code("INVALID_SCHEMA"));
  const run = await api.workerRunRecord({ cwd: repo.root, control_id: "dependency-control", actor_id: "parent", expected_revision: dependent.revision, worker_run: makeWorkerRun({ task_id: "dependent-task", workspace_cwd: repo.root }) });
  const consultation = await api.consultationRecord({ cwd: repo.root, control_id: "dependency-control", actor_id: "parent", expected_revision: run.revision, consultation: makeConsultation({ task_id: "dependent-task" }) });
  await assert.rejects(api.admitWorker({ cwd: repo.root, control_id: "dependency-control", actor_id: "parent", expected_revision: consultation.revision, worker_run_id: "run-001" }), code("DEPENDENCY_NOT_READY"));
  await assert.rejects(api.observeConsultation({ cwd: repo.root, control_id: "dependency-control", actor_id: "parent", expected_revision: consultation.revision, consultation_id: "consultation-001", observation: { state: "dispatched", source: "gpt-connector", observed_version: "gpt-5.6", observed_at: "2026-07-14T00:01:00.000Z", raw_state: "dispatched" } }), code("DEPENDENCY_NOT_READY"));
  const finalized = await api.taskFinalizeRecord({ cwd: repo.root, control_id: "dependency-control", actor_id: "parent", expected_revision: consultation.revision, task_id: "foundation-task", finalization_ref: "docs/foundation-decision.md", recorded_by: "parent" });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "dependency-control", actor_id: "parent", expected_revision: finalized.revision, worker_run_id: "run-001" });
  const dispatched = await api.observeConsultation({ cwd: repo.root, control_id: "dependency-control", actor_id: "parent", expected_revision: admitted.revision, consultation_id: "consultation-001", observation: { state: "dispatched", source: "gpt-connector", observed_version: "gpt-5.6", observed_at: "2026-07-14T00:02:00.000Z", raw_state: "dispatched" } });
  assert.equal(dispatched.manifest.consultations[0].state, "dispatched");
  const cycle = structuredClone(dependent.manifest);
  cycle.tasks[0].depends_on = ["dependent-task"];
  cycle.tasks[0].admission_digest = taskAdmissionDigest(cycle.tasks[0]);
  cycle.tasks[1].admission_digest = taskAdmissionDigest(cycle.tasks[1]);
  assert.throws(() => api.validateManifest(cycle), code("INVALID_SCHEMA"));
});

test("Worker lineageは親子・root assignment・context・入力digestを事実として保存する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "lineage-control" });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "lineage-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "lineage-task" }) });
  const root = await api.workerRunRecord({ cwd: repo.root, control_id: "lineage-control", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "lineage-task", workspace_cwd: repo.root }) });
  assert.equal(root.manifest.worker_runs[0].lineage.root_assignment_id, "assignment-001");
  const childLineage = {
    ...structuredClone(root.manifest.worker_runs[0].lineage),
    parent_worker_run_id: "run-001", root_assignment_id: "assignment-001",
    prompt_family: "refutation-v1", independence_group: "independent-refutation",
    input_digest: "c".repeat(64), approach_family_ref: "minimal-change",
    shared_finding_refs: ["docs/findings/auth-boundary.md"],
  };
  const child = await api.workerRunRecord({ cwd: repo.root, control_id: "lineage-control", actor_id: "parent", expected_revision: root.revision, worker_run: makeWorkerRun({ worker_run_id: "run-child", task_id: "lineage-task", assignment_id: "assignment-child", workspace_cwd: repo.root, lineage: childLineage }) });
  assert.deepEqual(child.manifest.worker_runs[1].lineage, childLineage);
  const unknownParent = { ...childLineage, parent_worker_run_id: "missing-run" };
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "lineage-control", actor_id: "parent", expected_revision: child.revision, worker_run: makeWorkerRun({ worker_run_id: "unknown-parent-run", task_id: "lineage-task", assignment_id: "unknown-parent-assignment", workspace_cwd: repo.root, lineage: unknownParent }) }), code("INVALID_SCHEMA"));
  const wrongContext = structuredClone(childLineage); wrongContext.parent_worker_run_id = null; wrongContext.root_assignment_id = "wrong-context-assignment"; wrongContext.context_policy.share_existing_findings = true;
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "lineage-control", actor_id: "parent", expected_revision: child.revision, worker_run: makeWorkerRun({ worker_run_id: "wrong-context-run", task_id: "lineage-task", assignment_id: "wrong-context-assignment", workspace_cwd: repo.root, lineage: wrongContext }) }), code("INVALID_SCHEMA"));
  const cycle = structuredClone(child.manifest);
  cycle.worker_runs[0].lineage.parent_worker_run_id = "run-child";
  assert.throws(() => api.validateManifest(cycle), code("INVALID_SCHEMA"));
});

test("read-only Workerも正式admissionを通り、証拠つき結果と親検証を保存する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "read-admission-control" });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "read-admission-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "read-task", effect: "read", write_scope: [] }) });
  const run = await api.workerRunRecord({ cwd: repo.root, control_id: "read-admission-control", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "read-task", write_mode: "none", workspace_cwd: repo.root }) });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "read-admission-control", actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
  assert.equal(admitted.manifest.worker_runs[0].state, "admitted");
  assert.deepEqual(admitted.manifest.worker_runs[0].admission.write_reservation, false);
  assert.equal(admitted.manifest.worker_runs[0].baseline_workspace_fingerprint, null);
  const dispatched = await api.observeWorker({ cwd: repo.root, control_id: "read-admission-control", actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "run-001", observation: workerObservation("dispatched") });
  const completed = await api.observeWorker({ cwd: repo.root, control_id: "read-admission-control", actor_id: "parent", expected_revision: dispatched.revision, worker_run_id: "run-001", observation: completedWorkerObservation() });
  assert.deepEqual(completed.manifest.worker_runs[0].result.evidence, [evidence("docs/worker-result.md")]);
  const accepted = await api.accept({ cwd: repo.root, control_id: "read-admission-control", actor_id: "parent", expected_revision: completed.revision, worker_run_id: "run-001", result_digest: "a".repeat(64), verification_evidence: [evidence("docs/verify.md")], decision_note: "read evidence verified", decided_by: "parent" });
  assert.deepEqual(accepted.manifest.worker_runs[0].acceptance.verification_evidence, [evidence("docs/verify.md")]);
});

test("manifest truth tableとtyped evidenceは欠損・矛盾・黙殺をfail-closedにする", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "truth-table-control" });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "truth-table-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "truth-task", effect: "read", write_scope: [] }) });
  const badEvidenceRun = makeWorkerRun({ worker_run_id: "bad-evidence-run", task_id: "truth-task", assignment_id: "bad-evidence-assignment", write_mode: "none", workspace_cwd: repo.root });
  badEvidenceRun.execution_verification.evidence = { ...badEvidenceRun.execution_verification.evidence, digest: "not-sha256" };
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: "truth-table-control", actor_id: "parent", expected_revision: task.revision, worker_run: badEvidenceRun }), code("INVALID_SCHEMA"));
  const run = await api.workerRunRecord({ cwd: repo.root, control_id: "truth-table-control", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "truth-task", write_mode: "none", workspace_cwd: repo.root }) });
  const forgedAdmission = structuredClone(run.manifest);
  forgedAdmission.worker_runs[0].state = "admitted";
  assert.throws(() => api.validateManifest(forgedAdmission), code("INVALID_SCHEMA"));
  await assert.rejects(api.observeWorker({ cwd: repo.root, control_id: "truth-table-control", actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001", observation: workerObservation("cancelled", { terminal_evidence: [evidence("docs/must-not-be-ignored.md")] }) }), code("INVALID_SCHEMA"));
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "truth-table-control", actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
  const forgedDispatch = structuredClone(admitted.manifest);
  forgedDispatch.worker_runs[0].state = "dispatched";
  assert.throws(() => api.validateManifest(forgedDispatch), code("INVALID_SCHEMA"));
  const cancelled = await api.observeWorker({ cwd: repo.root, control_id: "truth-table-control", actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "run-001", observation: workerObservation("cancelled", { dispatch_attempt_evidence: [evidence("connector:codex-sidecar:dispatch-attempt", "executor-receipt")] }) });
  assert.deepEqual(cancelled.manifest.worker_runs[0].dispatch_attempt_evidence, [evidence("connector:codex-sidecar:dispatch-attempt", "executor-receipt")]);
});

test("linked worktree共通dirでglobal lockとwrite競合を直列化し、non-overlapを許可する", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const main = await createGitRepo(base); const linked = await addLinkedWorktree(main);
  const one = await api.init({ cwd: main.root, control_id: "main-control", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const two = await api.init({ cwd: linked.root, control_id: "linked-control", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  assert.equal(one.manifest.declaration.common_dir_realpath, two.manifest.declaration.common_dir_realpath);
  const global = await api.taskRecord({ cwd: main.root, control_id: "main-control", actor_id: "parent", expected_revision: one.revision, task: makeTask({ task_id: "global-unique" }) });
  await assert.rejects(api.taskRecord({ cwd: linked.root, control_id: "linked-control", actor_id: "parent", expected_revision: two.revision, task: makeTask({ task_id: "global-unique" }) }), code("DUPLICATE_ID"));
  const mainTask = await api.taskRecord({ cwd: main.root, control_id: "main-control", actor_id: "parent", expected_revision: global.revision, task: makeTask({ task_id: "race-a" }) });
  const linkedTask = await api.taskRecord({ cwd: linked.root, control_id: "linked-control", actor_id: "parent", expected_revision: two.revision, task: makeTask({ task_id: "race-b" }) });
  const mainRun = await api.workerRunRecord({ cwd: main.root, control_id: "main-control", actor_id: "parent", expected_revision: mainTask.revision, worker_run: makeWorkerRun({ worker_run_id: "race-run-a", task_id: "race-a", assignment_id: "race-assignment-a", workspace_cwd: main.root }) });
  const linkedRun = await api.workerRunRecord({ cwd: linked.root, control_id: "linked-control", actor_id: "parent", expected_revision: linkedTask.revision, worker_run: makeWorkerRun({ worker_run_id: "race-run-b", task_id: "race-b", assignment_id: "race-assignment-b", workspace_cwd: linked.root }) });
  assert.deepEqual(await api.conflictCheck({ cwd: main.root, control_id: "main-control" }), { conflicts: [] });
  const [a, b] = await Promise.allSettled([
    api.admitWorker({ cwd: main.root, control_id: "main-control", actor_id: "parent", expected_revision: mainRun.revision, worker_run_id: "race-run-a" }),
    api.admitWorker({ cwd: linked.root, control_id: "linked-control", actor_id: "parent", expected_revision: linkedRun.revision, worker_run_id: "race-run-b" }),
  ]);
  const fulfilled = [a, b].filter((x) => x.status === "fulfilled");
  const rejected = [a, b].filter((x) => x.status === "rejected");
  assert.ok((fulfilled.length === 1 && rejected.length === 1 && ["LOCK_CONTENDED", "WRITE_CONFLICT"].includes(rejected[0].reason.code)) || (fulfilled.length === 0 && rejected.length === 2 && rejected.every((x) => x.reason.code === "LOCK_CONTENDED")));
  const linkedRevision = b.status === "fulfilled" ? b.value.revision : linkedRun.revision;
  const later = await api.taskRecord({ cwd: linked.root, control_id: "linked-control", actor_id: "parent", expected_revision: linkedRevision, task: makeTask({ task_id: "non-overlap", write_scope: [{ kind: "directory", path: "tests/orchestrate" }] }) });
  assert.equal(later.manifest.tasks.at(-1).task_id, "non-overlap");
});

test("全manifest scanはassignment immutable tupleをControl横断で再検証する", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const repo = await createGitRepo(base); const linked = await addLinkedWorktree(repo, "assignment-linked");
  const first = await api.init({ cwd: repo.root, control_id: "assignment-one", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const second = await api.init({ cwd: linked.root, control_id: "assignment-two", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const taskOne = await api.taskRecord({ cwd: repo.root, control_id: "assignment-one", actor_id: "parent", expected_revision: first.revision, task: makeTask({ task_id: "assignment-task-one", effect: "read", write_scope: [] }) });
  const run = await api.workerRunRecord({ cwd: repo.root, control_id: "assignment-one", actor_id: "parent", expected_revision: taskOne.revision, worker_run: makeWorkerRun({ worker_run_id: "assignment-run-one", assignment_id: "shared-assignment", task_id: "assignment-task-one", write_mode: "none", workspace_cwd: repo.root }) });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "assignment-one", actor_id: "parent", expected_revision: run.revision, worker_run_id: "assignment-run-one" });
  const dispatched = await api.observeWorker({ cwd: repo.root, control_id: "assignment-one", actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "assignment-run-one", observation: workerObservation("dispatched") });
  await api.observeWorker({ cwd: repo.root, control_id: "assignment-one", actor_id: "parent", expected_revision: dispatched.revision, worker_run_id: "assignment-run-one", observation: terminalWorkerObservation() });
  const taskTwo = await api.taskRecord({ cwd: linked.root, control_id: "assignment-two", actor_id: "parent", expected_revision: second.revision, task: makeTask({ task_id: "assignment-task-two", effect: "read", write_scope: [] }) });
  await assert.rejects(api.workerRunRecord({
    cwd: linked.root, control_id: "assignment-two", actor_id: "parent", expected_revision: taskTwo.revision,
    worker_run: makeWorkerRun({ worker_run_id: "assignment-run-two", assignment_id: "shared-assignment", task_id: "assignment-task-two", write_mode: "none", workspace_cwd: linked.root }),
  }), code("INVALID_SCHEMA"));
});

test("同一worktreeはscopeが非交差でも予約済みwrite Runを一件だけにする", async (t) => {
  const { repo, result } = await initialized(t);
  const firstTask = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "same-wt-a", write_scope: [{ kind: "directory", path: "lib" }] }) });
  const secondTask = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: firstTask.revision, task: makeTask({ task_id: "same-wt-b", write_scope: [{ kind: "directory", path: "tests" }] }) });
  const firstRun = await api.workerRunRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: secondTask.revision, worker_run: makeWorkerRun({ worker_run_id: "same-wt-run-a", task_id: "same-wt-a", assignment_id: "same-wt-assignment-a", workspace_cwd: repo.root }) });
  const secondRun = await api.workerRunRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: firstRun.revision, worker_run: makeWorkerRun({ worker_run_id: "same-wt-run-b", task_id: "same-wt-b", assignment_id: "same-wt-assignment-b", workspace_cwd: repo.root }) });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: secondRun.revision, worker_run_id: "same-wt-run-a" });
  assert.equal(admitted.manifest.worker_runs[0].state, "admitted");
  await assert.rejects(api.admitWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "same-wt-run-b" }), code("WRITE_CONFLICT"));
});

test("linked worktreeの同一scopeは同一alternative_groupのisolated-alternativeだけ両方予約できる", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const main = await createGitRepo(base); const linked = await addLinkedWorktree(main, "alternative-linked");
  const left = await api.init({ cwd: main.root, control_id: "alternative-left", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const right = await api.init({ cwd: linked.root, control_id: "alternative-right", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const leftTask = await api.taskRecord({ cwd: main.root, control_id: "alternative-left", actor_id: "parent", expected_revision: left.revision, task: makeTask({ task_id: "alternative-task-left", alternative_group: "choice-a" }) });
  const rightTask = await api.taskRecord({ cwd: linked.root, control_id: "alternative-right", actor_id: "parent", expected_revision: right.revision, task: makeTask({ task_id: "alternative-task-right", alternative_group: "choice-a" }) });
  const leftRun = await api.workerRunRecord({ cwd: main.root, control_id: "alternative-left", actor_id: "parent", expected_revision: leftTask.revision, worker_run: makeWorkerRun({ worker_run_id: "alternative-run-left", task_id: "alternative-task-left", assignment_id: "alternative-assignment-left", workspace_cwd: main.root, write_mode: "isolated-alternative" }) });
  const rightRun = await api.workerRunRecord({ cwd: linked.root, control_id: "alternative-right", actor_id: "parent", expected_revision: rightTask.revision, worker_run: makeWorkerRun({ worker_run_id: "alternative-run-right", task_id: "alternative-task-right", assignment_id: "alternative-assignment-right", workspace_cwd: linked.root, write_mode: "isolated-alternative" }) });
  const leftReserved = await api.admitWorker({ cwd: main.root, control_id: "alternative-left", actor_id: "parent", expected_revision: leftRun.revision, worker_run_id: "alternative-run-left" });
  const rightReserved = await api.admitWorker({ cwd: linked.root, control_id: "alternative-right", actor_id: "parent", expected_revision: rightRun.revision, worker_run_id: "alternative-run-right" });
  assert.equal(leftReserved.manifest.worker_runs[0].state, "admitted");
  assert.equal(rightReserved.manifest.worker_runs[0].state, "admitted");
});

test("別linked worktreeでalternative_group不一致は同一scopeを予約できない", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const main = await createGitRepo(base); const linked = await addLinkedWorktree(main, "negative-alternative-linked");
  const left = await api.init({ cwd: main.root, control_id: "negative-left", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const right = await api.init({ cwd: linked.root, control_id: "negative-right", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const leftTask = await api.taskRecord({ cwd: main.root, control_id: "negative-left", actor_id: "parent", expected_revision: left.revision, task: makeTask({ task_id: "negative-left-task", alternative_group: "choice-a" }) });
  const rightTask = await api.taskRecord({ cwd: linked.root, control_id: "negative-right", actor_id: "parent", expected_revision: right.revision, task: makeTask({ task_id: "negative-right-task", alternative_group: "choice-b" }) });
  const leftRun = await api.workerRunRecord({ cwd: main.root, control_id: "negative-left", actor_id: "parent", expected_revision: leftTask.revision, worker_run: makeWorkerRun({ worker_run_id: "negative-left-run", task_id: "negative-left-task", assignment_id: "negative-left-assignment", workspace_cwd: main.root, write_mode: "isolated-alternative" }) });
  const rightRun = await api.workerRunRecord({ cwd: linked.root, control_id: "negative-right", actor_id: "parent", expected_revision: rightTask.revision, worker_run: makeWorkerRun({ worker_run_id: "negative-right-run", task_id: "negative-right-task", assignment_id: "negative-right-assignment", workspace_cwd: linked.root, write_mode: "isolated-alternative" }) });
  const admitted = await api.admitWorker({ cwd: main.root, control_id: "negative-left", actor_id: "parent", expected_revision: leftRun.revision, worker_run_id: "negative-left-run" });
  assert.equal(admitted.manifest.worker_runs[0].state, "admitted");
  await assert.rejects(api.admitWorker({ cwd: linked.root, control_id: "negative-right", actor_id: "parent", expected_revision: rightRun.revision, worker_run_id: "negative-right-run" }), code("WRITE_CONFLICT"));
});

test("linked worktreeをremove/re-addした実identity driftはadmission時に拒否する", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const main = await createGitRepo(base); const linked = await addLinkedWorktree(main, "identity-linked");
  const init = await api.init({ cwd: main.root, control_id: "identity-control", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const task = await api.taskRecord({ cwd: main.root, control_id: "identity-control", actor_id: "parent", expected_revision: init.revision, task: makeTask({ task_id: "identity-task" }) });
  const run = await api.workerRunRecord({ cwd: main.root, control_id: "identity-control", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "identity-task", workspace_cwd: linked.root }) });
  const recordedFileId = run.manifest.worker_runs[0].workspace.git_dir_file_id;
  assert.match(recordedFileId, /^\d+:\d+$/);
  runGit(main.root, ["worktree", "remove", "--force", linked.root]);
  runGit(main.root, ["worktree", "add", "-q", "-b", "identity-readded", linked.root]);
  const readdedGitDir = runGit(linked.root, ["rev-parse", "--path-format=absolute", "--git-dir"]);
  const readdedStat = await (await import("node:fs/promises")).stat(readdedGitDir);
  assert.notEqual(`${readdedStat.dev}:${readdedStat.ino}`, recordedFileId);
  const resume = await api.resumeCheck({ cwd: main.root, control_id: "identity-control" });
  assert.equal(resume.outcome, "blocked");
  assert.ok(resume.blocking_reasons.some((entry) => entry.code === "worker-worktree-generation-changed" && entry.subject_id === "run-001"));
  await assert.rejects(api.admitWorker({ cwd: main.root, control_id: "identity-control", actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" }), code("WORKSPACE_DRIFT"));
});

test("atomic manifest更新中も並行readerは完全JSONと旧または新revisionだけを観測する", async (t) => {
  const { repo, result } = await initialized(t);
  const manifestPath = join(repo.commonDir, "dotagents", "orchestrate", "controls", CONTROL, "manifest.json");
  const observations = []; let reading = true;
  const reader = (async () => { while (reading) { const value = JSON.parse(await readFile(manifestPath, "utf8")); observations.push(value.record_revision); } })();
  let revision = result.revision;
  for (const number of [1, 2, 3]) {
    const mutation = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: revision, task: makeTask({ task_id: `atomic-task-${number}` }) });
    revision = mutation.revision;
  }
  reading = false; await reader;
  assert.ok(observations.length > 0);
  assert.ok(observations.every((value) => Number.isInteger(value) && value >= result.revision && value <= revision));
  assert.deepEqual(await readdir(join(repo.commonDir, "dotagents", "orchestrate", "controls", CONTROL)), ["manifest.json"]);
});

test("durability faultはlock残留や偽成功を作らずunknown outcomeを明示する", async (t) => {
  await withRepo(t, async (repo) => {
    const init = await api.init({ cwd: repo.root, control_id: "manifest-fault", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
    await withFault("manifest-after-rename", () => assert.rejects(api.taskRecord({ cwd: repo.root, control_id: "manifest-fault", actor_id: "parent", expected_revision: init.revision, task: makeTask({ task_id: "committed-but-unknown" }) }), code("COMMIT_OUTCOME_UNKNOWN")));
    const observed = await api.status({ cwd: repo.root, control_id: "manifest-fault" });
    assert.equal(observed.record_revision, 1); assert.equal(observed.tasks[0].task_id, "committed-but-unknown");
  });
  await withRepo(t, async (repo) => {
    const init = await api.init({ cwd: repo.root, control_id: "owner-fault", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
    await withFault("owner-publish-after-rename", () => assert.rejects(api.taskRecord({ cwd: repo.root, control_id: "owner-fault", actor_id: "parent", expected_revision: init.revision, task: makeTask({ task_id: "never-recorded" }) }), code("IO_FAILURE")));
    assert.deepEqual(await readdir(join(repo.commonDir, "dotagents", "orchestrate", "lock-owners")), []);
    await withFault("owner-release-after-unlink", () => assert.rejects(api.taskRecord({ cwd: repo.root, control_id: "owner-fault", actor_id: "parent", expected_revision: init.revision, task: makeTask({ task_id: "release-unknown" }) }), code("LOCK_OUTCOME_UNKNOWN")));
    assert.equal((await api.status({ cwd: repo.root, control_id: "owner-fault" })).tasks[0].task_id, "release-unknown");
    assert.deepEqual(await readdir(join(repo.commonDir, "dotagents", "orchestrate", "lock-owners")), []);
  });
  await withRepo(t, async (repo) => {
    const input = { cwd: repo.root, control_id: "parent-sync-fault", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() };
    await withFault("new-control-before-parent-sync", () => assert.rejects(api.init(input), code("IO_FAILURE")));
    await assert.rejects(access(join(repo.commonDir, "dotagents", "orchestrate", "controls", "parent-sync-fault")));
    assert.equal((await api.init(input)).manifest.control_id, "parent-sync-fault");
  });
});

test("baseline後のscope内変更はcompletedとacceptを通過する", async (t) => {
  const { repo, result } = await initialized(t);
  const task = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "fingerprint-task", write_scope: [{ kind: "file", path: "README.md" }] }) });
  const run = await api.workerRunRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "fingerprint-task", workspace_cwd: repo.root }) });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
  await writeFile(join(repo.root, "README.md"), "scope-in-change\n");
  await chmod(join(repo.root, "README.md"), 0o755);
  const dispatched = await api.observeWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "run-001", observation: workerObservation("dispatched") });
  const completed = await api.observeWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: dispatched.revision, worker_run_id: "run-001", observation: completedWorkerObservation() });
  assert.equal(typeof completed.manifest.worker_runs[0].result.workspace_fingerprint.digest, "string");
  const accepted = await api.accept({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: completed.revision, worker_run_id: "run-001", result_digest: "a".repeat(64), verification_evidence: [evidence("docs/verify.md")], decision_note: "scope only", decided_by: "parent" });
  assert.equal(accepted.manifest.worker_runs[0].acceptance.decision, "accepted");
  assert.equal(accepted.manifest.worker_runs[0].result.workspace_fingerprint.files.find((entry) => entry.path === "README.md").file_mode & 0o777, 0o755);
});

test("admission後のscope外変更はcompleted観測をWORKSPACE_DRIFTで拒否する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "scope-outside-control" });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "scope-outside-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "scope-outside-task", write_scope: [{ kind: "directory", path: "lib/orchestrate" }] }) });
  const run = await api.workerRunRecord({ cwd: repo.root, control_id: "scope-outside-control", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "scope-outside-task", workspace_cwd: repo.root }) });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "scope-outside-control", actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
  const dispatched = await api.observeWorker({ cwd: repo.root, control_id: "scope-outside-control", actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "run-001", observation: workerObservation("dispatched") });
  await writeFile(join(repo.root, "README.md"), "outside scope change\n");
  await assert.rejects(api.observeWorker({ cwd: repo.root, control_id: "scope-outside-control", actor_id: "parent", expected_revision: dispatched.revision, worker_run_id: "run-001", observation: completedWorkerObservation() }), code("WORKSPACE_DRIFT"));
});

test("admission後の既存dirty scope外file mode変更をWORKSPACE_DRIFTで拒否する", async (t) => {
  await withRepo(t, async (repo) => {
    const outside = join(repo.root, "docs", "control-record-plan.md");
    await writeFile(outside, "# dirty control record fixture plan\n");
    const init = await api.init({ cwd: repo.root, control_id: "mode-drift-control", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
    const task = await api.taskRecord({ cwd: repo.root, control_id: "mode-drift-control", actor_id: "parent", expected_revision: init.revision, task: makeTask({ task_id: "mode-drift-task", write_scope: [{ kind: "file", path: "README.md" }] }) });
    const run = await api.workerRunRecord({ cwd: repo.root, control_id: "mode-drift-control", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "mode-drift-task", workspace_cwd: repo.root }) });
    const admitted = await api.admitWorker({ cwd: repo.root, control_id: "mode-drift-control", actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
    const baseline = admitted.manifest.worker_runs[0].baseline_workspace_fingerprint.files.find((entry) => entry.path === "docs/control-record-plan.md");
    await chmod(outside, 0o755);
    const dispatched = await api.observeWorker({ cwd: repo.root, control_id: "mode-drift-control", actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "run-001", observation: workerObservation("dispatched") });
    await assert.rejects(api.observeWorker({ cwd: repo.root, control_id: "mode-drift-control", actor_id: "parent", expected_revision: dispatched.revision, worker_run_id: "run-001", observation: completedWorkerObservation() }), code("WORKSPACE_DRIFT"));
    assert.equal(baseline.file_mode & 0o777, 0o644);
  });
});

test("completed後accept前のworkspace変更はacceptをWORKSPACE_DRIFTで拒否する", async (t) => {
  const { repo, result } = await initialized(t, { control_id: "accept-drift-control" });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "accept-drift-control", actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "accept-drift-task", write_scope: [{ kind: "file", path: "README.md" }] }) });
  const run = await api.workerRunRecord({ cwd: repo.root, control_id: "accept-drift-control", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "accept-drift-task", workspace_cwd: repo.root }) });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: "accept-drift-control", actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
  await writeFile(join(repo.root, "README.md"), "first scoped change\n");
  const dispatched = await api.observeWorker({ cwd: repo.root, control_id: "accept-drift-control", actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "run-001", observation: workerObservation("dispatched") });
  const completed = await api.observeWorker({ cwd: repo.root, control_id: "accept-drift-control", actor_id: "parent", expected_revision: dispatched.revision, worker_run_id: "run-001", observation: completedWorkerObservation() });
  assert.equal(typeof completed.manifest.worker_runs[0].result.workspace_fingerprint.digest, "string");
  await writeFile(join(repo.root, "README.md"), "second scoped change before accept\n");
  await assert.rejects(api.accept({ cwd: repo.root, control_id: "accept-drift-control", actor_id: "parent", expected_revision: completed.revision, worker_run_id: "run-001", result_digest: "a".repeat(64), verification_evidence: [evidence("docs/verify.md")], decision_note: "changed after complete", decided_by: "parent" }), code("WORKSPACE_DRIFT"));
});

test("writer fingerprintはindex変更と宣言scope内のignored成果物を拒否する", async (t) => {
  await withRepo(t, async (repo) => {
    await writeFile(join(repo.root, ".gitignore"), "ignored-output.log\n");
    runGit(repo.root, ["add", ".gitignore"]); runGit(repo.root, ["commit", "-q", "-m", "ignore fixture"]);
    const init = await api.init({ cwd: repo.root, control_id: "ignored-guard", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
    const task = await api.taskRecord({ cwd: repo.root, control_id: "ignored-guard", actor_id: "parent", expected_revision: init.revision, task: makeTask({ task_id: "ignored-task", write_scope: [{ kind: "file", path: "ignored-output.log" }] }) });
    const run = await api.workerRunRecord({ cwd: repo.root, control_id: "ignored-guard", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "ignored-task", workspace_cwd: repo.root }) });
    const admitted = await api.admitWorker({ cwd: repo.root, control_id: "ignored-guard", actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
    const dispatched = await api.observeWorker({ cwd: repo.root, control_id: "ignored-guard", actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "run-001", observation: workerObservation("dispatched") });
    await writeFile(join(repo.root, "ignored-output.log"), "must be observed\n");
    await assert.rejects(api.observeWorker({ cwd: repo.root, control_id: "ignored-guard", actor_id: "parent", expected_revision: dispatched.revision, worker_run_id: "run-001", observation: completedWorkerObservation() }), code("WORKSPACE_DRIFT"));
  });
  await withRepo(t, async (repo) => {
    const init = await api.init({ cwd: repo.root, control_id: "index-guard", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
    const task = await api.taskRecord({ cwd: repo.root, control_id: "index-guard", actor_id: "parent", expected_revision: init.revision, task: makeTask({ task_id: "index-task", write_scope: [{ kind: "file", path: "README.md" }] }) });
    const run = await api.workerRunRecord({ cwd: repo.root, control_id: "index-guard", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "index-task", workspace_cwd: repo.root }) });
    const admitted = await api.admitWorker({ cwd: repo.root, control_id: "index-guard", actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
    const dispatched = await api.observeWorker({ cwd: repo.root, control_id: "index-guard", actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "run-001", observation: workerObservation("dispatched") });
    runGit(repo.root, ["update-index", "--assume-unchanged", "README.md"]);
    await assert.rejects(api.observeWorker({ cwd: repo.root, control_id: "index-guard", actor_id: "parent", expected_revision: dispatched.revision, worker_run_id: "run-001", observation: completedWorkerObservation() }), code("WORKSPACE_DRIFT"));
  });
});

test("lock owner recoveryはexact JSON、live/dead/malformed/link/token mismatchを区別する", async (t) => {
  const { repo } = await initialized(t);
  const owners = await createOwnerFixtures(repo.commonDir);
  for (const [name, token, expected] of [["live", "22222222-2222-4222-8222-222222222222", "LOCK_LIVE"], ["malformed", "33333333-3333-4333-8333-333333333333", "LOCK_MALFORMED"], ["symlink", "66666666-6666-4666-8666-666666666666", "STATE_PATH_UNSAFE"], ["hardlink", "77777777-7777-4777-8777-777777777777", "STATE_PATH_UNSAFE"], ["tokenMismatch", "44444444-4444-4444-8444-444444444444", "LOCK_TOKEN_MISMATCH"]]) {
    await assert.rejects(api.recoverLock({ cwd: repo.root, expected_token: token }), code(expected));
  }
  const deadToken = "11111111-1111-4111-8111-111111111111";
  const recovered = await api.recoverLock({ cwd: repo.root, expected_token: deadToken });
  assert.deepEqual(recovered, { recovered: true, token: deadToken });
  await assert.rejects(access(owners.dead));
  assert.equal(OWNER_SCHEMA, "dotagents.orchestration-lock-owner.v1");
});

test("fingerprintは実64MiBを受理し64MiB超過と非regularを拒否する", async (t) => {
  await withRepo(t, async (repo) => {
    const files = await createFingerprintBoundaryFiles(repo.root);
    assert.equal(files.acceptedStat.size, 64 * 1024 * 1024);
    runGit(repo.root, ["add", "exactly-64MiB.bin"]);
    const previousGitDir = process.env.GIT_DIR;
    const previousOptionalLocks = process.env.GIT_OPTIONAL_LOCKS;
    const previousGlobalConfig = process.env.GIT_CONFIG_GLOBAL;
    process.env.GIT_DIR = join(repo.root, "must-not-be-used-as-git-dir");
    process.env.GIT_OPTIONAL_LOCKS = "1";
    process.env.GIT_CONFIG_GLOBAL = join(repo.root, "must-not-be-used-as-git-config");
    t.after(() => {
      if (previousGitDir === undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR = previousGitDir;
      if (previousOptionalLocks === undefined) delete process.env.GIT_OPTIONAL_LOCKS; else process.env.GIT_OPTIONAL_LOCKS = previousOptionalLocks;
      if (previousGlobalConfig === undefined) delete process.env.GIT_CONFIG_GLOBAL; else process.env.GIT_CONFIG_GLOBAL = previousGlobalConfig;
    });
    const accepted = await api.fingerprintWorkspace({ cwd: repo.root });
    if (previousGitDir === undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR = previousGitDir;
    if (previousOptionalLocks === undefined) delete process.env.GIT_OPTIONAL_LOCKS; else process.env.GIT_OPTIONAL_LOCKS = previousOptionalLocks;
    if (previousGlobalConfig === undefined) delete process.env.GIT_CONFIG_GLOBAL; else process.env.GIT_CONFIG_GLOBAL = previousGlobalConfig;
    assert.equal(typeof accepted.digest, "string");
    await rm(files.accepted); runGit(repo.root, ["reset", "--", "exactly-64MiB.bin"]);
    const oversized = await createOversizedFingerprintFile(repo.root);
    assert.equal(oversized.rejectedStat.size, (64 * 1024 * 1024) + 1);
    await assert.rejects(api.fingerprintWorkspace({ cwd: repo.root }), code("LIMIT_EXCEEDED"));
    await rm(oversized.rejected);
    await symlink("README.md", join(repo.root, "tracked-symlink"));
    runGit(repo.root, ["add", "tracked-symlink"]);
    await assert.rejects(api.fingerprintWorkspace({ cwd: repo.root }), code("STATE_PATH_UNSAFE"));
  });
});

test("malformed manifestまたはcontrols未知entryが次mutationをfail-closedにする", async (t) => {
  const { repo, result } = await initialized(t);
  const paths = join(repo.commonDir, "dotagents", "orchestrate", "controls", "poison-control");
  await writeFile(join(repo.commonDir, "dotagents", "orchestrate", "controls", "unknown-file"), "poison");
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "blocked-by-entry" }) }), code("STATE_PATH_UNSAFE"));
  await rm(join(repo.commonDir, "dotagents", "orchestrate", "controls", "unknown-file"));
  await mkdir(paths, { recursive: true });
  await chmod(paths, 0o700);
  await writeFile(join(paths, "manifest.json"), "{not json");
  await chmod(join(paths, "manifest.json"), 0o600);
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "blocked-by-manifest" }) }), code("INVALID_SCHEMA"));
});

test("accept/reject/task finalization/control finalization/archiveは状態・証拠・atomic manifestを検査する", async (t) => {
  const { repo, result } = await initialized(t);
  const task = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: result.revision, task: makeTask() });
  const run = await api.workerRunRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ workspace_cwd: repo.root }) });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
  const dispatched = await api.observeWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "run-001", observation: workerObservation("dispatched") });
  const completed = await api.observeWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: dispatched.revision, worker_run_id: "run-001", observation: completedWorkerObservation() });
  const accepted = await api.accept({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: completed.revision, worker_run_id: "run-001", result_digest: "a".repeat(64), verification_evidence: [evidence("docs/verify.md")], decision_note: "accepted", decided_by: "parent" });
  assert.equal(accepted.manifest.worker_runs[0].acceptance.decision, "accepted");
  assert.equal(accepted.manifest.transition_receipts.at(-1).operation, "worker-accept");
  assert.deepEqual(accepted.manifest.transition_receipts.at(-1).evidence, [evidence("docs/verify.md")]);
  const decided = await api.taskFinalizeRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: accepted.revision, task_id: "task-001", finalization_ref: "docs/decision.md", recorded_by: "parent" });
  await assert.rejects(api.archive({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: decided.revision }), code("ARCHIVE_NOT_READY"));
  const finalized = await api.finalizeControl({
    cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: decided.revision,
    acceptance_matrix_ref: "docs/acceptance-matrix.md",
    final_audit_evidence: [evidence("docs/final-audit.md")],
    regression_evidence: [evidence("docs/regression.md", "command")],
    knowledge_return_refs: ["docs/knowledge-return.md"],
    parent_decision: evidence("docs/final-decision.md", "decision"),
    finalized_by: "parent",
  });
  assert.equal(finalized.manifest.control_finalization.objective_ref, "docs/control-record-plan.md");
  assert.equal(finalized.manifest.transition_receipts.at(-1).operation, "control-finalize");
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: finalized.revision, task: makeTask({ task_id: "late-task" }) }), code("CONTROL_FINALIZED"));
  const archived = await api.archive({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: finalized.revision });
  assert.equal(archived.manifest.status, "archived");
  assert.equal(archived.manifest.transition_receipts.at(-1).operation, "control-archive");
  assert.deepEqual(await readPersistedManifest(repo.commonDir, CONTROL), archived.manifest);
  await assert.rejects(api.reject({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: archived.revision, worker_run_id: "run-001", result_digest: "a".repeat(64), verification_evidence: [evidence("docs/verify.md")], decision_note: "late", decided_by: "parent" }), code("RECORD_ARCHIVED"));
});

test("control finalizationはTask完了と監査・回帰・knowledge return・親Decisionを必須にする", async (t) => {
  const { repo, result } = await initialized(t);
  const task = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: result.revision, task: makeTask({ effect: "read", write_scope: [] }) });
  const base = {
    cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: task.revision,
    acceptance_matrix_ref: "docs/acceptance-matrix.md", final_audit_evidence: [evidence("docs/final-audit.md")],
    regression_evidence: [evidence("npm-test", "command")], knowledge_return_refs: ["docs/knowledge-return.md"],
    parent_decision: evidence("docs/final-decision.md", "decision"), finalized_by: "parent",
  };
  await assert.rejects(api.finalizeControl(base), code("FINALIZATION_NOT_READY"));
  const decided = await api.taskFinalizeRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: task.revision, task_id: "task-001", finalization_ref: "docs/decision.md", recorded_by: "parent" });
  await assert.rejects(api.finalizeControl({ ...base, expected_revision: decided.revision, final_audit_evidence: [] }), code("INVALID_SCHEMA"));
  await assert.rejects(api.finalizeControl({ ...base, expected_revision: decided.revision, regression_evidence: [] }), code("INVALID_SCHEMA"));
  await assert.rejects(api.finalizeControl({ ...base, expected_revision: decided.revision, knowledge_return_refs: [] }), code("INVALID_SCHEMA"));
  await assert.rejects(api.finalizeControl({ ...base, expected_revision: decided.revision, parent_decision: evidence("docs/not-a-decision.md") }), code("INVALID_SCHEMA"));
});

test("record-only layerはprovider/network/dispatch/cancelを実行せず、CLIはstrict input JSONだけを受理する", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const repo = await createGitRepo(base); const sentinel = await installSentinelBin(base);
  const init = await api.init({ cwd: repo.root, control_id: CONTROL, objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const input = join(base, "status.json"); await writeJson(input, { cwd: repo.root, control_id: CONTROL });
  const protectedEnv = { ...process.env, PATH: `${sentinel.bin}:${process.env.PATH}` };
  const ok = spawnOrchestrate(["status", "--input", input], { env: protectedEnv });
  assert.equal(ok.status, 0); assert.deepEqual(JSON.parse(ok.stdout), { ok: true, command: "status", result: await api.status({ cwd: repo.root, control_id: CONTROL }) });
  const brief = spawnOrchestrate(["status", "--brief", "--input", input], { env: protectedEnv });
  assert.equal(brief.status, 0); assert.equal(JSON.parse(brief.stdout).command, "status --brief");
  const resume = spawnOrchestrate(["resume-check", "--input", input], { env: protectedEnv });
  assert.equal(resume.status, 0); assert.equal(JSON.parse(resume.stdout).command, "resume-check");
  const cliControl = "cli-record-only";
  const cliInitInput = join(base, "cli-init.json"); await writeJson(cliInitInput, { cwd: repo.root, control_id: cliControl, objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() });
  const cliInit = spawnOrchestrate(["init", "--input", cliInitInput], { env: protectedEnv });
  assert.equal(cliInit.status, 0); const cliInitResult = JSON.parse(cliInit.stdout).result;
  const cliTaskInput = join(base, "cli-task.json"); await writeJson(cliTaskInput, { cwd: repo.root, control_id: cliControl, actor_id: "parent", expected_revision: cliInitResult.revision, task: makeTask({ task_id: "cli-task" }) });
  const cliTask = spawnOrchestrate(["task-record", "--input", cliTaskInput], { env: protectedEnv });
  assert.equal(cliTask.status, 0); const cliTaskResult = JSON.parse(cliTask.stdout).result;
  const cliRunInput = join(base, "cli-run.json"); await writeJson(cliRunInput, { cwd: repo.root, control_id: cliControl, actor_id: "parent", expected_revision: cliTaskResult.revision, worker_run: makeWorkerRun({ task_id: "cli-task", worker_run_id: "cli-run", assignment_id: "cli-assignment", workspace_cwd: repo.root }) });
  const cliRun = spawnOrchestrate(["worker-run-record", "--input", cliRunInput], { env: protectedEnv });
  assert.equal(cliRun.status, 0); const cliRunResult = JSON.parse(cliRun.stdout).result;
  const cliAdmitInput = join(base, "cli-admit.json"); await writeJson(cliAdmitInput, { cwd: repo.root, control_id: cliControl, actor_id: "parent", expected_revision: cliRunResult.revision, worker_run_id: "cli-run" });
  const cliAdmit = spawnOrchestrate(["admit-worker", "--input", cliAdmitInput], { env: protectedEnv });
  assert.equal(cliAdmit.status, 0); const cliAdmitResult = JSON.parse(cliAdmit.stdout).result;
  assert.equal(cliAdmitResult.manifest.worker_runs[0].state, "admitted");
  const cliRegistryInput = join(base, "cli-registry-observation.json"); await writeJson(cliRegistryInput, {
    cwd: repo.root, control_id: cliControl, actor_id: "parent", expected_revision: cliAdmitResult.revision,
    observation: makeRegistryObservation({ registry_observation_id: "registry-cli" }),
  });
  const cliRegistry = spawnOrchestrate(["registry-observation-record", "--input", cliRegistryInput], { env: protectedEnv });
  assert.equal(cliRegistry.status, 0); const cliRegistryResult = JSON.parse(cliRegistry.stdout).result;
  assert.equal(cliRegistryResult.manifest.registry_observations.at(-1).registry_observation_id, "registry-cli");
  const cliPlacementInput = join(base, "cli-placement.json"); await writeJson(cliPlacementInput, {
    cwd: repo.root, control_id: cliControl, task_id: "cli-task", evaluated_at: "2026-07-14T00:30:00.000Z",
    candidates: [makePlacementCandidate({ candidate_id: "cli-placement", registry_observation_id: "registry-cli", workspace_cwd: repo.root, write_mode: "direct" })],
  });
  const cliPlacement = spawnOrchestrate(["placement-dry-run", "--input", cliPlacementInput], { env: protectedEnv });
  assert.equal(cliPlacement.status, 0); assert.equal(JSON.parse(cliPlacement.stdout).command, "placement-dry-run");
  const cliReserveInput = join(base, "cli-placement-reserve.json"); await writeJson(cliReserveInput, {
    cwd: repo.root, control_id: cliControl, actor_id: "parent", expected_revision: cliRegistryResult.revision,
    task_id: "cli-task", candidate: makePlacementCandidate({ candidate_id: "cli-reserve", registry_observation_id: "registry-cli", workspace_cwd: repo.root, write_mode: "direct" }), review_decision: null,
  });
  const cliReserve = spawnOrchestrate(["placement-reserve", "--input", cliReserveInput], { env: protectedEnv });
  assert.equal(cliReserve.status, 1); assert.equal(JSON.parse(cliReserve.stderr).code, "PLACEMENT_INELIGIBLE");
  const cliWorkerCancelInput = join(base, "cli-worker-cancel.json"); await writeJson(cliWorkerCancelInput, { cwd: repo.root, control_id: cliControl, actor_id: "parent", expected_revision: cliRegistryResult.revision, worker_run_id: "cli-run", decision: evidence("docs/cli-worker-cancel.md", "decision") });
  const cliWorkerCancel = spawnOrchestrate(["worker-cancel-request", "--input", cliWorkerCancelInput], { env: protectedEnv });
  assert.equal(cliWorkerCancel.status, 0); const cliWorkerCancelResult = JSON.parse(cliWorkerCancel.stdout).result;
  assert.equal(cliWorkerCancelResult.manifest.worker_runs[0].state, "admitted");
  const cliTaskCancelInput = join(base, "cli-task-cancel.json"); await writeJson(cliTaskCancelInput, { cwd: repo.root, control_id: cliControl, actor_id: "parent", expected_revision: cliWorkerCancelResult.revision, task_id: "cli-task", decision: evidence("docs/cli-task-cancel.md", "decision") });
  const cliTaskCancel = spawnOrchestrate(["task-cancel-record", "--input", cliTaskCancelInput], { env: protectedEnv });
  assert.equal(cliTaskCancel.status, 0); const cliTaskCancelResult = JSON.parse(cliTaskCancel.stdout).result;
  assert.deepEqual(cliTaskCancelResult.manifest.task_cancellations.map((entry) => entry.task_id), ["cli-task"]);
  await assert.rejects(access(sentinel.log));
  for (const args of [["unknown", "--input", input], ["status", "--input", input, "--input", input], ["status", "extra", "--input", input], ["status", "--brief", "--bogus", input]]) {
    const output = spawnOrchestrate(args); assert.equal(output.status, 2); assert.equal(JSON.parse(output.stderr).code, "INVALID_INPUT");
  }
  const linkedInput = join(base, "linked-input.json"); await symlink(input, linkedInput);
  const unsafe = spawnOrchestrate(["status", "--input", linkedInput]);
  assert.equal(unsafe.status, 2); assert.equal(JSON.parse(unsafe.stderr).code, "INPUT_PATH_UNSAFE");
  const tooLarge = join(base, "too-large.json"); await writeFile(tooLarge, `${" ".repeat((64 * 1024) + 1)}{}`);
  const oversized = spawnOrchestrate(["status", "--input", tooLarge]);
  assert.equal(oversized.status, 2); assert.equal(JSON.parse(oversized.stderr).code, "LIMIT_EXCEEDED");
  const invalidUtf8 = join(base, "invalid-utf8.json"); await writeFile(invalidUtf8, Buffer.from([0x7b, 0xff, 0x7d]));
  const invalidEncoding = spawnOrchestrate(["status", "--input", invalidUtf8]);
  assert.equal(invalidEncoding.status, 2); assert.equal(JSON.parse(invalidEncoding.stderr).code, "INVALID_INPUT");
  assert.equal(init.manifest.control_id, CONTROL);
});
