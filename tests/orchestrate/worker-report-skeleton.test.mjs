import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";

import {
  cleanupDir,
  createGitRepo,
  evidence,
  loadControl,
  makeBudget,
  makeTask,
  makeTempDir,
  makeWorkerRun,
  spawnOrchestrate,
  workerObservation,
  writeJson,
} from "./helpers.mjs";

const api = await loadControl();

test("Worker Report skeletonはnested strict shapeを固定し保存後そのままimport素材になる", async (t) => {
  const base = await makeTempDir("worker-report-skeleton-");
  t.after(() => cleanupDir(base));
  const repo = await createGitRepo(base);
  const controlId = "worker-report-skeleton-control";
  const initialized = await api.init({
    cwd: repo.root,
    control_id: controlId,
    objective_ref: "docs/control-record-plan.md",
    actor_id: "parent",
    document_refs: ["docs/control-record-plan.md"],
    budget: makeBudget(),
  });
  const validations = ["node --test focused.test.mjs", "git diff --check"];
  const task = await api.taskRecord({
    cwd: repo.root,
    control_id: controlId,
    actor_id: "parent",
    expected_revision: initialized.revision,
    task: makeTask({ task_id: "skeleton-task", validation: validations }),
  });
  const worker = await api.workerRunRecord({
    cwd: repo.root,
    control_id: controlId,
    actor_id: "parent",
    expected_revision: task.revision,
    worker_run: makeWorkerRun({
      worker_run_id: "skeleton-worker",
      task_id: "skeleton-task",
      assignment_id: "skeleton-assignment",
      workspace_cwd: repo.root,
      lineage: { ...makeWorkerRun().lineage, root_assignment_id: "skeleton-assignment" },
    }),
  });
  await assert.rejects(
    api.delegationPacketForWorker({ cwd: repo.root, control_id: controlId, worker_run_id: "skeleton-worker" }),
    (error) => error instanceof api.ControlRecordError && error.code === "INVALID_TRANSITION",
  );
  const admitted = await api.admitWorker({ cwd: repo.root, control_id: controlId, actor_id: "parent", expected_revision: worker.revision, worker_run_id: "skeleton-worker" });

  const inputPath = join(base, "skeleton-input.json");
  await writeJson(inputPath, { cwd: repo.root, control_id: controlId, worker_run_id: "skeleton-worker" });
  const cli = spawnOrchestrate(["worker-report-skeleton", "--input", inputPath]);
  assert.equal(cli.status, 0, cli.stderr);
  const skeleton = JSON.parse(cli.stdout).result;
  assert.equal(skeleton.schema_version, "dotagents.worker-report-skeleton.v1");
  assert.equal(skeleton.report.packet_digest, skeleton.packet_digest);
  assert.deepEqual(skeleton.report.validation_results.map((entry) => entry.validation_ref), validations);
  assert.deepEqual(Object.keys(skeleton.report.validation_results[0]).sort(), ["evidence", "outcome", "validation_ref"]);
  assert.deepEqual(Object.keys(skeleton.report.validation_results[0].evidence).sort(), ["digest", "observed_at", "ref", "type"]);
  assert.equal(skeleton.report.result_digest, "REPLACE_WITH_SHA256");
  const admittedPacket = await api.delegationPacketForWorker({ cwd: repo.root, control_id: controlId, worker_run_id: "skeleton-worker" });
  assert.equal(admittedPacket.packet_digest, skeleton.packet_digest);

  const dispatched = await api.observeWorker({
    cwd: repo.root,
    control_id: controlId,
    actor_id: "parent",
    expected_revision: admitted.revision,
    worker_run_id: "skeleton-worker",
    observation: workerObservation("dispatched"),
  });
  const recovered = await api.workerReportSkeletonForWorker({ cwd: repo.root, control_id: controlId, worker_run_id: "skeleton-worker" });
  assert.equal(recovered.packet_digest, skeleton.packet_digest);

  const report = structuredClone(recovered.report);
  report.result_digest = "d".repeat(64);
  report.evidence = [evidence("/root/skeleton_worker", "executor-receipt")];
  report.validation_results = validations.map((validationRef) => ({
    validation_ref: validationRef,
    outcome: "passed",
    evidence: evidence(validationRef, "command"),
  }));
  report.claims = ["strict skeleton imported without parent shape normalization"];
  const imported = await api.importWorkerReport({
    cwd: repo.root,
    control_id: controlId,
    actor_id: "parent",
    expected_revision: dispatched.revision,
    worker_run_id: "skeleton-worker",
    report,
  });
  assert.equal(imported.manifest.worker_runs[0].state, "completed");
  await assert.rejects(
    api.workerReportSkeletonForWorker({ cwd: repo.root, control_id: controlId, worker_run_id: "skeleton-worker" }),
    (error) => error instanceof api.ControlRecordError && error.code === "INVALID_TRANSITION",
  );
});
