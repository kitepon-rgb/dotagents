import assert from "node:assert/strict";
import { access, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { join } from "node:path";

import {
  addLinkedWorktree, cleanupDir, createBareRepo, createFingerprintBoundaryFiles, createGitRepo, createOversizedFingerprintFile,
  createNonGitDir, createOwnerFixtures, evidence, installSentinelBin, loadControl, makeConsultation, makeTask,
  makeTempDir, makeTransitionReceipt, makeWorkerRun, OWNER_SCHEMA, readPersistedManifest, runGit, spawnOrchestrate,
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

async function initialized(t, overrides = {}) {
  const base = await makeTempDir();
  t.after(() => cleanupDir(base));
  const repo = await createGitRepo(base);
  const result = await api.init({ cwd: repo.root, control_id: CONTROL, objective_ref: "docs/control-record-plan.md", actor_id: "parent-001", document_refs: ["docs/control-record-plan.md"], ...overrides });
  assert.equal(result.revision, 0);
  assert.equal(result.manifest.record_revision, 0);
  assert.equal(result.manifest.control_id, overrides.control_id ?? CONTROL);
  assert.deepEqual(await readPersistedManifest(repo.commonDir, overrides.control_id ?? CONTROL), result.manifest);
  return { repo, result };
}

test("純粋APIは同期で厳格schema・scopeを検証し、unknown fieldを拒否する", () => {
  const manifest = {
    schema_version: "dotagents.orchestration-control.v1", record_revision: 0, control_id: CONTROL, status: "active",
    declaration: { objective_ref: "docs/control-record-plan.md", project_root_realpath: "/project", common_dir_realpath: "/project/.git", git_dir_realpath: "/project/.git", base_sha: "0".repeat(40), initial_dirty: false, created_at: "2026-07-14T00:00:00.000Z", created_by: "parent-001" },
    document_refs: ["docs/control-record-plan.md"], tasks: [], worker_runs: [], consultations: [], task_finalizations: [],
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
  await assert.rejects(api.init({ control_id: CONTROL, objective_ref: "docs/x.md", actor_id: "parent", document_refs: ["docs/x.md"] }), code("INVALID_INPUT"));
  await assert.rejects(api.init({ cwd: nonGit, control_id: CONTROL, objective_ref: "docs/x.md", actor_id: "parent", document_refs: ["docs/x.md"] }), code("NOT_GIT_REPOSITORY"));
  const bareControl = await api.init({ cwd: bare.root, control_id: CONTROL, objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"] });
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
  await assert.rejects(api.init({ cwd: repo.root, control_id: CONTROL, objective_ref: "docs/control-record-plan.md", actor_id: "parent-001", document_refs: ["docs/control-record-plan.md"] }), code("CONTROL_EXISTS"));
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: 1, task: makeTask() }), code("REVISION_CONFLICT"));
});

test("TaskはF/A/H、scope、approval、global task_id一意性を正しく記録する", async (t) => {
  const { repo, result } = await initialized(t);
  const a = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: result.revision, task: makeTask() });
  assert.equal(a.revision, 1); assert.deepEqual((await readPersistedManifest(repo.commonDir, CONTROL)).tasks[0].doc_ref, makeTask().doc_ref); assert.match((await readPersistedManifest(repo.commonDir, CONTROL)).tasks[0].admission_digest, /^[0-9a-f]{64}$/);
  assert.deepEqual(await readdir(join(repo.commonDir, "dotagents", "orchestrate", "controls", CONTROL)), ["manifest.json"]);
  const f = makeTask({ task_id: "task-f", classification: "F", effect: "read", write_scope: [] });
  const fRecorded = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: a.revision, task: f });
  assert.equal(fRecorded.manifest.tasks.at(-1).classification, "F");
  const h = makeTask({ task_id: "task-h", classification: "H", effect: "read", write_scope: [], approval_ref: "docs/approval.md" });
  const hRecorded = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: fRecorded.revision, task: h });
  assert.equal(hRecorded.manifest.tasks.at(-1).approval_ref, "docs/approval.md");
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: hRecorded.revision, task: makeTask({ task_id: "bad-h", classification: "H", approval_ref: null }) }), code("INVALID_SCHEMA"));
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: hRecorded.revision, task: makeTask() }), code("DUPLICATE_ID"));
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
  await assert.rejects(api.workerRunRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent-001", expected_revision: failed.revision, worker_run: makeWorkerRun({ executor: "gpt-connector" }) }), code("EXECUTOR_FORBIDDEN"));
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
  const one = await api.init({ cwd: main.root, control_id: "main-control", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"] });
  const two = await api.init({ cwd: linked.root, control_id: "linked-control", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"] });
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
  const left = await api.init({ cwd: main.root, control_id: "alternative-left", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"] });
  const right = await api.init({ cwd: linked.root, control_id: "alternative-right", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"] });
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
  const left = await api.init({ cwd: main.root, control_id: "negative-left", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"] });
  const right = await api.init({ cwd: linked.root, control_id: "negative-right", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"] });
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
  const init = await api.init({ cwd: main.root, control_id: "identity-control", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"] });
  const task = await api.taskRecord({ cwd: main.root, control_id: "identity-control", actor_id: "parent", expected_revision: init.revision, task: makeTask({ task_id: "identity-task" }) });
  const run = await api.workerRunRecord({ cwd: main.root, control_id: "identity-control", actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "identity-task", workspace_cwd: linked.root }) });
  const recordedFileId = run.manifest.worker_runs[0].workspace.git_dir_file_id;
  assert.match(recordedFileId, /^\d+:\d+$/);
  runGit(main.root, ["worktree", "remove", "--force", linked.root]);
  runGit(main.root, ["worktree", "add", "-q", "-b", "identity-readded", linked.root]);
  const readdedGitDir = runGit(linked.root, ["rev-parse", "--path-format=absolute", "--git-dir"]);
  const readdedStat = await (await import("node:fs/promises")).stat(readdedGitDir);
  assert.notEqual(`${readdedStat.dev}:${readdedStat.ino}`, recordedFileId);
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

test("baseline後のscope内変更はcompletedとacceptを通過する", async (t) => {
  const { repo, result } = await initialized(t);
  const task = await api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "fingerprint-task", write_scope: [{ kind: "file", path: "README.md" }] }) });
  const run = await api.workerRunRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: task.revision, worker_run: makeWorkerRun({ task_id: "fingerprint-task", workspace_cwd: repo.root }) });
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: run.revision, worker_run_id: "run-001" });
  await writeFile(join(repo.root, "README.md"), "scope-in-change\n");
  const dispatched = await api.observeWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: admitted.revision, worker_run_id: "run-001", observation: workerObservation("dispatched") });
  const completed = await api.observeWorker({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: dispatched.revision, worker_run_id: "run-001", observation: completedWorkerObservation() });
  assert.equal(typeof completed.manifest.worker_runs[0].result.workspace_fingerprint.digest, "string");
  const accepted = await api.accept({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: completed.revision, worker_run_id: "run-001", result_digest: "a".repeat(64), verification_evidence: [evidence("docs/verify.md")], decision_note: "scope only", decided_by: "parent" });
  assert.equal(accepted.manifest.worker_runs[0].acceptance.decision, "accepted");
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
  await writeFile(join(paths, "manifest.json"), "{not json");
  await assert.rejects(api.taskRecord({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: result.revision, task: makeTask({ task_id: "blocked-by-manifest" }) }), code("INVALID_SCHEMA"));
});

test("accept/reject/task finalization/archiveは状態・fingerprint・atomic manifestを検査する", async (t) => {
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
  const archived = await api.archive({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: decided.revision });
  assert.equal(archived.manifest.status, "archived");
  assert.equal(archived.manifest.transition_receipts.at(-1).operation, "control-archive");
  assert.deepEqual(await readPersistedManifest(repo.commonDir, CONTROL), archived.manifest);
  await assert.rejects(api.reject({ cwd: repo.root, control_id: CONTROL, actor_id: "parent", expected_revision: archived.revision, worker_run_id: "run-001", result_digest: "a".repeat(64), verification_evidence: [evidence("docs/verify.md")], decision_note: "late", decided_by: "parent" }), code("RECORD_ARCHIVED"));
});

test("record-only layerはprovider/network/dispatch/cancelを実行せず、CLIはstrict input JSONだけを受理する", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const repo = await createGitRepo(base); const sentinel = await installSentinelBin(base);
  const init = await api.init({ cwd: repo.root, control_id: CONTROL, objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"] });
  const input = join(base, "status.json"); await writeJson(input, { cwd: repo.root, control_id: CONTROL });
  const protectedEnv = { ...process.env, PATH: `${sentinel.bin}:${process.env.PATH}` };
  const ok = spawnOrchestrate(["status", "--input", input], { env: protectedEnv });
  assert.equal(ok.status, 0); assert.deepEqual(JSON.parse(ok.stdout), { ok: true, command: "status", result: await api.status({ cwd: repo.root, control_id: CONTROL }) });
  const cliControl = "cli-record-only";
  const cliInitInput = join(base, "cli-init.json"); await writeJson(cliInitInput, { cwd: repo.root, control_id: cliControl, objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"] });
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
  assert.equal(cliAdmit.status, 0); assert.equal(JSON.parse(cliAdmit.stdout).result.manifest.worker_runs[0].state, "admitted");
  await assert.rejects(access(sentinel.log));
  for (const args of [["unknown", "--input", input], ["status", "--input", input, "--input", input], ["status", "extra", "--input", input]]) {
    const output = spawnOrchestrate(args); assert.equal(output.status, 2); assert.equal(JSON.parse(output.stderr).code, "INVALID_INPUT");
  }
  const linkedInput = join(base, "linked-input.json"); await symlink(input, linkedInput);
  const unsafe = spawnOrchestrate(["status", "--input", linkedInput]);
  assert.equal(unsafe.status, 2); assert.equal(JSON.parse(unsafe.stderr).code, "INPUT_PATH_UNSAFE");
  const tooLarge = join(base, "too-large.json"); await writeFile(tooLarge, `${" ".repeat((64 * 1024) + 1)}{}`);
  const oversized = spawnOrchestrate(["status", "--input", tooLarge]);
  assert.equal(oversized.status, 2); assert.equal(JSON.parse(oversized.stderr).code, "LIMIT_EXCEEDED");
  assert.equal(init.manifest.control_id, CONTROL);
});
